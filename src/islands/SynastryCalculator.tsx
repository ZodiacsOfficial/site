/**
 * Two charts, compared. Saved charts flow straight from localStorage
 * summaries into the pure synastry math — the ephemeris never loads on
 * that path. Birth-detail entry (or a stale engine version) lazy-loads
 * the engine the same way the chart calculator does.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BirthFields } from './BirthFields';
import type { CopyLinkState } from './CopyLinkButton';
import SignChip from './SignChip';
import { resolveSavedChart } from '../lib/profile/resolve';
import { MAX_PAIRS, deletePair, hasPair, loadPairs, pairSideLabels, prunePairs, savePair } from '../lib/profile/pairs';
import type { SavedPair, SavedPairSide } from '../lib/profile/pairs';
import type { SavedChart } from '../lib/profile/schema';
import type { MinimalBody, PairSummary } from '../lib/engine/synastry';
import type { ShareChartInput } from '../lib/share';
import type { City } from '../lib/geo/search';
import { LOCALE_META, localizePath, normalizeLocale, t, tf, type Locale } from '../lib/i18n';
import { useEngine, type EngineLoader } from '../lib/hooks/useEngine';
import { useProfile } from '../lib/hooks/useProfile';

interface SlotState {
  source: 'saved' | 'form' | 'link';
  savedId: string;
  name: string;
  date: string;
  time: string;
  timeKnown: boolean;
  city: City | null;
  /** Chart carried by value — locked, clearable. `received` means it
   *  arrived in someone else's invite link (never re-shared); without it
   *  the side was restored from a saved comparison. */
  link: { input: ShareChartInput; label: string; received?: boolean } | null;
}

interface Person {
  label: string;
  bodies: MinimalBody[];
  asc: number | null;
  /** False when the birth time was unknown — the Moon is a noon estimate. */
  timeKnown: boolean;
  /** Ring-drawing extras (retrograde marks, MC, house cusps where known). */
  wheel: {
    bodies: { body: string; lon: number; retrograde?: boolean }[];
    mc: number | null;
    cusps: number[] | null;
  };
}

type WheelModule = typeof import('./synastry/RelationshipWheel');
type CopyLinkModule = typeof import('./CopyLinkButton');
type ShareModule = typeof import('../lib/share');
type CompatibilityShareModule = typeof import('./CompatibilityShareControl');
type PrefilledPairModule = typeof import('./PrefilledPairNotice');

const emptySlot = (): SlotState => ({
  source: 'form', savedId: '', name: '', date: '', time: '', timeKnown: true, city: null, link: null,
});

// Saved-comparison strings stay module-local (the RelationshipWheel COPY
// precedent): only this island uses them, and the central UI dictionary
// rides in every island page's closure — the flagship shouldn't pay for
// compatibility-only chrome.
const PAIR_COPY_EN = {
  savedPairs: 'Saved comparisons',
  useMyChart: 'Use my chart — {handle}',
  dismissMyChart: 'Dismiss saved-chart suggestion',
  savePair: 'Save this comparison',
  pairSaved: 'Comparison saved on this device.',
  pairExists: 'Already saved.',
  pairSaveFull: 'You can save up to {n} comparisons — remove one first.',
  pairRemoved: 'Comparison removed.',
  savedComparisonSide: 'from a saved comparison',
  restoredSideHelp: 'This side came from a saved comparison — clear it to enter someone else.',
} as const;

