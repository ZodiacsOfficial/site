/**
 * Saved charts — the local-first Astrofolio surface. Renders
 * saved charts from localStorage, supports rename/delete, and frames
 * the local-first sync model honestly.
 */
import { useEffect, useState } from 'preact/hooks';
import { EMPTY_PROFILE } from '../lib/profile/schema';
import { loadProfile, deleteChart, renameChart } from '../lib/profile/store';
import type { Profile, SavedChart } from '../lib/profile/schema';
import { signForLongitude, formatLongitude, signName } from '../lib/signs';
import { encodeChartLink } from '../lib/share';
import type { Session } from '@supabase/supabase-js';
import type * as Sync from '../lib/profile/sync';
import { localizePath, normalizeLocale, t, tf, type Locale, type UiKey } from '../lib/i18n';
import { formatDate } from '../lib/i18n/dates';

/** "Cancer Sun · 1907-07-06" → "Cancer Sun" for compact CTAs. */
const handle = (name: string) => name.split('·')[0].trim() || name;
const HAS_PROFILE_SYNC = Boolean(
  import.meta.env.PUBLIC_SUPABASE_URL &&
  (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY)
);

function ChipRow({ chart, locale }: { chart: SavedChart; locale: Locale }) {
  const find = (name: string) => chart.summary.bodies.find((b) => b.body === name);
  const entries: { label: UiKey; lon: number | null }[] = [
    { label: 'sun', lon: find('Sun')?.lon ?? null },
    { label: 'moon', lon: find('Moon')?.lon ?? null },
    { label: 'rising', lon: chart.summary.angles?.asc ?? null },
  ];
  return (
    <div class="pf-chart__three">
      {entries.map(({ label, lon }) => {
        if (lon === null) {
          return (
            <span class="pf-chip pf-chip--empty" key={label}>
              <span class="pf-chip__label">{t(locale, label)}</span> {t(locale, 'needsTime')}
            </span>
          );
        }
        const s = signForLongitude(lon);
        return (
          <a class="pf-chip" href={localizePath(locale, `/${s.slug}/`)} style={`--sign:${s.hue}`} key={label} title={formatLongitude(lon, locale)}>
            <picture class="pf-chip__icon">
              <source srcset={`/assets/zodiac-icons/48/${s.slug}.avif`} type="image/avif" />
              <img src={`/assets/zodiac-icons/48/${s.slug}.webp`} width="16" height="16" alt="" loading="lazy" decoding="async" />
            </picture>
            <span class="pf-chip__label">{t(locale, label)}</span> {signName(s, locale)}
          </a>
        );
      })}
    </div>
  );
}

