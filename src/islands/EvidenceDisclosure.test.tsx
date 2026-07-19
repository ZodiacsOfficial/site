import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import EvidenceDisclosure from './EvidenceDisclosure';

describe('EvidenceDisclosure', () => {
  it('renders a native disclosure closed by default', () => {
    const markup = render(h(EvidenceDisclosure, {
      label: 'Behind this reading',
      description: 'Exact sky and method',
      children: h('p', null, 'Moon in Cancer · 12:00 UTC'),
    }));

    expect(markup).toMatch(/<details[^>]*class="evidence-disclosure evidence-disclosure--quiet"/);
    expect(markup).toContain('data-evidence-disclosure');
    expect(markup).toContain('<summary>');
    expect(markup).toContain('Behind this reading');
    expect(markup).toContain('Exact sky and method');
    expect(markup).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
  });

  it('supports the panel treatment and a scoped class', () => {
    const markup = render(h(EvidenceDisclosure, {
      label: 'Edition details',
      variant: 'panel',
      className: 'today-provenance',
      children: 'Publication record',
    }));

    expect(markup).toContain('evidence-disclosure--panel today-provenance');
  });
});
