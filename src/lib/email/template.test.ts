import { describe, expect, it } from 'vitest';
import {
  renderEmailHtml,
  renderEmailText,
  signIconUrl,
  SIGN_HUE,
  type EmailDocument,
} from './template';

const BASE = 'https://zodiacs.org';

function doc(overrides: Partial<EmailDocument> = {}): EmailDocument {
  return {
    preheader: 'Preview line',
    eyebrow: 'Weekly digest · Jul 13-19',
    title: 'Your sky, Jul 13-19',
    sign: 'leo',
    identity: '2 saved charts',
    intro: 'The closest aspects to your saved charts this week.',
    sections: [{
      heading: 'Frida',
      rows: [{ label: 'Jul 14', body: 'Jupiter puts focus on your way of thinking.', receipt: '0.0 deg orb' }],
    }],
    cta: { label: 'Read all transits', url: `${BASE}/transits/` },
    footerLines: ['You asked for a Monday digest.'],
    unsubscribeUrl: `${BASE}/api/unsubscribe?u=demo&sig=demo`,
    ...overrides,
  };
}

describe('the shared email shell', () => {
  it('carries the document through both parts', () => {
    const html = renderEmailHtml(doc(), BASE);
    const text = renderEmailText(doc());
    for (const part of [html, text]) {
      expect(part).toContain('Your sky, Jul 13-19');
      expect(part).toContain('Jupiter puts focus on your way of thinking.');
      expect(part).toContain('Read all transits');
    }
    // The preheader is inbox-preview only and never belongs in the text part.
    expect(html).toContain('Preview line');
    expect(text).not.toContain('Preview line');
  });

  it('references only email-decodable images, at the size it displays', () => {
    const html = renderEmailHtml(doc(), BASE);
    expect(html).toContain(signIconUrl(BASE, 'leo'));
    expect(html).toContain('/assets/zodiac-icons/128/leo.png');
    expect(html).not.toMatch(/\.(webp|avif)\b/iu);
    expect(html).toContain('width="44" height="44"');
  });

  it('lays out with tables, not flex or grid, for Word-rendered Outlook', () => {
    const html = renderEmailHtml(doc(), BASE);
    expect(html).not.toMatch(/display\s*:\s*(flex|grid)/iu);
    expect(html).toContain('role="presentation"');
  });

  it('tints with the sign hue from the token file', () => {
    expect(SIGN_HUE.leo).toBe('#E0A9B4');
    expect(renderEmailHtml(doc({ sign: 'leo' }), BASE)).toContain('#E0A9B4');
    // Without a sign there is no disc and no remote resource at all.
    const plain = renderEmailHtml(doc({ sign: undefined }), BASE);
    expect(plain).not.toMatch(/<img\b/iu);
  });

  it('escapes content rather than trusting it', () => {
    const html = renderEmailHtml(doc({ title: '<script>alert(1)</script>' }), BASE);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('drops hrefs that are not http(s)', () => {
    const html = renderEmailHtml(
      doc({ cta: { label: 'Tap', url: 'javascript:alert(1)' } }),
      BASE,
    );
    expect(html).not.toContain('javascript:');
  });

  it('says so when a section computed to nothing', () => {
    const empty = { heading: 'Diego', rows: [], empty: 'A quiet week for this chart.' };
    expect(renderEmailHtml(doc({ sections: [empty] }), BASE)).toContain('A quiet week');
    expect(renderEmailText(doc({ sections: [empty] }))).toContain('A quiet week');
  });

  it('stays well inside the size Gmail clips at', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      heading: `Chart ${i}`,
      rows: Array.from({ length: 5 }, (_, j) => ({
        label: `Jul ${j + 1}`,
        body: 'Jupiter puts focus on your way of thinking.',
        receipt: 'transiting Jupiter conjunction natal Mercury, 0.0 deg orb.',
      })),
    }));
    const bytes = Buffer.byteLength(renderEmailHtml(doc({ sections: many }), BASE), 'utf8');
    expect(bytes).toBeLessThan(102_400);
  });

  it('keeps the unsubscribe route reachable in both parts', () => {
    const url = `${BASE}/api/unsubscribe?u=demo&sig=demo`;
    expect(renderEmailText(doc())).toContain(url);
    expect(renderEmailHtml(doc(), BASE)).toContain(url.replaceAll('&', '&amp;'));
  });
});
