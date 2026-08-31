import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const CRITICAL_PATH = resolve(ROOT, 'src/styles/calculator-first-paint.css');
const CANONICAL_PATH = resolve(ROOT, 'src/styles/calculator.css');
const EN_BIRTH_CHART_PATH = resolve(ROOT, 'src/pages/birth-chart/index.astro');

const INTERACTION_SELECTORS = [
  '.field__input:focus-visible',
  '.calc__submit:disabled',
  '.calc__error',
  '.place__list',
  '.place__option',
  '.place__option.is-active',
  '.place__name',
  '.place__meta',
  '.place__empty',
  '.place__chip',
  '.place__clear',
  '.place__error',
  '.place__hint',
  '.place__chip-value',
  '.place__chip-value:focus-visible',
];

function context(rule) {
  const parents = [];
  for (let parent = rule.parent; parent?.type === 'atrule'; parent = parent.parent) {
    parents.unshift(`@${parent.name} ${parent.params}`);
  }
  return parents.join(' > ');
}

function declarationMap(rule) {
  return Object.fromEntries(
    rule.nodes
      .filter((node) => node.type === 'decl')
      .map((declaration) => [declaration.prop, declaration.value]),
  );
}

function rulesByIdentity(css) {
  const rules = new Map();
  postcss.parse(css).walkRules((rule) => {
    rules.set(`${context(rule)}\n${rule.selector}`, declarationMap(rule));
  });
  return rules;
}

describe('calculator first-paint CSS contract', () => {
  it('keeps every critical declaration in parity with canonical calculator CSS', async () => {
    const [criticalCss, canonicalCss] = await Promise.all([
      readFile(CRITICAL_PATH, 'utf8'),
      readFile(CANONICAL_PATH, 'utf8'),
    ]);
    const criticalRules = rulesByIdentity(criticalCss);
    const canonicalRules = rulesByIdentity(canonicalCss);

    for (const [identity, declarations] of criticalRules) {
      expect(canonicalRules.get(identity), `canonical rule missing or drifted: ${identity}`)
        .toEqual(declarations);
    }

    const criticalSelectors = new Set(
      [...criticalRules.keys()].map((identity) => identity.split('\n').at(-1)),
    );
    for (const selector of INTERACTION_SELECTORS) {
      expect(criticalSelectors, `critical interaction rule missing: ${selector}`).toContain(selector);
    }
  });

  it('retains an explicit keyboard focus ring in both sheets', async () => {
    const [criticalCss, canonicalCss] = await Promise.all([
      readFile(CRITICAL_PATH, 'utf8'),
      readFile(CANONICAL_PATH, 'utf8'),
    ]);

    for (const css of [criticalCss, canonicalCss]) {
      const rules = rulesByIdentity(css);
      const ring = rules.get('\n.field__input:focus-visible');
      expect(ring?.outline).toMatch(/^2px solid /u);
      expect(ring?.['outline-offset']).toBe('2px');
      expect(rules.get('\n.field__input:focus')?.outline).not.toBe('none');
    }
  });

  it('pins the English desktop context cue before deferred styles arrive', async () => {
    const [page, canonicalCss] = await Promise.all([
      readFile(EN_BIRTH_CHART_PATH, 'utf8'),
      readFile(CANONICAL_PATH, 'utf8'),
    ]);
    const cue = rulesByIdentity(canonicalCss).get('\n.calc__context-cue');

    expect(cue).toEqual({ 'font-size': '11px', 'line-height': '1.5' });
    expect(page).toContain('.field__help.calc__context-cue { font-size: 11px; line-height: 1.5; }');
  });
});
