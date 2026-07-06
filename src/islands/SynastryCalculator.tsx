/**
 * Two charts, compared. Saved charts flow straight from localStorage
 * summaries into the pure synastry math — the ephemeris never loads on
 * that path. Birth-detail entry (or a stale engine version) lazy-loads
 * the engine the same way the chart calculator does.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import PlaceSearch from './PlaceSearch';
import SignChip from './SignChip';
import { loadProfile } from '../lib/profile/store';
import { EMPTY_PROFILE } from '../lib/profile/schema';
import type { Profile, SavedChart } from '../lib/profile/schema';
import { summarizePair } from '../lib/engine/synastry';
import type { MinimalBody, PairSummary } from '../lib/engine/synastry';
import { synastryLine, pairSlug } from '../lib/compat';
import { ELEMENT_LABEL, signForLongitude } from '../lib/signs';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import { decodeChartLink, encodeChartLink } from '../lib/share';
import type { ShareChartInput } from '../lib/share';
import { ENGINE_VERSION } from '../lib/engine/types';
import type { City } from '../lib/geo/search';

const GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

let enginePromise: Promise<typeof import('../lib/engine/full')> | null = null;
const loadEngine = () => (enginePromise ??= import('../lib/engine/full'));

interface SlotState {
  source: 'saved' | 'form' | 'link';
  savedId: string;
  name: string;
  date: string;
  time: string;
  timeKnown: boolean;
  city: City | null;
  /** Chart that arrived in the URL fragment — locked, clearable. */
  link: { input: ShareChartInput; label: string } | null;
}

interface Person {
  label: string;
  bodies: MinimalBody[];
  asc: number | null;
  /** False when the birth time was unknown — the Moon is a noon estimate. */
  timeKnown: boolean;
}

const emptySlot = (): SlotState => ({
  source: 'form', savedId: '', name: '', date: '', time: '', timeKnown: true, city: null, link: null,
});

/** Short handle for sentences: chart names like "Cancer Sun · 1990-02-01" trim to "Cancer Sun". */
const handleOf = (name: string) => name.split('·')[0].trim() || name;

async function resolveSaved(chart: SavedChart): Promise<Person> {
  const stored: Person = {
    label: handleOf(chart.name),
    bodies: chart.summary.bodies.map(({ body, lon }) => ({ body, lon })),
    asc: chart.summary.angles?.asc ?? null,
    timeKnown: chart.birth.timeKnown,
  };
  // Stale engine? Recompute from birth input when we can; the stored
  // summary stays the honest fallback.
  if (chart.summary.engineVersion === ENGINE_VERSION || !chart.birth.place) return stored;
  try {
    const engine = await loadEngine();
    const resolved = resolveLocalToUtc(
      chart.birth.date,
      chart.birth.timeKnown && chart.birth.time ? chart.birth.time : '12:00',
      chart.birth.place.tz,
    );
    const result = engine.computeChart({
      utc: resolved.utc,
      latitude: chart.birth.place.lat,
      longitude: chart.birth.place.lon,
      houseSystem: chart.summary.houseSystem,
      timeKnown: chart.birth.timeKnown,
      flags: resolved.flags,
    });
    return {
      label: stored.label,
      bodies: result.bodies.map(({ body, lon }) => ({ body, lon })),
      asc: result.angles?.asc ?? null,
      timeKnown: chart.birth.timeKnown,
    };
  } catch {
    return stored;
  }
}

async function resolveLink(link: { input: ShareChartInput; label: string }): Promise<Person> {
  const engine = await loadEngine();
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
  };
}

async function resolveForm(slot: SlotState, fallbackLabel: string): Promise<Person> {
  const engine = await loadEngine();
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
  };
}

