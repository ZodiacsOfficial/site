import { MARK_INK, MARK_VOID, settledSunSlug, type ChartMarkSource } from '../lib/chart-mark/common';
import { constellationGeometry } from '../lib/chart-mark/constellation';
import { isStorablePhoto, type AvatarKind } from '../lib/profile/avatar';

interface Props {
  source: ChartMarkSource | null;
  /** Rendered size in px. With `fluid`, the design size only; the box fills its parent. */
  size: number;
  avatar?: AvatarKind;
  /** A data: URL kept in this browser; drawn only when `avatar` is 'photo'. */
  photo?: string | null;
  /** Accessible name. Without one the picture is decorative. */
  label?: string;
  /** Fill the parent box instead of a fixed pixel size. */
  fluid?: boolean;
  /** Draw the constellation in once (planets, then aspects). Motion-safe. */
  reveal?: boolean;
  class?: string;
}

/** The constellation needs room; below this a mark shows the Sun sign's disc. */
export const CONSTELLATION_MIN_SIZE = 44;

/**
 * A person's picture on the site: their chart mark by default, their Sun
 * sign's disc, or a photo that lives only in this browser. A mark falls back
 * to a quiet ring when the chart cannot settle what it would show.
 */
export default function ChartMark({
  source, size, avatar = 'mark', photo = null, label, fluid = false, reveal = false, class: className = '',
}: Props) {
  const a11y = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': 'true' as const };
  const classes = `chart-mark ${fluid ? 'chart-mark--fluid ' : ''}${className}`.trim();
  const box = fluid ? undefined : `width:${size}px;height:${size}px`;
  const dimension = fluid ? '100%' : size;

  if (avatar === 'photo' && isStorablePhoto(photo)) {
    return (
      <span class={`${classes} chart-mark--photo`} style={box} {...a11y}>
        <img src={photo} width={size} height={size} alt="" decoding="async" />
      </span>
    );
  }

  // Below 80px the rim points and hairlines vanish, so a small constellation
  // drops the rim and draws larger planets and firmer lines.
  const small = size < 80;
  const constellation = avatar !== 'sign' && source && size >= CONSTELLATION_MIN_SIZE
    ? constellationGeometry(source, { dotScale: small ? 1.3 : 1 })
    : null;
  if (constellation) {
    const weight = small ? 1.5 : 1;
    return (
      <svg
        class={`${classes}${reveal ? ' chart-mark--reveal' : ''}`}
        viewBox="0 0 100 100"
        width={dimension}
        height={dimension}
        focusable="false"
        {...a11y}
      >
        <circle cx="50" cy="50" r="49.5" fill={MARK_VOID} />
        <circle cx="50" cy="50" r="49.5" fill={constellation.glow} fill-opacity="0.1" />
        <circle cx="50" cy="50" r="47.5" fill="none" stroke="rgba(198,204,218,0.2)" stroke-width="0.6" />
        {!small && (
          <>
            <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(198,204,218,0.07)" stroke-width="0.5" />
            {constellation.rim.map((dot, index) => (
              <circle key={index} cx={dot.x} cy={dot.y} r="1.15" fill={dot.fill} fill-opacity="0.75" />
            ))}
          </>
        )}
        <g class="chart-mark__lines">
          {constellation.lines.map((line) => (
            <line
              key={`${line.a}-${line.b}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={MARK_INK}
              stroke-opacity={line.tense ? 0.22 : 0.36}
              stroke-width={(line.tense ? 0.55 : 0.7) * weight}
              stroke-dasharray={line.tense ? '1.6 1.4' : undefined}
            />
          ))}
        </g>
        {constellation.dots.map((dot, index) => (
          <circle
            key={dot.body}
            class="chart-mark__planet"
            style={reveal ? `--i:${index}` : undefined}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            fill={dot.fill}
            stroke={dot.body === 'Sun' ? MARK_INK : undefined}
            stroke-width={dot.body === 'Sun' ? 0.9 : undefined}
          />
        ))}
        {constellation.asc && (
          <line {...constellation.asc} stroke={MARK_INK} stroke-opacity="0.72" stroke-width={weight} stroke-linecap="round" />
        )}
      </svg>
    );
  }

  const slug = settledSunSlug(source);
  if (slug) {
    const tier = size > 48 ? 128 : 48;
    return (
      <span class={`${classes} chart-mark--sign`} style={box} {...a11y}>
        <picture>
          <source srcset={`/assets/zodiac-icons/${tier}/${slug}.avif`} type="image/avif" />
          <img src={`/assets/zodiac-icons/${tier}/${slug}.webp`} width={size} height={size} alt="" decoding="async" />
        </picture>
      </span>
    );
  }

  return (
    <svg class={`${classes} chart-mark--empty`} viewBox="0 0 100 100" width={dimension} height={dimension} focusable="false" {...a11y}>
      <circle cx="50" cy="50" r="48.5" fill={MARK_VOID} stroke="rgba(198,204,218,0.34)" stroke-width="1.5" stroke-dasharray="3 3.2" />
    </svg>
  );
}
