import { describe, expect, it } from 'vitest';
import { TP_CSS } from '../src/trade/styles.mjs';

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return TP_CSS.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1] ?? '';
}

describe('trade panel layout', () => {
  it('becomes one full-width surface inside the Registry sheet', () => {
    expect(rule('.stage-sheet .consumer-trade')).toContain('clear: both');
    expect(rule('.stage-sheet .consumer-trade')).toContain('width: 100%');

    const sheetPanel = rule('.stage-sheet .tp');
    expect(sheetPanel).toContain('width: 100%');
    expect(sheetPanel).toContain('padding: 0');
    expect(sheetPanel).toContain('border: 0');
    expect(sheetPanel).toContain('background: transparent');
  });

  it('uses deliberate, finger-sized amount and payment controls', () => {
    expect(rule('.tp .amts')).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(rule('.tp .amts button')).toContain('min-height: 44px');
    expect(rule('.tp .payseg')).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(rule('.tp .payseg button')).toContain('min-height: 48px');

    expect(TP_CSS).toContain('@container (max-width: 340px)');
    expect(TP_CSS).toContain('.tp .amts { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    expect(TP_CSS).toContain('.tp .payseg { grid-template-columns: 1fr; }');
  });

  it('keeps interaction feedback accessible and motion-considerate', () => {
    expect(TP_CSS).toContain(':focus-visible');
    expect(TP_CSS).toContain('@media (hover: hover) and (pointer: fine)');
    expect(TP_CSS).toContain('@media (prefers-reduced-motion: reduce)');
    expect(TP_CSS).toContain('cubic-bezier(.23,1,.32,1)');
  });
});
