import { signBySlug } from '../../lib/signs';
import type { AuraSign } from '../../lib/aura/types';

export interface ZodiacMedallionProps {
  sign: AuraSign;
  size?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * A consistent rim and crop for the canonical pastel zodiac discs.
 * The medallion is decorative whenever its adjacent copy names the sign.
 */
export function ZodiacMedallion({
  sign,
  size = 48,
  className,
  loading = 'lazy',
}: ZodiacMedallionProps) {
  const signData = signBySlug(sign);
  const classes = ['zodiac-medallion', className].filter(Boolean).join(' ');

  return (
    <span
      class={classes}
      style={`--zodiac-medallion-hue:${signData.hue};--zodiac-medallion-size:${size}px`}
      aria-hidden="true"
      data-zodiac-medallion={sign}
    >
      <picture class="zodiac-medallion__picture">
        <source
          srcset={`/assets/zodiac-icons/128/${sign}.avif`}
          type="image/avif"
        />
        <img
          src={`/assets/zodiac-icons/128/${sign}.webp`}
          width="128"
          height="128"
          alt=""
          loading={loading}
          decoding="async"
          draggable={false}
        />
      </picture>
    </span>
  );
}

export default ZodiacMedallion;
