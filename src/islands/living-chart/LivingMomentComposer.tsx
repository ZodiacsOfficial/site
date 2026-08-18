import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  LivingForecastSnapshotV1,
  LivingMomentCategory,
  LivingMomentTimePrecision,
  LivingMomentV1,
} from '../../lib/living-chart/types';
import { useLivingChart } from '../../lib/hooks/useLivingChart';
import { trackAnalytics } from '../../lib/analytics';

const CATEGORIES: Array<{ value: LivingMomentCategory; label: string }> = [
  { value: 'work', label: 'Work' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'home', label: 'Home' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'change', label: 'Change' },
  { value: 'wellbeing', label: 'Wellbeing' },
  { value: 'other', label: 'Other' },
];

interface Props {
  chartLabel: string;
  forecast: LivingForecastSnapshotV1;
  reflectionQuestionId: string;
  syncEnabled?: boolean;
  onCancel(): void;
  onSaved(moment: LivingMomentV1): void;
}

function localDateParts(now = new Date()): { date: string; time: string } {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function occurredAt(date: string, time: string, precision: LivingMomentTimePrecision): string | null {
  if (precision === 'date_only') {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(new Date(`${date}T12:00:00`).getTime())
      ? date
      : null;
  }
  const local = new Date(`${date}T${time}:00`);
  return Number.isFinite(local.getTime()) ? local.toISOString() : null;
}

export default function LivingMomentComposer({
  chartLabel,
  forecast,
  reflectionQuestionId,
  syncEnabled = false,
  onCancel,
  onSaved,
}: Props) {
  const initial = useMemo(() => localDateParts(), []);
  const { create, ownerReady } = useLivingChart({ readMoments: false, syncEnabled });
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<LivingMomentCategory | undefined>();
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [precision, setPrecision] = useState<LivingMomentTimePrecision>('exact');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const save = async (event: Event) => {
    event.preventDefault();
    const cleanNote = note.trim();
    if (!cleanNote && !category) {
      setMessage('Add a note or choose a category.');
      return;
    }
    const instant = occurredAt(date, time, precision);
    if (!instant) {
      setMessage('Choose a valid date and time.');
      return;
    }
    setBusy(true);
    setMessage('');
    const result = await create({
      primaryChartId: forecast.chartId,
      occurredAt: instant,
      timePrecision: precision,
      category,
      note: cleanNote || undefined,
      forecast,
      reflectionQuestionId,
    });
    setBusy(false);
    if (!result) {
      setMessage(ownerReady
        ? 'This moment could not be saved. Check this browser’s storage and try again.'
        : 'Living Chart storage is unavailable in this browser.');
      return;
    }
    trackAnalytics('living_chart_saved', {
      mode: forecast.source === 'quiet' ? 'quiet' : 'active',
    });
    onSaved(result);
  };

  return (
    <form class="living-moment-composer" data-living-moment-form aria-busy={busy ? 'true' : undefined} onSubmit={save}>
      <header class="living-moment-composer__head">
        <h3 ref={headingRef} tabIndex={-1}>Save this moment</h3>
        <p id="living-moment-requirement">
          For {chartLabel}. Add at least a note or one part of life.
        </p>
      </header>

      <label class="living-moment-composer__field">
        <span class="living-moment-composer__label">What happened? <span aria-hidden="true">(optional)</span></span>
        <textarea
          value={note}
          maxLength={500}
          placeholder="A short note"
          aria-describedby="living-moment-requirement living-moment-counter"
          onInput={(event) => setNote((event.currentTarget as HTMLTextAreaElement).value)}
        />
        <span class="living-moment-composer__counter" id="living-moment-counter">{note.length}/500</span>
      </label>

      <fieldset class="living-moment-composer__categories" aria-describedby="living-moment-requirement">
        <legend class="living-moment-composer__legend">Part of life <span aria-hidden="true">(optional)</span></legend>
        {CATEGORIES.map((item) => (
          <label key={item.value}>
            <input
              type="radio"
              name="living-moment-category"
              value={item.value}
              checked={category === item.value}
              onChange={() => setCategory(item.value)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>

      <div class="living-moment-composer__when">
        <label class="living-moment-composer__date">
          <span class="living-moment-composer__label">Date</span>
          <input type="date" required value={date} onInput={(event) => setDate((event.currentTarget as HTMLInputElement).value)} />
        </label>
        {precision !== 'date_only' && (
          <label class="living-moment-composer__date">
            <span class="living-moment-composer__label">Time</span>
            <input type="time" required value={time} onInput={(event) => setTime((event.currentTarget as HTMLInputElement).value)} />
          </label>
        )}
      </div>

      <fieldset class="living-moment-composer__precision">
        <legend class="living-moment-composer__legend">Time precision</legend>
        <div class="living-moment-composer__precision-options">
          {([
            ['exact', 'Exact'],
            ['approximate', 'Approximate'],
            ['date_only', 'Date only'],
          ] as Array<[LivingMomentTimePrecision, string]>).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="living-moment-precision"
                value={value}
                checked={precision === value}
                onChange={() => setPrecision(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p class="living-moment-composer__hint">
        The forecast shown above is saved with this entry exactly as you saw it.
      </p>
      {message && <p class="living-moment-composer__status" role="alert">{message}</p>}
      <div class="living-moment-composer__actions">
        <button class="btn btn--primary" type="submit" disabled={busy}>
          <span>{busy ? 'Saving…' : 'Save moment'}</span><span class="orb" aria-hidden="true">→</span>
        </button>
        <button class="living-chart__text-action" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
