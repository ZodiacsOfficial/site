import { useState } from 'preact/hooks';
import type { Chart } from '../lib/engine/types';
import { t, type Locale } from '../lib/i18n';
import type { ShareChartInput } from '../lib/share';
import { ChartShareDialog } from './PositionsShareSurface';

interface ChartShareControlProps {
  chart: Chart;
  input: ShareChartInput;
  locale: Locale;
  fullUrl: string;
}

type CardState = 'idle' | 'busy' | 'saved' | 'error';

/** Result-only opener; the canvas implementation stays behind the card action. */
export function ChartShareControl({ chart, input, locale, fullUrl }: ChartShareControlProps) {
  const [card, setCard] = useState<CardState>('idle');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        class="btn btn--glass"
        type="button"
        onClick={() => {
          setCard('idle');
          setOpen(true);
        }}
        disabled={card === 'busy'}
        data-share-card
      >
        <span>{card === 'busy'
          ? t(locale, 'rendering')
          : card === 'saved'
            ? t(locale, 'cardSaved')
            : t(locale, 'shareChart')}</span>
        <span class="orb">{card === 'saved' ? '✓' : '↗'}</span>
      </button>
      {card === 'saved' && <p class="sr-only" role="status">{t(locale, 'chartCardSaved')}</p>}
      {card === 'error' && <p class="calc__error" role="alert">{t(locale, 'cardError')}</p>}
      {open && (
        <ChartShareDialog
          chart={chart}
          input={input}
          locale={locale}
          fullUrl={fullUrl}
          card={card}
          onCardStateChange={setCard}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