const PAIR_COPY = {
  en: PAIR_COPY_EN,
  es: {
    savedPairs: 'Comparaciones guardadas',
    useMyChart: 'Usar mi carta — {handle}',
    dismissMyChart: 'Descartar sugerencia de carta guardada',
    savePair: 'Guardar esta comparación',
    pairSaved: 'Comparación guardada en este dispositivo.',
    pairExists: 'Ya está guardada.',
    pairSaveFull: 'Puedes guardar hasta {n} comparaciones — elimina una primero.',
    pairRemoved: 'Comparación eliminada.',
    savedComparisonSide: 'de una comparación guardada',
    restoredSideHelp: 'Este lado viene de una comparación guardada — bórralo para ingresar los datos de otra persona.',
  },
  pt: {
    savedPairs: 'Comparações salvas',
    useMyChart: 'Usar meu mapa — {handle}',
    dismissMyChart: 'Dispensar sugestão de mapa salvo',
    savePair: 'Salvar esta comparação',
    pairSaved: 'Comparação salva neste dispositivo.',
    pairExists: 'Já está salva.',
    pairSaveFull: 'Você pode salvar até {n} comparações — remova uma primeiro.',
    pairRemoved: 'Comparação removida.',
    savedComparisonSide: 'de uma comparação salva',
    restoredSideHelp: 'Este lado veio de uma comparação salva — limpe-o para inserir os dados de outra pessoa.',
  },
  fr: {
    savedPairs: 'Comparaisons enregistrées',
    useMyChart: 'Utiliser mon thème — {handle}',
    dismissMyChart: 'Fermer la suggestion de thème enregistré',
    savePair: 'Enregistrer cette comparaison',
    pairSaved: 'Comparaison enregistrée sur cet appareil.',
    pairExists: 'Déjà enregistrée.',
    pairSaveFull: 'Tu peux enregistrer jusqu’à {n} comparaisons — supprime-en une d’abord.',
    pairRemoved: 'Comparaison supprimée.',
    savedComparisonSide: 'd’une comparaison enregistrée',
    restoredSideHelp: 'Ce côté provient d’une comparaison enregistrée — efface-le pour saisir les données d’une autre personne.',
  },
  it: {
    savedPairs: 'Confronti salvati',
    useMyChart: 'Usa il mio tema — {handle}',
    dismissMyChart: 'Chiudi il suggerimento del tema salvato',
    savePair: 'Salva questo confronto',
    pairSaved: 'Confronto salvato su questo dispositivo.',
    pairExists: 'Già salvato.',
    pairSaveFull: 'Puoi salvare fino a {n} confronti — prima rimuovine uno.',
    pairRemoved: 'Confronto rimosso.',
    savedComparisonSide: 'da un confronto salvato',
    restoredSideHelp: 'Questo lato proviene da un confronto salvato — cancellalo per inserire i dati di un’altra persona.',
  },
} as const satisfies Record<Locale, Record<keyof typeof PAIR_COPY_EN, string>>;

const pc = (locale: Locale, key: keyof typeof PAIR_COPY_EN) => PAIR_COPY[locale][key];
const pcf = (locale: Locale, key: keyof typeof PAIR_COPY_EN, values: Record<string, string | number>) =>
  pc(locale, key).replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
const listLocale = (locale: Locale) => LOCALE_META[locale].intlLocale;

/** Short handle for sentences: chart names like "Cancer Sun · 1990-02-01" trim to "Cancer Sun". */
const handleOf = (name: string) => name.split('·')[0].trim() || name;

async function resolveSaved(chart: SavedChart, loadEngine: EngineLoader): Promise<Person> {
  const resolved = await resolveSavedChart(chart, loadEngine);
  // Retrograde marks come from the stored summary (best effort — a stale
  // summary's flags may lag a recompute by a hair; cosmetic only).
  const retro = new Map(chart.summary.bodies.map((b) => [b.body, b.retrograde]));
  return {
    label: handleOf(chart.name),
    bodies: resolved.bodies,
    asc: resolved.asc,
    timeKnown: resolved.timeKnown,
    wheel: {
      bodies: resolved.bodies.map(({ body, lon }) => ({ body, lon, retrograde: retro.get(body) })),
      mc: chart.summary.angles?.mc ?? null,
      cusps: null,
    },
  };
}

async function resolveLink(link: { input: ShareChartInput; label: string }, loadEngine: EngineLoader): Promise<Person> {
  const [engine, { resolveLocalToUtc }] = await Promise.all([
    loadEngine(),
    import('../lib/time/localToUtc'),
  ]);
  const { input } = link;
  const resolved = resolveLocalToUtc(
    input.date,
    input.timeKnown && input.time ? input.time : '12:00',
    input.tz,
  );
  const result = engine.computeChart({
    utc: resolved.utc,
    latitude: input.lat,
    longitude: input.lon,
    houseSystem: 'whole',
    timeKnown: input.timeKnown,
    flags: resolved.flags,
  });
  return {
    label: link.label,
    bodies: result.bodies.map(({ body, lon }) => ({ body, lon })),
    asc: result.angles?.asc ?? null,
    timeKnown: input.timeKnown,
    wheel: {
      bodies: result.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
      mc: result.angles?.mc ?? null,
      cusps: input.timeKnown ? (result.houses?.cusps ?? null) : null,
    },
  };
}

