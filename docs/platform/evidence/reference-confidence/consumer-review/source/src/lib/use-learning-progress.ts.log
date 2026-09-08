import { useEffect, useRef, useState } from 'preact/hooks';
import { learningProgressOwner, type LearningAction, type LearningSnapshot } from './learning-progress';

export function useLearningProgress() {
  const lifetime = useRef(false);
  const [ready, setReady] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);
  const [progress, setProgress] = useState<LearningSnapshot>({ started: [], completed: [], pageOnly: false });
  useEffect(() => {
    lifetime.current = true;
    const owner = learningProgressOwner();
    const update = () => { setProgress(owner.snapshot()); setResetRevision(owner.restartGeneration()); };
    const unsubscribe = owner.subscribe(update);
    update();
    setReady(true);
    return () => { lifetime.current = false; unsubscribe(); };
  }, []);
  const act = async (action: LearningAction, current: () => boolean = () => true) => {
    const accepted = await learningProgressOwner().act(action, () => lifetime.current && current());
    return accepted && lifetime.current && current();
  };
  return { progress, ready, act, resetRevision };
}
