import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import PlanetGlyph from '../components/PlanetGlyph';
import type { Chart } from '../lib/engine/types';
import { localizePath, t, type Locale } from '../lib/i18n';
import { planetLabel } from '../lib/i18n/astrology';
import {
  decodePositionsLink,
  encodePositionsLink,
  type PositionsShareChart,
  type PositionsShareInput,
} from '../lib/share-positions';
import type { ShareChartInput } from '../lib/share';
import { formatLongitude } from '../lib/signs';
import Wheel from '../lib/wheel/Wheel';
import { CopyLinkButton, type CopyLinkState } from './CopyLinkButton';
import SignChip from './SignChip';

type CardState = 'idle' | 'busy' | 'saved' | 'error';
type ShareVariant = 'details_link' | 'positions_link' | 'details_card' | 'positions_card';

const SHARE_COPY = {
  en: {
    shareOptionsTitle: 'Share this chart',
    closeShare: 'Close sharing options',
    hideBirthDetails: 'Hide birth details',
    copyPositionsLink: 'Copy positions-only link',
    positionsShareNote: 'The link omits your birth date, time, and place; the card replaces that receipt with the engine version. Planetary positions can still be identifying; this is not anonymous.',
    positionsOnlyTitle: 'Shared chart positions',
    positionsOnlyNotice: 'Positions only — birth details not included.',
    positionsOnlyPrivacy: 'This token omits the birth date, time, and place. Planetary positions can still be identifying; it is not anonymous.',
    positionsLinkInvalid: 'That positions-only link is invalid or incomplete.',
    shareLinkAmbiguous: 'This link contains two chart formats, so neither one was opened.',
    positionsShareUnavailable: "Couldn't create a positions-only link for this chart.",
  },
  es: {
    shareOptionsTitle: 'Compartir esta carta',
    closeShare: 'Cerrar opciones para compartir',
    hideBirthDetails: 'Ocultar datos de nacimiento',
    copyPositionsLink: 'Copiar enlace solo con posiciones',
    positionsShareNote: 'El enlace omite tu fecha, hora y lugar de nacimiento; la tarjeta reemplaza ese recibo con la versión del motor. Las posiciones planetarias aún pueden identificarte; no es anónimo.',
    positionsOnlyTitle: 'Posiciones compartidas de la carta',
    positionsOnlyNotice: 'Solo posiciones — no se incluyen datos de nacimiento.',
    positionsOnlyPrivacy: 'Este código omite la fecha, hora y lugar de nacimiento. Las posiciones planetarias aún pueden identificarte; no es anónimo.',
    positionsLinkInvalid: 'Ese enlace solo con posiciones no es válido o está incompleto.',
    shareLinkAmbiguous: 'Este enlace contiene dos formatos de carta, por lo que no se abrió ninguno.',
    positionsShareUnavailable: 'No se pudo crear un enlace solo con posiciones para esta carta.',
  },
  pt: {
    shareOptionsTitle: 'Compartilhar este mapa',
    closeShare: 'Fechar opções de compartilhamento',
    hideBirthDetails: 'Ocultar dados de nascimento',
    copyPositionsLink: 'Copiar link apenas com posições',
    positionsShareNote: 'O link omite sua data, hora e local de nascimento; no cartão, esses dados são substituídos pela versão do motor. As posições planetárias ainda podem identificar você; isso não é anônimo.',
    positionsOnlyTitle: 'Posições compartilhadas do mapa',
    positionsOnlyNotice: 'Apenas posições — os dados de nascimento não estão incluídos.',
    positionsOnlyPrivacy: 'Este código omite a data, a hora e o local de nascimento. As posições planetárias ainda podem identificar você; isto não é anônimo.',
    positionsLinkInvalid: 'Esse link apenas com posições é inválido ou está incompleto.',
    shareLinkAmbiguous: 'Este link contém dois formatos de mapa, por isso nenhum deles foi aberto.',
    positionsShareUnavailable: 'Não foi possível criar um link apenas com posições para este mapa.',
  },
  fr: {
    shareOptionsTitle: 'Partager ce thème',
    closeShare: 'Fermer les options de partage',
    hideBirthDetails: 'Masquer les données de naissance',
    copyPositionsLink: 'Copier le lien avec les positions uniquement',
    positionsShareNote: 'Le lien omet ta date, ton heure et ton lieu de naissance ; la carte remplace ces données par la version du moteur. Les positions planétaires peuvent tout de même permettre de t’identifier : ce partage n’est pas anonyme.',
    positionsOnlyTitle: 'Positions partagées du thème',
    positionsOnlyNotice: 'Positions uniquement — données de naissance non incluses.',
    positionsOnlyPrivacy: 'Ce code omet la date, l’heure et le lieu de naissance. Les positions planétaires peuvent tout de même permettre de t’identifier : ce partage n’est pas anonyme.',
    positionsLinkInvalid: 'Ce lien avec les positions uniquement est incorrect ou incomplet.',
    shareLinkAmbiguous: 'Ce lien contient deux formats de thème : aucun des deux n’a donc été ouvert.',
    positionsShareUnavailable: 'Impossible de créer un lien avec les positions uniquement pour ce thème.',
  },
} as const;

