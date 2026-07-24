import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { AURA_SIGN_ORDER, type AuraCabinetHolding } from '../../lib/aura/types';
import AuraCollectionCabinet, {
  cabinetVisibleEdition,
  cabinetVisibleFinish,
  compactGoldCount,
  exactGoldCount,
  isGildedHolding,
  normalizedGoldCount,
  principalSign,
} from './AuraCollectionCabinet';

const mixedHoldings: AuraCabinetHolding[] = [
  { sign: 'aries', finish: 'pastel' },
  { sign: 'libra', finish: 'silver' },
  { sign: 'pisces', finish: 'gold', goldCount: '3' },
];

describe('AuraCollectionCabinet', () => {
  it('renders all twelve niches in canonical order with factual represented states', () => {
    const markup = render(h(AuraCollectionCabinet, {
      holdings: mixedHoldings,
      selectedSign: 'libra',
    }));

    expect(markup.match(/data-aura-cabinet-sign=/g)).toHaveLength(12);
    expect(markup.indexOf('data-aura-cabinet-sign="aries"'))
      .toBeLessThan(markup.indexOf('data-aura-cabinet-sign="taurus"'));
    expect(markup.indexOf('data-aura-cabinet-sign="aquarius"'))
      .toBeLessThan(markup.indexOf('data-aura-cabinet-sign="pisces"'));
    expect(markup).toContain('3</strong> of the Twelve in this collection.');
    expect(markup).toContain('data-aura-cabinet-sign="aries" data-aura-cabinet-represented="true"');
    expect(markup).toContain('data-aura-cabinet-sign="taurus" data-aura-cabinet-represented="false"');
    expect(markup).toContain('data-aura-cabinet-finish="silver"');
    expect(markup).toContain('data-aura-cabinet-finish="gold"');
    // Only represented niches display the pastel medallion; reserved niches
    // carry an incised glyph instead of a dimmed pseudo-object.
    expect(markup.match(/data-zodiac-medallion=/g)).toHaveLength(3);
    expect(markup.match(/aura-collection-cabinet__reserved-mark/g)).toHaveLength(9);
    expect(markup).toContain('/assets/zodiac-icons/128/aries.avif');
    expect(markup).toContain('/assets/zodiac-icons/128/aries.webp');
    expect(markup).toContain('data-aura-cabinet-edition-seal="silver">III</span>');
    expect(markup).not.toContain('/assets/cabinet-materials/silver/libra.avif');
    expect(markup).not.toContain('/assets/cabinet-materials/bronze/');
    expect(markup).toContain('/assets/cabinet-materials/gold/pisces.avif');
    expect(markup).toContain('/assets/cabinet-materials/gold/pisces.webp');
    expect(markup).toContain('aura-collection-cabinet__multiplicity-badge');
    expect(markup).toContain('>×3</span>');
    expect(markup).toContain('gold sculptures');
    // Absence is a reserved niche, never a shouted deficiency.
    expect(markup).not.toContain('NOT REPRESENTED');
    expect(markup).toContain('place reserved — no holding found');
    expect(markup).not.toContain('/assets/nuggets/thumb/');
    expect(markup).toContain('Nº 02');
  });

  it('renders a stable selected placard with keywords, provenance, and Registry link', () => {
    const markup = render(h(AuraCollectionCabinet, {
      holdings: [{ sign: 'libra', finish: 'silver' }],
      selectedSign: 'libra',
      recordedNote: 'Recorded July 18, 2026 · Solana',
    }));

    expect(markup).toContain('data-aura-cabinet-placard="libra"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Harmony');
    expect(markup).toContain('Beauty');
    expect(markup).toContain('Attraction');
    expect(markup).toContain('Silver Edition');
    expect(markup).toContain('From 100,000 held');
    expect(markup).toContain('Libra edition: Silver Edition');
    expect(markup).toContain('set in a cast silver rim and sealed III');
    expect(markup).toContain('Recorded July 18, 2026 · Solana');
    expect(markup).toContain('href="/registry/libra/"');
    expect(markup).toContain('View Registry record');
  });

  it('speaks sample voice and opens the placard on the principal work', () => {
    const markup = render(h(AuraCollectionCabinet, {
      holdings: [
        { sign: 'sagittarius', finish: 'bronze' },
        { sign: 'cancer', finish: 'pastel' },
      ],
      illustrative: true,
    }));

    expect(markup).toContain('Curator’s sample');
    expect(markup).not.toMatch(/illustrative/i);
    // Bronze outranks pastel: the curator presents the principal work first.
    expect(markup).toContain('data-aura-cabinet-placard="sagittarius"');
    expect(markup).toContain('set in a cast bronze rim and sealed II');
  });

  it('marks the complete Twelve with the case frame and an engraved plate', () => {
    const markup = render(h(AuraCollectionCabinet, {
      holdings: AURA_SIGN_ORDER.map((sign) => ({ sign, finish: 'gold' as const, goldCount: '1' })),
      plateDate: 'July 18, 2026',
    }));

    expect(markup).toContain('class="aura-collection-cabinet is-complete"');
    expect(markup).toContain('data-aura-cabinet-complete="true"');
    expect(markup).toContain('12</strong> of the Twelve in this collection.');
    expect(markup).toContain('data-aura-cabinet-case-plate');
    expect(markup).toContain('The Complete Twelve');
    expect(markup).toContain('recorded July 18, 2026');
  });

  it('caps every reveal stage at the verified final edition', () => {
    expect(cabinetVisibleFinish('pastel', 'gold')).toBe('pastel');
    expect(cabinetVisibleFinish('bronze', 'light')).toBe('pastel');
    expect(cabinetVisibleFinish('bronze', 'pastel')).toBe('pastel');
    expect(cabinetVisibleFinish('bronze', 'silver')).toBe('bronze');
    expect(cabinetVisibleFinish('silver', 'bronze')).toBe('bronze');
    expect(cabinetVisibleFinish('gold', 'silver')).toBe('silver');
    expect(cabinetVisibleFinish('gold', 'gold')).toBe('gold');
    expect(cabinetVisibleFinish('gold', 'strike')).toBe('gold');
    expect(cabinetVisibleFinish('gold', 'gild')).toBe('gold');
    expect(cabinetVisibleFinish('silver', 'settled')).toBe('silver');
  });

  it('holds the Gilded Case behind Gold until its own beat', () => {
    const gilded = { sign: 'leo', finish: 'gold', goldCount: '12' } as const;
    const single = { sign: 'leo', finish: 'gold', goldCount: '9' } as const;

    expect(isGildedHolding(gilded)).toBe(true);
    expect(isGildedHolding(single)).toBe(false);
    expect(isGildedHolding({ sign: 'leo', finish: 'silver' })).toBe(false);
    expect(cabinetVisibleEdition(gilded, 'silver')).toBe('silver');
    expect(cabinetVisibleEdition(gilded, 'gold')).toBe('gold');
    expect(cabinetVisibleEdition(gilded, 'strike')).toBe('gold');
    expect(cabinetVisibleEdition(gilded, 'gild')).toBe('gilded');
    expect(cabinetVisibleEdition(gilded, 'settled')).toBe('gilded');
    expect(cabinetVisibleEdition(single, 'settled')).toBe('gold');
  });

  it('gilds the case, frames the seat, and seals the fifth edition V', () => {
    const markup = render(h(AuraCollectionCabinet, {
      holdings: [
        { sign: 'aries', finish: 'pastel' },
        { sign: 'leo', finish: 'gold', goldCount: '12' },
      ],
      selectedSign: 'leo',
    }));
    const ungilded = render(h(AuraCollectionCabinet, {
      holdings: [{ sign: 'leo', finish: 'gold', goldCount: '9' }],
      selectedSign: 'leo',
    }));

    expect(markup).toContain('data-aura-cabinet-gilded="true"');
    expect(markup).toContain('aura-collection-cabinet__gilding');
    expect(markup).toContain('data-aura-cabinet-gilt-plate');
    expect(markup).toContain('The Gilded Case');
    expect(markup).toContain('sealed V');
    expect(markup).toContain('From 10,000,000 held');
    expect(markup).toContain('data-aura-cabinet-edition="gilded"');
    expect(markup).toContain('data-aura-cabinet-lineage="gilded"');
    expect(markup).toContain('>×12</span>');
    // The seat still holds a Gold sculpture: gilding frames it, never replaces it.
    expect(markup).toContain('/assets/cabinet-materials/gold/leo.webp');
    // Nine sculptures is still the Gold Sculpture, and the case stays plain.
    expect(ungilded).toContain('data-aura-cabinet-gilded="false"');
    expect(ungilded).not.toContain('data-aura-cabinet-gilt-plate');
    expect(ungilded).not.toContain('data-aura-cabinet-edition="gilded"');
    // Rung V stands in the rail either way — the ladder is always the whole ladder.
    expect(ungilded).toContain('data-aura-cabinet-lineage="gilded"');
    // Standing is recorded, never sold.
    expect(markup).not.toMatch(/buy|acquire|upgrade|unlock/i);
  });

  it('shows additional Masterworks as struck roundels with one capped grammar', () => {
    const doubleMarkup = render(h(AuraCollectionCabinet, {
      holdings: [{ sign: 'leo', finish: 'gold', goldCount: '2' }],
      selectedSign: 'leo',
    }));
    const largeMarkup = render(h(AuraCollectionCabinet, {
      holdings: [{ sign: 'aquarius', finish: 'gold', goldCount: '2500' }],
      selectedSign: 'aquarius',
    }));

    // One roundel per additional Masterwork, up to three, then a "+" marker.
    expect(doubleMarkup.match(/aura-collection-cabinet__strike-roundel/g)).toHaveLength(1);
    expect(doubleMarkup).toContain('×2');
    expect(doubleMarkup).toContain('2 gold sculptures — one for each complete million held.');
    expect(largeMarkup.match(/aura-collection-cabinet__strike-roundel--more/g)).toHaveLength(1);
    // The badge caps at ×99+ everywhere public; the placard keeps the exact figure.
    expect(largeMarkup).toContain('×99+');
    expect(largeMarkup).not.toContain('×2.5K');
    expect(largeMarkup).toContain('2,500 gold sculptures — one for each complete million held.');
    expect(largeMarkup).toContain('· ×2,500');
  });

  it('normalizes and formats Gold counts deterministically', () => {
    expect(normalizedGoldCount()).toBe(1n);
    expect(normalizedGoldCount('0')).toBe(1n);
    expect(normalizedGoldCount('0002')).toBe(2n);
    expect(normalizedGoldCount('not-a-count')).toBe(1n);
    expect(exactGoldCount('1234567')).toBe('1,234,567');
    expect(compactGoldCount('2')).toBe('2');
    expect(compactGoldCount('9')).toBe('9');
    expect(compactGoldCount('10')).toBe('10');
    expect(compactGoldCount('99')).toBe('99');
    expect(compactGoldCount('100')).toBe('99+');
    expect(compactGoldCount('2500')).toBe('99+');
  });

  it('names the principal work by edition, then Gold count, then zodiac order', () => {
    expect(principalSign([])).toBeNull();
    expect(principalSign([{ sign: 'cancer', finish: 'pastel' }])).toBe('cancer');
    expect(principalSign([
      { sign: 'cancer', finish: 'pastel' },
      { sign: 'sagittarius', finish: 'bronze' },
    ])).toBe('sagittarius');
    expect(principalSign([
      { sign: 'aries', finish: 'gold', goldCount: '1' },
      { sign: 'leo', finish: 'gold', goldCount: '3' },
    ])).toBe('leo');
    expect(principalSign([
      { sign: 'aries', finish: 'gold', goldCount: '2' },
      { sign: 'leo', finish: 'gold', goldCount: '2' },
    ])).toBe('aries');
  });

  it('shows only completed curatorial arrangements as plaques', () => {
    const earned = render(h(AuraCollectionCabinet, {
      holdings: [
        { sign: 'aries', finish: 'pastel' },
        { sign: 'libra', finish: 'bronze' },
      ],
    }));
    const incomplete = render(h(AuraCollectionCabinet, {
      holdings: [{ sign: 'aries', finish: 'pastel' }],
    }));
    const complete = render(h(AuraCollectionCabinet, {
      holdings: AURA_SIGN_ORDER.map((sign) => ({ sign, finish: 'pastel' as const })),
    }));

    expect(earned).toContain('Completed arrangements');
    expect(earned).toContain('Aries · Libra Axis');
    expect(earned).not.toContain('Fire Triptych');
    expect(earned).not.toContain('progress');
    expect(earned).not.toContain('purchase');
    expect(incomplete).not.toContain('Completed arrangements');
    // The Complete Twelve is the case plate, not one plaque among fourteen.
    expect(complete).toContain('data-aura-cabinet-case-plate');
    expect(complete).not.toContain('data-aura-curatorial-set="complete-twelve"');
  });

  it('keeps material artwork disciplined, synchronized, and accessible', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/islands/aura/AuraCollectionCabinet.css'),
      'utf8',
    );
    const source = readFileSync(
      resolve(process.cwd(), 'src/islands/aura/AuraCollectionCabinet.tsx'),
      'utf8',
    );

    expect(css).toMatch(/grid-template-columns:\s*repeat\(6,/);
    expect(css).toContain('@media (max-width: 639px)');
    expect(css).toMatch(/grid-template-columns:\s*repeat\(3,/);
    expect(css).toMatch(/\.aura-collection-cabinet__niche\s*\{[^}]*aspect-ratio:\s*4 \/ 5;/s);
    expect(css).toMatch(/\.aura-collection-cabinet__object\s*\{[^}]*aspect-ratio:\s*1;/s);
    expect(css).toContain('.aura-collection-cabinet__edition-disc');
    expect(css).toContain('.aura-collection-cabinet__edition-seal');
    // The struck rims draw from the same metal ramps as the seal artwork.
    expect(css).toContain('--aura-cabinet-bronze-ring: conic-gradient(');
    expect(css).toContain('--aura-cabinet-silver-ring: conic-gradient(');
    expect(css).toContain('calc(var(--aura-cabinet-index) * 40ms)');
    expect(css).toContain('calc(var(--aura-cabinet-index) * 30ms)');
    expect(css).toContain('aura-cabinet-gold-light-pass');
    // The gold beat dims the rest of the room, one time, by light alone.
    expect(css).toMatch(/data-aura-cabinet-stage="gold"[^{]*:not\(\[data-aura-cabinet-finish="gold"\]\)/);
    expect(css).toMatch(/\.aura-collection-cabinet__strike-roundel\s*\{[^}]*opacity:\s*0;/s);
    expect(css).toContain('calc(var(--aura-strike-index) * 120ms)');
    expect(css).toContain('.aura-collection-cabinet__case-plate');
    expect(css).toContain('.aura-collection-cabinet__gilding');
    expect(css).toContain('aura-cabinet-gilding-pass');
    expect(css).toContain('aura-cabinet-gilding-sheen');
    // The gilding beat dims the room further than the gold beat did.
    expect(css).toMatch(/data-aura-cabinet-stage="gild"[^{]*:not\(\[data-aura-cabinet-edition="gilded"\]\)/);
    expect(css).toMatch(/\.aura-collection-cabinet__lineage\s*\{[^}]*repeat\(5,/s);
    expect(css).toContain('@media (hover: hover) and (pointer: fine)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).not.toContain('transition: all');
    // Museum labels never truncate the name of a work, and never whisper
    // below the legibility floor.
    expect(css).not.toContain('text-overflow: ellipsis');
    expect(css).not.toMatch(/font-size:\s*0\.[0-5]\d*rem/);
    expect(source).toContain("['pastel', 300]");
    expect(source).toContain("['bronze', 1_150]");
    expect(source).toContain("['silver', 1_900]");
    expect(source).toContain("['gold', 2_650]");
    expect(source).toContain("['strike', 3_500]");
    expect(source).toContain('REVEAL_SETTLE_MS = 4_100');
    // The gilding beat is additive: only cabinets that earned it wait longer.
    expect(source).toContain('GILD_BEAT_MS = 4_300');
    expect(source).toContain('GILD_SETTLE_MS = 5_500');
    expect(source).toContain('typeof IntersectionObserver');
    expect(source).toContain("document.addEventListener('visibilitychange'");
    // A visitor's click or keypress mid-reveal settles the case immediately.
    expect(source).toContain("cabinet.addEventListener('pointerdown', handleInterrupt)");
    expect(source).toContain("cabinet.addEventListener('keydown', handleInterrupt)");
    expect(source).toContain('ASSET_TIMEOUT_MS = 1_200');
    expect(source).toContain("if (finish === 'bronze' || finish === 'silver')");
    expect(source).toContain("return `/assets/cabinet-materials/gold/${sign}`");
    expect(source).not.toContain('`/assets/cabinet-materials/${finish}/${sign}`');
  });
});
