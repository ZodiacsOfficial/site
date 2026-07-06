/**
 * The proof strip: live sky facts, one quiet mono line.
 * Sun/Moon from the lite math; retrogrades + next lunation from the
 * build-time sky data — the ephemeris never loads here.
 */
import { useMemo } from 'preact/hooks';
import { formatLongitude, signForLongitude } from '../lib/signs';
import { moonLongitude, sunLongitude } from '../lib/engine/lite';
import sky from '../data/sky.json';

export default function SkyTicker() {
  const items = useMemo(() => {
    const now = new Date();
    const nowIso = now.toISOString();
    const out: string[] = [];

    out.push(`Sun ${formatLongitude(sunLongitude(now))}`);
    out.push(`Moon in ${signForLongitude(moonLongitude(now)).name}`);

    const active = (sky.retrogrades as { planet: string; from: string; to: string | null }[])
      .filter((r) => r.from <= nowIso && (r.to === null || r.to > nowIso))
      .map((r) => r.planet);
    out.push(active.includes('Mercury') ? 'Mercury retrograde' : 'Mercury direct');
    for (const planet of active) {
      if (planet !== 'Mercury') out.push(`${planet} retrograde`);
    }

    const nextMoon = (sky.moons as { type: string; at: string }[]).find((m) => m.at > nowIso);
    if (nextMoon) {
      const days = Math.round((new Date(nextMoon.at).getTime() - now.getTime()) / 86400_000);
      const label = nextMoon.type === 'full' ? 'Full moon' : 'New moon';
      out.push(days <= 0 ? `${label} tonight` : days === 1 ? `${label} tomorrow` : `${label} in ${days} days`);
    }

    return out;
  }, []);

  return (
    <p class="skyticker mono" aria-label="Current sky conditions, computed live">
      <span class="skyticker__label">Right now</span>
      {items.map((item, i) => (
        <span key={item}>
          {i > 0 && <span class="skyticker__sep" aria-hidden="true">·</span>}
          <span class="skyticker__item">{item}</span>
        </span>
      ))}
    </p>
  );
}
