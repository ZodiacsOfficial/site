import { useEffect, useRef } from 'preact/hooks';
import AspectGlyph from '../components/AspectGlyph';
import PlanetGlyph from '../components/PlanetGlyph';
import { trackAnalytics } from '../lib/analytics';
import type { Chart } from '../lib/engine/types';
import { t, type CatalogLocale as Locale } from '../lib/i18n';
import { aspectLabel, planetLabel } from '../lib/i18n/astrology';
import { natalAspectLine } from '../lib/natal';
import {
  decodePositionsLink,
  type PositionsShareChart,
} from '../lib/share-positions';
import {
  prepareChartSheet,
  preparePlacementCard,
  savePreparedChartCard,
  type PreparedChartCard,
} from '../lib/share-card';
import { formatLongitude } from '../lib/signs';
import { positionsReading } from '../lib/share-positions-reading';
import Wheel from '../lib/wheel/Wheel';
import SignChip from './SignChip';

export const SHARE_POSITIONS_EN = {
    shareOptionsTitle: 'Share this chart',
    closeShare: 'Close sharing options',
    hideBirthDetails: 'Hide birth details',
    copyPositionsLink: 'Copy positions-only link',
    positionsShareNote: 'The link omits your birth date, time, and place; the chart sheet replaces that receipt with calculation settings. Planetary positions can still be identifying; this is not anonymous.',
    positionsOnlyTitle: 'Shared chart positions',
    positionsOnlyNotice: 'Positions only — birth details not included.',
    positionsOnlyPrivacy: 'This link omits the birth date, time, and place. Planetary positions can still be identifying; it is not anonymous.',
    reconstructedHouses: 'Houses are reconstructed as whole sign from the shared Ascendant. The original house calculation cannot be rebuilt from positions alone.',
    sharedAspects: 'Major aspects',
    positionsLinkInvalid: 'That positions-only link is invalid or incomplete.',
    shareLinkAmbiguous: 'This link contains two chart formats, so neither one was opened.',
    positionsShareUnavailable: "Couldn't create a positions-only link for this chart.",
    preparingImage: 'Preparing image…',
    shareThisImage: 'Share this image',
    moreWaysToShare: 'More ways to share',
    chartImagePrivacy: 'The image includes chart positions and calculation settings, but not a name, birth date, time, place, coordinates, or chart link.',
    chartImagePrivacyDetails: 'This image includes the birth date, time, and place shown above. It does not include a name, coordinates, or chart link.',
    moonCardTitle: 'Moon sign card',
    risingCardTitle: 'Rising sign card',
    moonCardAction: 'Share my Moon sign',
    risingCardAction: 'Share my Rising sign',
} as const;

