import { useRef, useState } from 'preact/hooks';
import { useLearningSources } from '../lib/use-learning-sources';
import { learningSourceCurrent } from '../lib/learning-source';
import { profileChartHandoffFragment } from '../lib/chart-handoff';
import { useLearningProgress } from '../lib/use-learning-progress';

export default function LearningSavedEntry() {
  const { act } = useLearningProgress();
  const { sources, accessGeneration } = useLearningSources();
  const [selectedId, setSelectedId] = useState('');
  const [entryMessage, setEntryMessage] = useState('');
  const entryToken = useRef(0);
  const selectedSource = sources.find((source) => source.id === selectedId) ?? sources[0];
        return sources.length > 0 ? <div class="learning-practice learning-practice--entry">
          <h3>Learn with your chart</h3>
          <p>Find a placement, connect it to a life area, then recognize an aspect. Your answers stay on this page; completion is always your choice.</p>
          <label>Saved chart
            <select value={selectedSource?.id ?? ''} onChange={(event) => { entryToken.current += 1; setSelectedId(event.currentTarget.value); setEntryMessage(''); }}>
              {sources.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
            </select>
          </label>
          <button type="button" class="btn btn--ghost" onClick={() => {
            if (!selectedSource) return;
            const source = selectedSource;
            const request = ++entryToken.current;
            const generation = accessGeneration.current;
            const current = () => request === entryToken.current && generation === accessGeneration.current && learningSourceCurrent(source);
            if (!current()) { setEntryMessage('This saved chart has changed. Choose it again to continue.'); return; }
            void act({ type: 'start', id: 'big-three' }, current).then((accepted) => {
              if (!accepted || !current()) return;
              const fragment = profileChartHandoffFragment(source.id);
              if (fragment) window.location.assign(`/birth-chart/#${fragment}`);
            });
          }}>Practice with this saved chart</button>
          <p role="status">{entryMessage}</p>
        </div> : <p role="status">No available saved chart can be used for practice. Save a chart with birth details, then return to this path.</p>;
}
