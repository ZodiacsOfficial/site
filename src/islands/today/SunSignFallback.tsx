import { useEffect, useMemo, useState } from 'preact/hooks';
import dailyData from '../../data/daily.json';
import type { Daily } from '../../lib/daily';
import { SIGNS, type Sign } from '../../lib/signs';
import { sunSignTodayLine } from './sun-sign-reading';

export const TODAY_SUN_SIGN_STORAGE_KEY = 'zodiacs:today-sun-sign:v1';

type NextAction = 'choose-sun-sign' | 'open-horoscope' | 'get-birth-chart';

function trackNextAction(state: 'no-chart' | 'sun-sign', action: NextAction): void {
  if (typeof window === 'undefined') return;
  (window as Window & {
    zodiacsAnalytics?: {
      track?: (name: string, properties: { state: string; action: string }) => void;
    };
  }).zodiacsAnalytics?.track?.('next_action_clicked', { state, action });
}

function readSavedSign(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(TODAY_SUN_SIGN_STORAGE_KEY);
    return SIGNS.some((sign) => sign.slug === saved) ? saved : null;
  } catch {
    return null;
  }
}

function saveSign(slug: string): void {
  try {
    window.localStorage.setItem(TODAY_SUN_SIGN_STORAGE_KEY, slug);
  } catch {
    // The reading still works when local storage is unavailable.
  }
}

export default function SunSignFallback() {
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    setSelected(readSavedSign());
    setReady(true);
  }, []);

  const active = useMemo<Sign | null>(
    () => SIGNS.find((sign) => sign.slug === selected) ?? null,
    [selected],
  );
  const dailyLine = active ? sunSignTodayLine(active.slug, dailyData as Daily) : null;

  const chooseSign = (slug: string) => {
    setSelected(slug);
    setHasInteracted(true);
    saveSign(slug);
    trackNextAction('no-chart', 'choose-sun-sign');
  };

  return (
    <div class="today-fallback">
      <div class="today-fallback__intro">
        <h2>Start with your Sun sign</h2>
        <p>
          This is usually the zodiac sign you know from your birthday. Choose it for one
          clear note about today — no birth time needed.
        </p>
      </div>

      <fieldset class="today-sign-picker">
        <legend class="sr-only">Choose your Sun sign</legend>
        <div class="today-sign-picker__grid">
          {SIGNS.map((sign) => (
            <button
              key={sign.slug}
              type="button"
              class={`today-sign${selected === sign.slug ? ' today-sign--selected' : ''}`}
              style={`--sign:${sign.hue}`}
              aria-pressed={selected === sign.slug}
              aria-controls="today-sun-sign-reading"
              onClick={() => chooseSign(sign.slug)}
            >
              <span class="today-sign__glyph" aria-hidden="true">{sign.glyph}</span>
              <span class="today-sign__name">{sign.name}</span>
              <span class="today-sign__dates">{sign.dates}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div
        id="today-sun-sign-reading"
        class="today-fallback__result"
        aria-live={hasInteracted ? 'polite' : undefined}
      >
        {!ready ? (
          <p class="today-fallback__prompt">Checking for your saved sign…</p>
        ) : active && dailyLine ? (
          <section class="today-sign-reading" style={`--sign:${active.hue}`}>
            <p class="kicker">Your quick read</p>
            <h3>{active.name} today</h3>
            <p class="today-sign-reading__line">{dailyLine}</p>
            <a
              class="btn btn--primary"
              href={`/horoscopes/${active.slug}/`}
              onClick={() => trackNextAction('sun-sign', 'open-horoscope')}
            >
              <span>Read the {active.name} horoscope</span>
              <span class="orb" aria-hidden="true">→</span>
            </a>
          </section>
        ) : (
          <p class="today-fallback__prompt">Choose a sign above to reveal today’s note.</p>
        )}
      </div>

      <div class="today-fallback__personalize">
        <div>
          <strong>Want a reading based on your whole chart?</strong>
          <p>Add your birth time and place for a more personal daily comparison.</p>
        </div>
        <a
          class="btn btn--ghost"
          href="/birth-chart/"
          onClick={() => trackNextAction('sun-sign', 'get-birth-chart')}
        >
          <span>Get your birth chart</span>
          <span class="orb" aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
