import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  REGISTRY_PRO_CHAT_FLAG,
  REGISTRY_PRO_CHAT_META,
  REGISTRY_PRO_FLAG,
  REGISTRY_PRO_META,
  injectRegistryPro,
  registryProChatEnabled,
  registryProEnabled,
} from '../src/pro/entry.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const PAGE = resolve(ROOT, 'public/registry/pro/index.html');

describe('Registry Pro build-time gates', () => {
  it('accepts only the exact master value and makes chat subordinate', () => {
    expect(registryProEnabled({ [REGISTRY_PRO_FLAG]: '1' })).toBe(true);
    for (const value of ['true', 'yes', 'on', ' 1 ', '0', 1]) {
      expect(registryProEnabled({ [REGISTRY_PRO_FLAG]: value })).toBe(false);
    }
    expect(registryProChatEnabled({ [REGISTRY_PRO_CHAT_FLAG]: '1' })).toBe(false);
    expect(registryProChatEnabled({
      [REGISTRY_PRO_FLAG]: '1', [REGISTRY_PRO_CHAT_FLAG]: '1',
    })).toBe(true);
  });

  it('keeps committed HTML flag-off and byte-reversibly stamps both gates', async () => {
    const committed = await readFile(PAGE, 'utf8');
    expect(committed).toContain(`<meta name="${REGISTRY_PRO_META}" content="0" />`);
    expect(committed).toContain(`<meta name="${REGISTRY_PRO_CHAT_META}" content="0" />`);
    expect(committed).toContain('<!-- registry-pro:slot {} -->');
    expect(committed).not.toContain('data-registry-pro-terminal');
    expect(committed).not.toContain('/assets/registry-pro.js');

    const terminal = injectRegistryPro(committed, { [REGISTRY_PRO_FLAG]: '1' });
    expect(terminal.enabled).toBe(true);
    expect(terminal.chatEnabled).toBe(false);
    expect(terminal.output).toContain('data-registry-pro-terminal');
    expect(terminal.output).toContain('data-registry-pro-fallback');
    expect(terminal.output).toContain('no quote or transaction was sent');
    expect(terminal.output).toContain('/assets/registry-pro.js');
    expect(terminal.output).toContain(`<meta name="${REGISTRY_PRO_CHAT_META}" content="0" />`);

    const withChat = injectRegistryPro(committed, {
      [REGISTRY_PRO_FLAG]: '1', [REGISTRY_PRO_CHAT_FLAG]: '1',
    });
    expect(withChat.chatEnabled).toBe(true);
    expect(withChat.output).toContain(`<meta name="${REGISTRY_PRO_CHAT_META}" content="1" />`);
    expect(injectRegistryPro(withChat.output, {}).output).toBe(committed);
    expect(injectRegistryPro(withChat.output, withChat).output).not.toContain('content="1"');
  });

  it('wires page generation, stamping, bundle drift, and independent server gate', async () => {
    const [packageSource, workflow, gateway] = await Promise.all([
      readFile(resolve(ROOT, 'package.json'), 'utf8'),
      readFile(resolve(ROOT, '.github/workflows/site-check.yml'), 'utf8'),
      readFile(resolve(ROOT, 'src/pro/server/quote-gateway.mjs'), 'utf8'),
    ]);
    for (const script of [
      'build-registry-pro-page.mjs', 'build-registry-pro.mjs', 'configure-registry-pro.mjs',
    ]) {
      expect(packageSource).toContain(script);
      expect(workflow).toContain(script);
    }
    expect(gateway).toContain("value(env, 'REGISTRY_PRO_QUOTES_ENABLED') === '1'");
    expect(gateway).toContain("value(env, 'JUPITER_API_KEY')");
    expect(gateway).not.toMatch(/PUBLIC_JUPITER|PUBLIC_REGISTRY_PRO_QUOTES/u);
  });
});