function SlotForm({
  slot, setSlot, charts, idPrefix, fallbackLabel,
}: {
  slot: SlotState;
  setSlot: (updater: (s: SlotState) => SlotState) => void;
  charts: SavedChart[];
  idPrefix: string;
  fallbackLabel: string;
}) {
  if (slot.source === 'link' && slot.link) {
    return (
      <div class="syn__slot">
        <span class="mono--label">{fallbackLabel}</span>
        <div class="field">
          <label class="field__label" for={`${idPrefix}-linked`}>Chart</label>
          <span class="place__chip">
            <input
              id={`${idPrefix}-linked`} class="place__chip-value" type="text" readOnly
              value={`${slot.link.label} · shared with you`}
            />
            <button
              type="button" class="place__clear" aria-label="Remove the shared chart"
              onClick={() => setSlot(() => emptySlot())}
            >×</button>
          </span>
          <p class="field__help">This side arrived in the link — clear it to enter someone else.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="syn__slot">
      <span class="mono--label">{fallbackLabel}</span>

      {charts.length > 0 && (
        <div class="field">
          <label class="field__label" for={`${idPrefix}-source`}>Chart</label>
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
            <option value="">Enter birth details…</option>
            {charts.map((c) => <option value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {slot.source === 'form' && (
        <>
          <div class="field">
            <label class="field__label" for={`${idPrefix}-name`}>Name <span class="field__optional">optional</span></label>
            <input
              id={`${idPrefix}-name`} class="field__input" type="text" maxLength={24}
              placeholder={fallbackLabel} value={slot.name}
              onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSlot((s) => ({ ...s, name: v })); }}
            />
          </div>
          <div class="field">
            <label class="field__label" for={`${idPrefix}-date`}>Birth date</label>
            <input
              id={`${idPrefix}-date`} class="field__input" type="date" required
              min="1800-01-01" max="2199-12-31" value={slot.date}
              onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSlot((s) => ({ ...s, date: v })); }}
            />
          </div>
          <div class="field">
            <div class="field__labelrow">
              <label class="field__label" for={`${idPrefix}-time`}>Birth time</label>
              <label class="field__toggle">
                <input
                  type="checkbox" checked={!slot.timeKnown}
                  onChange={(e) => { const v = !(e.target as HTMLInputElement).checked; setSlot((s) => ({ ...s, timeKnown: v })); }}
                />
                Not known
              </label>
            </div>
            <input
              id={`${idPrefix}-time`} class="field__input" type="time"
              disabled={!slot.timeKnown} value={slot.time}
              onFocus={() => loadEngine()}
              onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSlot((s) => ({ ...s, time: v })); }}
            />
          </div>
          <div class="field">
            <label class="field__label" for={`${idPrefix}-place`}>Birthplace</label>
            <PlaceSearch id={`${idPrefix}-place`} selected={slot.city} onSelect={(c) => setSlot((s) => ({ ...s, city: c }))} />
          </div>
        </>
      )}
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  const find = (name: string) => person.bodies.find((b) => b.body === name);
  const sun = find('Sun');
  const moon = find('Moon');
  return (
    <div class="syn__person">
      <strong>{person.label}</strong>
      <div class="syn__three">
        {sun && <span class="syn__placement"><span class="mono--label">Sun</span> <SignChip lon={sun.lon} /></span>}
        {moon && <span class="syn__placement"><span class="mono--label">Moon</span> <SignChip lon={moon.lon} /></span>}
        {person.asc !== null && <span class="syn__placement"><span class="mono--label">Rising</span> <SignChip lon={person.asc} /></span>}
      </div>
    </div>
  );
}

function BalanceBars({ person, balance }: { person: string; balance: Record<string, number> }) {
  return (
    <div class="syn__balance">
      <span class="syn__balance-name">{person}</span>
      {(['fire', 'earth', 'air', 'water'] as const).map((el) => (
        <div class="syn__bar" key={el}>
          <span class="syn__bar-label mono--label">{ELEMENT_LABEL[el]}</span>
          <span class="syn__bar-track"><span class="syn__bar-fill" style={`width:${balance[el] * 10}%`} /></span>
          <span class="syn__bar-n mono">{balance[el]}</span>
        </div>
      ))}
    </div>
  );
}

