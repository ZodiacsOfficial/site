/**
 * The homepage signature asset: the twelve pastel icons in a slow
 * orbital ring around tonight's computed moon. Pure CSS orbit with
 * nested counter-rotation so icons stay upright; hover pauses; reduced
 * motion renders the static wheel. No ephemeris — lite math only.
 */
import { useMemo } from 'preact/hooks';
import { SIGNS, signForLongitude } from '../lib/signs';
import { moonIllumination, moonLongitude, moonPhaseAngle, moonPhaseName } from '../lib/engine/lite';

const DEG = Math.PI / 180;

/** SVG path for the lit portion of the moon at phase angle p (0=new, 180=full). */
function moonPath(p: number, r: number, cx: number, cy: number): string {
  const waxing = p <= 180;
  const cos = Math.cos(p * DEG);
  const rx = Math.abs(cos) * r;
  const top = `${cx} ${cy - r}`;
  const bottom = `${cx} ${cy + r}`;
  // Outer limb: right side while waxing, left while waning.
  const outer = `A ${r} ${r} 0 1 ${waxing ? 1 : 0} ${bottom}`;
  // Terminator ellipse bulges toward the lit side before the quarter,
  // away after it.
  const bulge = waxing ? (cos > 0 ? 0 : 1) : (cos > 0 ? 1 : 0);
  const terminator = `A ${rx} ${r} 0 1 ${bulge} ${top}`;
  return `M ${top} ${outer} ${terminator} Z`;
}

export default function ZodiacWheelHero() {
  const now = useMemo(() => new Date(), []);
  const phase = moonPhaseAngle(now);
  const illum = Math.round(moonIllumination(now) * 100);
  const phaseName = moonPhaseName(now);
  const moonSign = signForLongitude(moonLongitude(now));

  return (
    <div class="wheelhero" aria-label={`Tonight: ${phaseName}, moon in ${moonSign.name}`}>
      <div class="wheelhero__halo" aria-hidden="true"></div>

      <div class="wheelhero__ring" aria-hidden="true">
        {SIGNS.map((s, i) => (
          <div class="wheelhero__spoke" style={`--a:${i * 30}deg`} key={s.slug}>
            <div class="wheelhero__arm">
              <div class="wheelhero__counter" style={`--na:${-i * 30}deg`}>
                <a class="wheelhero__icon" href={`/${s.slug}/`} style={`--sign:${s.hue}`} tabIndex={-1} aria-hidden="true">
                  <picture>
                    <source srcset={`/assets/zodiac-icons/128/${s.slug}.avif`} type="image/avif" />
                    <img src={`/assets/zodiac-icons/128/${s.slug}.webp`} width="52" height="52" alt="" loading="eager" decoding="async" />
                  </picture>
                  <span class="wheelhero__tip">{s.name}</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div class="wheelhero__core">
        <svg viewBox="0 0 120 120" width="108" height="108" role="img" aria-label={`${phaseName}, ${illum}% illuminated`}>
          <circle cx="60" cy="60" r="34" fill="rgba(238,241,247,0.07)" stroke="rgba(238,241,247,0.18)" stroke-width="1" />
          <path d={moonPath(phase, 34, 60, 60)} fill="rgba(238,241,247,0.88)" />
        </svg>
        <span class="wheelhero__phase mono">{phaseName}</span>
        <span class="wheelhero__moonsign mono">Moon in {moonSign.name} · {illum}%</span>
      </div>
    </div>
  );
}
