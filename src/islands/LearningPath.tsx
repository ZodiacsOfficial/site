import { useEffect, useMemo, useState } from 'preact/hooks';

const STORAGE_KEY = 'zodiacs:learning-path:v1';

const STEPS = [
  {
    id: 'big-three',
    eyebrow: 'Why am I like this?',
    title: 'Meet the three sides of you',
    body: 'Your Sun, Moon, and rising sign separate what drives you, what you need, and how people first read you.',
    why: 'It can explain why the outside version of you does not always match how you feel inside.',
    href: '/birth-chart/',
    action: 'Show me my three',
  },
  {
    id: 'planets-houses',
    eyebrow: 'Where does it show up?',
    title: 'Find the life areas that matter most',
    body: 'The houses place your chart in real life — work, love, home, money, friendships, and the parts of you kept private.',
    why: 'It turns personality language into something you can actually notice in your day-to-day life.',
    href: '/learn/houses/',
    action: 'See the life areas',
  },
  {
    id: 'aspects',
    eyebrow: 'Why does this repeat?',
    title: 'Recognize one pattern you keep meeting',
    body: 'Aspects connect two sides of you. They can describe a natural talent, a familiar tension, or a choice that keeps returning.',
    why: 'Naming the pattern gives you a chance to use it on purpose instead of running it on autopilot.',
    href: '/learn/aspects/',
    action: 'Understand my patterns',
  },
  {
    id: 'whole-chart',
    eyebrow: 'What is happening now?',
    title: 'See which themes may be louder today',
    body: 'Your birth chart stays the same. The moving sky adds timing by showing which parts of it are being activated now.',
    why: 'This is useful for reflection and planning — not proof that one unavoidable event will happen.',
    href: '/today/',
    action: 'See what is active now',
  },
  {
    id: 'follow-sky',
    eyebrow: 'What comes next?',
    title: 'Choose your way to look ahead',
    body: 'Use your Sun-sign horoscope for a simple monthly forecast, or your saved chart for a more personal birthday-year view.',
    why: 'Think weather, not fate: a forecast can point to a theme, while your choices shape what happens next.',
    href: '/horoscopes/',
    action: 'Read my horoscope',
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

function readProgress(): StepId[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return normalizeLearningProgress(value);
  } catch {
    return [];
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
  const [completed, setCompleted] = useState<StepId[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCompleted(readProgress());
    setReady(true);
  }, []);

  const completedSet = useMemo(() => new Set(completed), [completed]);
  const activeStep = useMemo(() => activeLearningStep(completed), [completed]);

  function save(next: StepId[]) {
    setCompleted(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Progress still works for this visit when storage is unavailable.
    }
  }

  function complete(id: StepId) {
    if (completedSet.has(id)) return;
    save([...completed, id]);
  }

  function restart() {
    save([]);
    track('restart');
  }

  const count = completed.length;
  const allDone = count === STEPS.length;

  return (
    <section class="learning-path shell" aria-labelledby="learning-path-title">
      <div class="core learning-path__core">
        <header class="learning-path__head">
          <div>
            <span class="mono--label">A guided reading</span>
            <h2 id="learning-path-title">Understand your chart, one step at a time.</h2>
            <p>Start with your personality, then explore repeating patterns, timing, and your horoscope. Follow the path or jump ahead — everything stays in plain English.</p>
          </div>
          <div class="learning-path__progress" aria-live="polite">
            <span>{ready ? `${count} of ${STEPS.length}` : 'Loading your progress…'}</span>
            <div
              class="learning-path__bar"
              role="progressbar"
              aria-label="Learning path progress"
              aria-valuemin={0}
              aria-valuemax={STEPS.length}
              aria-valuenow={ready ? count : 0}
              aria-valuetext={ready ? `${count} of ${STEPS.length} steps complete` : 'Loading saved progress'}
            >
              <span style={{ width: `${((ready ? count : 0) / STEPS.length) * 100}%` }} />
            </div>
          </div>
        </header>

        {ready && allDone && (
          <div class="learning-path__complete" role="status">
            <strong>You have a way forward.</strong>
            <span>Return to your chart when you want depth, or your horoscope when you want a quick check-in.</span>
          </div>
        )}

        {!ready ? (
          <p class="learning-path__loading" role="status">Opening your saved path…</p>
        ) : <ol class="learning-path__steps">
          {STEPS.map((step, index) => {
            const done = completedSet.has(step.id);
            const active = activeStep?.id === step.id;
            return (
              <li
                key={step.id}
                class={`learning-step${active ? ' learning-step--active' : ''}${done ? ' learning-step--done' : ''}`}
              >
                {done ? (
                  <>
                    <span class="learning-step__check learning-step__check--status" aria-hidden="true">✓</span>
                    <span class="sr-only">{step.title}, completed.</span>
                  </>
                ) : (
                  <button
                    class="learning-step__check"
                    type="button"
                    aria-label={`Mark ${step.title} complete`}
                    onClick={() => complete(step.id)}
                  >
                    {index + 1}
                  </button>
                )}
                <div class="learning-step__copy">
                  <span class="mono learning-step__eyebrow">{step.eyebrow}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <p class="learning-step__why"><strong>Why it matters:</strong> {step.why}</p>
                </div>
                <div class="learning-step__action-wrap">
                  {activeStep?.id === step.id && (
                    <span class="mono learning-step__next-cue">{activeStep.cue}</span>
                  )}
                  <a
                    class={`btn ${active ? 'btn--primary' : 'btn--ghost'} learning-step__action`}
                    href={step.href}
                    onClick={() => {
                      complete(step.id);
                      track(step.id);
                    }}
                  >
                    <span>{done ? 'Open again' : step.action}</span>
                    <span class="orb" aria-hidden="true">→</span>
                  </a>
                </div>
              </li>
            );
          })}
        </ol>}

        {ready && count > 0 && (
          <button class="learning-path__restart" type="button" onClick={restart}>
            Start this path over
          </button>
        )}
      </div>
    </section>
  );
}
