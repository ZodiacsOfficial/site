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
import { ensurePastelZodiacIconEmbedding } from '../lib/share-card-pastel-icons';
import { degreeInSign, formatLongitude } from '../lib/signs';
import { moonIsUncertain } from '../lib/moon-certainty';
import { positionsReading } from '../lib/share-positions-reading';
import Wheel from '../lib/wheel/Wheel';
import SignChip from './SignChip';

export const SHARE_POSITIONS_EN = {
    shareOptionsTitle: 'Share this chart',
    closeShare: 'Close sharing options',
    hideBirthDetails: 'Hide birth details',
    copyPositionsLink: 'Copy positions-only link',
    positionsShareNote: 'The link has no name, birth date, time or place fields. Its exact positions still give your birth date and time. They give your birthplace only as a region about 500 km across.',
    positionsOnlyTitle: 'Shared chart positions',
    positionsOnlyNotice: 'Positions only, with no name, date, time or place fields.',
    positionsOnlyPrivacy: 'The exact positions still give the birth date and time. They give the birthplace only as a region about 500 km across.',
    reconstructedHouses: 'Houses are reconstructed as whole sign from the shared Ascendant. The original house calculation cannot be rebuilt from positions alone.',
    sharedAspects: 'Major aspects',
    positionsLinkInvalid: 'That positions-only link is invalid or incomplete.',
    shareLinkAmbiguous: 'This link contains two chart formats, so neither one was opened.',
    positionsShareUnavailable: "Couldn't create a positions-only link for this chart.",
    preparingImage: 'Preparing image…',
    shareThisImage: 'Share this image',
    moreWaysToShare: 'More ways to share',
    chartImagePrivacy: 'The image shows chart positions and calculation settings, with no name, birth date, time, place, coordinates or chart link. Its positions still give the birth date and time, and its Ascendant and Midheaven the approximate birthplace.',
    chartImagePrivacyDetails: 'This image includes the birth date, local time, place, coordinates, time zone, and resolved UTC. It does not include a name or chart link.',
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
    positionsShareNote: 'El enlace no tiene campos de nombre, fecha, hora ni lugar de nacimiento. Sus posiciones exactas siguen dando tu fecha y hora de nacimiento. Solo dan tu lugar de nacimiento como una región de unos 500 km de ancho.',
    positionsOnlyTitle: 'Posiciones compartidas de la carta',
    positionsOnlyNotice: 'Solo posiciones, sin campos de nombre, fecha, hora ni lugar.',
    positionsOnlyPrivacy: 'Las posiciones exactas siguen dando la fecha y la hora de nacimiento. Solo dan el lugar de nacimiento como una región de unos 500 km de ancho.',
    reconstructedHouses: 'Las casas se reconstruyen por signo entero desde el Ascendente compartido. El cálculo original no puede reconstruirse solo con las posiciones.',
    sharedAspects: 'Aspectos mayores',
    positionsLinkInvalid: 'Ese enlace solo con posiciones no es válido o está incompleto.',
    shareLinkAmbiguous: 'Este enlace contiene dos formatos de carta, por lo que no se abrió ninguno.',
    positionsShareUnavailable: 'No se pudo crear un enlace solo con posiciones para esta carta.',
    preparingImage: 'Preparando imagen…',
    shareThisImage: 'Compartir esta imagen',
    moreWaysToShare: 'Más formas de compartir',
    chartImagePrivacy: 'La imagen muestra las posiciones de la carta y los ajustes de cálculo, sin nombre, fecha, hora ni lugar de nacimiento, coordenadas ni enlace a la carta. Sus posiciones siguen dando la fecha y la hora de nacimiento, y su ascendente y su medio cielo, el lugar de nacimiento aproximado.',
    chartImagePrivacyDetails: 'Esta imagen incluye la fecha, la hora local, el lugar, las coordenadas, la zona horaria y la hora UTC calculada. No incluye el nombre ni un enlace a la carta.',
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
    positionsShareNote: 'O link não tem campos de nome, data, hora ou local de nascimento. Suas posições exatas ainda indicam sua data e hora de nascimento. O local de nascimento aparece só como uma região de cerca de 500 km de largura.',
    positionsOnlyTitle: 'Posições compartilhadas do mapa',
    positionsOnlyNotice: 'Apenas posições, sem campos de nome, data, hora ou local.',
    positionsOnlyPrivacy: 'As posições exatas ainda indicam a data e a hora de nascimento. O local de nascimento aparece só como uma região de cerca de 500 km de largura.',
    reconstructedHouses: 'As casas são reconstruídas por signo inteiro a partir do Ascendente compartilhado. O cálculo original não pode ser refeito apenas com as posições.',
    sharedAspects: 'Aspectos principais',
    positionsLinkInvalid: 'Esse link apenas com posições é inválido ou está incompleto.',
    shareLinkAmbiguous: 'Este link contém dois formatos de mapa, por isso nenhum deles foi aberto.',
    positionsShareUnavailable: 'Não foi possível criar um link apenas com posições para este mapa.',
    preparingImage: 'Preparando imagem…',
    shareThisImage: 'Compartilhar esta imagem',
    moreWaysToShare: 'Mais formas de compartilhar',
    chartImagePrivacy: 'A imagem mostra as posições do mapa e as configurações de cálculo, sem nome, data, hora ou local de nascimento, coordenadas nem link do mapa. Suas posições ainda revelam a data e a hora de nascimento, e o ascendente e o meio do céu, o local de nascimento aproximado.',
    chartImagePrivacyDetails: 'Esta imagem inclui a data, a hora local, o local, as coordenadas, o fuso horário e o UTC calculado. Não inclui nome nem link do mapa.',
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
    positionsShareNote: 'Le lien n’a pas de champ pour le nom, la date, l’heure ou le lieu de naissance. Ses positions exactes donnent quand même ta date et ton heure de naissance. Elles ne situent ton lieu de naissance que dans une région d’environ 500 km de large.',
    positionsOnlyTitle: 'Positions partagées du thème',
    positionsOnlyNotice: 'Positions uniquement, sans champ de nom, de date, d’heure ou de lieu.',
    positionsOnlyPrivacy: 'Les positions exactes donnent quand même la date et l’heure de naissance. Elles ne situent le lieu de naissance que dans une région d’environ 500 km de large.',
    reconstructedHouses: 'Les maisons sont reconstruites en signes entiers à partir de l’Ascendant partagé. Le calcul d’origine ne peut pas être retrouvé à partir des seules positions.',
    sharedAspects: 'Aspects majeurs',
    positionsLinkInvalid: 'Ce lien avec les positions uniquement est incorrect ou incomplet.',
    shareLinkAmbiguous: 'Ce lien contient deux formats de thème : aucun des deux n’a donc été ouvert.',
    positionsShareUnavailable: 'Impossible de créer un lien avec les positions uniquement pour ce thème.',
    preparingImage: 'Préparation de l’image…',
    shareThisImage: 'Partager cette image',
    moreWaysToShare: 'Autres façons de partager',
    chartImagePrivacy: 'L’image montre les positions du thème et les réglages de calcul, sans nom, date, heure ou lieu de naissance, coordonnées ni lien vers le thème. Ses positions donnent encore la date et l’heure de naissance, et son ascendant et son milieu du ciel, le lieu de naissance approximatif.',
    chartImagePrivacyDetails: 'Cette image inclut la date, l’heure locale, le lieu, les coordonnées, le fuseau horaire et l’UTC calculé. Elle n’inclut ni nom ni lien vers le thème.',
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
    positionsShareNote: 'Il link non ha campi per nome, data, ora o luogo di nascita. Le sue posizioni esatte indicano comunque data e ora della tua nascita. Il luogo di nascita risulta solo come una regione larga circa 500 km.',
    positionsOnlyTitle: 'Posizioni condivise del tema',
    positionsOnlyNotice: 'Solo posizioni, senza campi per nome, data, ora o luogo.',
    positionsOnlyPrivacy: 'Le posizioni esatte indicano comunque data e ora di nascita. Il luogo di nascita risulta solo come una regione larga circa 500 km.',
    reconstructedHouses: 'Le case sono ricostruite a segno intero dall’Ascendente condiviso. Il calcolo originale non può essere ricavato dalle sole posizioni.',
    sharedAspects: 'Aspetti maggiori',
    positionsLinkInvalid: 'Questo link con le sole posizioni non è valido o è incompleto.',
    shareLinkAmbiguous: 'Questo link contiene due formati diversi per il tema, quindi non ne è stato aperto nessuno.',
    positionsShareUnavailable: 'Non è stato possibile creare un link con le sole posizioni per questo tema.',
    preparingImage: 'Preparazione immagine…',
    shareThisImage: 'Condividi questa immagine',
    moreWaysToShare: 'Altri modi per condividere',
    chartImagePrivacy: 'L’immagine mostra le posizioni del tema e le impostazioni di calcolo, senza nome, data, ora o luogo di nascita, coordinate né link al tema. Le sue posizioni danno ancora la data e l’ora di nascita, e l’ascendente e il medio cielo il luogo di nascita approssimativo.',
    chartImagePrivacyDetails: 'Questa immagine include data, ora locale, luogo, coordinate, fuso orario e UTC calcolato. Non include nome né un link al tema.',
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
    positionsShareNote: 'В ссылке нет полей для имени, даты, времени и места рождения. Точные положения всё равно выдают дату и время вашего рождения. Место рождения по ним определяется лишь как область шириной около 500 км.',
    positionsOnlyTitle: 'Положения из присланной карты',
    positionsOnlyNotice: 'Только положения, без полей имени, даты, времени и места.',
    positionsOnlyPrivacy: 'Точные положения всё равно выдают дату и время рождения. Место рождения по ним определяется лишь как область шириной около 500 км.',
    reconstructedHouses: 'Дома восстановлены как целые знаки от переданного Асцендента. Исходный расчёт домов нельзя восстановить только по положениям.',
    sharedAspects: 'Мажорные аспекты',
    positionsLinkInvalid: 'Ссылка только с положениями недействительна или неполна.',
    shareLinkAmbiguous: 'В ссылке есть два формата карты, поэтому ни один не был открыт.',
    positionsShareUnavailable: 'Не удалось создать ссылку только с положениями для этой карты.',
    preparingImage: 'Готовим изображение…',
    shareThisImage: 'Поделиться изображением',
    moreWaysToShare: 'Другие способы поделиться',
    chartImagePrivacy: 'На изображении есть положения карты и настройки расчёта, но нет имени, даты, времени и места рождения, координат и ссылки на карту. По положениям всё же можно определить дату и время рождения, а по асценденту и MC — примерное место рождения.',
    chartImagePrivacyDetails: 'На этом изображении есть дата, местное время, место, координаты, часовой пояс и рассчитанное UTC. Имя и ссылка на карту не включены.',
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

export async function preparePrimaryShareArtifact(
  chart: Chart,
  mode: 'full' | 'moon' | 'rising',
  locale: Locale,
  moonAmbiguous = false,
): Promise<PreparedChartCard> {
  if (mode === 'full') {
    await ensurePastelZodiacIconEmbedding();
    return prepareChartSheet(chart, { locale, hideBirthDetails: true, moonAmbiguous });
  }
  return preparePlacementCard(chart, mode, locale, {
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
      {moonIsUncertain(chart) && <p class="notice" data-moon-uncertain>{t(locale, 'moon')} · {t(locale, 'needsBirthTime')}</p>}
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
                <td class="mono">{row.body ? formatLongitude(row.lon, locale).split(' ')[0] : `${Math.floor(degreeInSign(row.lon))}°`}</td>
                <td>{row.body === 'Moon' && moonIsUncertain(chart) ? t(locale, 'needsBirthTime') : <SignChip lon={row.lon} locale={locale} />}</td>
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
