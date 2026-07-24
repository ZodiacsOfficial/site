import { useEffect, useRef, useState } from 'preact/hooks';
import PlanetGlyph from '../components/PlanetGlyph';
import type { Chart } from '../lib/engine/types';
import { t, type CatalogLocale as Locale } from '../lib/i18n';
import { planetLabel } from '../lib/i18n/astrology';
import {
  decodePositionsLink,
  type PositionsShareChart,
} from '../lib/share-positions';
import {
  prepareChartCard,
  savePreparedChartCard,
  type PreparedChartCard,
} from '../lib/share-card';
import { formatLongitude } from '../lib/signs';
import { shareCardText } from '../lib/share-card-copy';
import Wheel from '../lib/wheel/Wheel';
import SignChip from './SignChip';

type CardState = 'idle' | 'busy' | 'saved' | 'error';
type ShareVariant =
  | 'details_link'
  | 'positions_link'
  | 'big_three_card'
  | 'full_chart_card'
  | 'signature_card';
type ShareCardChoice = 'full' | 'big-three';
type PreparedCardState = 'preparing' | 'ready' | 'busy' | 'saved' | 'error';

export const SHARE_POSITIONS_EN = {
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
    preparingImage: 'Preparing image…',
    shareThisImage: 'Share this image',
    moreWaysToShare: 'More ways to share',
    chartImagePrivacy: 'The image includes chart positions and the engine version, but not a name, birth date, time, place, coordinates, or chart link.',
} as const;

