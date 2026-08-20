import { useEffect, useRef, useState } from 'preact/hooks';
import type { Chart } from '../lib/engine/types';
import { t, type CatalogLocale as Locale } from '../lib/i18n';
import { encodePositionsLink } from '../lib/share-positions';
import {
  prepareBigThreeCard,
  prepareChartCard,
  prepareChartSheet,
  preparePlacementCard,
  primaryShareCardVariant,
  savePreparedChartCard,
  type PreparedChartCard,
} from '../lib/share-card';
import { shareCardText } from '../lib/share-card-copy';
import { signForLongitude, signName } from '../lib/signs';
import Wheel from '../lib/wheel/Wheel';
import { CopyLinkButton, type CopyLinkState } from './CopyLinkButton';
import { shareText } from './PositionsShareSurface';

type Mode = 'full' | 'moon' | 'rising';
type CardState = 'idle' | 'busy' | 'saved' | 'error';
type Choice = 'sheet' | 'signature' | 'big-three' | 'full' | 'placement';
type PreparedState = 'idle' | 'preparing' | 'ready' | 'busy' | 'saved' | 'error';

interface Props {
  chart: Chart;
  locale: Locale;
  mode?: Mode;
  card: CardState;
  onCardStateChange: (state: CardState) => void;
  onClose: () => void;
  detailsUrl?: string;
  receiverPath?: string;
  birthReceipt?: string;
  preparedPrimary?: PreparedChartCard | null;
  moonAmbiguous?: boolean;
}

const LINK_COPY = {
  en: {
    copied: 'Link copied', preview: 'Copy link with preview', details: 'Copy link with birth details',
    detailsNote: 'Includes your birth details.',
    previewNote: 'The private link keeps positions in your browser; the preview link sends positions — never birth details — to the preview service.',
    sheet: 'Share chart sheet',
  },
  es: { copied: 'Enlace copiado', preview: 'Copiar enlace con vista previa', details: 'Copiar enlace con datos de nacimiento', detailsNote: 'Incluye tus datos de nacimiento.', previewNote: 'El enlace privado mantiene las posiciones en tu navegador; el enlace con vista previa envía posiciones, nunca datos de nacimiento, al servicio de vista previa.', sheet: 'Compartir hoja de la carta' },
  pt: { copied: 'Link copiado', preview: 'Copiar link com prévia', details: 'Copiar link com dados de nascimento', detailsNote: 'Inclui seus dados de nascimento.', previewNote: 'O link privado mantém as posições no navegador; o link com prévia envia posições, nunca dados de nascimento, ao serviço de prévia.', sheet: 'Compartilhar folha do mapa' },
  fr: { copied: 'Lien copié', preview: 'Copier le lien avec aperçu', details: 'Copier le lien avec données de naissance', detailsNote: 'Inclut tes données de naissance.', previewNote: 'Le lien privé garde les positions dans ton navigateur ; le lien avec aperçu envoie les positions, jamais les données de naissance, au service d’aperçu.', sheet: 'Partager la feuille du thème' },
  it: { copied: 'Link copiato', preview: 'Copia il link con anteprima', details: 'Copia il link con dati di nascita', detailsNote: 'Include i tuoi dati di nascita.', previewNote: 'Il link privato mantiene le posizioni nel browser; il link con anteprima invia le posizioni, mai i dati di nascita, al servizio di anteprima.', sheet: 'Condividi il foglio del tema' },
  ru: { copied: 'Ссылка скопирована', preview: 'Скопировать ссылку с превью', details: 'Скопировать ссылку с данными рождения', detailsNote: 'Включает ваши данные рождения.', previewNote: 'Приватная ссылка хранит положения в браузере; ссылка с превью отправляет сервису превью положения, но не данные рождения.', sheet: 'Поделиться листом карты' },
} as const;

function trackShare(variant: 'details_link' | 'positions_link' | 'big_three_card' | 'full_chart_card' | 'signature_card'): void {
  const analytics = (window as Window & {
    zodiacsAnalytics?: { track?: (name: string, props: { variant: string }) => void };
  }).zodiacsAnalytics;
  analytics?.track?.('chart_share', { variant });
}