export default function ProfileManager({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [syncApi, setSyncApi] = useState<typeof Sync | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [syncState, setSyncState] = useState<'idle' | 'sending' | 'sent' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [digestOptIn, setDigestOptInState] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);

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
          setDigestOptInState(await api.getDigestOptIn());
          setSyncState('synced');
        }
        unsubscribe = api.onSyncAuthChange(async (next) => {
          setSession(next);
          if (!next) {
            setDigestOptInState(false);
            return;
          }
          setSyncState('syncing');
          await api.syncNow();
          setProfile(loadProfile());
          setDigestOptInState(await api.getDigestOptIn());
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
      setSyncMessage(t(locale, 'checkEmail'));
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
      setSyncMessage(err instanceof Error ? err.message : t(locale, 'syncFailed'));
    }
  }

  async function onSignOut() {
    if (!syncApi) return;
    await syncApi.signOutOfSync();
    setSession(null);
    setDigestOptInState(false);
    setSyncState('idle');
  }

  async function onDigestChange(e: Event) {
    if (!syncApi || !session) return;
    const checked = (e.currentTarget as HTMLInputElement).checked;
    const previous = digestOptIn;
    setDigestOptInState(checked);
    setDigestBusy(true);
    setSyncMessage('');
    try {
      const saved = await syncApi.setDigestOptIn(checked);
      if (!saved) throw new Error(t(locale, 'digestFailed'));
      setSyncState('synced');
      setSyncMessage(t(locale, 'digestSaved'));
    } catch {
      setDigestOptInState(previous);
      setSyncState('error');
      setSyncMessage(t(locale, 'digestFailed'));
    } finally {
      setDigestBusy(false);
    }
  }

  const syncPanel = HAS_PROFILE_SYNC && (
    <aside class="pf-sync shell">
      <div class="core pf-sync__core">
        <div>
          <strong>{session ? t(locale, 'syncOn') : t(locale, 'keepEveryDevice')}</strong>
          <p>
            {session
              ? `${session.user.email ? tf(locale, 'signedInAs', { email: session.user.email }) : t(locale, 'signedIn')}. ${t(locale, 'syncCopyOn')}`
              : t(locale, 'syncCopyOff')}
          </p>
          {syncMessage && <p class={`pf-sync__message pf-sync__message--${syncState}`}>{syncMessage}</p>}
          {session && (
            <label class="pf-digest">
              <input
                type="checkbox"
                checked={digestOptIn}
                disabled={digestBusy}
                onChange={onDigestChange}
                aria-label={t(locale, 'weeklyDigestAria')}
              />
              <span>
                <strong>{t(locale, 'weeklyDigestTitle')}</strong>
                <small>{t(locale, 'weeklyDigestCopy')}</small>
              </span>
            </label>
          )}
        </div>
        {session ? (
          <div class="pf-sync__actions">
            <button class="pf-chart__action" type="button" onClick={onSyncNow} disabled={syncState === 'syncing'}>
              {syncState === 'syncing' ? t(locale, 'syncing') : syncState === 'synced' ? t(locale, 'synced') : t(locale, 'syncNow')}
            </button>
            <button class="pf-chart__action" type="button" onClick={onSignOut}>{t(locale, 'signOut')}</button>
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
              aria-label={t(locale, 'emailSyncAria')}
              required
            />
            <button class="btn btn--primary" type="submit" disabled={!syncApi || syncState === 'sending'}>
              <span>{syncState === 'sending' ? t(locale, 'sending') : t(locale, 'sendSignIn')}</span><span class="orb">↗</span>
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
            <h2>{t(locale, 'nothingSaved')}</h2>
            <p>
              {t(locale, 'emptyProfile')}
            </p>
            <a class="btn btn--primary" href={localizePath(locale, '/birth-chart/')}>
              <span>{t(locale, 'getBirthChart')}</span><span class="orb">↗</span>
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
        {profile.charts.length} {profile.charts.length === 1 ? t(locale, 'savedChartSingular') : t(locale, 'savedChartPlural')} · {session ? t(locale, 'syncedWhenSignedIn') : t(locale, 'storedBrowser')}
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
                      aria-label={t(locale, 'chartName')}
                    />
                    <button class="pf-chart__action" type="submit">{t(locale, 'save')}</button>
                  </form>
                ) : (
                  <h2>{chart.name}</h2>
                )}
                <div class="pf-chart__actions">
                  {chart.birth.place && (
                    <a
                      class="pf-chart__action"
                      href={`${localizePath(locale, '/birth-chart/')}#c=${encodeChartLink({
                        date: chart.birth.date,
                        time: chart.birth.time,
                        timeKnown: chart.birth.timeKnown,
                        lat: chart.birth.place.lat,
                        lon: chart.birth.place.lon,
                        tz: chart.birth.place.tz,
                        name: chart.name,
                        place: chart.birth.place.name,
                        houseSystem: chart.summary.houseSystem,
                      })}`}
                    >
                      {t(locale, 'openChart')}
                    </a>
                  )}
                  <button
                    class="pf-chart__action"
                    type="button"
                    onClick={() => { setEditing(chart.id); setDraft(chart.name); }}
                  >
                    {t(locale, 'rename')}
                  </button>
                  <button
                    class="pf-chart__action pf-chart__action--danger"
                    type="button"
                    onClick={() => {
                      if (confirm(tf(locale, 'removeChartConfirm', { name: chart.name }))) deleteChart(chart.id);
                    }}
                  >
                    {t(locale, 'remove')}
                  </button>
                </div>
              </header>

              <p class="pf-chart__birth mono">
                {formatDate(locale, `${chart.birth.date}T12:00:00Z`, {
                  year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
                })}
                {chart.birth.time ? ` · ${chart.birth.time}` : ` · ${t(locale, 'timeUnknown')}`}
                {chart.birth.place ? ` · ${chart.birth.place.name}, ${chart.birth.place.country}` : ''}
              </p>

              <ChipRow chart={chart} locale={locale} />
            </div>
          </article>
        ))}
      </div>

      {profile.charts.length >= 2 && (
        <div class="pf-next shell tinted" style="--sign:var(--sign-libra)">
          <div class="core tinted pf-next__core">
            <strong>
              {tf(locale, 'compareSavedHeading', {
                a: handle(profile.charts[0].name), b: handle(profile.charts[1].name),
              })}
            </strong>
            <p>
              {t(locale, 'compareSavedPitch')}
            </p>
            <a
              class="btn btn--primary pf-next__cta"
              href={`${localizePath(locale, '/compatibility/')}?a=${profile.charts[0].id}&b=${profile.charts[1].id}`}
            >
              <span>{t(locale, 'compareThese')}</span><span class="orb">↗</span>
            </a>
          </div>
        </div>
      )}

      <div class="pf-foot">
        <a class="btn btn--ghost" href={localizePath(locale, '/birth-chart/')}><span>{t(locale, 'addAnotherChart')}</span><span class="orb">+</span></a>
      </div>
    </div>
  );
}
