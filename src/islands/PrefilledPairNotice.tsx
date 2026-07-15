import { useState } from 'preact/hooks';
import type { Locale } from '../lib/i18n';
import { SIGN_SLUGS, signBySlug, signName, type Sign } from '../lib/signs';

export const COMPATIBILITY_PREFILL_EN = {
    title: '{a} and {b} pairing loaded',
    help: 'This keeps the sun-sign context visible while you enter the two actual charts below. It does not invent birth details.',
    clear: 'Clear loaded sun-sign pairing',
} as const;

const COPY = {
  en: COMPATIBILITY_PREFILL_EN,
  es: {
    title: 'Pareja {a} y {b} cargada',
    help: 'Esto mantiene visible el contexto de signos solares mientras ingresas las dos cartas reales. No inventa datos de nacimiento.',
    clear: 'Borrar pareja de signos solares cargada',
  },
  pt: COMPATIBILITY_PREFILL_EN,
  fr: COMPATIBILITY_PREFILL_EN,
  it: COMPATIBILITY_PREFILL_EN,
} as const;

function initialPair(): { a: Sign; b: Sign } | null {
  const params = new URLSearchParams(window.location.search);
  const a = params.get('sign1');
  const b = params.get('sign2');
  return a && b && SIGN_SLUGS.includes(a) && SIGN_SLUGS.includes(b)
    ? { a: signBySlug(a), b: signBySlug(b) }
    : null;
}

export function PrefilledPairNotice({ locale }: { locale: Locale }) {
  const [pair, setPair] = useState(initialPair);
  if (!pair) return null;
  const copy = COPY[locale];
  const title = copy.title
    .replace('{a}', signName(pair.a, locale))
    .replace('{b}', signName(pair.b, locale));

  return (
    <aside class="syn__prefilled notice" data-prefilled-pair>
      <span class="syn__prefilled-icons" aria-hidden="true">
        <img src={`/assets/zodiac-icons/48/${pair.a.slug}.webp`} alt="" width="36" height="36" />
        <img src={`/assets/zodiac-icons/48/${pair.b.slug}.webp`} alt="" width="36" height="36" />
      </span>
      <span class="syn__prefilled-copy">
        <strong>{title}</strong>
        <span>{copy.help}</span>
      </span>
      <button
        type="button"
        class="place__clear"
        aria-label={copy.clear}
        onClick={() => {
          const params = new URLSearchParams(window.location.search);
          params.delete('sign1');
          params.delete('sign2');
          history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
          setPair(null);
          requestAnimationFrame(() => {
            const target = document.querySelector<HTMLElement>('#syn-a-source, #syn-a-name, #syn-a-date');
            target?.focus();
          });
        }}
      >×</button>
    </aside>
  );
}