export type ShareCopyKey = keyof typeof SHARE_COPY.en;

export function shareText(locale: Locale, key: ShareCopyKey): string {
  return SHARE_COPY[locale][key];
}

/** Kept behind this module's dynamic boundary for the calculator receiver. */
export function decodePositionsToken(token: string): PositionsShareChart | null {
  return decodePositionsLink(token);
}

function trackShare(variant: ShareVariant) {
  const analytics = (window as Window & {
    zodiacsAnalytics?: { track?: (name: string, props: { variant: ShareVariant }) => void };
  }).zodiacsAnalytics;
  analytics?.track?.('chart_share', { variant });
}

interface PositionsOnlyResultProps {
  chart: PositionsShareChart;
  locale: Locale;
}

/** The intentionally reduced receiver for a v2 share token. */
export function PositionsOnlyResult({ chart, locale }: PositionsOnlyResultProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      rootRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      headingRef.current?.focus();
    });
  }, []);

  const rows = chart.angles
    ? [
      ...chart.bodies.map((body) => ({ key: body.body, label: planetLabel(locale, body.body), lon: body.lon, body: body.body })),
      { key: 'asc', label: 'ASC', lon: chart.angles.asc, body: null },
      { key: 'mc', label: 'MC', lon: chart.angles.mc, body: null },
    ]
    : chart.bodies.map((body) => ({ key: body.body, label: planetLabel(locale, body.body), lon: body.lon, body: body.body }));

  return (
    <section class="calc__result calc__positions-only" ref={rootRef} data-positions-only>
      <h2 class="calc__positions-title" tabIndex={-1} ref={headingRef}>
        {shareText(locale, 'positionsOnlyTitle')}
      </h2>
      <p class="notice" role="status">{shareText(locale, 'positionsOnlyNotice')}</p>
      <p class="calc__positions-privacy">{shareText(locale, 'positionsOnlyPrivacy')}</p>

      <div class="calc__wheel shell">
        <div class="core calc__wheel-core">
          <div aria-hidden="true">
            <Wheel
              bodies={chart.bodies.filter((body) => body.body !== 'South Node')}
              asc={chart.angles?.asc ?? null}
              mc={chart.angles?.mc ?? null}
              cusps={null}
              aspects={[]}
            />
          </div>
          <p class="calc__receipt mono">{t(locale, 'engine')}{chart.engineVersion}</p>
        </div>
      </div>

      <div class="calc__table-wrap">
        <table class="calc__table">
          <thead>
            <tr><th>{t(locale, 'body')}</th><th>{t(locale, 'position')}</th><th>{t(locale, 'sign')}</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  {row.body && <span class="calc__glyph"><PlanetGlyph body={row.body} size={15} /></span>}
                  {row.label}
                </td>
                <td class="mono">{formatLongitude(row.lon, locale).split(' ')[0]}</td>
                <td><SignChip lon={row.lon} locale={locale} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface ChartShareDialogProps {
  chart: Chart;
  input: ShareChartInput;
  locale: Locale;
  fullUrl: string;
  card: CardState;
  onCardStateChange: (state: CardState) => void;
  onClose: () => void;
}

/** Lazily mounted so the ordinary calculator bundle pays only for its opener. */
export function ChartShareDialog({
  chart,
  input,
  locale,
  fullUrl,
  card,
  onCardStateChange,
  onClose,
}: ChartShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hideBirthDetails, setHideBirthDetails] = useState(false);
  const [linkState, setLinkState] = useState<CopyLinkState>('idle');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const positionsInput: PositionsShareInput = useMemo(() => ({
    bodies: chart.bodies,
    angles: chart.angles ? { asc: chart.angles.asc, mc: chart.angles.mc } : null,
    houseSystem: chart.houses?.system ?? input.houseSystem,
    engineVersion: chart.engineVersion,
  }), [chart, input.houseSystem]);
  const positionsToken = useMemo(() => encodePositionsLink(positionsInput), [positionsInput]);
  const positionsUrl = useMemo(() => {
    if (!positionsToken) return null;
    return `${window.location.origin}${localizePath(locale, '/birth-chart/')}#p=${positionsToken}`;
  }, [locale, positionsToken]);
  const activeUrl = hideBirthDetails ? (positionsUrl ?? '') : fullUrl;

  function changePrivacy(next: boolean) {
    if (card === 'busy') return;
    setLinkState('idle');
    onCardStateChange('idle');
    setHideBirthDetails(next);
  }

  async function saveCard() {
    onCardStateChange('busy');
    trackShare(hideBirthDetails ? 'positions_card' : 'details_card');
    try {
      const { saveChartCard } = await import('../lib/share-card');
      const outcome = hideBirthDetails
        ? await saveChartCard(chart, input, { hideBirthDetails: true })
        : await saveChartCard(chart, input);
      onCardStateChange(outcome === 'cancelled' ? 'idle' : 'saved');
    } catch (error) {
      console.error(error);
      onCardStateChange('error');
    }
  }

  return (
    <dialog
      class="calc-share-dialog shell"
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      data-share-dialog
      data-share-mode={hideBirthDetails ? 'positions' : 'details'}
      aria-labelledby="chart-share-title"
    >
      <div class="core calc-share-dialog__core">
        <header class="calc-share-dialog__head">
          <h2 id="chart-share-title">{shareText(locale, 'shareOptionsTitle')}</h2>
          <button
            class="calc-share-dialog__close"
            type="button"
            aria-label={shareText(locale, 'closeShare')}
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </header>

        <label class="calc-share-dialog__toggle">
          <input
            type="checkbox"
            checked={hideBirthDetails}
            disabled={card === 'busy'}
            onChange={(event) => changePrivacy((event.currentTarget as HTMLInputElement).checked)}
            data-hide-birth-details
          />
          <span>{shareText(locale, 'hideBirthDetails')}</span>
        </label>

        <p class="calc-share-dialog__note">
          {hideBirthDetails ? shareText(locale, 'positionsShareNote') : t(locale, 'shareNote')}
        </p>

        {hideBirthDetails && !positionsUrl && (
          <p class="calc__error" role="alert">{shareText(locale, 'positionsShareUnavailable')}</p>
        )}

        {(!hideBirthDetails || positionsUrl) && (
          <CopyLinkButton
            url={activeUrl}
            state={linkState}
            onStateChange={(next) => {
              setLinkState(next);
              trackShare(hideBirthDetails ? 'positions_link' : 'details_link');
            }}
            idleLabel={hideBirthDetails ? shareText(locale, 'copyPositionsLink') : t(locale, 'copyChartLink')}
            copiedLabel={t(locale, 'linkCopied')}
            ariaLabel={t(locale, 'linkToChart')}
            buttonClass="btn btn--glass"
            dataHook="share"
          />
        )}

        <button
          class="btn btn--ghost calc-share-dialog__card"
          type="button"
          onClick={saveCard}
          disabled={card === 'busy'}
          data-share-card-action
        >
          <span>{card === 'busy' ? t(locale, 'rendering') : card === 'saved' ? t(locale, 'cardSaved') : t(locale, 'saveChartCard')}</span>
          <span class="orb">{card === 'saved' ? '✓' : '↗'}</span>
        </button>

        {linkState === 'copied' && <p class="sr-only" role="status">{t(locale, 'chartLinkCopied')}</p>}
        {card === 'saved' && <p class="sr-only" role="status">{t(locale, 'chartCardSaved')}</p>}
        {card === 'error' && <p class="calc__error" role="alert">{t(locale, 'cardError')}</p>}
      </div>
    </dialog>
  );
}