const SHARE_COPY = {
  en: SHARE_POSITIONS_EN,
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
    preparingImage: 'Preparando imagen…',
    shareThisImage: 'Compartir esta imagen',
    moreWaysToShare: 'Más formas de compartir',
    chartImagePrivacy: 'La imagen incluye las posiciones de la carta y la versión del motor, pero no el nombre, la fecha, la hora ni el lugar de nacimiento, las coordenadas o un enlace a la carta.',
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
    preparingImage: 'Preparando imagem…',
    shareThisImage: 'Compartilhar esta imagem',
    moreWaysToShare: 'Mais formas de compartilhar',
    chartImagePrivacy: 'A imagem inclui as posições do mapa e a versão do motor, mas não inclui nome, data, hora ou local de nascimento, coordenadas nem link do mapa.',
  },
  fr: {
    shareOptionsTitle: 'Partager ce thème',
    closeShare: 'Fermer les options de partage',
    hideBirthDetails: 'Masquer les données de naissance',
    copyPositionsLink: 'Copier le lien avec les positions uniquement',
    positionsShareNote: 'Le lien omet ta date, ton heure et ton lieu de naissance ; sur l’image, ces données sont remplacées par la version du moteur. Les positions planétaires peuvent tout de même permettre de t’identifier : ce partage n’est pas anonyme.',
    positionsOnlyTitle: 'Positions partagées du thème',
    positionsOnlyNotice: 'Positions uniquement — données de naissance non incluses.',
    positionsOnlyPrivacy: 'Ce code omet la date, l’heure et le lieu de naissance. Les positions planétaires peuvent tout de même permettre de t’identifier : ce partage n’est pas anonyme.',
    positionsLinkInvalid: 'Ce lien avec les positions uniquement est incorrect ou incomplet.',
    shareLinkAmbiguous: 'Ce lien contient deux formats de thème : aucun des deux n’a donc été ouvert.',
    positionsShareUnavailable: 'Impossible de créer un lien avec les positions uniquement pour ce thème.',
    preparingImage: 'Préparation de l’image…',
    shareThisImage: 'Partager cette image',
    moreWaysToShare: 'Autres façons de partager',
    chartImagePrivacy: 'L’image inclut les positions du thème et la version du moteur, mais aucun nom, date, heure ou lieu de naissance, coordonnées ou lien vers le thème.',
  },
  it: {
    shareOptionsTitle: 'Condividi questo tema',
    closeShare: 'Chiudi le opzioni di condivisione',
    hideBirthDetails: 'Nascondi i dati di nascita',
    copyPositionsLink: 'Copia il link con le sole posizioni',
    positionsShareNote: 'Il link omette data, ora e luogo di nascita; nell’immagine, questi dati sono sostituiti dalla versione del motore. Le posizioni planetarie possono comunque identificarti: questa condivisione non è anonima.',
    positionsOnlyTitle: 'Posizioni condivise del tema',
    positionsOnlyNotice: 'Solo posizioni — dati di nascita non inclusi.',
    positionsOnlyPrivacy: 'Questo codice omette data, ora e luogo di nascita. Le posizioni planetarie possono comunque identificarti: non è anonimo.',
    positionsLinkInvalid: 'Questo link con le sole posizioni non è valido o è incompleto.',
    shareLinkAmbiguous: 'Questo link contiene due formati diversi per il tema, quindi non ne è stato aperto nessuno.',
    positionsShareUnavailable: 'Non è stato possibile creare un link con le sole posizioni per questo tema.',
    preparingImage: 'Preparazione immagine…',
    shareThisImage: 'Condividi questa immagine',
    moreWaysToShare: 'Altri modi per condividere',
    chartImagePrivacy: 'L’immagine include le posizioni del tema e la versione del motore, ma non nome, data, ora o luogo di nascita, coordinate o link al tema.',
  },
  ru: {
    shareOptionsTitle: 'Поделиться этой картой',
    closeShare: 'Закрыть варианты отправки',
    hideBirthDetails: 'Скрыть данные рождения',
    copyPositionsLink: 'Скопировать ссылку только с положениями',
    positionsShareNote: 'В ссылке нет даты, времени и места рождения; на карточке вместо них указана версия движка. Положения планет всё равно могут вас идентифицировать — это не анонимная ссылка.',
    positionsOnlyTitle: 'Положения из присланной карты',
    positionsOnlyNotice: 'Только положения — без данных рождения.',
    positionsOnlyPrivacy: 'В этом коде нет даты, времени и места рождения. Положения планет всё равно могут вас идентифицировать; это не анонимно.',
    positionsLinkInvalid: 'Ссылка только с положениями недействительна или неполна.',
    shareLinkAmbiguous: 'В ссылке есть два формата карты, поэтому ни один не был открыт.',
    positionsShareUnavailable: 'Не удалось создать ссылку только с положениями для этой карты.',
    preparingImage: 'Готовим изображение…',
    shareThisImage: 'Поделиться изображением',
    moreWaysToShare: 'Другие способы поделиться',
    chartImagePrivacy: 'На изображении есть положения карты и версия движка, но нет имени, даты, времени и места рождения, координат или ссылки на карту.',
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

function trackCardDownloaded(variant: Exclude<ShareVariant, 'details_link' | 'positions_link'>) {
  const analytics = (window as Window & {
    zodiacsAnalytics?: { track?: (name: string, props: { variant: ShareVariant }) => void };
  }).zodiacsAnalytics;
  analytics?.track?.('share_card_downloaded', { variant });
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
  locale: Locale;
  card: CardState;
  onCardStateChange: (state: CardState) => void;
  onClose: () => void;
}

/** Lazily mounted so the ordinary calculator bundle pays only for its opener. */
export function ChartShareDialog({
  chart,
  locale,
  card,
  onCardStateChange,
  onClose,
}: ChartShareDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [preparedCards, setPreparedCards] = useState<Partial<Record<ShareCardChoice, PreparedChartCard>>>({});
  const [cardStates, setCardStates] = useState<Record<ShareCardChoice, PreparedCardState>>({
    full: 'preparing',
    'big-three': 'preparing',
  });
  const hasBigThree = chart.angles !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    let current = true;
    setPreparedCards({});
    setCardStates({ full: 'preparing', 'big-three': 'preparing' });

    const prepare = (variant: ShareCardChoice) => {
      void prepareChartCard(chart, { variant, locale }).then((prepared) => {
        if (!current) return;
        setPreparedCards((value) => ({ ...value, [variant]: prepared }));
        setCardStates((value) => ({ ...value, [variant]: 'ready' }));
      }).catch((error) => {
        console.error(error);
        if (current) setCardStates((value) => ({ ...value, [variant]: 'error' }));
      });
    };

    prepare('full');
    if (hasBigThree) prepare('big-three');
    return () => { current = false; };
  }, [chart, hasBigThree, locale]);

  function shareCard(variant: ShareCardChoice): void {
    const prepared = preparedCards[variant];
    if (!prepared || cardStates[variant] === 'busy') return;
    setCardStates((value) => ({ ...value, [variant]: 'busy' }));
    onCardStateChange('busy');
    // savePreparedChartCard calls navigator.share before its returned promise
    // yields, preserving the activation from this exact button tap on iOS.
    void savePreparedChartCard(prepared).then((outcome) => {
      if (outcome === 'cancelled') {
        setCardStates((value) => ({ ...value, [variant]: 'ready' }));
        onCardStateChange('idle');
        return;
      }
      const analyticsVariant = variant === 'big-three' ? 'big_three_card' : 'full_chart_card';
      trackShare(analyticsVariant);
      trackCardDownloaded(analyticsVariant);
      setCardStates((value) => ({ ...value, [variant]: 'saved' }));
      onCardStateChange('saved');
    }).catch((error) => {
      console.error(error);
      setCardStates((value) => ({ ...value, [variant]: 'error' }));
      onCardStateChange('error');
    });
  }

  const actionLabel = (variant: ShareCardChoice): string =>
    shareCardText(locale, variant === 'big-three' ? 'bigThreeAction' : 'fullChartAction');

  const stateLabel = (variant: ShareCardChoice): string => {
    const state = cardStates[variant];
    if (state === 'preparing') return shareText(locale, 'preparingImage');
    if (state === 'busy') return t(locale, 'rendering');
    if (state === 'saved') return t(locale, 'cardSaved');
    return '';
  };

  return (
    <dialog
      class="calc-share-dialog"
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      data-share-dialog
      data-share-mode={hasBigThree ? 'chart-and-big-three' : 'full'}
      aria-labelledby="chart-share-title"
    >
      <div class="calc-share-dialog__surface">
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

        <section
          class="calc-share-dialog__chart"
          aria-labelledby="chart-primary-share-preview-title"
          data-share-primary="full"
        >
          <div class="calc-share-dialog__chart-wheel" aria-hidden="true">
            <Wheel
              bodies={chart.bodies.filter((body) => body.body !== 'South Node')}
              asc={chart.angles?.asc ?? null}
              mc={chart.angles?.mc ?? null}
              cusps={chart.houses?.cusps ?? null}
              aspects={chart.aspects.filter((aspect) => aspect.orb < 6)}
            />
          </div>
          <div class="calc-share-dialog__chart-copy">
            <span class="mono--label">{shareCardText(locale, 'fullChartTitle')}</span>
            <h3 id="chart-primary-share-preview-title">{shareText(locale, 'shareOptionsTitle')}</h3>
          </div>
        </section>

        <div
          class="calc-share-dialog__cards"
          role="group"
          aria-label={shareText(locale, 'shareOptionsTitle')}
        >
          {hasBigThree && (
            <button
              class="btn btn--primary calc-share-dialog__card"
              type="button"
              onClick={() => shareCard('big-three')}
              disabled={card === 'busy' || !preparedCards['big-three'] || cardStates['big-three'] === 'preparing' || cardStates['big-three'] === 'busy'}
              data-share-card-action="big-three"
            >
              <span>{actionLabel('big-three')}</span>
              {stateLabel('big-three') && <span class="sr-only">{stateLabel('big-three')}</span>}
              <span class="orb" aria-hidden="true">{cardStates['big-three'] === 'saved' ? '✓' : '↗'}</span>
            </button>
          )}
          <button
            class={`btn ${hasBigThree ? 'btn--ghost' : 'btn--primary'} calc-share-dialog__card`}
            type="button"
            onClick={() => shareCard('full')}
            disabled={card === 'busy' || !preparedCards.full || cardStates.full === 'preparing' || cardStates.full === 'busy'}
            data-share-card-action="full"
          >
            <span>{actionLabel('full')}</span>
            {stateLabel('full') && <span class="sr-only">{stateLabel('full')}</span>}
            <span class="orb" aria-hidden="true">{cardStates.full === 'saved' ? '✓' : '↗'}</span>
          </button>
        </div>

        <p class="calc-share-dialog__note">{shareText(locale, 'chartImagePrivacy')}</p>
        {card === 'saved' && <p class="sr-only" role="status">{t(locale, 'chartCardSaved')}</p>}
        {(card === 'error' || Object.values(cardStates).includes('error')) && (
          <p class="calc__error" role="alert">{t(locale, 'cardError')}</p>
        )}
      </div>
    </dialog>
  );
}
