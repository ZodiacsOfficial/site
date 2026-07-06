/** Small sign pill used inside result tables and synastry readouts. */
import { signForLongitude, signName } from '../lib/signs';
import { localizePath, normalizeLocale, type Locale } from '../lib/i18n';

export default function SignChip({ lon, locale: rawLocale = 'en' }: { lon: number; locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const s = signForLongitude(lon);
  return (
    <a class="chip" href={localizePath(locale, `/${s.slug}/`)} style={`--sign:${s.hue}`}>
      <picture class="chip__icon">
        <source srcset={`/assets/zodiac-icons/48/${s.slug}.avif`} type="image/avif" />
        <img src={`/assets/zodiac-icons/48/${s.slug}.webp`} width="18" height="18" alt="" loading="lazy" decoding="async" />
      </picture>
      {signName(s, locale)}
    </a>
  );
}