async function resolveForm(slot: SlotState, fallbackLabel: string, loadEngine: EngineLoader): Promise<Person> {
  const [engine, { resolveLocalToUtc }] = await Promise.all([
    loadEngine(),
    import('../lib/time/localToUtc'),
  ]);
  const timeKnown = slot.timeKnown && slot.time !== '';
  const resolved = resolveLocalToUtc(slot.date, timeKnown ? slot.time : '12:00', slot.city!.tz);
  const result = engine.computeChart({
    utc: resolved.utc,
    latitude: slot.city!.lat,
    longitude: slot.city!.lon,
    houseSystem: 'whole',
    timeKnown,
    flags: resolved.flags,
  });
  return {
    label: slot.name.trim() || fallbackLabel,
    bodies: result.bodies.map(({ body, lon }) => ({ body, lon })),
    asc: result.angles?.asc ?? null,
    timeKnown,
    wheel: {
      bodies: result.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
      mc: result.angles?.mc ?? null,
      cusps: timeKnown ? (result.houses?.cusps ?? null) : null,
    },
  };
}

function SlotForm({
  slot, setSlot, charts, idPrefix, fallbackLabel, locale, loadEngine, quickFill,
}: {
  slot: SlotState;
  setSlot: (updater: (s: SlotState) => SlotState) => void;
  charts: SavedChart[];
  idPrefix: string;
  fallbackLabel: string;
  locale: Locale;
  loadEngine: EngineLoader;
  quickFill?: {
    label: string;
    dismissLabel: string;
    onUse: () => void;
    onDismiss: () => void;
  };
}) {
  if (slot.source === 'link' && slot.link) {
    const received = slot.link.received === true;
    return (
      <div class="syn__slot">
        <span class="mono--label">{fallbackLabel}</span>
        <div class="field">
          <label class="field__label" for={`${idPrefix}-linked`}>{t(locale, 'chart')}</label>
          <span class="place__chip">
            <input
              id={`${idPrefix}-linked`} class="place__chip-value" type="text" readOnly
              value={`${slot.link.label} · ${received ? t(locale, 'sharedWithYou') : pc(locale, 'savedComparisonSide')}`}
            />
            <button
              type="button" class="place__clear" aria-label={t(locale, 'removeSharedChart')}
              onClick={() => setSlot(() => emptySlot())}
            >×</button>
          </span>
          <p class="field__help">{received ? t(locale, 'sharedSideHelp') : pc(locale, 'restoredSideHelp')}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="syn__slot">
      {quickFill && (
        <div class="syn__quick-fill">
          <button type="button" class="syn__quick-use" onClick={quickFill.onUse}>
            {quickFill.label}
          </button>
          <button
            type="button"
            class="syn__quick-dismiss"
            aria-label={quickFill.dismissLabel}
            onClick={quickFill.onDismiss}
          >×</button>
        </div>
      )}
      <span class="mono--label">{fallbackLabel}</span>

      {charts.length > 0 && (
        <div class="field">
          <label class="field__label" for={`${idPrefix}-source`}>{t(locale, 'chart')}</label>
          <select
            id={`${idPrefix}-source`} class="field__input"
            value={slot.source === 'saved' ? slot.savedId : ''}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              setSlot((s) => (v === ''
                ? { ...s, source: 'form', savedId: '' }
                : { ...s, source: 'saved', savedId: v }));
            }}
          >
            <option value="">{t(locale, 'enterBirthDetails')}</option>
            {charts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {slot.source === 'form' && (
        <>
          <div class="field">
            <label class="field__label" for={`${idPrefix}-name`}>{t(locale, 'name')} <span class="field__optional">{t(locale, 'optional')}</span></label>
            <input
              id={`${idPrefix}-name`} class="field__input" type="text" maxLength={24}
              placeholder={fallbackLabel} value={slot.name}
              onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSlot((s) => ({ ...s, name: v })); }}
            />
          </div>
          <BirthFields
            locale={locale}
            dateId={`${idPrefix}-date`}
            timeId={`${idPrefix}-time`}
            placeId={`${idPrefix}-place`}
            date={slot.date}
            time={slot.time}
            timeKnown={slot.timeKnown}
            city={slot.city}
            onDateChange={(date) => setSlot((s) => ({ ...s, date }))}
            onTimeChange={(time) => setSlot((s) => ({ ...s, time }))}
            onTimeKnownChange={(timeKnown) => setSlot((s) => ({ ...s, timeKnown }))}
            onCityChange={(city) => setSlot((s) => ({ ...s, city }))}
            onWarm={loadEngine}
          />
        </>
      )}
    </div>
  );
}

function PersonCard({ person, locale }: { person: Person; locale: Locale }) {
  const find = (name: string) => person.bodies.find((b) => b.body === name);
  const sun = find('Sun');
  const moon = find('Moon');
  return (
    <div class="syn__person">
      <strong>{person.label}</strong>
      <div class="syn__three">
        {sun && <span class="syn__placement"><span class="mono--label">{t(locale, 'sun')}</span> <SignChip lon={sun.lon} locale={locale} /></span>}
        {moon && <span class="syn__placement"><span class="mono--label">{t(locale, 'moon')}</span> <SignChip lon={moon.lon} locale={locale} /></span>}
        {person.asc !== null && <span class="syn__placement"><span class="mono--label">{t(locale, 'rising')}</span> <SignChip lon={person.asc} locale={locale} /></span>}
      </div>
    </div>
  );
}

