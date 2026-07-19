import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SIGNS } from './signs';

const VOID_SURFACES = ['#060709', '#0A0C11', '#0F121A', '#151925', '#1C2130'] as const;

function relativeLuminance(hex: string): number {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Phase 1 pastel identity and contrast contract', () => {
  it('keeps every canonical sign hue synchronized with its CSS token', async () => {
    const tokensPath = fileURLToPath(new URL('../styles/tokens.css', import.meta.url));
    const tokens = await readFile(tokensPath, 'utf8');

    for (const sign of SIGNS) {
      expect(tokens).toContain(`--sign-${sign.slug}: ${sign.hue};`);
    }
  });

  it.each(SIGNS)('$name pastel holds WCAG AA on every dark surface', (sign) => {
    for (const surface of VOID_SURFACES) {
      expect(
        contrastRatio(sign.hue, surface),
        `${sign.name} ${sign.hue} on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the horoscopes hub focus ring above the 3:1 non-text threshold', async () => {
    const hubPath = fileURLToPath(new URL('../pages/horoscopes/index.astro', import.meta.url));
    const hub = await readFile(hubPath, 'utf8');
    expect(hub).toContain('.horo-method summary:focus-visible { outline: 2px solid var(--ink-0);');
    for (const surface of VOID_SURFACES) {
      expect(contrastRatio('#EEF1F7', surface), `focus ring on ${surface}`).toBeGreaterThanOrEqual(3);
    }
  });
});
