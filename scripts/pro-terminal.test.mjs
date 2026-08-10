import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PRO_SIGNS } from '../src/pro/catalog.mjs';

const ROOT = resolve(import.meta.dirname, '..');

describe('Registry Pro terminal contract', () => {
  it('keeps all twelve signs in zodiac order and only pastel sign hues', () => {
    expect(PRO_SIGNS.map((sign) => sign.slug)).toEqual([
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ]);
    expect(new Set(PRO_SIGNS.map((sign) => sign.hue)).size).toBe(12);
  });

  it('requests quotes only on explicit form submission and sends no wallet-shaped field', async () => {
    const terminal = await readFile(resolve(ROOT, 'src/pro/terminal.mjs'), 'utf8');
    expect(terminal).toContain("ui.form.addEventListener('submit', requestQuotes)");
    expect(terminal).toContain("fetchImpl('/api/registry-pro-quotes'");
    expect(terminal).toContain("method: 'POST'");
    expect(terminal).toMatch(/JSON\.stringify\(\{\s*sign: market\.slug,\s*side,\s*amount: atomic,\s*slippageBps:/u);
    expect(terminal).not.toMatch(/walletAddress|taker:|receiver:|payer:|signature:/u);
    expect(terminal).toContain('No wallet address is accepted.');
  });

  it('keeps reference-market and provider-routing language separate', async () => {
    const terminal = await readFile(resolve(ROOT, 'src/pro/terminal.mjs'), 'utf8');
    expect(terminal).toContain('Reference-pool chart');
    expect(terminal).toContain('Canonical pool only · not a consolidated tape');
    expect(terminal).toContain('Compare exact-input quotes');
    expect(terminal).toContain('Highest quoted output');
    expect(terminal).toContain('Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode');
    expect(terminal).not.toContain("'Jupiter Swap V2'");
    expect(terminal).not.toMatch(/best execution|order book/iu);
  });

  it('keeps candle and tape lifecycles independent and exposes chart data as a table', async () => {
    const terminal = await readFile(resolve(ROOT, 'src/pro/terminal.mjs'), 'utf8');
    expect(terminal).toContain('let chartGeneration = 0');
    expect(terminal).toContain('let tapeGeneration = 0');
    expect(terminal).toContain('const candleTable = createCandleTable');
    expect(terminal).toContain("canvas.setAttribute('role', 'img')");
    expect(terminal).toContain('Candle data table');
    expect(terminal).toContain('if (tapeToo) tape.clear()');
    expect(terminal).not.toContain('marketGeneration');
  });

  it('invalidates changed and expired quotes without removing keyboard focus', async () => {
    const terminal = await readFile(resolve(ROOT, 'src/pro/terminal.mjs'), 'utf8');
    expect(terminal).toContain("ui.amount.addEventListener('input'");
    expect(terminal).toContain("ui.slippage.addEventListener('change'");
    expect(terminal).toContain('Provider snapshots expired. Request a fresh comparison.');
    expect(terminal).toContain("payload?.status === 'unavailable'");
    expect(terminal).toContain('Their independent failure states are shown below.');
    expect(terminal).toContain("ui.submit.setAttribute('aria-disabled', 'true')");
    expect(terminal).not.toContain('ui.submit.disabled = true');
    expect(terminal).toContain("ui.submit.removeAttribute('aria-disabled')");
    expect(terminal).toContain("ui.submit.removeAttribute('aria-busy')");
  });
});
