import { useEffect, useMemo, useState } from 'preact/hooks';

const STORAGE_KEY = 'zodiacs:learning-path:v2';
const LEGACY_STORAGE_KEY = 'zodiacs:learning-path:v1';

const STEPS = [
  {
    id: 'big-three',
    eyebrow: 'Why am I like this?',
    title: 'Meet the three sides of you',
    body: 'Your Sun, Moon, and rising sign separate what drives you, what you need, and how people first read you.',
    why: 'It can explain why the outside version of you does not always match how you feel inside.',
    href: '/birth-chart/',
    action: 'Show me my three',
    reflection: 'I have read my available chart placements and can describe what one means.',
  },
  {
    id: 'planets-houses',
    eyebrow: 'Where does it show up?',
    title: 'Find the life areas that matter most',
    body: 'The houses place your chart in real life — work, love, home, money, friendships, and the parts of you kept private.',
    why: 'It turns personality language into something you can actually notice in your day-to-day life.',
    href: '/learn/houses/',
    action: 'See the life areas',
    reflection: 'I can name one house and the area of life it describes.',
  },
  {
    id: 'aspects',
    eyebrow: 'Why does this repeat?',
    title: 'Recognize one pattern you keep meeting',
    body: 'Aspects connect two sides of you. They can describe a natural talent, a familiar tension, or a choice that keeps returning.',
    why: 'Naming the pattern gives you a chance to use it on purpose instead of running it on autopilot.',
    href: '/learn/aspects/',
    action: 'Understand my patterns',
    reflection: 'I can describe how one aspect connects two planets.',
  },
  {
    id: 'whole-chart',
    eyebrow: 'What is happening now?',
    title: 'See which themes may be louder today',
    body: 'Your birth chart stays the same. The moving sky adds timing by showing which parts of it are being activated now.',
    why: 'This is useful for reflection and planning — not proof that one unavoidable event will happen.',
    href: '/today/',
    action: 'See what is active now',
    reflection: 'I have read today’s themes and considered one in my own life.',
  },
  {
    id: 'follow-sky',
    eyebrow: 'What comes next?',
    title: 'Choose your way to look ahead',
    body: 'Use your Sun-sign horoscope for a simple monthly forecast, or your saved chart for a more personal birthday-year view.',
    why: 'Think weather, not fate: a forecast can point to a theme, while your choices shape what happens next.',
    href: '/horoscopes/',
    action: 'Read my horoscope',
    reflection: 'I have read a forecast and chosen one theme to reflect on.',
  },
] as const;

export type StepId = (typeof STEPS)[number]['id'];
export type LearningStepCue = 'Start here' | 'Up next';

export function activeLearningStep(completed: readonly StepId[]): {
  id: StepId;
  cue: LearningStepCue;
} | null {
  const completedSet = new Set(completed);
  const next = STEPS.find((step) => !completedSet.has(step.id));
  if (!next) return null;
  return { id: next.id, cue: completed.length === 0 ? 'Start here' : 'Up next' };
}

export function normalizeLearningProgress(value: unknown): StepId[] {
  if (!Array.isArray(value)) return [];
  const requested = new Set(value.filter((id): id is string => typeof id === 'string'));
  return STEPS.map((step) => step.id).filter((id) => requested.has(id));
}

export interface LearningProgress {
  started: StepId[];
  completed: StepId[];
}

export function normalizeLearningState(value: unknown): LearningProgress {
  // The old array recorded link opens as completion. Preserve those visits
  // as started; they cannot establish that somebody read a lesson.
  if (Array.isArray(value)) return { started: normalizeLearningProgress(value), completed: [] };
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 2) {
    return { started: [], completed: [] };
  }
  const record = value as Record<string, unknown>;
  const started = normalizeLearningProgress(record.started);
  return {
    started,
    completed: normalizeLearningProgress(record.completed).filter((id) => started.includes(id)),
  };
}

export function updateLearningProgress(
  progress: LearningProgress,
  action: 'start' | 'complete',
  id: StepId,
): LearningProgress {
  if (action === 'start') {
    return { ...progress, started: normalizeLearningProgress([...progress.started, id]) };
  }
  if (!progress.started.includes(id)) return progress;
  return { ...progress, completed: normalizeLearningProgress([...progress.completed, id]) };
}

function readProgress(): LearningProgress {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? 'null');
    return normalizeLearningState(value);
  } catch {
    return { started: [], completed: [] };
  }
}

function track(action: string) {
  (window as Window & {
    zodiacsAnalytics?: { track?: (name: string, properties: Record<string, string>) => void };
  }).zodiacsAnalytics?.track?.('next_action_clicked', {
    state: 'learning_path',
    action,
  });
}

