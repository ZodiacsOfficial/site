/**
 * Saved charts — the local-first Astrofolio surface. Renders
 * saved charts from localStorage, supports rename/delete, and frames
 * the local-first sync model honestly.
 */
import { useEffect, useState } from 'preact/hooks';
import { EMPTY_PROFILE } from '../lib/profile/schema';
import { loadProfile, deleteChart, renameChart } from '../lib/profile/store';
import type { Profile, SavedChart } from '../lib/profile/schema';
import { signForLongitude, formatLongitude } from '../lib/signs';
import type { Session } from '@supabase/supabase-js';
import type * as Sync from '../lib/profile/sync';

/** "Cancer Sun · 1907-07-06" → "Cancer Sun" for compact CTAs. */
const handle = (name: string) => name.split('·')[0].trim() || name;
const HAS_PROFILE_SYNC = Boolean(
  import.meta.env.PUBLIC_SUPABASE_URL &&
  (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY)
);

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
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [syncApi, setSyncApi] = useState<typeof Sync | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [syncState, setSyncState] = useState<'idle' | 'sending' | 'sent' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    setProfile(loadProfile());
    const sync = () => setProfile(loadProfile());
    window.addEventListener('zodiacs:profile', sync);
    return () => window.removeEventListener('zodiacs:profile', sync);
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    if (!HAS_PROFILE_SYNC) return () => unsubscribe();
    import('../lib/profile/sync')
      .then(async (api) => {
        if (!api.isSupabaseConfigured()) return;
        setSyncApi(api);
        const current = await api.getSyncSession();
        setSession(current);
        if (current) {
          setSyncState('syncing');
          await api.syncNow();
          setProfile(loadProfile());
          setSyncState('synced');
        }
        unsubscribe = api.onSyncAuthChange(async (next) => {
          setSession(next);
          if (!next) return;
          setSyncState('syncing');
          await api.syncNow();
          setProfile(loadProfile());
          setSyncState('synced');
        });
      })
      .catch(() => {});
    return () => unsubscribe();
  }, []);

  async function onSendLink(e: Event) {
    e.preventDefault();
    if (!syncApi || !email.trim()) return;
    setSyncState('sending');
    setSyncMessage('');
    const result = await syncApi.sendMagicLink(email.trim());
    if (result.ok) {
      setSyncState('sent');
      setSyncMessage('Check your email for a sign-in link. This page will sync after you return.');
    } else {
      setSyncState('error');
      setSyncMessage(result.message);
    }
  }

  async function onSyncNow() {
    if (!syncApi) return;
    setSyncState('syncing');
    try {
      await syncApi.syncNow();
      setProfile(loadProfile());
      setSyncState('synced');
    } catch (err) {
      setSyncState('error');
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed. Please try again.');
    }
  }

  async function onSignOut() {
    if (!syncApi) return;
    await syncApi.signOutOfSync();
    setSession(null);
    setSyncState('idle');
  }

  const syncPanel = HAS_PROFILE_SYNC && (
    <aside class="pf-sync shell">
      <div class="core pf-sync__core">
        <div>
          <strong>{session ? 'Sync is on' : 'Keep charts on every device'}</strong>
          <p>
            {session
              ? `Signed in${session.user.email ? ` as ${session.user.email}` : ''}. Saved charts and removals sync across devices.`
              : 'Save charts on this device. Sign in when you want them on every device.'}
          </p>
          {syncMessage && <p class={`pf-sync__message pf-sync__message--${syncState}`}>{syncMessage}</p>}
        </div>
        {session ? (
          <div class="pf-sync__actions">
            <button class="pf-chart__action" type="button" onClick={onSyncNow} disabled={syncState === 'syncing'}>
              {syncState === 'syncing' ? 'Syncing…' : syncState === 'synced' ? 'Synced' : 'Sync now'}
            </button>
            <button class="pf-chart__action" type="button" onClick={onSignOut}>Sign out</button>
          </div>
        ) : (
          <form class="pf-sync__form" onSubmit={onSendLink}>
            <input
              class="field__input"
              type="email"
              inputMode="email"
              autocomplete="email"
              placeholder="you@example.com"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              aria-label="Email for profile sync"
              required
            />
            <button class="btn btn--primary" type="submit" disabled={!syncApi || syncState === 'sending'}>
              <span>{syncState === 'sending' ? 'Sending…' : 'Send sign-in link'}</span><span class="orb">↗</span>
            </button>
          </form>
        )}
      </div>
    </aside>
  );

  if (profile.charts.length === 0) {
    return (
      <div class="pf">
        {syncPanel}
        <div class="pf-empty shell">
          <div class="core pf-empty__core">
            <h2>Nothing saved yet.</h2>
            <p>
              Charts you save will live here, on your device first. Run a
              chart and tap <strong>Save this chart</strong> to start your
              saved charts.
            </p>
            <a class="btn btn--primary" href="/birth-chart/">
              <span>Get your free birth chart</span><span class="orb">↗</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="pf">
      {syncPanel}
      <p class="pf-count mono">
        {profile.charts.length} saved {profile.charts.length === 1 ? 'chart' : 'charts'} · {session ? 'synced when signed in' : 'stored in this browser'}
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
