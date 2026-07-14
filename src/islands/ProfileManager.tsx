/**
 * Saved charts — the local-first Astrofolio surface. Renders
 * saved charts from localStorage, supports rename/delete, and frames
 * the local-first sync model honestly.
 */
import { useEffect, useState } from 'preact/hooks';
import { deleteChart, renameChart } from '../lib/profile/store';
import { deletePair, loadPairs, pairSideLabels, prunePairs } from '../lib/profile/pairs';
import type { SavedPair } from '../lib/profile/pairs';
import type { SavedChart } from '../lib/profile/schema';
import { useProfile } from '../lib/hooks/useProfile';
import { signForLongitude, formatLongitude, signName } from '../lib/signs';
import { encodeChartLink } from '../lib/share';
import type { Session } from '@supabase/supabase-js';
import type * as Sync from '../lib/profile/sync';
import { localizePath, normalizeLocale, t, tf, type Locale, type UiKey } from '../lib/i18n';
import { formatDate, intlLocale } from '../lib/i18n/dates';

/** "Cancer Sun · 1907-07-06" → "Cancer Sun" for compact CTAs. */
const handle = (name: string) => name.split('·')[0].trim() || name;

// Module-local like the compatibility island's PAIR_COPY — only this
// page uses these two strings.
const PF_PAIR_COPY = {
  en: { savedPairs: 'Saved comparisons', pairRemoved: 'Comparison removed.' },
  es: { savedPairs: 'Comparaciones guardadas', pairRemoved: 'Comparación eliminada.' },
  pt: { savedPairs: 'Comparações salvas', pairRemoved: 'Comparação removida.' },
  fr: { savedPairs: 'Comparaisons enregistrées', pairRemoved: 'Comparaison supprimée.' },
} as const satisfies Record<Locale, Record<'savedPairs' | 'pairRemoved', string>>;
export const PF_BOOK_COPY = {
  en: {
    count: (n: number) => n === 1
      ? '1 chart saved.'
      : `${n} charts saved — yours and the people you read for.`,
    add: "Add someone's chart",
    privacy: 'Saved on this device. Nothing is uploaded unless you turn sync on.',
  },
  es: {
    count: (n: number) => n === 1
      ? '1 carta guardada.'
      : `${n} cartas guardadas: la tuya y las de las personas para quienes haces lecturas.`,
    add: 'Añade la carta de alguien',
    privacy: 'Guardado en este dispositivo. No se sube nada salvo que actives la sincronización.',
  },
  pt: {
    count: (n: number) => n === 1
      ? '1 mapa salvo.'
      : `${n} mapas salvos: o seu e os das pessoas para quem você faz leituras.`,
    add: 'Adicionar o mapa de alguém',
    privacy: 'Salvo neste dispositivo. Nada é enviado, a menos que você ative a sincronização.',
  },
  fr: {
    count: (n: number) => n === 1
      ? '1 thème enregistré.'
      : `${n} thèmes enregistrés : le tien et ceux que tu interprètes pour d’autres personnes.`,
    add: 'Ajouter le thème de quelqu’un',
    privacy: 'Enregistré sur cet appareil. Rien n’est envoyé tant que tu n’actives pas la synchronisation.',
  },
} as const;
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
  const { profile, ready: profileReady } = useProfile();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pairs, setPairs] = useState<SavedPair[]>([]);
  const [pairAnnounce, setPairAnnounce] = useState('');
  const [syncApi, setSyncApi] = useState<typeof Sync | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [syncState, setSyncState] = useState<'idle' | 'sending' | 'sent' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [digestOptIn, setDigestOptInState] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);

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
          setDigestOptInState(await api.getDigestOptIn());
          setSyncState('synced');
        });
      })
      .catch(() => {});
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setPairs(loadPairs());
    const onPairs = (e: Event) => setPairs((e as CustomEvent<SavedPair[]>).detail);
    window.addEventListener('zodiacs:pairs', onPairs);
    return () => window.removeEventListener('zodiacs:pairs', onPairs);
  }, []);

  // Same read-time cleanup the compatibility island does — this page is
  // where charts get deleted, so orphaned pairs heal right here. Never
  // pruned against an EMPTY chart list (a corrupt or version-skewed
  // profile read also looks empty).
  useEffect(() => {
    if (!profileReady || profile.charts.length === 0) return;
    prunePairs(new Set(profile.charts.map((c) => c.id)));
  }, [profileReady, profile]);

  const sideRestorable = (side: SavedPair['a']) =>
    side.kind === 'input' || profile.charts.some((c) => c.id === side.chartId);
  const visiblePairs = pairs.filter((pair) => sideRestorable(pair.a) && sideRestorable(pair.b));

  function onRemovePair(pair: SavedPair, index: number) {
    if (!deletePair(pair.id)) {
      setPairAnnounce(t(locale, 'chartSaveError'));
      return;
    }
    setPairAnnounce(PF_PAIR_COPY[locale].pairRemoved);
    requestAnimationFrame(() => {
      const chips = document.querySelectorAll<HTMLElement>('.pf-pairs .syn__pair-restore');
      const next = chips[Math.min(index, chips.length - 1)]
        ?? document.querySelector<HTMLElement>('.pf-foot .btn, .pf-empty .btn');
      next?.focus();
    });
  }

  const pairsBlock = visiblePairs.length > 0 && (
    <div class="syn__pairs pf-pairs">
      <span class="mono--label" id="pf-pairs-label">{PF_PAIR_COPY[locale].savedPairs}</span>
      <ul class="syn__pairs-list" role="list" aria-labelledby="pf-pairs-label">
        {visiblePairs.map((pair, index) => {
          const labels = pairSideLabels(pair, profile.charts);
          const spoken = new Intl.ListFormat(intlLocale(locale), {
            style: 'long', type: 'conjunction',
          }).format(labels);
          return (
            <li key={pair.id} class="syn__pair">
              <a
                class="syn__pair-restore"
                href={`${localizePath(locale, '/compatibility/')}?pair=${pair.id}`}
                aria-label={`${t(locale, 'compareCharts')}: ${spoken}`}
              >
                {labels.join(' × ')}
              </a>
              <button
                type="button" class="syn__pair-remove"
                aria-label={`${t(locale, 'remove')}: ${spoken}`}
                onClick={() => onRemovePair(pair, index)}
              >×</button>
            </li>
          );
        })}
      </ul>
    </div>
  );

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
        <p class="sr-only" role="status">{pairAnnounce}</p>
        {syncPanel}
        {/* Inline-side pairs need no saved charts — still show them. */}
        {pairsBlock}
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
      <p class="sr-only" role="status">{pairAnnounce}</p>
      {syncPanel}
      <p class="pf-count mono">
        {PF_BOOK_COPY[locale].count(profile.charts.length)}
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

      <p class="pf-privacy">{PF_BOOK_COPY[locale].privacy}</p>

      {pairsBlock}

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
        <a class="btn btn--ghost" href={localizePath(locale, '/birth-chart/')}><span>{PF_BOOK_COPY[locale].add}</span><span class="orb">+</span></a>
      </div>
    </div>
  );
}