export default function SynastryCalculator() {
  // Starts as the empty profile so the form server-renders; the mount
  // effect swaps in the device's real profile (dropdowns appear then).
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [slotA, setSlotA] = useState<SlotState>(emptySlot());
  const [slotB, setSlotB] = useState<SlotState>(emptySlot());
  const [result, setResult] = useState<{ a: Person; b: Person; summary: PairSummary } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [autoRan, setAutoRan] = useState(false);
  const [invite, setInvite] = useState<ShareChartInput | null>(null);
  const [inviteState, setInviteState] = useState<'idle' | 'copied' | 'manual'>('idle');

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    // ?a=&b= deep link: preselect saved charts by their device-local ids.
    const params = new URLSearchParams(window.location.search);
    const idA = params.get('a');
    const idB = params.get('b');
    let linked = 0;
    if (idA && p.charts.some((c) => c.id === idA)) {
      setSlotA((s) => ({ ...s, source: 'saved', savedId: idA }));
      linked += 1;
    }
    if (idB && p.charts.some((c) => c.id === idB)) {
      setSlotB((s) => ({ ...s, source: 'saved', savedId: idB }));
      linked += 1;
    }
    if (linked === 2) setAutoRan(true);
    // #a= fragment: a chart shared from another device rides in the URL
    // itself. It fills Person A; the fragment is then stripped so the
    // birth details don't linger in the bar.
    const token = new URLSearchParams(window.location.hash.slice(1)).get('a');
    if (token) {
      const decoded = decodeChartLink(token);
      if (decoded) {
        setSlotA({
          ...emptySlot(),
          source: 'link',
          link: { input: decoded, label: decoded.name ?? 'Shared chart' },
        });
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
    const sync = () => setProfile(loadProfile());
    window.addEventListener('zodiacs:profile', sync);
    return () => window.removeEventListener('zodiacs:profile', sync);
  }, []);

  const charts = profile.charts;

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
  function inviteFromSlot(slot: SlotState): ShareChartInput | null {
    if (slot.source === 'link') return null;
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
    `${window.location.origin}/compatibility/#a=${encodeChartLink(invite!)}`;

  async function onInvite() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(inviteUrl());
      setInviteState('copied');
    } catch {
      setInviteState('manual');
    }
  }

  async function compare(e?: Event) {
    e?.preventDefault();
    if (!slotReady(slotA) || !slotReady(slotB) || sameSaved) return;
    setBusy(true);
    setError('');
    try {
      const resolve = (slot: SlotState, fallback: string) =>
        slot.source === 'saved' ? resolveSaved(charts.find((c) => c.id === slot.savedId)!)
          : slot.source === 'link' ? resolveLink(slot.link!)
          : resolveForm(slot, fallback);
      const [a, b] = await Promise.all([resolve(slotA, 'Person A'), resolve(slotB, 'Person B')]);
      const summary = summarizePair(a.bodies, b.bodies, 8);
      setResult({ a, b, summary });
      setInvite(inviteFromSlot(slotA));
      setInviteState('idle');
    } catch (err) {
      setError('Something went wrong comparing the charts. Please try again.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  // Deep-linked pairs run themselves — the saved path is pure math.
  useEffect(() => {
    if (autoRan && profile && slotReady(slotA) && slotReady(slotB) && !result && !busy) {
      compare();
    }
  }, [autoRan, profile, slotA, slotB]);

  const pairHref = useMemo(() => {
    if (!result) return null;
    const sunA = result.a.bodies.find((b) => b.body === 'Sun');
    const sunB = result.b.bodies.find((b) => b.body === 'Sun');
    if (!sunA || !sunB) return null;
    const sa = signForLongitude(sunA.lon);
    const sb = signForLongitude(sunB.lon);
    return { href: `/compatibility/${pairSlug(sa.slug, sb.slug)}/`, a: sa.name, b: sb.name };
  }, [result]);

  return (
    <div class="calc">
      <form class="calc__form shell" onSubmit={compare}>
        <div class="core calc__core">
          <div class="syn__slots">
            <SlotForm slot={slotA} setSlot={(u) => setSlotA(u)} charts={charts} idPrefix="syn-a" fallbackLabel="Person A" />
            <SlotForm slot={slotB} setSlot={(u) => setSlotB(u)} charts={charts} idPrefix="syn-b" fallbackLabel="Person B" />
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!canCompare}>
            <span>{busy ? 'Comparing…' : 'Compare the charts'}</span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">Computed on your device — birth data never leaves it.</p>
          {sameSaved && (
            <p class="field__help">That’s the same chart twice — pick two different ones to compare.</p>
          )}
          {charts.length < 2 && (
            <p class="field__help">
              Charts you <a href="/birth-chart/">calculate and save</a> appear here as
              one-tap choices, so the second comparison is faster than the first.
            </p>
          )}
          {error && <p class="calc__error" role="alert">{error}</p>}
        </div>
      </form>

      {result && (
        <div class="calc__result">
          {(!result.a.timeKnown || !result.b.timeKnown) && (
            <p class="notice" role="status">
              No birth time for {[result.a, result.b].filter((p) => !p.timeKnown).map((p) => p.label).join(' and ')},
              so that Moon is a midday estimate — it can sit up to six degrees
              off, and a Moon aspect near the edge of its orb may come or go
              with the real time.
            </p>
          )}
          <div class="syn__people">
            <PersonCard person={result.a} />
            <span class="syn__vs mono">×</span>
            <PersonCard person={result.b} />
          </div>

          <p class="syn__tally mono">
            {result.summary.aspects.length} cross-chart aspects ·
            {' '}{result.summary.easeful} easeful (trine/sextile) ·
            {' '}{result.summary.charged} charged (square/opposition)
          </p>

          <div class="syn__aspects">
            {result.summary.top.map((asp) => (
              <div class="syn__aspect" key={`${asp.a}-${asp.b}-${asp.type}`}>
                <span class="syn__aspect-receipt mono">
                  {GLYPHS[asp.a]} {result.a.label}’s {asp.a} {asp.type} {GLYPHS[asp.b]} {result.b.label}’s {asp.b} · orb {asp.orb.toFixed(1)}°
                </span>
                <p class="syn__aspect-read">
                  {synastryLine(result.a.label, asp.a, result.b.label, asp.b, asp.type)}
                </p>
              </div>
            ))}
          </div>

          <div class="syn__balances">
            <BalanceBars person={result.a.label} balance={result.summary.elements.a} />
            <BalanceBars person={result.b.label} balance={result.summary.elements.b} />
          </div>

          {pairHref && (
            <div class="calc__actions">
              <a class="btn btn--ghost" href={pairHref.href}>
                <span>Read the {pairHref.a} and {pairHref.b} pairing</span><span class="orb">→</span>
              </a>
            </div>
          )}

          {/* Invite: A's side rides in the link; B fills their own */}
          {invite && (
            <div class="calc__share">
              <div class="calc__actions">
                <button class="btn btn--ghost" type="button" onClick={onInvite} data-invite-link>
                  <span>{inviteState === 'copied' ? 'Link copied' : `Invite someone to compare with ${result.a.label}`}</span>
                  <span class="orb">{inviteState === 'copied' ? '✓' : '⧉'}</span>
                </button>
              </div>
              {inviteState === 'manual' && (
                <input
                  class="field__input calc__share-url" type="text" readOnly value={inviteUrl()}
                  aria-label="Invite link"
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                />
              )}
              <p class="calc__share-note">
                The link carries {result.a.label}’s birth details and opens this
                page with that side filled in — nothing is sent to us. Worth
                their okay if that isn’t you.
              </p>
              {inviteState === 'copied' && (
                <p class="sr-only" role="status">Invite link copied to your clipboard.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