export default function ChartShareDialog({
  chart,
  locale,
  mode = 'full',
  card,
  onCardStateChange,
  onClose,
  detailsUrl = '',
  receiverPath = '/birth-chart/',
  birthReceipt,
  preparedPrimary = null,
  moonAmbiguous = false,
}: Props) {
  const copy = LINK_COPY[locale];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hideRef = useRef(true);
  const generationRef = useRef<Record<Choice, number>>({
    sheet: 0, signature: 0, 'big-three': 0, full: 0, placement: 0,
  });
  const preparationRef = useRef(new Map<Choice, number>());
  const [hideBirthDetails, setHideBirthDetails] = useState(true);
  const [links, setLinks] = useState<{ positions: string; preview: string } | null>(null);
  const [linkState, setLinkState] = useState<Record<'positions' | 'preview' | 'details', CopyLinkState>>({
    positions: 'idle', preview: 'idle', details: 'idle',
  });
  const [prepared, setPrepared] = useState<Partial<Record<Choice, PreparedChartCard>>>({});
  const [states, setStates] = useState<Record<Choice, PreparedState>>({
    sheet: 'idle', signature: 'idle', 'big-three': 'idle', full: 'idle', placement: 'idle',
  });

  const primaryChoice: Choice = mode === 'full' ? 'sheet' : 'placement';
  const primaryAlternative = primaryShareCardVariant(locale, Boolean(chart.angles));
  const primaryTitle = mode === 'full'
    ? copy.sheet
    : shareText(locale, mode === 'moon' ? 'moonCardTitle' : 'risingCardTitle');
  const placementLongitude = mode === 'moon'
    ? chart.bodies.find((body) => body.body === 'Moon')?.lon
    : mode === 'rising' ? chart.angles?.asc : undefined;
  const placementSign = placementLongitude == null ? null : signForLongitude(placementLongitude);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    const token = encodePositionsLink({
      bodies: chart.bodies,
      angles: chart.angles ? { asc: chart.angles.asc, mc: chart.angles.mc } : null,
      houseSystem: chart.houses?.system ?? 'whole',
      engineVersion: chart.engineVersion,
    });
    if (!token) return;
    const positions = `${window.location.origin}${receiverPath}#p=${token}`;
    const preview = `${window.location.origin}/api/og/chart?p=${encodeURIComponent(token)}`;
    setLinks({ positions, preview });
  }, [chart, receiverPath]);

  useEffect(() => {
    if (!preparedPrimary) return;
    if (primaryChoice === 'sheet' && !hideRef.current) return;
    setPrepared((current) => ({ ...current, [primaryChoice]: preparedPrimary }));
    setStates((current) => ({ ...current, [primaryChoice]: 'ready' }));
  }, [preparedPrimary, primaryChoice]);

  useEffect(() => {
    if (preparedPrimary) return;
    void prepareChoice(primaryChoice, hideRef.current);
  }, [preparedPrimary, primaryChoice]);

  useEffect(() => {
    if (mode !== 'full') return;
    void prepareChoice(primaryAlternative);
  }, [mode, primaryAlternative]);

  async function buildChoice(choice: Choice, hidden: boolean): Promise<PreparedChartCard> {
    const timeOptions = { referenceTime: !chart.input.timeKnown, moonAmbiguous };
    if (choice === 'sheet') return prepareChartSheet(chart, {
      locale, hideBirthDetails: hidden, birthReceipt, moonAmbiguous,
    });
    if (choice === 'placement') {
      return preparePlacementCard(chart, mode === 'rising' ? 'rising' : 'moon', locale, timeOptions);
    }
    if (choice === 'signature') return prepareChartCard(chart, { variant: 'signature', locale, ...timeOptions });
    if (choice === 'big-three') return prepareBigThreeCard(chart, locale, timeOptions);
    return prepareChartCard(chart, { variant: 'full', locale, ...timeOptions });
  }

  async function prepareChoice(choice: Choice, hidden = hideRef.current): Promise<void> {
    const generation = generationRef.current[choice];
    if (preparationRef.current.get(choice) === generation) return;
    preparationRef.current.set(choice, generation);
    setStates((current) => ({ ...current, [choice]: 'preparing' }));
    try {
      const result = await buildChoice(choice, hidden);
      if (generation !== generationRef.current[choice] || (choice === 'sheet' && hidden !== hideRef.current)) return;
      setPrepared((current) => ({ ...current, [choice]: result }));
      setStates((current) => ({ ...current, [choice]: 'ready' }));
    } catch (error) {
      console.error(error);
      if (generation === generationRef.current[choice]) setStates((current) => ({ ...current, [choice]: 'error' }));
    } finally {
      if (preparationRef.current.get(choice) === generation) preparationRef.current.delete(choice);
    }
  }

  function changePrivacy(hidden: boolean): void {
    generationRef.current.sheet += 1;
    hideRef.current = hidden;
    setHideBirthDetails(hidden);
    setPrepared((current) => {
      const next = { ...current };
      delete next.sheet;
      if (hidden && preparedPrimary) next.sheet = preparedPrimary;
      return next;
    });
    setStates((current) => ({ ...current, sheet: hidden && preparedPrimary ? 'ready' : 'idle' }));
    if (!hidden || !preparedPrimary) void prepareChoice('sheet', hidden);
  }

  function shareChoice(choice: Choice): void {
    const artifact = prepared[choice];
    if (!artifact) {
      void prepareChoice(choice);
      return;
    }
    if (states[choice] === 'busy') return;
    setStates((current) => ({ ...current, [choice]: 'busy' }));
    onCardStateChange('busy');
    void savePreparedChartCard(artifact).then((outcome) => {
      if (outcome === 'cancelled') {
        setStates((current) => ({ ...current, [choice]: 'ready' }));
        onCardStateChange('idle');
        return;
      }
      const variant = choice === 'signature'
        ? 'signature_card'
        : choice === 'big-three' || choice === 'placement'
          ? 'big_three_card'
          : 'full_chart_card';
      trackShare(variant);
      (window as Window & { zodiacsAnalytics?: { track?: (name: string, props: { variant: string }) => void } })
        .zodiacsAnalytics?.track?.('share_card_downloaded', { variant });
      setStates((current) => ({ ...current, [choice]: 'saved' }));
      onCardStateChange('saved');
    }).catch((error) => {
      console.error(error);
      setStates((current) => ({ ...current, [choice]: 'error' }));
      onCardStateChange('error');
    });
  }

  const actionText = (choice: Choice): string => {
    if (states[choice] === 'preparing') return shareText(locale, 'preparingImage');
    if (states[choice] === 'busy') return t(locale, 'rendering');
    if (choice === 'sheet') return copy.sheet;
    if (choice === 'signature') return shareCardText(locale, 'signatureAction');
    if (choice === 'placement') {
      return shareText(locale, mode === 'moon' ? 'moonCardAction' : 'risingCardAction');
    }
    if (choice === 'big-three') return shareCardText(locale, 'bigThreeAction');
    return shareCardText(locale, 'fullChartAction');
  };

  return (
    <dialog
      class="calc-share-dialog"
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
      data-share-dialog
      data-share-mode={mode}
      aria-labelledby="chart-share-title"
    >
      <div class="calc-share-dialog__surface">
        <header class="calc-share-dialog__head">
          <h2 id="chart-share-title">{shareText(locale, 'shareOptionsTitle')}</h2>
          <button class="calc-share-dialog__close" type="button" aria-label={shareText(locale, 'closeShare')} onClick={() => dialogRef.current?.close()}>×</button>
        </header>

        {links && (
          <section class="calc-share-dialog__links" aria-label={shareText(locale, 'shareOptionsTitle')}>
            <CopyLinkButton
              url={links.positions}
              state={linkState.positions}
              onStateChange={(state) => setLinkState((current) => ({ ...current, positions: state }))}
              idleLabel={shareText(locale, 'copyPositionsLink')}
              copiedLabel={copy.copied}
              ariaLabel={shareText(locale, 'copyPositionsLink')}
              buttonClass="btn btn--primary"
              dataHook="positions"
              onCopied={() => trackShare('positions_link')}
            />
            <p class="calc-share-dialog__note">{shareText(locale, 'positionsShareNote')}</p>
            <CopyLinkButton
              url={links.preview}
              state={linkState.preview}
              onStateChange={(state) => setLinkState((current) => ({ ...current, preview: state }))}
              idleLabel={copy.preview}
              copiedLabel={copy.copied}
              ariaLabel={copy.preview}
              buttonClass="btn btn--ghost"
              dataHook="preview"
              onCopied={() => trackShare('positions_link')}
            >
              <p class="calc-share-dialog__note">{copy.previewNote}</p>
            </CopyLinkButton>
            {mode === 'full' && detailsUrl && (
              <CopyLinkButton
                url={detailsUrl}
                state={linkState.details}
                onStateChange={(state) => setLinkState((current) => ({ ...current, details: state }))}
                idleLabel={copy.details}
                copiedLabel={copy.copied}
                ariaLabel={copy.details}
                buttonClass="btn btn--ghost"
                dataHook="details"
                onCopied={() => trackShare('details_link')}
              >
                <p class="calc-share-dialog__note">{copy.detailsNote}</p>
              </CopyLinkButton>
            )}
          </section>
        )}

        <section class="calc-share-dialog__chart" aria-label={primaryTitle} data-share-primary={mode === 'full' ? 'sheet' : 'placement'}>
          {mode === 'full' ? (
            <div class="calc-share-dialog__chart-wheel" aria-hidden="true">
              <Wheel
                bodies={chart.bodies.filter((body) => body.body !== 'South Node')}
                asc={chart.angles?.asc ?? null}
                mc={chart.angles?.mc ?? null}
                cusps={chart.houses?.cusps ?? null}
                aspects={chart.aspects.filter((aspect) => aspect.orb < 6)}
              />
            </div>
          ) : placementSign ? (
            <div class="calc-share-dialog__placement" style={`--sign:${placementSign.hue}`} aria-hidden="true" data-share-placement-preview>
              <span class="calc-share-dialog__placement-glyph">{placementSign.glyph}</span>
              <span>{signName(placementSign, locale)}</span>
            </div>
          ) : null}
          <div class="calc-share-dialog__chart-copy"><h3>{primaryTitle}</h3></div>
        </section>

        {mode === 'full' && (
          <label class="calc-share-dialog__privacy">
            <input type="checkbox" checked={hideBirthDetails} onChange={(event) => changePrivacy(event.currentTarget.checked)} data-hide-birth-details />
            <span>{shareText(locale, 'hideBirthDetails')}</span>
          </label>
        )}

        <div class="calc-share-dialog__cards" role="group" aria-label={shareText(locale, 'moreWaysToShare')}>
          <button
            class="btn btn--primary calc-share-dialog__card"
            type="button"
            onClick={() => shareChoice(primaryChoice)}
            disabled={card === 'busy' || !prepared[primaryChoice] || states[primaryChoice] === 'preparing' || states[primaryChoice] === 'busy'}
            data-share-card-action={primaryChoice}
          >
            <span>{actionText(primaryChoice)}</span><span class="orb">{states[primaryChoice] === 'saved' ? '✓' : '↗'}</span>
          </button>
          {mode === 'full' && (
            <button
              class="btn btn--ghost calc-share-dialog__card"
              type="button"
              onClick={() => shareChoice(primaryAlternative)}
              disabled={card === 'busy' || !prepared[primaryAlternative] || states[primaryAlternative] === 'preparing' || states[primaryAlternative] === 'busy'}
              data-share-card-action={primaryAlternative}
            >
              <span>{actionText(primaryAlternative)}</span><span class="orb">{states[primaryAlternative] === 'saved' ? '✓' : states[primaryAlternative] === 'ready' ? '↗' : '+'}</span>
            </button>
          )}
        </div>
        <p class="calc-share-dialog__note" data-chart-image-privacy>
          {shareText(locale, hideBirthDetails ? 'chartImagePrivacy' : 'chartImagePrivacyDetails')}
        </p>
        {(card === 'error' || Object.values(states).includes('error')) && <p class="calc__error" role="alert">{t(locale, 'cardError')}</p>}
      </div>
    </dialog>
  );
}
