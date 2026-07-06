/**
 * Your cosmic profile — the local-first Astrofolio surface. Renders
 * saved charts from localStorage, supports rename/delete, and frames
 * the on-device model honestly. Accounts and sync are the Phase-2
 * upgrade this schema was designed for.
 */
import { useEffect, useState } from 'preact/hooks';
import { loadProfile, deleteChart, renameChart } from '../lib/profile/store';
import type { Profile, SavedChart } from '../lib/profile/schema';
import { signForLongitude, formatLongitude } from '../lib/signs';

/** "Cancer Sun · 1907-07-06" → "Cancer Sun" for compact CTAs. */
const handle = (name: string) => name.split('·')[0].trim() || name;

function ChipRow({ chart }: { chart: SavedChart }) {
  const find = (name: string) => chart.summary.bodies.find((b) => b.body === name);
  const entries: { label: string; lon: number | null }[] = [
    { label: 'Sun', lon: find('Sun')?.lon ?? null },
    { label: 'Moon', lon: find('Moon')?.lon ?? null },
    { label: 'Rising', lon: chart.summary.angles?.asc ?? null },
  ];
  return (
    <div class="pf-chart__three">
      {entries.map(({ label, lon }) => {
        if (lon === null) {
          return (
            <span class="pf-chip pf-chip--empty" key={label}>
              <span class="pf-chip__label">{label}</span> needs a time
            </span>
          );
        }
        const s = signForLongitude(lon);
        return (
          <a class="pf-chip" href={`/${s.slug}/`} style={`--sign:${s.hue}`} key={label} title={formatLongitude(lon)}>
            <picture class="pf-chip__icon">
              <source srcset={`/assets/zodiac-icons/48/${s.slug}.avif`} type="image/avif" />
              <img src={`/assets/zodiac-icons/48/${s.slug}.webp`} width="16" height="16" alt="" loading="lazy" decoding="async" />
            </picture>
            <span class="pf-chip__label">{label}</span> {s.name}
          </a>
        );
      })}
    </div>
  );
}

export default function ProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setProfile(loadProfile());
    const sync = () => setProfile(loadProfile());
    window.addEventListener('zodiacs:profile', sync);
    return () => window.removeEventListener('zodiacs:profile', sync);
  }, []);

  if (!profile) return <p class="pf-loading mono">Reading this device…</p>;

  if (profile.charts.length === 0) {
    return (
      <div class="pf-empty shell">
        <div class="core pf-empty__core">
          <h2>Nothing saved yet.</h2>
          <p>
            Charts you save will live here, on your device, not ours. Run a
            chart and tap <strong>Save this chart</strong> to start your
            cosmic profile.
          </p>
          <a class="btn btn--primary" href="/birth-chart/">
            <span>Get your free birth chart</span><span class="orb">↗</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="pf">
      <p class="pf-count mono">
        {profile.charts.length} saved {profile.charts.length === 1 ? 'chart' : 'charts'} · stored in this browser only
      </p>

      <div class="pf-list">
        {profile.charts.map((chart) => (
          <article class="pf-chart shell" key={chart.id}>
            <div class="core pf-chart__core">
              <header class="pf-chart__head">
                {editing === chart.id ? (
                  <form
                    class="pf-chart__rename"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (draft.trim()) renameChart(chart.id, draft.trim());
                      setEditing(null);
                    }}
                  >
                    <input
                      class="field__input"
                      value={draft}
                      onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
                      aria-label="Chart name"
                    />
                    <button class="pf-chart__action" type="submit">Save</button>
                  </form>
                ) : (
                  <h2>{chart.name}</h2>
                )}
                <div class="pf-chart__actions">
                  <button
                    class="pf-chart__action"
                    type="button"
                    onClick={() => { setEditing(chart.id); setDraft(chart.name); }}
                  >
                    Rename
                  </button>
                  <button
                    class="pf-chart__action pf-chart__action--danger"
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove “${chart.name}” from this device?`)) deleteChart(chart.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </header>

              <p class="pf-chart__birth mono">
                {chart.birth.date}
                {chart.birth.time ? ` · ${chart.birth.time}` : ' · time unknown'}
                {chart.birth.place ? ` · ${chart.birth.place.name}, ${chart.birth.place.country}` : ''}
              </p>

              <ChipRow chart={chart} />
            </div>
          </article>
        ))}
      </div>

      {profile.charts.length >= 2 && (
        <div class="pf-next shell tinted" style="--sign:var(--sign-libra)">
          <div class="core tinted pf-next__core">
            <strong>
              Compare {handle(profile.charts[0].name)} &amp; {handle(profile.charts[1].name)}
            </strong>
            <p>
              Two charts saved is a comparison waiting to happen: every
              cross-chart aspect, read honestly, computed on this device.
            </p>
            <a
              class="btn btn--primary pf-next__cta"
              href={`/compatibility/?a=${profile.charts[0].id}&b=${profile.charts[1].id}`}
            >
              <span>Compare these two charts</span><span class="orb">↗</span>
            </a>
          </div>
        </div>
      )}

      <div class="pf-foot">
        <a class="btn btn--ghost" href="/birth-chart/"><span>Add another chart</span><span class="orb">+</span></a>
      </div>
    </div>
  );
}