export default function SynastryCalculator({ locale: rawLocale = 'en' }: { locale?: Locale }) {
  const locale = normalizeLocale(rawLocale);
  const loadEngine = useEngine();
  const { profile, ready: profileReady } = useProfile();
  const [slotA, setSlotA] = useState<SlotState>(emptySlot());
  const [slotB, setSlotB] = useState<SlotState>(emptySlot());
  const [result, setResult] = useState<{
    a: Person; b: Person; summary: PairSummary; at: number;
    sides: [SavedPairSide | null, SavedPairSide | null];
  } | null>(null);
  const [wheelMod, setWheelMod] = useState<WheelModule | null>(null);
  const [copyLinkMod, setCopyLinkMod] = useState<CopyLinkModule | null>(null);
  const [shareMod, setShareMod] = useState<ShareModule | null>(null);
  const [compatShareMod, setCompatShareMod] = useState<CompatibilityShareModule | null>(null);
  const [prefilledPairMod, setPrefilledPairMod] = useState<PrefilledPairModule | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [autoRan, setAutoRan] = useState(false);
  const [invite, setInvite] = useState<ShareChartInput | null>(null);
  const [inviteState, setInviteState] = useState<CopyLinkState>('idle');
  const [pairs, setPairs] = useState<SavedPair[]>([]);
  const [pairSave, setPairSave] = useState<'idle' | 'saved' | 'exists' | 'full' | 'error'>('idle');
  const [pairAnnounce, setPairAnnounce] = useState('');
  const [restoreTick, setRestoreTick] = useState(0);
  const [quickFillDismissed, setQuickFillDismissed] = useState(false);
  const compareInFlightRef = useRef(false);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusAfterComputeRef = useRef(false);
  const profileLinksReadRef = useRef(false);

  // Result-only actions stay outside the entry form's initial closure.
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    if (!copyLinkMod || !shareMod) {
      void Promise.all([
        import('./CopyLinkButton'),
        import('../lib/share'),
      ]).then(([copyModule, shareModule]) => {
        if (!cancelled) {
          setCopyLinkMod(copyModule);
          setShareMod(shareModule);
        }
      }).catch(() => {});
    }
    if (!compatShareMod) {
      void import('./CompatibilityShareControl').then((module) => {
        if (!cancelled) setCompatShareMod(module);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [result, copyLinkMod, shareMod, compatShareMod]);

  useEffect(() => {
    if (!profileReady || profileLinksReadRef.current) return;
    profileLinksReadRef.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.has('sign1') || params.has('sign2')) {
      void import('./PrefilledPairNotice').then(setPrefilledPairMod, () => {});
    }
    // ?pair= deep link (the profile page's saved-comparisons strip):
    // restore the stored pair and compare. Same-device ids, like ?a=&b=.
    const pairId = params.get('pair');
    const storedPair = pairId ? loadPairs().find((p) => p.id === pairId) : undefined;
    if (storedPair && sideRestorable(storedPair.a) && sideRestorable(storedPair.b)) {
      restorePair(storedPair);
    } else {
      // ?a=&b= deep link: preselect saved charts by their device-local ids.
      const idA = params.get('a');
      const idB = params.get('b');
      let linked = 0;
      if (idA && profile.charts.some((c) => c.id === idA)) {
        setSlotA((s) => ({ ...s, source: 'saved', savedId: idA }));
        linked += 1;
      }
      if (idB && profile.charts.some((c) => c.id === idB)) {
        setSlotB((s) => ({ ...s, source: 'saved', savedId: idB }));
        linked += 1;
      }
      if (linked === 2) setAutoRan(true);
    }
    // #a= fragment: a chart shared from another device rides in the URL
    // itself. It fills Person A; the fragment is then stripped so the
    // birth details don't linger in the bar.
    const token = new URLSearchParams(window.location.hash.slice(1)).get('a');
    if (token) {
      void import('../lib/share').then((module) => {
        setShareMod(module);
        const decoded = module.decodeChartLink(token);
        if (!decoded) return;
        setSlotA({
          ...emptySlot(),
          source: 'link',
          link: { input: decoded, label: decoded.name ?? t(locale, 'sharedChart'), received: true },
        });
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }).catch(() => {});
    }
  }, [profileReady, profile, locale]);

  // Saved comparisons live beside the profile; every same-page write
  // (save, remove, prune) re-arrives through the zodiacs:pairs event so
  // one listener keeps the strip current.
  useEffect(() => {
    setPairs(loadPairs());
    const onPairs = (e: Event) => setPairs((e as CustomEvent<SavedPair[]>).detail);
    window.addEventListener('zodiacs:pairs', onPairs);
    return () => window.removeEventListener('zodiacs:pairs', onPairs);
  }, []);

  // Pairs are only read here, so this is where orphans get cleaned up:
  // once the chart list is live, drop pairs whose saved chart is gone
  // (deleted on /profile/, or removed by a remote sync merge). A no-op
  // prune writes and dispatches nothing. An EMPTY chart list is never
  // pruned against — `ready` means "load attempted", and a corrupt or
  // version-skewed profile key also reads as empty; orphans there stay
  // hidden by the render filter instead of being destroyed.
  useEffect(() => {
    if (!profileReady || profile.charts.length === 0) return;
    prunePairs(new Set(profile.charts.map((c) => c.id)));
  }, [profileReady, profile]);

  // The save state describes a stored pair; keep it honest when the
  // store changes underneath it (the just-saved pair removed → the
  // button must offer saving again; a slot freed → the full alert is
  // stale).
  useEffect(() => {
    if (pairSave === 'idle' || pairSave === 'error') return;
    if (pairSave === 'full') {
      if (pairs.length < MAX_PAIRS) setPairSave('idle');
      return;
    }
    const [a, b] = result?.sides ?? [null, null];
    if (a && b && !hasPair(pairs, a, b)) setPairSave('idle');
  }, [pairs]);

  const charts = profile.charts;
  const latestChart = useMemo(
    () => charts.reduce<SavedChart | null>((latest, chart) => (
      !latest || chart.updatedAt > latest.updatedAt ? chart : latest
    ), null),
    [charts],
  );
  const slotAIsUntouched = slotA.source === 'form'
    && slotA.name === '' && slotA.date === '' && slotA.time === ''
    && slotA.timeKnown && slotA.city === null && slotA.link === null;
  const showQuickFill = profileReady && latestChart !== null
    && slotAIsUntouched && !quickFillDismissed;
  const CopyLinkButton = copyLinkMod?.CopyLinkButton;

  const slotReady = (slot: SlotState) =>
    slot.source === 'saved' ? charts.some((c) => c.id === slot.savedId)
      : slot.source === 'link' ? slot.link !== null
      : slot.date !== '' && slot.city !== null;

  const sameSaved =
    slotA.source === 'saved' && slotB.source === 'saved'
    && slotA.savedId !== '' && slotA.savedId === slotB.savedId;

  const canCompare = slotReady(slotA) && slotReady(slotB) && !sameSaved && !busy;

  // Only the inviter's own side rides in an invite link — a chart that
  // itself arrived by link is someone else's data and never re-shared.
  // A side restored from a saved comparison is this device's own data.
  function inviteFromSlot(slot: SlotState): ShareChartInput | null {
    if (slot.source === 'link') {
      return slot.link && slot.link.received !== true ? slot.link.input : null;
    }
    if (slot.source === 'saved') {
      const c = charts.find((x) => x.id === slot.savedId);
      if (!c || !c.birth.place) return null;
      return {
        date: c.birth.date,
        time: c.birth.time,
        timeKnown: c.birth.timeKnown,
        lat: c.birth.place.lat,
        lon: c.birth.place.lon,
        tz: c.birth.place.tz,
        name: handleOf(c.name),
        place: c.birth.place.name,
        houseSystem: 'whole',
      };
    }
    if (slot.date === '' || slot.city === null) return null;
    const timeKnown = slot.timeKnown && slot.time !== '';
    return {
      date: slot.date,
      time: timeKnown ? slot.time : null,
      timeKnown,
      lat: slot.city.lat,
      lon: slot.city.lon,
      tz: slot.city.tz,
      name: slot.name.trim() || undefined,
      place: slot.city.name,
      houseSystem: 'whole',
    };
  }

  const inviteUrl = () =>
    `${window.location.origin}${localizePath(locale, '/compatibility/')}#a=${shareMod!.encodeChartLink(invite!)}`;

  const track = (name: string, props: Record<string, string> = {}) => {
    (window as unknown as {
      zodiacsAnalytics?: { track?: (n: string, p: Record<string, string>) => void };
    }).zodiacsAnalytics?.track?.(name, props);
  };

  /** Snapshot one slot as a storable pair side — a saved chart by
   *  reference (renames flow through), everything else by value. */
  function sideFromSlot(slot: SlotState, label: string): SavedPairSide | null {
    if (slot.source === 'saved') {
      const c = charts.find((x) => x.id === slot.savedId);
      if (!c) return null;
      // The birth key lets this person dedupe against a by-value save of
      // the same birth data (e.g. they first arrived in an invite link).
      const birthKey = c.birth.place
        ? `${c.birth.date}|${c.birth.time ?? ''}|${c.birth.place.lat}|${c.birth.place.lon}`
        : undefined;
      return { kind: 'chart', chartId: c.id, label, ...(birthKey ? { birthKey } : {}) };
    }
    if (slot.source === 'link') {
      return slot.link
        ? { kind: 'input', input: slot.link.input, label, ...(slot.link.received ? { received: true } : {}) }
        : null;
    }
    if (slot.date === '' || slot.city === null) return null;
    const timeKnown = slot.timeKnown && slot.time !== '';
    return {
      kind: 'input',
      input: {
        date: slot.date,
        time: timeKnown ? slot.time : null,
        timeKnown,
        lat: slot.city.lat,
        lon: slot.city.lon,
        tz: slot.city.tz,
        name: slot.name.trim() || undefined,
        place: slot.city.name,
        houseSystem: 'whole',
      },
      label,
    };
  }

  function onSavePair() {
    if (!result || !result.sides[0] || !result.sides[1]) return;
    const outcome = savePair({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      a: result.sides[0],
      b: result.sides[1],
    });
    setPairSave(outcome);
    if (outcome === 'saved' || outcome === 'exists') {
      setPairAnnounce(pc(locale, outcome === 'saved' ? 'pairSaved' : 'pairExists'));
    }
    if (outcome === 'saved') track('chart_saved', { source: 'pair' });
  }

  function onRemovePair(pair: SavedPair, index: number) {
    if (!deletePair(pair.id)) {
      setPairAnnounce(t(locale, 'chartSaveError'));
      return;
    }
    setPairAnnounce(pc(locale, 'pairRemoved'));
    // The button under the pointer/cursor just unmounted — hand focus to
    // the nearest surviving chip, else back into the form.
    requestAnimationFrame(() => {
      const chips = document.querySelectorAll<HTMLElement>('.syn__pair-restore');
      const next = chips[Math.min(index, chips.length - 1)]
        ?? document.getElementById('syn-a-source')
        ?? document.getElementById('syn-a-name');
      next?.focus();
    });
  }

  function restorePair(pair: SavedPair) {
    const toSlot = (side: SavedPairSide): SlotState => (side.kind === 'chart'
      ? { ...emptySlot(), source: 'saved', savedId: side.chartId }
      : {
        ...emptySlot(),
        source: 'link',
        link: { input: side.input, label: side.label, received: side.received },
      });
    setSlotA(toSlot(pair.a));
    setSlotB(toSlot(pair.b));
    setRestoreTick((n) => n + 1);
  }

  // A pair is only offered when both sides can still resolve — a chart
  // side whose saved chart is gone (mid-sync) would just error.
  const sideRestorable = (side: SavedPairSide) =>
    side.kind === 'input' || charts.some((c) => c.id === side.chartId);
  const visiblePairs = pairs.filter((pair) => sideRestorable(pair.a) && sideRestorable(pair.b));
  const pairName = (pair: SavedPair) => pairSideLabels(pair, charts).join(' × ');
  // Accessible names spell the glyph out: "Frida and Diego", not
  // "Frida multiplication sign Diego".
  const pairSpokenName = (pair: SavedPair) => new Intl.ListFormat(listLocale(locale), {
    style: 'long', type: 'conjunction',
  }).format(pairSideLabels(pair, charts));

  async function compare(e?: Event) {
    e?.preventDefault();
    // Ref, not state: two effects in one commit share the same stale
    // `busy` closure, so state can't gate re-entry.
    if (compareInFlightRef.current) return;
    if (!slotReady(slotA) || !slotReady(slotB) || sameSaved) return;
    compareInFlightRef.current = true;
    focusAfterComputeRef.current = e !== undefined;
    setBusy(true);
    setError('');
    try {
      const resolve = (slot: SlotState, fallback: string) =>
        slot.source === 'saved' ? resolveSaved(charts.find((c) => c.id === slot.savedId)!, loadEngine)
          : slot.source === 'link' ? resolveLink(slot.link!, loadEngine)
          : resolveForm(slot, fallback, loadEngine);
      const [a, b, mod, { summarizePair }] = await Promise.all([
        resolve(slotA, t(locale, 'personA')),
        resolve(slotB, t(locale, 'personB')),
        wheelMod ? Promise.resolve(wheelMod) : import('./synastry/RelationshipWheel'),
        import('../lib/engine/synastry'),
      ]);
      const summary = summarizePair(a.bodies, b.bodies, 8);
      setWheelMod(mod);
      setResult({
        a, b, summary, at: Date.now(),
        sides: [sideFromSlot(slotA, a.label), sideFromSlot(slotB, b.label)],
      });
      setInvite(inviteFromSlot(slotA));
      setInviteState('idle');
      setPairSave('idle');
      setPairAnnounce(''); // same-text re-announcements need a mutation
      track('compat_computed', {
        source: slotA.source === 'form' && slotB.source === 'form' ? 'form' : 'restored',
      });
    } catch (err) {
      setError(t(locale, 'compareError'));
      console.error(err);
    } finally {
      compareInFlightRef.current = false;
      setBusy(false);
    }
  }

  // Deep-linked pairs run themselves — the saved path is pure math.
  useEffect(() => {
    if (autoRan && slotReady(slotA) && slotReady(slotB) && !result && !busy) {
      compare();
    }
  }, [autoRan, profile, slotA, slotB]);

  // A restored comparison compares itself once the slots have settled.
  // The synthetic event marks the compute user-initiated, so focus moves
  // to the result like any pressed Compare. The tick is consumed on the
  // first non-busy evaluation whether or not it fires — a restore whose
  // slots were edited away must not ambush a later hand-filled form.
  useEffect(() => {
    if (restoreTick === 0 || busy) return;
    setRestoreTick(0);
    if (slotReady(slotA) && slotReady(slotB)) {
      compare(new Event('zodiacs:restore'));
    }
  }, [restoreTick, slotA, slotB, busy]);

  useEffect(() => {
    if (busy || !focusAfterComputeRef.current) return;
    if (error) {
      errorRef.current?.focus();
      focusAfterComputeRef.current = false;
      return;
    }
    if (result) {
      resultHeadingRef.current?.focus();
      focusAfterComputeRef.current = false;
    }
  }, [busy, error, result]);

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={compare} aria-busy={busy}>
        <div class="core calc__core">
          {/* Always mounted: role=status nodes inserted together with
              their text are routinely missed by VoiceOver — the region
              must pre-exist (the ChartCalculator announcer pattern). */}
          <p class="sr-only" role="status">{pairAnnounce}</p>
          {visiblePairs.length > 0 && (
            <div class="syn__pairs">
              <span class="mono--label" id="syn-pairs-label">{pc(locale, 'savedPairs')}</span>
              {/* Explicit role: list-style:none strips list semantics in
                  Safari/VoiceOver. */}
              <ul class="syn__pairs-list" role="list" aria-labelledby="syn-pairs-label">
                {visiblePairs.map((pair, index) => {
                  const spoken = pairSpokenName(pair);
                  return (
                    <li key={pair.id} class="syn__pair">
                      <button
                        type="button" class="syn__pair-restore"
                        aria-label={`${t(locale, 'compareCharts')}: ${spoken}`}
                        onClick={() => restorePair(pair)}
                      >
                        {pairName(pair)}
                      </button>
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
          )}
          {prefilledPairMod && <prefilledPairMod.PrefilledPairNotice locale={locale} />}
          <div class="syn__slots">
            <SlotForm
              slot={slotA}
              setSlot={(u) => setSlotA(u)}
              charts={charts}
              idPrefix="syn-a"
              fallbackLabel={t(locale, 'personA')}
              locale={locale}
              loadEngine={loadEngine}
              quickFill={showQuickFill ? {
                label: pcf(locale, 'useMyChart', { handle: handleOf(latestChart.name) }),
                dismissLabel: pc(locale, 'dismissMyChart'),
                onUse: () => {
                  setQuickFillDismissed(true);
                  setSlotA((s) => ({ ...s, source: 'saved', savedId: latestChart.id }));
                },
                onDismiss: () => setQuickFillDismissed(true),
              } : undefined}
            />
            <SlotForm slot={slotB} setSlot={(u) => setSlotB(u)} charts={charts} idPrefix="syn-b" fallbackLabel={t(locale, 'personB')} locale={locale} loadEngine={loadEngine} />
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!canCompare}>
            <span>{busy ? t(locale, 'comparing') : t(locale, 'compareCharts')}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">{t(locale, 'privacyDevice')}</p>
          {sameSaved && (
            <p class="field__help">{t(locale, 'sameChart')}</p>
          )}
          {charts.length < 2 && (
            <p class="field__help">
              {t(locale, 'compareSavedHelp')}{' '}
              <a href={localizePath(locale, '/birth-chart/')}>{t(locale, 'getBirthChart')} →</a>
            </p>
          )}
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        </div>
      </form>

      {result && (
        <div class="calc__result">
          <h2 class="sr-only" tabIndex={-1} ref={resultHeadingRef}>{t(locale, 'compatibility')}</h2>
          {(!result.a.timeKnown || !result.b.timeKnown) && (
            <p class="notice" role="status">
              {t(locale, 'compareNoTimeNotice')} {new Intl.ListFormat(listLocale(locale), {
                style: 'long', type: 'conjunction',
              }).format([result.a, result.b].filter((p) => !p.timeKnown).map((p) => p.label))},
              {' '}{t(locale, 'moonMiddayEstimate')}
            </p>
          )}
          <div class="syn__people">
            <PersonCard person={result.a} locale={locale} />
            <span class="syn__vs mono">×</span>
            <PersonCard person={result.b} locale={locale} />
          </div>

          {wheelMod && (
            /* Keyed per compare: a fresh pair resets the swap and any
               focused contact — nothing stale carries over. */
            <wheelMod.default
              key={result.at}
              locale={locale}
              a={{
                label: result.a.label,
                bodies: result.a.wheel.bodies,
                asc: result.a.asc,
                mc: result.a.wheel.mc,
                cusps: result.a.wheel.cusps,
                timeKnown: result.a.timeKnown,
              }}
              b={{
                label: result.b.label,
                bodies: result.b.wheel.bodies,
                asc: result.b.asc,
                mc: result.b.wheel.mc,
                cusps: result.b.wheel.cusps,
                timeKnown: result.b.timeKnown,
              }}
              summary={result.summary}
            />
          )}

          {(compatShareMod || (result.sides[0] && result.sides[1])) && (
            <div class="calc__actions">
              {compatShareMod && (
                <compatShareMod.CompatibilityPairingCta
                  a={{ label: result.a.label, bodies: result.a.bodies, asc: result.a.asc }}
                  b={{ label: result.b.label, bodies: result.b.bodies, asc: result.b.asc }}
                  locale={locale}
                />
              )}
              {result.sides[0] && result.sides[1] && (
                <button
                  type="button" class="btn btn--ghost" data-save-pair onClick={onSavePair}
                  disabled={pairSave === 'saved' || pairSave === 'exists'}
                >
                  <span>
                    {pairSave === 'saved' || pairSave === 'exists'
                      ? t(locale, 'chartSavedDevice')
                      : pc(locale, 'savePair')}
                  </span>
                  <span class="orb">{pairSave === 'saved' || pairSave === 'exists' ? '✓' : '+'}</span>
                </button>
              )}
              {compatShareMod && (
                <compatShareMod.CompatibilityShareControl
                  key={result.at}
                  a={{ label: result.a.label, bodies: result.a.bodies, asc: result.a.asc }}
                  b={{ label: result.b.label, bodies: result.b.bodies, asc: result.b.asc }}
                  summary={result.summary}
                  locale={locale}
                />
              )}
            </div>
          )}
          {/* Announcement rides the persistent status node above; these
              visible notes are for sighted users (alerts announce fine
              on insertion). */}
          {pairSave !== 'idle' && (
            pairSave === 'saved' || pairSave === 'exists'
              ? <p class="calc__share-note" data-pair-status>{pc(locale, pairSave === 'saved' ? 'pairSaved' : 'pairExists')}</p>
              : pairSave === 'full'
                ? <p class="calc__error" role="alert" data-pair-status>{pcf(locale, 'pairSaveFull', { n: MAX_PAIRS })}</p>
                : <p class="calc__error" role="alert" data-pair-status>{t(locale, 'chartSaveError')}</p>
          )}

          {/* Invite: A's side rides in the link; B fills their own */}
          {invite && CopyLinkButton && shareMod && (
            <div class="calc__share">
              <CopyLinkButton
                url={inviteUrl()}
                state={inviteState}
                onStateChange={setInviteState}
                idleLabel={tf(locale, 'inviteWith', { name: result.a.label })}
                copiedLabel={t(locale, 'linkCopied')}
                ariaLabel={t(locale, 'inviteLink')}
                buttonClass="btn btn--ghost"
                dataHook="invite"
              >
                <p class="calc__share-note">
                  {tf(locale, 'inviteNamedNote', { name: result.a.label })}
                </p>
                {inviteState === 'copied' && (
                  <p class="sr-only" role="status">{t(locale, 'inviteCopied')}</p>
                )}
              </CopyLinkButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
