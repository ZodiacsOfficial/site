import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PRO_CHAT_MODERATION_ACTIONS,
  PRO_CHAT_PHASE,
  PRO_CHAT_REPORT_REASONS,
  PRO_CHAT_ROOM,
  PRO_CHAT_RULES,
  PRO_CHAT_SHELL_COPY,
  PRO_CHAT_SYSTEM_STATES,
} from '../src/pro/chat/contracts.mjs';
import { createReadOnlyTrollbox } from '../src/pro/chat/shell.mjs';

const ROOT = resolve(import.meta.dirname, '..');

class TestElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.className = '';
    this.id = '';
    this.textContent = '';
    this.disabled = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  set innerHTML(_value) {
    throw new Error('The Trollbox must not render through innerHTML.');
  }
}

class TestDocument {
  createElement(tagName) {
    return new TestElement(tagName, this);
  }
}

function walk(root) {
  return [root, ...root.children.flatMap(walk)];
}

function byClass(root, className) {
  return walk(root).filter((node) => node.className.split(/\s+/u).includes(className));
}

function renderedText(root) {
  return walk(root).map((node) => node.textContent).filter(Boolean).join('\n');
}

describe('Registry Pro read-only Trollbox', () => {
  it('pins the preview, global room and closed future moderation vocabulary', () => {
    expect(PRO_CHAT_PHASE).toBe('preview');
    expect(PRO_CHAT_ROOM).toEqual({ id: 'global', label: 'Global room' });
    expect(PRO_CHAT_RULES).toEqual(['No links', 'No addresses', 'No images', 'No direct messages']);
    expect(PRO_CHAT_REPORT_REASONS).toEqual([
      'spam', 'scam', 'manipulation', 'harassment', 'impersonation', 'privacy',
    ]);
    expect(PRO_CHAT_MODERATION_ACTIONS).toEqual(['hide', 'remove', 'restore', 'mute', 'ban']);
    expect(Object.isFrozen(PRO_CHAT_ROOM)).toBe(true);
    expect(Object.isFrozen(PRO_CHAT_SYSTEM_STATES)).toBe(true);
    expect(PRO_CHAT_SYSTEM_STATES.every(Object.isFrozen)).toBe(true);
  });

  it('renders only honest system states and a disabled, explained composer', () => {
    const document = new TestDocument();
    const host = document.createElement('div');
    const mounted = createReadOnlyTrollbox({ host });
    const [shell] = host.children;

    expect(shell.tagName).toBe('ASIDE');
    expect(shell.className).toBe('rp-chat');
    expect(shell.getAttribute('data-chat-mode')).toBe('preview');
    expect(shell.getAttribute('aria-labelledby')).toMatch(/^rp-chat-title-/u);
    expect(byClass(shell, 'rp-chat__message')).toHaveLength(PRO_CHAT_SYSTEM_STATES.length);
    expect(byClass(shell, 'rp-chat__message--system')).toHaveLength(PRO_CHAT_SYSTEM_STATES.length);

    const text = renderedText(shell);
    expect(text).toContain(PRO_CHAT_SHELL_COPY.status);
    for (const state of PRO_CHAT_SYSTEM_STATES) expect(text).toContain(state.body);
    for (const rule of PRO_CHAT_RULES) expect(text).toContain(rule);

    const [input] = byClass(shell, 'rp-chat__composer-input');
    const [submit] = byClass(shell, 'rp-chat__submit');
    const [explanation] = byClass(shell, 'rp-chat__composer-explanation');
    expect(input.disabled).toBe(true);
    expect(input.maxLength).toBe(280);
    expect(input.placeholder).toBe(PRO_CHAT_SHELL_COPY.composerPlaceholder);
    expect(input.getAttribute('aria-describedby')).toBe(explanation.id);
    expect(submit.disabled).toBe(true);

    mounted.destroy();
    mounted.destroy();
    expect(host.children).toHaveLength(0);
  });

  it('rejects an absent host and carries no active integration surface', async () => {
    expect(() => createReadOnlyTrollbox()).toThrow(TypeError);

    const sources = await Promise.all([
      'src/pro/chat/contracts.mjs',
      'src/pro/chat/shell.mjs',
    ].map((file) => readFile(resolve(ROOT, file), 'utf8')));
    const source = sources.join('\n');

    expect(source).not.toMatch(/innerHTML/u);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/u);
    expect(source).not.toMatch(/createClient|signInWithWeb3|signMessage|signTransaction/u);
    expect(source).not.toMatch(/localStorage|sessionStorage|document\.cookie/u);
    expect(source).not.toMatch(/PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|\/api\//u);
    expect(source).not.toMatch(/\.href\s*=|createElement\(['"](?:a|img)['"]\)/u);
  });
});
