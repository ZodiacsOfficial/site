import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import { BirthFields } from './BirthFields';
import PlaceSearch from './PlaceSearch';
import { useProfile } from '../lib/hooks/useProfile';
import { useProfileAccessGeneration } from '../lib/hooks/useProfileAccessGeneration';
import type { City } from '../lib/geo/search';
import type { SolarReturnResultData } from './solar-return/compute';
import type { SolarReturnResultProps } from './solar-return/SolarReturnResult';
import type { WheelProps } from '../lib/wheel/Wheel';
import { loadModule } from '../lib/module-load';
import CalculationReload, { calculationError } from './CalculationReload';

type ResultComponent = ComponentType<SolarReturnResultProps>;

export default function SolarReturnCalculator() {
  const { profile, ready: profileReady } = useProfile();
  const [source, setSource] = useState<'saved' | 'manual'>('manual');
  const [savedId, setSavedId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeKnown, setTimeKnown] = useState(true);
  const [city, setCity] = useState<City | null>(null);
  const [differentPlace, setDifferentPlace] = useState(false);
  const [castCity, setCastCity] = useState<City | null>(null);
  const [yearMode, setYearMode] = useState<'current' | 'custom'>('current');
  const [customYear, setCustomYear] = useState(String(new Date().getFullYear()));
  const [result, setResult] = useState<SolarReturnResultData | null>(null);
  const [ResultView, setResultView] = useState<ResultComponent | null>(null);
  const [WheelView, setWheelView] = useState<ComponentType<WheelProps> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const initialized = useRef(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const profileAccessGeneration = useProfileAccessGeneration(() => {
    setResult(null);
    setResultView(null);
    setWheelView(null);
    setSource('manual');
    setSavedId('');
    setBusy(false);
    setError('');
  });

  useEffect(() => {
    mounted.current = true;
    const onAccess = () => {
      inFlight.current = false;
      setBusy(false);
    };
    window.addEventListener('zodiacs:profile-access', onAccess);
    return () => {
      mounted.current = false;
      inFlight.current = false;
      window.removeEventListener('zodiacs:profile-access', onAccess);
    };
  }, []);

  useEffect(() => {
    if (!profileReady || initialized.current) return;
    initialized.current = true;
    if (profile.charts[0]) {
      setSource('saved');
      setSavedId(profile.charts[0].id);
    }
  }, [profileReady, profile]);

  const saved = profile.charts.find((chart) => chart.id === savedId) ?? null;
  const manualReady = date !== '' && city !== null && (!timeKnown || time !== '');
  const ready = source === 'saved' ? saved !== null : manualReady;
  const effectiveTimeKnown = saved ? saved.birth.timeKnown && Boolean(saved.birth.time) : timeKnown;

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function calculate(event: Event) {
    event.preventDefault();
    if (!mounted.current || !ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    const accessGeneration = profileAccessGeneration.current;
    const isCurrent = () => mounted.current && accessGeneration === profileAccessGeneration.current;
    try {
      const [{ computeSolarReturn }, view, wheel] = await loadModule(() => Promise.all([
        import('./solar-return/compute'),
        import('./solar-return/SolarReturnResult'),
        import('./transit/TransitRing'),
      ]));
      if (!isCurrent()) return;
      const selected = source === 'saved' ? saved : null;
      const birthplace = selected ? selected.birth.place : city;
      const savedSun = selected && !selected.birth.place
        ? selected.summary.bodies.find((body) => body.body === 'Sun')?.lon ?? null
        : null;
      const known = selected ? selected.birth.timeKnown && Boolean(selected.birth.time) : timeKnown;
      const resultData = computeSolarReturn({
        birthDate: selected?.birth.date ?? date,
        birthTime: selected?.birth.time ?? (time || null),
        timeKnown: known,
        birthplace,
        savedSunLon: savedSun,
        houseSystem: selected?.summary.houseSystem ?? profile.settings.houseSystem,
        castLocation: selected && !selected.birth.place ? null : (differentPlace ? castCity : birthplace),
        year: yearMode === 'current' ? 'current' : Number(customYear),
      });
      if (!isCurrent()) return;
      setResultView(() => view.SolarReturnResult);
      setWheelView(() => wheel.StaticWheel);
      setResult(resultData);
    } catch (cause) {
      if (!isCurrent()) return;
      console.error(cause);
      setError(calculationError(cause, 'en', 'The solar return could not be computed. Check the details and try again.'));
    } finally {
      if (isCurrent()) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <div class="calc" data-solar-return-calculator>
      <form class="calc__form shell" onSubmit={calculate} aria-busy={busy}>
        <div class="core calc__core">
          {profile.charts.length > 0 && (
            <div class="field sr-form__source">
              <label class="field__label" for="sr-source">Chart</label>
              <select id="sr-source" class="field__input" value={source === 'saved' ? savedId : ''} onChange={(event) => {
                const value = (event.target as HTMLSelectElement).value;
                setSource(value ? 'saved' : 'manual');
                setSavedId(value);
                setDifferentPlace(false);
                setCastCity(null);
              }}>
                <option value="">Enter birth details</option>
                {profile.charts.map((chart) => <option key={chart.id} value={chart.id}>{chart.name}</option>)}
              </select>
            </div>
          )}

          {source === 'manual' && (
            <div class="calc__fields sr-form__birth">
              <BirthFields
                locale="en" dateId="sr-date" timeId="sr-time" placeId="sr-place"
                date={date} time={time} timeKnown={timeKnown} city={city}
                onDateChange={setDate} onTimeChange={setTime} onTimeKnownChange={(known) => { setTimeKnown(known); if (!known) { setDifferentPlace(false); setCastCity(null); } }} onCityChange={setCity}
                requireKnownTime
                timeHelp="Unknown time uses a noon chart and suppresses houses."
                placeHelp="A birthplace is required so the birth date can be resolved in its timezone."
              />
            </div>
          )}

          {saved && !saved.birth.place && <p class="notice">This saved chart has no stored birthplace. Its saved Sun position will be used, and the result will be planets-only.</p>}

          <div class="calc__fields sr-form__options">
            <div class="field">
              <label class="field__label" for="sr-year-mode">Return year</label>
              <select id="sr-year-mode" class="field__input" value={yearMode} onChange={(event) => setYearMode((event.target as HTMLSelectElement).value as 'current' | 'custom')}>
                <option value="current">Current return</option>
                <option value="custom">Choose a year</option>
              </select>
              {yearMode === 'custom' && <input aria-label="Custom return year" class="field__input" type="number" min="1800" max="2200" required value={customYear} onInput={(event) => setCustomYear((event.target as HTMLInputElement).value)} />}
            </div>

            {effectiveTimeKnown && !(saved && !saved.birth.place) && (
              <div class="field">
                <label class="field__toggle sr-form__toggle"><input type="checkbox" checked={differentPlace} onChange={(event) => {
                  const checked = (event.target as HTMLInputElement).checked;
                  setDifferentPlace(checked);
                  setCastCity(null);
                }} />Cast for a different place</label>
                {differentPlace && <><label class="field__label" for="sr-cast-place">Return location</label><PlaceSearch id="sr-cast-place" selected={castCity} onSelect={setCastCity} locale="en" /></>}
                <p class="field__help">Defaults to the birthplace. Relocation changes angles and houses, not planets.</p>
              </div>
            )}
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!ready || busy || (differentPlace && !(saved && !saved.birth.place) && !castCity)}><span>{busy ? 'Computing…' : 'Cast solar return'}</span><span class="orb">↗</span></button>
          <p class="calc__privacy"><strong>Private by default.</strong> The chart is calculated on this device; nothing is uploaded.</p>
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
          <CalculationReload error={error} locale="en" />
        </div>
      </form>
      {result && ResultView && WheelView && <ResultView key={result.chart.input.utc.toISOString()} result={result} Wheel={WheelView} />}
    </div>
  );
}
