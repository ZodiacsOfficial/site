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
    expect(rule('.tp .amts button')).toMatch(/min-height:\s*(?:4[4-9]|[5-9]\d)px/);
    expect(rule('.tp .payseg')).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(rule('.tp .payseg button')).toMatch(/min-height:\s*(?:4[8-9]|[5-9]\d)px/);

    expect(TP_CSS).toContain('@container (max-width: 340px)');
    expect(TP_CSS).toMatch(/@container \(max-width: 340px\)[\s\S]+\.tp \.amts \{[\s\S]+repeat\(4,/);
    expect(TP_CSS).toMatch(/@container \(max-width: 340px\)[\s\S]+\.tp \.payseg \{[^}]+repeat\(2,/);
    expect(TP_CSS).toMatch(/@container \(max-width: 340px\)[\s\S]+\.tp \.amts button \{[^}]+min-height:\s*(?:4[4-9]|[5-9]\d)px/);
  });

  it('presents the purchase as four numbered stages with visible safety context', () => {
    expect(rule('.tp__step-number')).toContain('border-radius: 50%');
    expect(rule('.tp .details')).toContain('grid-template-columns');
    expect(rule('.tp .review-notice')).toContain('border: 1px solid');
    expect(rule('.tp__asset-note')).toContain('rgba(231,200,121');
  });

  it('keeps interaction feedback accessible and motion-considerate', () => {
    expect(TP_CSS).toContain(':focus-visible');
    expect(TP_CSS).toContain('@media (hover: hover) and (pointer: fine)');
    expect(TP_CSS).toContain('@media (prefers-reduced-motion: reduce)');
    expect(TP_CSS).toContain('cubic-bezier(.23,1,.32,1)');
  });
});