const SHARE_COPY = {
  en: SHARE_POSITIONS_EN,
  es: {
    shareOptionsTitle: 'Compartir esta carta',
    closeShare: 'Cerrar opciones para compartir',
    hideBirthDetails: 'Ocultar datos de nacimiento',
    copyPositionsLink: 'Copiar enlace solo con posiciones',
    positionsShareNote: 'El enlace omite tu fecha, hora y lugar de nacimiento; la hoja de la carta reemplaza esos datos con los ajustes de cálculo. Las posiciones planetarias aún pueden identificarte; no es anónimo.',
    positionsOnlyTitle: 'Posiciones compartidas de la carta',
    positionsOnlyNotice: 'Solo posiciones — no se incluyen datos de nacimiento.',
    positionsOnlyPrivacy: 'Este código omite la fecha, hora y lugar de nacimiento. Las posiciones planetarias aún pueden identificarte; no es anónimo.',
    reconstructedHouses: 'Las casas se reconstruyen por signo entero desde el Ascendente compartido. El cálculo original no puede reconstruirse solo con las posiciones.',
    sharedAspects: 'Aspectos mayores',
    positionsLinkInvalid: 'Ese enlace solo con posiciones no es válido o está incompleto.',
    shareLinkAmbiguous: 'Este enlace contiene dos formatos de carta, por lo que no se abrió ninguno.',
    positionsShareUnavailable: 'No se pudo crear un enlace solo con posiciones para esta carta.',
    preparingImage: 'Preparando imagen…',
    shareThisImage: 'Compartir esta imagen',
    moreWaysToShare: 'Más formas de compartir',
    chartImagePrivacy: 'La imagen incluye las posiciones de la carta y los ajustes de cálculo, pero no el nombre, la fecha, la hora ni el lugar de nacimiento, las coordenadas o un enlace a la carta.',
    chartImagePrivacyDetails: 'Esta imagen incluye la fecha, la hora y el lugar de nacimiento indicados arriba. No incluye el nombre, las coordenadas ni un enlace a la carta.',
    moonCardTitle: 'Tarjeta del signo lunar',
    risingCardTitle: 'Tarjeta del ascendente',
    moonCardAction: 'Compartir mi signo lunar',
    risingCardAction: 'Compartir mi ascendente',
  },
  pt: {
    shareOptionsTitle: 'Compartilhar este mapa',
    closeShare: 'Fechar opções de compartilhamento',
    hideBirthDetails: 'Ocultar dados de nascimento',
    copyPositionsLink: 'Copiar link apenas com posições',
    positionsShareNote: 'O link omite sua data, hora e local de nascimento; a folha do mapa substitui esses dados pelas configurações de cálculo. As posições planetárias ainda podem identificar você; isso não é anônimo.',
    positionsOnlyTitle: 'Posições compartilhadas do mapa',
    positionsOnlyNotice: 'Apenas posições — os dados de nascimento não estão incluídos.',
    positionsOnlyPrivacy: 'Este código omite a data, a hora e o local de nascimento. As posições planetárias ainda podem identificar você; isto não é anônimo.',
    reconstructedHouses: 'As casas são reconstruídas por signo inteiro a partir do Ascendente compartilhado. O cálculo original não pode ser refeito apenas com as posições.',
    sharedAspects: 'Aspectos principais',
    positionsLinkInvalid: 'Esse link apenas com posições é inválido ou está incompleto.',
    shareLinkAmbiguous: 'Este link contém dois formatos de mapa, por isso nenhum deles foi aberto.',
    positionsShareUnavailable: 'Não foi possível criar um link apenas com posições para este mapa.',
    preparingImage: 'Preparando imagem…',
    shareThisImage: 'Compartilhar esta imagem',
    moreWaysToShare: 'Mais formas de compartilhar',
    chartImagePrivacy: 'A imagem inclui as posições do mapa e as configurações de cálculo, mas não inclui nome, data, hora ou local de nascimento, coordenadas nem link do mapa.',
    chartImagePrivacyDetails: 'Esta imagem inclui a data, a hora e o local de nascimento mostrados acima. Não inclui nome, coordenadas nem link do mapa.',
    moonCardTitle: 'Cartão do signo lunar',
    risingCardTitle: 'Cartão do ascendente',
    moonCardAction: 'Compartilhar meu signo lunar',
    risingCardAction: 'Compartilhar meu ascendente',
  },
  fr: {
    shareOptionsTitle: 'Partager ce thème',
    closeShare: 'Fermer les options de partage',
    hideBirthDetails: 'Masquer les données de naissance',
    copyPositionsLink: 'Copier le lien avec les positions uniquement',
    positionsShareNote: 'Le lien omet ta date, ton heure et ton lieu de naissance ; la feuille du thème remplace ces données par les réglages de calcul. Les positions planétaires peuvent tout de même permettre de t’identifier : ce partage n’est pas anonyme.',
    positionsOnlyTitle: 'Positions partagées du thème',
    positionsOnlyNotice: 'Positions uniquement — données de naissance non incluses.',
    positionsOnlyPrivacy: 'Ce code omet la date, l’heure et le lieu de naissance. Les positions planétaires peuvent tout de même permettre de t’identifier : ce partage n’est pas anonyme.',
    reconstructedHouses: 'Les maisons sont reconstruites en signes entiers à partir de l’Ascendant partagé. Le calcul d’origine ne peut pas être retrouvé à partir des seules positions.',
    sharedAspects: 'Aspects majeurs',
    positionsLinkInvalid: 'Ce lien avec les positions uniquement est incorrect ou incomplet.',
    shareLinkAmbiguous: 'Ce lien contient deux formats de thème : aucun des deux n’a donc été ouvert.',
    positionsShareUnavailable: 'Impossible de créer un lien avec les positions uniquement pour ce thème.',
    preparingImage: 'Préparation de l’image…',
    shareThisImage: 'Partager cette image',
    moreWaysToShare: 'Autres façons de partager',
    chartImagePrivacy: 'L’image inclut les positions du thème et les réglages de calcul, mais aucun nom, date, heure ou lieu de naissance, coordonnées ou lien vers le thème.',
    chartImagePrivacyDetails: 'Cette image inclut la date, l’heure et le lieu de naissance indiqués ci-dessus. Elle n’inclut ni nom, ni coordonnées, ni lien vers le thème.',
    moonCardTitle: 'Carte du signe lunaire',
    risingCardTitle: 'Carte de l’Ascendant',
    moonCardAction: 'Partager mon signe lunaire',
    risingCardAction: 'Partager mon Ascendant',
  },
  it: {
    shareOptionsTitle: 'Condividi questo tema',
    closeShare: 'Chiudi le opzioni di condivisione',
    hideBirthDetails: 'Nascondi i dati di nascita',
    copyPositionsLink: 'Copia il link con le sole posizioni',
    positionsShareNote: 'Il link omette data, ora e luogo di nascita; il foglio del tema sostituisce questi dati con le impostazioni di calcolo. Le posizioni planetarie possono comunque identificarti: questa condivisione non è anonima.',
    positionsOnlyTitle: 'Posizioni condivise del tema',
    positionsOnlyNotice: 'Solo posizioni — dati di nascita non inclusi.',
    positionsOnlyPrivacy: 'Questo codice omette data, ora e luogo di nascita. Le posizioni planetarie possono comunque identificarti: non è anonimo.',
    reconstructedHouses: 'Le case sono ricostruite a segno intero dall’Ascendente condiviso. Il calcolo originale non può essere ricavato dalle sole posizioni.',
    sharedAspects: 'Aspetti maggiori',
    positionsLinkInvalid: 'Questo link con le sole posizioni non è valido o è incompleto.',
    shareLinkAmbiguous: 'Questo link contiene due formati diversi per il tema, quindi non ne è stato aperto nessuno.',
    positionsShareUnavailable: 'Non è stato possibile creare un link con le sole posizioni per questo tema.',
    preparingImage: 'Preparazione immagine…',
    shareThisImage: 'Condividi questa immagine',
    moreWaysToShare: 'Altri modi per condividere',
    chartImagePrivacy: 'L’immagine include le posizioni del tema e le impostazioni di calcolo, ma non nome, data, ora o luogo di nascita, coordinate o link al tema.',
    chartImagePrivacyDetails: 'Questa immagine include data, ora e luogo di nascita indicati sopra. Non include nome, coordinate né un link al tema.',
    moonCardTitle: 'Carta del segno lunare',
    risingCardTitle: 'Carta dell’Ascendente',
    moonCardAction: 'Condividi il mio segno lunare',
    risingCardAction: 'Condividi il mio Ascendente',
  },
  ru: {
    shareOptionsTitle: 'Поделиться этой картой',
    closeShare: 'Закрыть варианты отправки',
    hideBirthDetails: 'Скрыть данные рождения',
    copyPositionsLink: 'Скопировать ссылку только с положениями',
    positionsShareNote: 'В ссылке нет даты, времени и места рождения; на листе карты вместо них указаны настройки расчёта. Положения планет всё равно могут вас идентифицировать — это не анонимная ссылка.',
    positionsOnlyTitle: 'Положения из присланной карты',
    positionsOnlyNotice: 'Только положения — без данных рождения.',
    positionsOnlyPrivacy: 'В этом коде нет даты, времени и места рождения. Положения планет всё равно могут вас идентифицировать; это не анонимно.',
    reconstructedHouses: 'Дома восстановлены как целые знаки от переданного Асцендента. Исходный расчёт домов нельзя восстановить только по положениям.',
    sharedAspects: 'Мажорные аспекты',
    positionsLinkInvalid: 'Ссылка только с положениями недействительна или неполна.',
    shareLinkAmbiguous: 'В ссылке есть два формата карты, поэтому ни один не был открыт.',
    positionsShareUnavailable: 'Не удалось создать ссылку только с положениями для этой карты.',
    preparingImage: 'Готовим изображение…',
    shareThisImage: 'Поделиться изображением',
    moreWaysToShare: 'Другие способы поделиться',
    chartImagePrivacy: 'На изображении есть положения карты и настройки расчёта, но нет имени, даты, времени и места рождения, координат или ссылки на карту.',
    chartImagePrivacyDetails: 'На этом изображении есть указанные выше дата, время и место рождения. Имя, координаты и ссылка на карту не включены.',
    moonCardTitle: 'Карточка знака Луны',
    risingCardTitle: 'Карточка асцендента',
    moonCardAction: 'Поделиться знаком Луны',
    risingCardAction: 'Поделиться асцендентом',
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

export function preparePrimaryShareArtifact(
  chart: Chart,
  mode: 'full' | 'moon' | 'rising',
  locale: Locale,
  moonAmbiguous = false,
): Promise<PreparedChartCard> {
  return mode === 'full'
    ? prepareChartSheet(chart, { locale, hideBirthDetails: true, moonAmbiguous })
    : preparePlacementCard(chart, mode, locale, {
      referenceTime: !chart.input.timeKnown,
      moonAmbiguous,
    });
}

export function sharePreparedArtifact(prepared: PreparedChartCard) {
  return savePreparedChartCard(prepared);
}

export async function sharePrimaryArtifact(
  prepared: PreparedChartCard,
  mode: 'full' | 'moon' | 'rising',
): Promise<'idle' | 'saved' | 'error'> {
  try {
    const outcome = await savePreparedChartCard(prepared);
    if (outcome === 'cancelled') return 'idle';
    const variant = mode === 'full' ? 'full_chart_card' : 'big_three_card';
    trackAnalytics('chart_share', { variant });
    trackAnalytics('share_card_downloaded', { variant });
    return 'saved';
  } catch (error) {
    console.error(error);
    return 'error';
  }
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
  const reading = positionsReading(chart);

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
              cusps={reading.cusps}
              aspects={reading.aspects}
            />
          </div>
          <p class="calc__receipt mono">{t(locale, 'engine')}{chart.engineVersion}</p>
        </div>
      </div>

      <div class="calc__table-wrap">
        <table class="calc__table">
          <thead>
            <tr><th>{t(locale, 'body')}</th><th>{t(locale, 'position')}</th><th>{t(locale, 'sign')}</th>{reading.cusps && <th>{t(locale, 'house')}</th>}</tr>
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
                {reading.cusps && <td class="mono">{reading.houses.get(row.body ?? (row.key === 'asc' ? 'ASC' : 'MC'))}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reading.reconstructedWholeSign && (
        <p class="calc__positions-privacy" data-reconstructed-houses>{shareText(locale, 'reconstructedHouses')}</p>
      )}
      {reading.topAspects.length > 0 && (
        <section class="calc__aspects calc__positions-aspects" aria-labelledby="shared-aspects-title">
          <h3 id="shared-aspects-title">{shareText(locale, 'sharedAspects')}</h3>
          <ul>
            {reading.topAspects.map((aspect) => (
              <li key={`${aspect.a}-${aspect.type}-${aspect.b}`}>
                <p class="mono">
                  <PlanetGlyph body={aspect.a} size={13} /> {planetLabel(locale, aspect.a)}{' '}
                  <AspectGlyph type={aspect.type} size={13} /> {aspectLabel(locale, aspect.type)}{' '}
                  <PlanetGlyph body={aspect.b} size={13} /> {planetLabel(locale, aspect.b)} · {t(locale, 'orb')} {aspect.orb.toFixed(1)}°
                </p>
                {locale === 'en' && <p>{natalAspectLine(aspect.a, aspect.type, aspect.b)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
