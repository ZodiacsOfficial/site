import { describe, expect, it } from 'vitest';
import {
  iframeEmbedCode,
  normalizeAccent,
  scriptEmbedCode,
  widgetAccentForTheme,
  widgetContrastRatio,
  widgetEmbedUrl,
} from './widgets';

describe('widget embed contract', () => {
  it('builds a same-origin route with a constrained theme and accent', () => {
    expect(widgetEmbedUrl('https://zodiacs.org', 'moon', 'light', '#E0B080'))
      .toBe('https://zodiacs.org/embed/moon/?theme=light&accent=%23E0B080');
    expect(normalizeAccent('red')).toBeNull();
  });

  it('keeps host accents readable in both themes', () => {
    const dark = widgetAccentForTheme('#000000', 'dark');
    const light = widgetAccentForTheme('#FFFFFF', 'light');
    expect(dark).not.toBeNull();
    expect(light).not.toBeNull();
    expect(widgetContrastRatio(dark!, '#0A0C11')).toBeGreaterThanOrEqual(4.5);
    expect(widgetContrastRatio(light!, '#FBFAF7')).toBeGreaterThanOrEqual(4.5);
    expect(widgetAccentForTheme('#E0B080', 'dark')).toBe('#E0B080');
    expect(widgetAccentForTheme('red', 'dark')).toBeNull();
  });

  it('produces a sandboxed, labeled iframe', () => {
    const code = iframeEmbedCode({
      origin: 'https://zodiacs.org',
      kind: 'chart',
      theme: 'dark',
      accent: '#E0B080',
      title: 'Mini birth chart',
    });
    expect(code).toContain('/embed/chart/?theme=dark&amp;accent=%23E0B080');
    expect(code).toContain('sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"');
    expect(code).toContain('referrerpolicy="strict-origin-when-cross-origin"');
  });

  it('produces a script mount with no branding-off switch', () => {
    const code = scriptEmbedCode({
      origin: 'https://zodiacs.org',
      kind: 'sky',
      theme: 'dark',
      title: 'The sky today',
    });
    expect(code).toContain('/assets/widgets.js');
    expect(code).toContain('data-zodiacs-widget="sky"');
    expect(code).not.toMatch(/brand|credit|powered/i);
  });
});
