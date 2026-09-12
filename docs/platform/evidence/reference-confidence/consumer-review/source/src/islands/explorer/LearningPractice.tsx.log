import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { learningSourceCurrent } from '../../lib/learning-source';
import { useLearningSources } from '../../lib/use-learning-sources';
import { useLearningProgress } from '../../lib/use-learning-progress';
import { PAGE_ONLY_COPY } from '../../lib/learning-progress';
import { learningExercises, type ExerciseInput } from './learning-exercises';
import type { EntityRef } from '../../lib/scene/types';
import '../LearningPractice.css';

export interface PracticeSource {
  id: string; identity: string; run: number; inputRevision: number;
  isCurrent: (run: number, inputRevision: number) => boolean;
}
interface Props extends ExerciseInput { source: PracticeSource; onShow: (entity: EntityRef, behavior: 'instant') => void }
type ExerciseId = 'big-three' | 'planets-houses' | 'aspects';

export default function LearningPractice({ source, onShow, ...input }: Props) {
  const { sources, accessGeneration } = useLearningSources();
  const { progress, act, resetRevision } = useLearningProgress();
  const [id, setId] = useState<ExerciseId>('big-three');
  const [focus, setFocus] = useState<'Sun' | 'Moon' | 'Rising'>('Sun');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [correct, setCorrect] = useState(false);
  const [reflection, setReflection] = useState(false);
  const [active, setActive] = useState(false);
  const [, refreshToken] = useState(0);
  const token = useRef(0);
  const mounted = useRef(true);
  const captured = useMemo(() => ({ ...source, access: accessGeneration.current }), [source.id, source.identity, source.run, source.inputRevision]);
  const valid = () => mounted.current && source.isCurrent(captured.run, captured.inputRevision)
    && captured.access === accessGeneration.current && learningSourceCurrent(captured);
  const current = valid();
  useLayoutEffect(() => {
    token.current += 1; refreshToken(token.current); setActive(false); setAnswer(''); setFeedback(''); setCorrect(false); setReflection(false);
  }, [captured, current, resetRevision]);
  useLayoutEffect(() => () => { mounted.current = false; token.current += 1; }, []);
  // `sources` refreshes disclosure on profile/storage/pageshow; handlers also reread synchronously.
  const available = current && sources.some((candidate) => candidate.id === captured.id && candidate.identity === captured.identity);
  const exercise = learningExercises(input, focus)[id];
  const renderedToken = token.current;
  const interactionCurrent = () => valid() && token.current === renderedToken;
  const reset = () => { token.current += 1; setActive(false); setAnswer(''); setFeedback(''); setCorrect(false); setReflection(false); };
  function start() {
    if (!exercise || !interactionCurrent()) return;
    const attempt = ++token.current;
    setAnswer(''); setFeedback(''); setCorrect(false); setReflection(false);
    void act({ type: 'start', id }, () => valid() && token.current === attempt).then((accepted) => {
      if (accepted && valid() && token.current === attempt) setActive(true);
    });
  }
  return <section class="learning-practice" aria-labelledby="learning-practice-title">
    <h3 id="learning-practice-title">Try it with your chart</h3>
    <p>Look, answer, then reflect. A correct answer is a starting point; you decide when the lesson feels understood.</p>
    {!available ? <p role="status">This practice no longer matches an available saved chart. Open your saved chart again to begin a fresh attempt.</p> : <>
      <label>Practice
        <select aria-label="Practice" value={id} onChange={(event) => { reset(); setId(event.currentTarget.value as ExerciseId); }}>
          <option value="big-three">Your big three</option><option value="planets-houses">Planets and houses</option><option value="aspects">A connection between planets</option>
        </select>
      </label>
      {id === 'big-three' && <label>Choose a reference point
        <select aria-label="Choose a reference point" value={focus} onChange={(event) => { reset(); setFocus(event.currentTarget.value as typeof focus); }}>
          <option>Sun</option><option>Moon</option><option>Rising</option>
        </select>
      </label>}
      {!exercise ? <p>This result does not establish the facts needed for this exercise. Continue with the lesson and reflection; no answer is required.</p> : <>
        {!active ? <div class="learning-practice__actions"><button type="button" class="btn btn--ghost" onClick={start}>Begin this exercise</button></div> : <>
          <fieldset><legend>{exercise.question}</legend><div class="learning-practice__options">
            {exercise.choices.map((choice) => <label key={choice}><input type="radio" name={`practice-${id}`} value={choice} checked={answer === choice}
              onChange={() => { if (!interactionCurrent()) return; token.current += 1; setAnswer(choice); setCorrect(false); setReflection(false); setFeedback(''); }} />{choice}</label>)}
          </div></fieldset>
          <div class="learning-practice__actions">
            <button type="button" class="btn btn--ghost" disabled={!answer} onClick={() => {
              if (!interactionCurrent()) return;
              token.current += 1;
              const matches = answer === exercise.answer; setCorrect(matches); setReflection(false);
              setFeedback(matches ? exercise.explanation : 'Have another look at the reading or highlight it on the wheel, then try again.');
            }}>Check my answer</button>
            <button type="button" class="btn btn--ghost" onClick={() => { if (interactionCurrent()) onShow(exercise.entity, 'instant'); }}>Show on chart</button>
          </div>
          <p class="learning-practice__status" role="status">{feedback}</p>
          {correct && <>
            <label><input type="checkbox" checked={reflection} onChange={(event) => { if (interactionCurrent()) { token.current += 1; setReflection(event.currentTarget.checked); } }} />{exercise.reflection}</label>
            <div class="learning-practice__actions"><button type="button" class="btn btn--ghost" disabled={!reflection} onClick={() => {
              if (!interactionCurrent()) return;
              const attempt = token.current;
              void act({ type: 'complete', id }, () => valid() && attempt === token.current && reflection && correct).then((accepted) => {
                if (accepted && valid() && attempt === token.current) setFeedback('Lesson marked complete. You can return and practice again whenever you like.');
              });
            }}>Mark this lesson complete</button></div>
          </>}
        </>}
      </>}
    </>}
    {progress.completed.includes(id) && <p>Previously marked complete. You can practice again without changing that progress.</p>}
    {progress.pageOnly && <p role="status">{PAGE_ONLY_COPY}</p>}
    <a class="btn btn--ghost" href="/learn/#learning-path-title">Return to the five-step path</a>
  </section>;
}