export default function LearningPath() {
  const [progress, setProgress] = useState<LearningProgress>({ started: [], completed: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(readProgress());
    setReady(true);
  }, []);

  const { started, completed } = progress;
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const startedSet = useMemo(() => new Set(started), [started]);
  const activeStep = useMemo(() => activeLearningStep(completed), [completed]);

  function save(next: LearningProgress) {
    setProgress(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...next }));
    } catch {
      // Progress still works for this visit when storage is unavailable.
    }
  }

  function complete(id: StepId) {
    if (completedSet.has(id)) return;
    save(updateLearningProgress(progress, 'complete', id));
  }

  function restart() {
    save({ started: [], completed: [] });
    track('restart');
  }

  const count = completed.length;
  const inProgressCount = started.filter((id) => !completedSet.has(id)).length;
  const allDone = count === STEPS.length;

  return (
    <section class="learning-path shell" aria-labelledby="learning-path-title">
      <div class="core learning-path__core">
        <header class="learning-path__head">
          <div>
            <span class="mono--label">A guided reading</span>
            <h2 id="learning-path-title">Understand your chart, one step at a time.</h2>
            <p>Start with your personality, then explore repeating patterns, timing, and your horoscope. Follow the path or jump ahead — everything stays in plain English.</p>
            <p class="learning-path__note">Check off each step yourself after reading and reflecting. Your progress stays on this device.</p>
          </div>
          <div class="learning-path__progress" aria-live="polite">
            <span>{ready ? `${count} of ${STEPS.length} complete${inProgressCount ? ` · ${inProgressCount} started` : ''}` : `${STEPS.length} steps to explore`}</span>
            {ready && <div
              class="learning-path__bar"
              role="progressbar"
              aria-label="Learning path progress"
              aria-valuemin={0}
              aria-valuemax={STEPS.length}
              aria-valuenow={count}
              aria-valuetext={`${count} of ${STEPS.length} steps complete`}
            >
              <span style={{ width: `${(count / STEPS.length) * 100}%` }} />
            </div>}
          </div>
        </header>

        {ready && allDone && (
          <div class="learning-path__complete" role="status">
            <strong>You have a way forward.</strong>
            <span>Return to your chart when you want depth, or your horoscope when you want a quick check-in.</span>
          </div>
        )}

        <ol class="learning-path__steps">
          {STEPS.map((step, index) => {
            const done = completedSet.has(step.id);
            const hasStarted = startedSet.has(step.id);
            const active = activeStep?.id === step.id;
            return (
              <li
                key={step.id}
                data-learning-step={step.id}
                data-learning-state={done ? 'completed' : hasStarted ? 'started' : 'new'}
                class={`learning-step${active ? ' learning-step--active' : ''}${done ? ' learning-step--done' : ''}`}
              >
                {done ? (
                  <>
                    <span class="learning-step__check learning-step__check--status" aria-hidden="true">✓</span>
                    <span class="sr-only">{step.title}, completed.</span>
                  </>
                ) : (
                  <span class="learning-step__check learning-step__check--status" aria-hidden="true">
                    {index + 1}
                  </span>
                )}
                <div class="learning-step__copy">
                  <span class="mono learning-step__eyebrow">{step.eyebrow}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <p class="learning-step__why"><strong>Why it matters:</strong> {step.why}</p>
                  {ready && hasStarted && !done && (
                    <label class="learning-step__reflection">
                      <input type="checkbox" onChange={() => complete(step.id)} />
                      <span>{step.reflection}</span>
                    </label>
                  )}
                </div>
                <div class="learning-step__action-wrap">
                  {(active || hasStarted || done) && (
                    <span class="mono learning-step__next-cue">{done ? 'Completed' : hasStarted ? 'Started' : activeStep?.cue}</span>
                  )}
                  <a
                    class={`btn ${active ? 'btn--primary' : 'btn--ghost'} learning-step__action`}
                    href={step.href}
                    onClick={() => {
                      save(updateLearningProgress(progress, 'start', step.id));
                      track(step.id);
                    }}
                  >
                    <span>{done ? 'Open again' : hasStarted ? 'Continue reading' : step.action}</span>
                    <span class="orb" aria-hidden="true">→</span>
                  </a>
                </div>
              </li>
            );
          })}
        </ol>

        {ready && started.length > 0 && (
          <button class="learning-path__restart" type="button" onClick={restart}>
            Start this path over
          </button>
        )}
      </div>
    </section>
  );
}
