/**
 * The calculator island — birth data in, chart out, entirely on-device.
 * The ephemeris (engine/full) is lazy-loaded so the form is interactive
 * immediately; a prefetch warms it on first focus.
 *
 * mode:
 *   'full'   — the flagship: big three, wheel, placements, aspects
 *   'moon'   — moon-focused result view (same engine)
 *   'rising' — rising-focused result view (time required)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BirthFields } from './BirthFields';
import ChartActionDock from './ChartActionDock';
import AstroTerm from './AstroTerm';
import EvidenceDisclosure from './EvidenceDisclosure';
import type { CopyLinkState } from './CopyLinkButton';
import SignChip from './SignChip';
import PlanetGlyph from '../components/PlanetGlyph';
import AspectGlyph from '../components/AspectGlyph';
import Wheel from '../lib/wheel/Wheel';
import Inspector from './explorer/Inspector';
import LayerChips from './explorer/LayerChips';
import ReadingPath, { type ReadingScrollBehavior } from './explorer/ReadingPath';
import {
  EMPTY_FIRST_READING,
  readFirstReadingProgress,
  writeFirstReadingProgress,
  type FirstReadingProgress,
  type FirstReadingStatus,
} from './explorer/tour/progress';
import { buildSceneModel } from '../lib/scene/build';
import { emphasisFor } from '../lib/scene/emphasis';
import {
  ALL_ASPECT_TYPES, entityId, parseEntityId,
  type ChartSceneModel, type EntityRef,
} from '../lib/scene/types';
import { formatLongitude, signBySlug, signForLongitude, signName } from '../lib/signs';
import { bigThree } from '../lib/interpretations';
import { chartWeather, natalAspectLine, planetInHouseLine, topAspects } from '../lib/natal';
import { chartSignature } from '../lib/chart-signature';
import { resolveLocalToUtc } from '../lib/time/localToUtc';
import { houseOf } from '../lib/engine/houses';
import { moonPhaseName } from '../lib/engine/lite';
import { registryAuraChartAnalytics, registryAuraChartLink } from '../lib/registry-aura-entry.mjs';
import { trackAnalytics } from '../lib/analytics';
import { decodeChartLink, NAME_MAX } from '../lib/share';
import type { ShareChartInput } from '../lib/share';
import {
  chartHandoffFragment,
  compatibilityHandoffPath,
  mineHandoffFromHash,
  someoneElseHandoffPath,
  subjectModeFromHash,
  type MineHandoff,
  type SubjectMode,
} from '../lib/chart-handoff';
import type { PositionsShareChart } from '../lib/share-positions';
import type { TourVisual } from '../lib/scene/chapters';
import { ENGINE_VERSION } from '../lib/engine/types';
import type { Chart, HouseSystem } from '../lib/engine/types';
import type { City } from '../lib/geo/search';
import { CATALOG_LOCALES, RELEASED_LOCALES, localizePath, normalizeCatalogLocale, t, tp, type CatalogLocale as Locale, type ReleasedLocale } from '../lib/i18n';
import { aspectLabel, moonPhaseLabel, planetLabel } from '../lib/i18n/astrology';
import { russianRuntime } from '../lib/i18n/ru-runtime';
import { useEngine } from '../lib/hooks/useEngine';
import type { AspectType } from '../lib/engine/types';
import {
  clearPostChartContext,
  publishPostChartContext,
} from '../lib/profile/post-chart-context';

type Mode = 'full' | 'moon' | 'rising';

interface Props { mode: Mode; locale?: Locale }

interface RunInput {
  date: string;
  time: string;
  timeKnown: boolean;
  city: City;
  houseSystem: HouseSystem;
  name?: string;
  subjectMode?: SubjectMode;
  mine?: MineHandoff | null;
}

type ShareSurfaceModule = typeof import('./PositionsShareSurface');
type TourModule = typeof import('./explorer/tour');
type LensModule = typeof import('./explorer/lens/ChartLens');
type LensId = import('./explorer/lens/copy').LensId;
type LensRingRenderer = (geo: import('../lib/wheel/Wheel').WheelGeometry) => import('preact').ComponentChildren;

/** Rail labels stay host-local: they render before the lens module loads. */
const LENS_LABELS: Record<ReleasedLocale, Record<'rail' | 'natal' | LensId, string>> = {
  en: { rail: 'Chart through time', natal: 'Natal', sky: 'Sky now', progressed: 'Progressed', return: 'Solar return' },
  es: { rail: 'La carta en el tiempo', natal: 'Natal', sky: 'Cielo ahora', progressed: 'Progresada', return: 'Retorno solar' },
  pt: { rail: 'O mapa ao longo do tempo', natal: 'Natal', sky: 'Céu agora', progressed: 'Progredido', return: 'Retorno solar' },
  fr: { rail: 'Le thème au fil du temps', natal: 'Natal', sky: 'Ciel actuel', progressed: 'Progressé', return: 'Révolution solaire' },
  it: { rail: 'Il tema nel tempo', natal: 'Natale', sky: 'Cielo attuale', progressed: 'Progredito', return: 'Rivoluzione solare' },
};
const DETAIL_LABELS: Record<ReleasedLocale, { lead: string; placements: string; aspects: string }> = {
  en: { lead: 'See exact chart data — ', placements: ' placements · ', aspects: ' aspects' },
  es: { lead: 'Ver los datos exactos — ', placements: ' posiciones · ', aspects: ' aspectos' },
  pt: { lead: 'Ver os dados exatos — ', placements: ' posições · ', aspects: ' aspectos' },
  fr: { lead: 'Voir les données exactes — ', placements: ' positions · ', aspects: ' aspects' },
  it: { lead: 'Vedi i dati esatti — ', placements: ' posizioni · ', aspects: ' aspetti' },
};
const DETAIL_STORAGE_KEY = 'zodiacs.detail.v1';
const WHEEL_ACTION_COPY = {
  en: { actions: 'Chart actions', guide: 'Take the guided tour', replay: 'Replay the tour', another: 'Read another chart', signatureSelf: 'Your chart signature', signatureOther: 'Their chart signature', compareMine: 'Compare with mine', compareAdd: 'Add my chart to compare', shareOther: 'Share this chart' },
  es: { actions: 'Acciones de la carta', guide: 'Hacer el recorrido guiado', replay: 'Repetir el recorrido', another: 'Leer otra carta', signatureSelf: 'La firma de tu carta', signatureOther: 'La firma de su carta', compareMine: 'Comparar con la mía', compareAdd: 'Añadir mi carta para comparar', shareOther: 'Compartir esta carta' },
  pt: { actions: 'Ações do mapa', guide: 'Fazer o tour guiado', replay: 'Repetir o tour', another: 'Ler outro mapa', signatureSelf: 'A assinatura do seu mapa', signatureOther: 'A assinatura deste mapa', compareMine: 'Comparar com o meu', compareAdd: 'Adicionar meu mapa para comparar', shareOther: 'Compartilhar este mapa' },
  fr: { actions: 'Actions du thème', guide: 'Faire la visite guidée', replay: 'Rejouer la visite', another: 'Lire un autre thème', signatureSelf: 'La signature de ton thème', signatureOther: 'La signature de son thème', compareMine: 'Comparer avec le mien', compareAdd: 'Ajouter mon thème pour comparer', shareOther: 'Partager ce thème' },
  it: { actions: 'Azioni del tema', guide: 'Inizia il tour guidato', replay: 'Ripeti il tour', another: 'Leggi un altro tema', signatureSelf: 'La firma del tuo tema', signatureOther: 'La firma del suo tema', compareMine: 'Confronta con il mio', compareAdd: 'Aggiungi il mio tema per confrontare', shareOther: 'Condividi questo tema' },
} as const satisfies Record<ReleasedLocale, {
  actions: string;
  guide: string;
  replay: string;
  another: string;
  signatureSelf: string;
  signatureOther: string;
  compareMine: string;
  compareAdd: string;
  shareOther: string;
}>;
function firstReadingChartKey(chart: Chart): string {
  return [
    chart.input.utc.toISOString(),
    chart.input.timeKnown ? '1' : '0',
    chart.input.latitude?.toFixed(4) ?? '',
    chart.input.longitude?.toFixed(4) ?? '',
  ].join('|');
}
const CHART_BOOK_COPY = {
  en: { label: 'Whose chart is this?', save: 'Save', skip: 'Skip' },
  es: { label: '¿De quién es esta carta?', save: 'Guardar', skip: 'Omitir' },
  pt: { label: 'De quem é este mapa?', save: 'Salvar', skip: 'Pular' },
  fr: { label: 'À qui appartient ce thème\u202f?', save: 'Enregistrer', skip: 'Passer' },
  it: { label: 'Di chi è questo tema?', save: 'Salva', skip: 'Salta' },
} as const satisfies Record<ReleasedLocale, { label: string; save: string; skip: string }>;
const REGISTRY_AURA_CHART_COPY = {
  en: {
    discover: 'Your saved chart can meet the Registry records carried by a public address.',
    discoverLink: 'Read this chart beside a public address →',
    return: 'Your chart is saved.',
    returnLink: 'Return to Registry Collection →',
  },
  es: {
    discover: 'Tu carta guardada puede encontrarse con los registros que lleva una dirección pública.',
    discoverLink: 'Lee esta carta junto a una dirección pública →',
    return: 'Tu carta está guardada.',
    returnLink: 'Volver a Registry Collection →',
  },
  pt: {
    discover: 'Seu mapa salvo pode se encontrar com os registros associados a um endereço público.',
    discoverLink: 'Leia este mapa ao lado de um endereço público →',
    return: 'Seu mapa foi salvo.',
    returnLink: 'Voltar para Registry Collection →',
  },
  fr: {
    discover: 'Votre thème enregistré peut rencontrer les notices portées par une adresse publique.',
    discoverLink: 'Lire ce thème à côté d’une adresse publique →',
    return: 'Votre thème est enregistré.',
    returnLink: 'Retourner à Registry Collection →',
  },
  it: {
    discover: 'Il tema salvato può incontrare i registri associati a un indirizzo pubblico.',
    discoverLink: 'Leggi questa carta accanto a un indirizzo pubblico →',
    return: 'Il tema è stato salvato.',
    returnLink: 'Torna a Registry Collection →',
  },
} as const satisfies Record<ReleasedLocale, {
  discover: string;
  discoverLink: string;
  return: string;
  returnLink: string;
}>;
const PERSON_CHART_COPY = {
  en: (name: string) => `${name}'s chart — "you" below means ${name}.`,
  es: (name: string) => `La carta de ${name}: el "tú" de abajo se refiere a ${name}.`,
  pt: (name: string) => `O mapa de ${name}: o "você" abaixo se refere a ${name}.`,
  fr: (name: string) => `Le thème de ${name}\u00a0: le «\u00a0tu\u00a0» ci-dessous désigne ${name}.`,
  it: (name: string) => `Il tema di ${name}: il «tu» qui sotto si riferisce a ${name}.`,
} satisfies Record<ReleasedLocale, (name: string) => string>;
const OTHER_SUBJECT_COPY = {
  en: {
    unnamed: 'You’re reading someone else’s chart. “You” below means the person whose birth details you entered.',
    named: (name: string) => `You’re reading ${name}’s chart. “You” below means ${name}.`,
    heading: (name: string | null) => name ? `${name}’s birth chart` : 'Someone else’s birth chart',
    submit: 'Update their chart',
    privacy: 'Private by default. Their birth details stay in this browser.',
  },
  es: {
    unnamed: 'Estás leyendo la carta de otra persona. El “tú” de abajo se refiere a la persona cuyos datos ingresaste.',
    named: (name: string) => `Estás leyendo la carta de ${name}. El “tú” de abajo se refiere a ${name}.`,
    heading: (name: string | null) => name ? `Carta natal de ${name}` : 'Carta natal de otra persona',
    submit: 'Actualizar su carta',
    privacy: 'Privado de forma predeterminada. Sus datos de nacimiento permanecen en este navegador.',
  },
  pt: {
    unnamed: 'Você está lendo o mapa de outra pessoa. O “você” abaixo se refere à pessoa cujos dados foram inseridos.',
    named: (name: string) => `Você está lendo o mapa de ${name}. O “você” abaixo se refere a ${name}.`,
    heading: (name: string | null) => name ? `Mapa astral de ${name}` : 'Mapa astral de outra pessoa',
    submit: 'Atualizar o mapa dela',
    privacy: 'Privado por padrão. Os dados de nascimento dessa pessoa permanecem neste navegador.',
  },
  fr: {
    unnamed: 'Tu lis le thème d’une autre personne. Le « tu » ci-dessous désigne la personne dont tu as saisi les données.',
    named: (name: string) => `Tu lis le thème de ${name}. Le « tu » ci-dessous désigne ${name}.`,
    heading: (name: string | null) => name ? `Thème astral de ${name}` : 'Thème astral d’une autre personne',
    submit: 'Mettre son thème à jour',
    privacy: 'Privé par défaut. Ses données de naissance restent dans ce navigateur.',
  },
  it: {
    unnamed: 'Stai leggendo il tema di un’altra persona. Il «tu» qui sotto indica la persona di cui hai inserito i dati.',
    named: (name: string) => `Stai leggendo il tema di ${name}. Il «tu» qui sotto indica ${name}.`,
    heading: (name: string | null) => name ? `Tema natale di ${name}` : 'Tema natale di un’altra persona',
    submit: 'Aggiorna il suo tema',
    privacy: 'Privato per impostazione predefinita. I suoi dati di nascita restano in questo browser.',
  },
} as const satisfies Record<ReleasedLocale, {
  unnamed: string;
  named: (name: string) => string;
  heading: (name: string | null) => string;
  submit: string;
  privacy: string;
}>;
const AUTO_NAME_SUN = {
  en: 'Sun',
  es: 'Sol',
  pt: 'Sol',
  fr: 'Soleil',
  it: 'Sole',
} as const satisfies Record<ReleasedLocale, string>;

function russianNameTemplate(template: string, name: string): string {
  return template.replaceAll('{name}', name);
}
type SavePrefillSource = 'link' | 'match' | 'auto';
type CalendarSubscribeModule = typeof import('./CalendarSubscribe');
type CopyLinkModule = typeof import('./CopyLinkButton');
type CommunicationReadModule = typeof import('./CommunicationRead');
type ApproachReadModule = typeof import('./ApproachRead');
type A2hsHint = import('../lib/a2hs').A2hsHint;
type PushOptInModule = typeof import('./PushOptIn');
type PwaInstallModule = typeof import('./PwaInstallPrompt');

interface ChartSpotlight {
  id: string;
  run: number;
  phase: 'primed' | 'settled';
  motion: 'animated' | 'instant';
}

const WEB_PUSH_ENABLED = import.meta.env.PUBLIC_WEB_PUSH_ENABLED === '1';

/** Does the scene still contain the selected entity? (Recompute survival.) */
function sceneHas(scene: ChartSceneModel, ref: EntityRef): boolean {
  switch (ref.kind) {
    case 'body': return scene.bodies.some((b) => b.body === ref.body);
    case 'sign': return scene.signs.some((s) => s.slug === ref.sign);
    case 'house': return scene.houses != null && ref.house >= 1 && ref.house <= 12;
    case 'aspect': return scene.aspects.some((a) => a.a === ref.a && a.b === ref.b && a.type === ref.type);
    case 'angle': return scene.angles != null;
  }
}

export default function ChartCalculator({ mode, locale: rawLocale = 'en' }: Props) {
  const locale = normalizeCatalogLocale(rawLocale);
  const russianCopy = locale === 'ru' ? russianRuntime() : null;
  const releasedLocale: ReleasedLocale | null = locale === 'ru' ? null : locale;
  const lensLabels = russianCopy?.chart.lens ?? LENS_LABELS[releasedLocale!];
  const detailLabels = russianCopy?.chart.detail ?? DETAIL_LABELS[releasedLocale!];
  const wheelActionCopy = russianCopy?.chart.wheelActions ?? WHEEL_ACTION_COPY[releasedLocale!];
  const chartBookCopy = russianCopy?.chart.chartBook ?? CHART_BOOK_COPY[releasedLocale!];
  const registryAuraCopy = russianCopy?.chart.registryAura ?? REGISTRY_AURA_CHART_COPY[releasedLocale!];
  const otherSubjectCopy = russianCopy
    ? {
        unnamed: russianCopy.chart.otherSubject.unnamed,
        named: (name: string) => russianNameTemplate(russianCopy.chart.otherSubject.namedTemplate, name),
        heading: (name: string | null) => name
          ? russianNameTemplate(russianCopy.chart.otherSubject.headingTemplate, name)
          : russianCopy.chart.otherSubject.headingUnnamed,
        submit: russianCopy.chart.otherSubject.submit,
        privacy: russianCopy.chart.otherSubject.privacy,
      }
    : OTHER_SUBJECT_COPY[releasedLocale!];
  const personChartCopy = (name: string) => russianCopy
    ? russianNameTemplate(russianCopy.chart.personChartTemplate, name)
    : PERSON_CHART_COPY[releasedLocale!](name);
  const showsEnglishInterpretation = locale === 'en';
  const registryAuraLink = typeof window === 'undefined'
    ? null
    : registryAuraChartLink(window.location.search, {
        PUBLIC_REGISTRY_COLLECTION_ENABLED: import.meta.env.PUBLIC_REGISTRY_COLLECTION_ENABLED,
        PUBLIC_REGISTRY_AURA_ENABLED: import.meta.env.PUBLIC_REGISTRY_AURA_ENABLED,
      });
  const loadEngine = useEngine();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeKnown, setTimeKnown] = useState(true);
  const [city, setCity] = useState<City | null>(null);
  const [houseSystem, setHouseSystem] = useState<HouseSystem>('whole');
  const [chart, setChart] = useState<Chart | null>(null);
  const [moonAmbiguous, setMoonAmbiguous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<'idle' | 'saved' | 'full' | 'error'>('idle');
  const [shareInput, setShareInput] = useState<ShareChartInput | null>(null);
  const [computedInput, setComputedInput] = useState<RunInput | null>(null);
  const [profileRevision, setProfileRevision] = useState(0);
  const [share, setShare] = useState<CopyLinkState>('idle');
  const [card, setCard] = useState<'idle' | 'busy' | 'saved' | 'error'>('idle');
  const [fromLink, setFromLink] = useState(false);
  const [linkName, setLinkName] = useState<string | null>(null);
  const [subjectMode, setSubjectMode] = useState<SubjectMode>('self');
  const [mineHandoff, setMineHandoff] = useState<MineHandoff | null>(null);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [saveDraft, setSaveDraft] = useState('');
  const [saveInitial, setSaveInitial] = useState('');
  const [saveSource, setSaveSource] = useState<SavePrefillSource>('auto');
  const [positionsOnly, setPositionsOnly] = useState<PositionsShareChart | null>(null);
  const [shareSurface, setShareSurface] = useState<ShareSurfaceModule | null>(null);
  const [calendarSurface, setCalendarSurface] = useState<CalendarSubscribeModule | null>(null);
  const [copyLinkModule, setCopyLinkModule] = useState<CopyLinkModule | null>(null);
  const [communicationSurface, setCommunicationSurface] = useState<CommunicationReadModule | null>(null);
  const [approachSurface, setApproachSurface] = useState<ApproachReadModule | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [a2hsHint, setA2hsHint] = useState<A2hsHint | null>(null);
  const [pushOptIn, setPushOptIn] = useState<PushOptInModule | null>(null);
  const [pwaInstallModule, setPwaInstallModule] = useState<PwaInstallModule | null>(null);
  const [pwaComputationCount, setPwaComputationCount] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const saveNameRef = useRef<HTMLInputElement>(null);
  const saveOriginRef = useRef<'tour' | 'free'>('free');
  const shareReturnRef = useRef<HTMLElement | null>(null);
  const focusAfterComputeRef = useRef(false);
  const chartContextIdRef = useRef(0);

  // ── Chart Explorer state (full mode) ──
  const [selection, setSelection] = useState<EntityRef | null>(null);
  const [aspectTypes, setAspectTypes] = useState<AspectType[]>(ALL_ASPECT_TYPES);
  const [showHouses, setShowHouses] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [spotlight, setSpotlight] = useState<ChartSpotlight | null>(null);
  const selFromUrl = useRef(false);
  const wheelboxRef = useRef<HTMLDivElement>(null);
  const detailPreferenceRef = useRef<'open' | 'closed' | null>(null);
  const spotlightRunRef = useRef(0);
  const spotlightArrivalCleanupRef = useRef<(() => void) | null>(null);

  // ── Guided tour (lazy — the module never loads until asked for) ──
  const [tourMod, setTourMod] = useState<TourModule | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourKind, setTourKind] = useState<'quick' | 'full' | null>(null);
  const [tourVisual, setTourVisual] = useState<TourVisual | null>(null);
  const [firstReading, setFirstReading] = useState<FirstReadingProgress>(EMPTY_FIRST_READING);
  const [firstReadingLoaded, setFirstReadingLoaded] = useState(false);
  const firstReadingImpressionRef = useRef('');

  // ── Time-Lens rail (lazy — same discipline as the tour) ──
  const [lensMod, setLensMod] = useState<LensModule | null>(null);
  const [lens, setLens] = useState<'natal' | LensId>('natal');
  const [lensRing, setLensRing] = useState<LensRingRenderer | null>(null);
  // Stable identity — the lens module's ring effect depends on it.
  const onLensRing = useCallback(
    (renderer: LensRingRenderer | null) => setLensRing(() => renderer),
    [],
  );

  const scene = useMemo(
    () => (chart && mode === 'full' ? buildSceneModel(chart) : null),
    [chart, mode],
  );
  const emphasis = useMemo(
    () => (scene ? emphasisFor(scene, selection) : { highlight: new Set<string>(), soft: new Set<string>() }),
    [scene, selection],
  );

  // What the wheel actually renders: the tour's render-only overrides win
  // while nothing is selected; a live selection always outranks the tour's
  // lighting, and the user's houses toggle outranks the morph preview.
  const viewScene = tourVisual?.scene ?? scene;
  const viewEmphasis = selection ? emphasis : (tourVisual?.emphasis ?? emphasis);
  const viewCusps = showHouses
    ? (tourVisual?.cusps ?? chart?.houses?.cusps ?? null)
    : null;

  useEffect(() => () => {
    spotlightArrivalCleanupRef.current?.();
  }, []);

  useEffect(() => {
    const onProfile = () => setProfileRevision((revision) => revision + 1);
    window.addEventListener('zodiacs:profile', onProfile);
    return () => window.removeEventListener('zodiacs:profile', onProfile);
  }, []);

  function track(name: string, props: Record<string, string>) {
    (window as unknown as {
      zodiacsAnalytics?: { track?: (n: string, p: Record<string, string>) => void };
    }).zodiacsAnalytics?.track?.(name, props);
  }

  function loadPushOptIn(): void {
    if (!WEB_PUSH_ENABLED || locale === 'ru') return;
    void import('./PushOptIn').then(setPushOptIn, () => {});
  }

  function keepWheelAboveTour() {
    requestAnimationFrame(() => {
      const box = wheelboxRef.current;
      if (!box || !matchMedia('(max-width: 959.5px)').matches) return;
      const rect = box.getBoundingClientRect();
      const visibleTop = 84 + (Number.parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-top')) || 0);
      const sheetTop = window.innerHeight * 0.52;
      if (rect.top >= visibleTop && rect.bottom <= sheetTop) return;
      window.scrollBy({ top: rect.top - visibleTop, behavior: 'auto' });
    });
  }

  function persistFirstReading(
    status: FirstReadingStatus,
    step: number,
    chartKey = chart ? firstReadingChartKey(chart) : firstReading.chartKey,
  ) {
    let next: FirstReadingProgress = {
      version: 1,
      status,
      step: Math.max(0, Math.min(3, step)),
      updatedAt: new Date().toISOString(),
    };
    if (chartKey) next.chartKey = chartKey;
    try {
      next = writeFirstReadingProgress(localStorage, { status, step, chartKey });
    } catch { /* storage unavailable — in-memory progress still works */ }
    setFirstReading(next);
    return next;
  }

  async function startTour(kind: 'quick' | 'full' = 'full') {
    try {
      const mod = tourMod ?? await import('./explorer/tour');
      setTourMod(mod);
      resetLens(); // the tour teaches the natal wheel; a lens ring would contradict it
      if (selection) applySelect(null);
      setTourKind(kind);
      setTourOpen(true);
      if (kind === 'full') track('tour_start', { variant: 'v1' });
      keepWheelAboveTour();
    } catch {
      setTourKind(null);
      setError(t(locale, 'chartError'));
    }
  }
  function exitTour() {
    setTourOpen(false);
    setTourKind(null);
    setTourVisual(null);
  }

  function startFirstReading() {
    const resume = firstReading.status === 'in_progress';
    const next = resume ? firstReading : persistFirstReading('in_progress', 0);
    track('first_reading_prompt', { action: resume ? 'resume' : 'start' });
    track('next_action_clicked', { state: resume ? 'guide_in_progress' : 'new_chart', action: 'guide' });
    setFirstReading(next);
    void startTour('quick');
  }

  function dismissFirstReading() {
    persistFirstReading('dismissed', 0);
    track('first_reading_prompt', { action: 'explore' });
  }

  function completeFirstReading() {
    if (firstReading.status !== 'complete') {
      persistFirstReading('complete', 3);
      track('first_reading_completed', {});
    }
    exitTour();
  }

  function resetLens() {
    setLens('natal');
    setLensRing(null);
  }
  async function selectLens(next: 'natal' | LensId) {
    if (next === lens) return;
    if (next === 'natal') {
      resetLens();
      track('lens_change', { lens: 'natal' });
      return;
    }
    try {
      const mod = lensMod ?? await import('./explorer/lens/ChartLens');
      setLensMod(mod);
      setLens(next);
      track('lens_change', { lens: next });
    } catch {
      setError(t(locale, 'chartError'));
    }
  }

  /** Spoken summary of a selection for the polite live region. */
  function describeSelection(ref: EntityRef): string {
    if (!scene) return '';
    switch (ref.kind) {
      case 'body': {
        const b = scene.bodies.find((x) => x.body === ref.body);
        if (!b) return '';
        return [
          planetLabel(locale, b.body),
          formatLongitude(b.lon, locale),
          b.house != null ? `${t(locale, 'house')} ${b.house}` : '',
          b.retrograde ? 'Rx' : '',
        ].filter(Boolean).join(', ');
      }
      case 'sign': return signName(signBySlug(ref.sign), locale);
      case 'house': return `${t(locale, 'house')} ${ref.house}`;
      case 'aspect': return `${planetLabel(locale, ref.a)} ${aspectLabel(locale, ref.type)} ${planetLabel(locale, ref.b)}`;
      case 'angle': return ref.angle.toUpperCase();
    }
  }

  /** The one selection entry point: state + URL + announcement + focus care. */
  function openDetailForSelection() {
    if (detailOpen) return;
    setDetailOpen(true);
  }

  function cancelSpotlightArrival() {
    spotlightArrivalCleanupRef.current?.();
    spotlightArrivalCleanupRef.current = null;
  }

  function applySelect(ref: EntityRef | null) {
    cancelSpotlightArrival();
    setSpotlight(null);
    // Selecting a house someone can't see makes no sense — re-light the layer.
    if (ref?.kind === 'house') setShowHouses(true);
    // The data rows now live inside a closed-by-default disclosure. Re-light
    // that layer before applying a body/aspect highlight from the Explorer.
    if (ref?.kind === 'body' || ref?.kind === 'aspect') openDetailForSelection();
    setSelection(ref);
    setAnnounce(ref ? describeSelection(ref) : t(locale, 'selectionCleared'));
    try {
      const url = new URL(window.location.href);
      if (ref) url.searchParams.set('sel', entityId(ref));
      else url.searchParams.delete('sel');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch { /* URL API unavailable — selection still works */ }
    if (!ref) {
      // Clearing may unmount the focused inspector (close button, Escape
      // inside the card) — focus falls to <body> without this hand-back.
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) wheelboxRef.current?.focus();
      });
    }
  }

  function showOnChartFromReading(ref: EntityRef, behavior: ReadingScrollBehavior): void {
    resetLens();
    if (ref.kind === 'aspect') {
      setAspectTypes((current) => current.includes(ref.type) ? current : [...current, ref.type]);
    }
    applySelect(ref);
    const id = entityId(ref);
    const run = ++spotlightRunRef.current;
    const motion: ChartSpotlight['motion'] = behavior === 'smooth' ? 'animated' : 'instant';
    setSpotlight({ id, run, phase: motion === 'animated' ? 'primed' : 'settled', motion });

    let outerFrame = 0;
    let watchFrame = 0;
    let fallback = 0;
    let cancelled = false;
    let scrollEndHandler: (() => void) | null = null;
    const detach = () => {
      if (outerFrame) cancelAnimationFrame(outerFrame);
      if (watchFrame) cancelAnimationFrame(watchFrame);
      if (fallback) window.clearTimeout(fallback);
      if (scrollEndHandler) window.removeEventListener('scrollend', scrollEndHandler);
    };
    const cleanup = () => {
      cancelled = true;
      detach();
    };
    spotlightArrivalCleanupRef.current = cleanup;

    outerFrame = requestAnimationFrame(() => {
      if (cancelled || spotlightRunRef.current !== run) return;
      const wheel = wheelboxRef.current;
      if (!wheel) {
        cleanup();
        return;
      }
      const target = Array.from(wheel.querySelectorAll<SVGElement>('[data-entity]'))
        .find((node) => node.getAttribute('data-entity') === id) ?? wheel;
      const mobile = matchMedia('(max-width: 959.5px)').matches;
      const destinationY = () => window.innerHeight * (mobile ? 0.34 : 0.5);
      const destinationTop = () => {
        const rect = target.getBoundingClientRect();
        return Math.max(0, window.scrollY + rect.top + rect.height / 2 - destinationY());
      };
      const arrived = () => {
        const rect = target.getBoundingClientRect();
        return Math.abs(rect.top + rect.height / 2 - destinationY()) <= 22;
      };
      const settle = (force = false) => {
        if (cancelled || spotlightRunRef.current !== run || (!force && !arrived())) return false;
        detach();
        setSpotlight((current) => current?.run === run
          ? { ...current, phase: 'settled' }
          : current);
        if (spotlightArrivalCleanupRef.current === cleanup) {
          spotlightArrivalCleanupRef.current = null;
        }
        return true;
      };

      if (motion === 'instant') {
        const root = document.documentElement;
        const previous = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo({ top: destinationTop(), behavior: 'auto' });
        root.style.scrollBehavior = previous;
        wheel.focus({ preventScroll: true });
        detach();
        if (spotlightArrivalCleanupRef.current === cleanup) {
          spotlightArrivalCleanupRef.current = null;
        }
        return;
      }

      window.scrollTo({ top: destinationTop(), behavior: 'smooth' });
      wheel.focus({ preventScroll: true });
      scrollEndHandler = () => { settle(); };
      window.addEventListener('scrollend', scrollEndHandler, { passive: true });
      const watchPosition = () => {
        if (settle()) return;
        if (!cancelled && spotlightRunRef.current === run) {
          watchFrame = requestAnimationFrame(watchPosition);
        }
      };
      watchFrame = requestAnimationFrame(watchPosition);
      fallback = window.setTimeout(() => {
        if (cancelled || spotlightRunRef.current !== run) return;
        const root = document.documentElement;
        const previous = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo({ top: destinationTop(), behavior: 'auto' });
        root.style.scrollBehavior = previous;
        settle(true);
      }, 1400);
    });
  }

  // A `?sel=` deep link applies once, after the first computed scene.
  useEffect(() => {
    if (!scene || selFromUrl.current) return;
    selFromUrl.current = true;
    const id = new URLSearchParams(window.location.search).get('sel');
    const ref = id ? parseEntityId(id) : null;
    if (ref && sceneHas(scene, ref)) {
      if (ref.kind === 'body' || ref.kind === 'aspect') openDetailForSelection();
      setSelection(ref);
    }
  }, [scene]);

  // Device-local preference. The server and first client paint stay closed;
  // the one mount read may restore an explicit choice without tracking it as
  // a fresh interaction.
  useEffect(() => {
    if (mode !== 'full') return;
    try {
      const stored = localStorage.getItem(DETAIL_STORAGE_KEY);
      detailPreferenceRef.current = stored === 'open' || stored === 'closed' ? stored : null;
      if (detailPreferenceRef.current === 'open') setDetailOpen(true);
    } catch { /* storage unavailable — closed default remains */ }
  }, []);

  // The first-reading prompt is a device preference, just like exact-data
  // disclosure. Delay its first paint until the stored state is known so a
  // dismissed or completed prompt never flashes back during hydration.
  useEffect(() => {
    if (mode === 'full') {
      try {
        setFirstReading(readFirstReadingProgress(localStorage));
      } catch { /* blocked storage keeps the unopened default */ }
    }
    setFirstReadingLoaded(true);
  }, []);

  useEffect(() => {
    if (!chart || mode !== 'full' || !firstReadingLoaded || tourOpen) return;
    if (firstReading.status !== 'not_started' && firstReading.status !== 'in_progress') return;
    const key = `${chart.input.utc.toISOString()}:${firstReading.status}`;
    if (firstReadingImpressionRef.current === key) return;
    firstReadingImpressionRef.current = key;
    track('first_reading_prompt', {
      action: firstReading.status === 'in_progress' ? 'resume_view' : 'view',
    });
  }, [chart, mode, firstReadingLoaded, firstReading.status, tourOpen]);

  function onDetailToggle(e: Event) {
    const open = (e.currentTarget as HTMLDetailsElement).open;
    setDetailOpen(open);
    const preference = open ? 'open' : 'closed';
    // A delayed DOM event for the mount-restored value is not a new visitor
    // interaction. The validated preference was read exactly once on mount.
    if (detailPreferenceRef.current === preference) return;
    detailPreferenceRef.current = preference;
    try {
      localStorage.setItem(DETAIL_STORAGE_KEY, preference);
    } catch { /* device preference is best effort */ }
    track('detail_toggle', { to: open ? 'full' : 'plain' });
  }

  // Recompute: keep the selection when the entity survives, clear it when
  // it doesn't (e.g. houses gone on a no-time chart).
  useEffect(() => {
    if (!scene || !selection) return;
    if (!sceneHas(scene, selection)) applySelect(null);
  }, [scene]);

  // Hiding the house layer clears a house selection; filtering an aspect
  // type off clears a selected aspect of that type — never leave the wheel
  // dimmed around a mark that is no longer rendered.
  useEffect(() => {
    if (!showHouses && selection?.kind === 'house') applySelect(null);
  }, [showHouses]);
  useEffect(() => {
    if (selection?.kind === 'aspect' && !aspectTypes.includes(selection.type)) applySelect(null);
  }, [aspectTypes]);

  function onWheelKeyDown(e: KeyboardEvent) {
    if (!scene) return;
    // Only keys pressed on the wheelbox itself — buttons inside the stage
    // (layer chips) keep their native keyboard behavior.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      // Cycle order: bodies by longitude, then the marked angles — so the
      // ASC/MC inspector notes are reachable without a pointer.
      const cycle: EntityRef[] = [
        ...[...scene.bodies].sort((a, b) => a.lon - b.lon)
          .map((b): EntityRef => ({ kind: 'body', body: b.body })),
        ...(scene.angles
          ? [{ kind: 'angle', angle: 'asc' } as EntityRef, { kind: 'angle', angle: 'mc' } as EntityRef]
          : []),
      ];
      const at = selection ? cycle.findIndex((c) => entityId(c) === entityId(selection)) : -1;
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = at === -1
        ? (step === 1 ? cycle[0] : cycle[cycle.length - 1])
        : cycle[(at + step + cycle.length) % cycle.length];
      applySelect(next);
    } else if (e.key === 'Enter' && selection) {
      e.preventDefault();
      (document.querySelector('[data-inspector-heading]') as HTMLElement | null)?.focus();
    } else if (e.key === 'Escape') {
      // First Escape clears a selection; a second (or a bare one) ends the
      // tour. The tour card handles its own Escape and stops propagation.
      if (selection) applySelect(null);
      else if (tourOpen) exitTour();
    }
  }

  // Warm the ephemeris while the visitor types.
  useEffect(() => {
    const warm = () => { loadEngine(); };
    const idle = (window as any).requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 2500));
    idle(warm);
  }, [loadEngine]);

  // A shared chart arrives in the fragment. A v1 #c token carries birth
  // input and computes as before; a v2 #p token is loaded into a deliberately
  // reduced, read-only view. Never choose between two conflicting formats.
  useEffect(() => {
    if (mode !== 'full') return;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const nextSubjectMode = subjectModeFromHash(hash);
    const nextMineHandoff = mineHandoffFromHash(hash);
    const clearFragment = () => history.replaceState(null, '', window.location.pathname + window.location.search);

    if (params.has('c') && params.has('p')) {
      clearFragment();
      let active = true;
      import('./PositionsShareSurface')
        .then((surface) => {
          if (active) setError(surface.shareText(locale, 'shareLinkAmbiguous'));
        })
        .catch(() => {
          if (active) setError(t(locale, 'chartError'));
        });
      return () => { active = false; };
    }

    if (params.has('p')) {
      const token = params.get('p') ?? '';
      let active = true;
      import('./PositionsShareSurface')
        .then((surface) => {
          if (!active) return;
          const decoded = surface.decodePositionsToken(token);
          if (!decoded) {
            setError(surface.shareText(locale, 'positionsLinkInvalid'));
            return;
          }
          setChart(null);
          setShareInput(null);
          setComputedInput(null);
          setPositionsOnly(decoded);
          setShareSurface(surface);
          setSubjectMode(nextSubjectMode);
          setMineHandoff(nextMineHandoff);
          clearFragment();
        })
        .catch(() => {
          if (active) setError(t(locale, 'chartError'));
        });
      return () => { active = false; };
    }

    const token = params.get('c');
    if (!token) return;
    const decoded = decodeChartLink(token);
    if (!decoded) return;
    const linkCity: City = {
      name: decoded.place ?? (russianCopy?.chart.sharedBirthplace ?? 'Shared birthplace'),
      admin1: '', country: '',
      lat: decoded.lat, lon: decoded.lon, tz: decoded.tz, pop: 0,
    };
    setDate(decoded.date);
    setTime(decoded.time ?? '');
    setTimeKnown(decoded.timeKnown);
    setCity(linkCity);
    setHouseSystem(decoded.houseSystem);
    setFromLink(true);
    setLinkName(decoded.name ?? null);
    setPositionsOnly(null);
    clearFragment();
    runChart({
      date: decoded.date, time: decoded.time ?? '', timeKnown: decoded.timeKnown,
      city: linkCity, houseSystem: decoded.houseSystem,
      name: decoded.name,
      subjectMode: nextSubjectMode,
      mine: nextMineHandoff,
    }, false);
  }, []);

  useEffect(() => {
    if (busy || !focusAfterComputeRef.current) return;
    if (error) {
      errorRef.current?.focus();
      focusAfterComputeRef.current = false;
      return;
    }
    if (chart) {
      resultHeadingRef.current?.focus();
      focusAfterComputeRef.current = false;
    }
  }, [busy, error, chart]);

  const canCompute = date !== '' && city !== null && (!timeKnown || time !== '')
    && !(mode === 'rising' && !timeKnown);

  async function runChart(input: RunInput, focusAfterCompute: boolean) {
    focusAfterComputeRef.current = focusAfterCompute;
    setBusy(true);
    setError('');
    setSaved('idle');
    setMatchedName(null);
    setSavePromptOpen(false);
    setA2hsHint(null);
    setShare('idle');
    setCard('idle');
    resetLens();
    setPositionsOnly(null);
    setShareDialogOpen(false);
    setMoonAmbiguous(false);
    setSubjectMode(input.subjectMode ?? 'self');
    setMineHandoff(input.mine ?? null);
    try {
      const engine = await loadEngine();
      const effectiveTime = input.timeKnown ? input.time : '12:00';
      const resolved = resolveLocalToUtc(input.date, effectiveTime, input.city.tz);
      const result = engine.computeChart({
        utc: resolved.utc,
        latitude: input.city.lat,
        longitude: input.city.lon,
        houseSystem: input.houseSystem,
        timeKnown: input.timeKnown,
        flags: resolved.flags,
      });
      setChart(result);
      setComputedInput({ ...input, city: { ...input.city } });
      const contextId = chartContextIdRef.current + 1;
      chartContextIdRef.current = contextId;
      clearPostChartContext();
      if (mode === 'full' && firstReading.status === 'in_progress') {
        const nextChartKey = firstReadingChartKey(result);
        if (firstReading.chartKey !== nextChartKey) {
          persistFirstReading('not_started', 0, nextChartKey);
          exitTour();
        }
      }
      if (mode === 'full') {
        void import('./CalendarSubscribe').then(setCalendarSurface, () => {});
        void import('./CopyLinkButton').then(setCopyLinkModule, () => {});
        if (showsEnglishInterpretation) {
          void import('./CommunicationRead').then(setCommunicationSurface, () => {});
          void import('./ApproachRead').then(setApproachSurface, () => {});
        }
      }
      track('result_rendered', { mode });
      track('chart_computed', { mode });
      if (locale !== 'ru') void import('./PwaInstallPrompt').then(setPwaInstallModule, () => {});
      setPwaComputationCount((count) => count + 1);
      const computedSun = result.bodies.find((body) => body.body === 'Sun');
      window.dispatchEvent(new CustomEvent('zodiacs:chart-computed', {
        detail: {
          mode,
          sunSign: computedSun ? signForLongitude(computedSun.lon).slug : undefined,
          contextId,
        },
      }));
      setShareInput({
        date: input.date,
        time: input.timeKnown ? input.time : null,
        timeKnown: input.timeKnown,
        lat: input.city.lat,
        lon: input.city.lon,
        tz: input.city.tz,
        place: input.city.name || undefined,
        houseSystem: input.houseSystem,
        ...(input.name ? { name: input.name } : {}),
      });

      if (!input.timeKnown) {
        // Does the Moon change signs across this civil day?
        const early = resolveLocalToUtc(input.date, '00:00', input.city.tz);
        const late = resolveLocalToUtc(input.date, '23:59', input.city.tz);
        const moonEarly = signForLongitude(engine.computeBodies(early.utc).find((b) => b.body === 'Moon')!.lon);
        const moonLate = signForLongitude(engine.computeBodies(late.utc).find((b) => b.body === 'Moon')!.lon);
        setMoonAmbiguous(moonEarly.slug !== moonLate.slug);
      }

      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(t(locale, 'chartError'));
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function compute(e: Event) {
    e.preventDefault();
    if (!canCompute || !city) return;
    setFromLink(false);
    if (subjectMode === 'self') setLinkName(null);
    runChart({
      date,
      time,
      timeKnown,
      city,
      houseSystem,
      subjectMode,
      mine: mineHandoff,
      ...(subjectMode === 'other' && linkName ? { name: linkName } : {}),
    }, true);
  }

  const shareUrl = () =>
    `${window.location.origin}${localizePath(locale, '/birth-chart/')}#${chartHandoffFragment(shareInput!, {
      subjectMode,
    })}`;

  async function openShareOptions() {
    if (!chart || !shareInput) return;
    shareReturnRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setCard('idle');
    try {
      const surface = await import('./PositionsShareSurface');
      setShareSurface(surface);
      setShareDialogOpen(true);
    } catch (err) {
      console.error(err);
      setCard('error');
    }
  }

  function shareChartFromAction() {
    // The sheet owns every share path. Its primary image is prepared after
    // opening so the final button can invoke iOS file sharing directly from
    // the user's second tap.
    void openShareOptions();
  }

  function closeShareDialog(): void {
    setShareDialogOpen(false);
    requestAnimationFrame(() => {
      const returnTo = shareReturnRef.current;
      if (returnTo?.isConnected) returnTo.focus();
      else wheelboxRef.current?.focus();
    });
  }

  const placements = useMemo(() => {
    if (!chart) return [];
    return chart.bodies.map((b) => ({
      ...b,
      label: formatLongitude(b.lon, locale),
      house: chart.houses ? houseOf(b.lon, chart.houses.cusps) : null,
    }));
  }, [chart]);

  const sun = chart?.bodies.find((b) => b.body === 'Sun');
  const moon = chart?.bodies.find((b) => b.body === 'Moon');
  const asc = chart?.angles?.asc ?? null;
  const sunSign = sun ? signForLongitude(sun.lon) : null;
  const autoNameLocales = locale === 'ru' ? CATALOG_LOCALES : RELEASED_LOCALES;
  const autoNames = autoNameLocales.map((candidate) => {
    if (!sunSign) return '';
    const sunLabel = candidate === 'ru'
      ? russianCopy!.chart.autoNameSun
      : AUTO_NAME_SUN[candidate];
    return `${signName(sunSign, candidate)} ${sunLabel} · ${computedInput?.date ?? date}`;
  });
  const autoName = sunSign
    ? `${signName(sunSign, locale)} ${locale === 'ru' ? russianCopy!.chart.autoNameSun : AUTO_NAME_SUN[locale]} · ${computedInput?.date ?? date}`
    : '';
  const isAutoName = (name: string | null) => name !== null && autoNames.includes(name);
  const personName = linkName && !isAutoName(linkName)
    ? linkName
    : matchedName && !isAutoName(matchedName) ? matchedName : null;
  const otherSubjectNotice = personName
    ? otherSubjectCopy.named(personName)
    : otherSubjectCopy.unnamed;
  const compareWithMineHref = subjectMode === 'other' && shareInput
    ? compatibilityHandoffPath(shareInput, mineHandoff)
    : undefined;
  const anotherChartHref = subjectMode === 'self' && shareInput
    ? someoneElseHandoffPath(shareInput)
    : '/birth-chart/someone-else/';

  useEffect(() => {
    if (!chart || !computedInput || mode !== 'full') return;
    let active = true;
    const contextId = chartContextIdRef.current;
    const identity = {
      birth: {
        date: computedInput.date,
        time: computedInput.timeKnown ? computedInput.time : null,
        timeKnown: computedInput.timeKnown,
        place: {
          name: computedInput.city.name,
          admin1: computedInput.city.admin1,
          country: computedInput.city.country,
          lat: computedInput.city.lat,
          lon: computedInput.city.lon,
          tz: computedInput.city.tz,
        },
      },
      summary: { houseSystem: chart.houses?.system ?? computedInput.houseSystem },
    };
    void import('../lib/profile/store').then(({ findMatchingChart }) => {
      if (!active || contextId !== chartContextIdRef.current) return;
      const match = findMatchingChart(identity);
      setMatchedName(match?.name ?? null);
      publishPostChartContext({
        mode: 'full',
        sunSign: sunSign?.slug ?? null,
        chartId: match?.id ?? null,
        contextId,
      });
    }).catch(() => {});
    return () => { active = false; };
  }, [chart, computedInput, mode, profileRevision, sunSign?.slug]);

  useEffect(() => {
    if (savePromptOpen) saveNameRef.current?.focus();
  }, [savePromptOpen]);

  function chartIdentity() {
    if (!chart || !computedInput) return null;
    return {
      birth: {
        date: computedInput.date,
        time: computedInput.timeKnown ? computedInput.time : null,
        timeKnown: computedInput.timeKnown,
        place: {
          name: computedInput.city.name,
          admin1: computedInput.city.admin1,
          country: computedInput.city.country,
          lat: computedInput.city.lat,
          lon: computedInput.city.lon,
          tz: computedInput.city.tz,
        },
      },
      summary: { houseSystem: chart.houses?.system ?? computedInput.houseSystem },
    };
  }

  function closeSavePrompt() {
    setSavePromptOpen(false);
    requestAnimationFrame(() => saveButtonRef.current?.focus());
  }

  async function openSavePrompt(origin: 'tour' | 'free' = 'free') {
    const identity = chartIdentity();
    if (!identity || saved === 'saved') return;
    saveOriginRef.current = origin;
    let currentName = matchedName;
    try {
      const { findMatchingChart } = await import('../lib/profile/store');
      currentName = findMatchingChart(identity)?.name ?? null;
      setMatchedName(currentName);
    } catch { /* saving will surface an error if storage cannot load */ }
    const source: SavePrefillSource = linkName ? 'link' : currentName ? 'match' : 'auto';
    const prefill = (linkName ?? currentName ?? autoName).slice(0, NAME_MAX);
    setSaveSource(source);
    setSaveInitial(prefill);
    setSaveDraft(prefill);
    setSavePromptOpen(true);
  }

  async function commitSave(explicitName: string | undefined, via: 'prompt' | 'link' | 'skip') {
    const identity = chartIdentity();
    if (!chart || !computedInput || !identity) return;
    track('chart_save', { source: saveOriginRef.current });
    const now = new Date().toISOString();
    try {
      const { findMatchingChart, saveChart } = await import('../lib/profile/store');
      const status = saveChart({
        id: crypto.randomUUID(),
        name: explicitName ?? autoName,
        createdAt: now,
        updatedAt: now,
        birth: identity.birth,
        summary: {
          engineVersion: ENGINE_VERSION,
          utcISO: chart.input.utc.toISOString(),
          houseSystem: chart.houses?.system ?? computedInput.houseSystem,
          bodies: chart.bodies.map((b) => ({ body: b.body, lon: b.lon, retrograde: b.retrograde })),
          angles: chart.angles ? { asc: chart.angles.asc, mc: chart.angles.mc } : null,
          flags: chart.flags,
        },
      }, explicitName ? { explicitName } : undefined);
      setSaved(status === 'updated' ? 'saved' : status);
      if (status === 'saved' || status === 'updated') {
        track('chart_saved', { source: saveOriginRef.current });
        track('chart_name_set', { via });
        const match = findMatchingChart(identity);
        setMatchedName(match?.name ?? explicitName ?? matchedName ?? autoName);
        publishPostChartContext({
          mode: 'full',
          sunSign: sunSign?.slug ?? null,
          chartId: match?.id ?? null,
          contextId: chartContextIdRef.current,
        });
        void import('../lib/a2hs').then(({ claimA2hsHint }) => {
          const hint = claimA2hsHint(locale, navigator.userAgent, localStorage);
          const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
            || window.matchMedia('(display-mode: standalone)').matches;
          if (hint && !standalone) setA2hsHint(hint);
          else loadPushOptIn();
        }).catch(() => {});
      }
    } catch {
      setSaved('error');
    }
    closeSavePrompt();
  }

  function submitSaveName(e: Event) {
    e.preventDefault();
    const value = saveDraft.trim();
    const accepted = value || autoName;
    // Existing profile renames may predate the 24-character share-link cap.
    // If the displayed, capped match is accepted unchanged, keep this save
    // non-explicit so saveChart preserves the full stored name.
    const unchangedMatch = saveSource === 'match' && accepted === saveInitial.trim();
    const explicitName = isAutoName(accepted) || unchangedMatch ? undefined : accepted;
    // A saved-name match has no fourth analytics category: accepting that
    // non-auto value in the naming prompt is a prompt commit.
    const via = saveSource === 'link' && accepted === saveInitial.trim()
      ? 'link'
      : explicitName || (unchangedMatch && !isAutoName(accepted)) ? 'prompt' : 'skip';
    void commitSave(explicitName, via);
  }

  // The visual story uses planets only (nodes stay in exact data), plus the
  // strongest aspects and whole-chart balance derived once per result.
  const reading = useMemo(() => {
    if (!chart || mode !== 'full') return null;
    const ps = placements
      .filter((p) => !p.body.includes('Node'))
      .map((p) => {
        const sign = signForLongitude(p.lon);
        return {
          body: p.body,
          lon: p.lon,
          house: p.house,
          retrograde: p.retrograde,
          signSlug: sign.slug,
        };
      });
    return {
      ps,
      top: topAspects(
        chart.aspects.filter((aspect) => !aspect.a.includes('Node') && !aspect.b.includes('Node')),
        4,
      ),
      weather: chartWeather(
        ps.map((p) => ({ body: p.body, lon: p.lon, retrograde: p.retrograde, sign: p.signSlug })),
        chart.houses ? (b) => ps.find((x) => x.body === b)?.house ?? null : undefined,
      ),
    };
  }, [chart, placements, mode]);

  const signature = useMemo(
    () => (chart && mode === 'full' ? chartSignature(chart, locale) : null),
    [chart, locale, mode],
  );

  const heroCards = useMemo(() => {
    if (!chart || !sun || !moon) return [];
    const cards: { kind: 'sun' | 'moon' | 'rising'; title: string; lon: number | null }[] =
      mode === 'moon'
        ? [{ kind: 'moon', title: t(locale, 'yourMoonSign'), lon: moon.lon }]
        : mode === 'rising'
          ? [{ kind: 'rising', title: t(locale, 'yourRisingSign'), lon: asc }]
          : [
            { kind: 'sun', title: t(locale, 'sun'), lon: sun.lon },
            { kind: 'moon', title: t(locale, 'moon'), lon: moon.lon },
            { kind: 'rising', title: t(locale, 'rising'), lon: asc },
          ];
    return cards;
  }, [chart, mode, sun, moon, asc, locale]);

  const PositionsOnlyView = shareSurface?.PositionsOnlyResult;
  const ShareDialog = shareSurface?.ChartShareDialog;
  const CalendarSubscribe = calendarSurface?.default;
  const CopyLinkButton = copyLinkModule?.CopyLinkButton;
  const ApproachRead = approachSurface?.default;
  const CommunicationRead = communicationSurface?.default;
  const PushOptIn = pushOptIn?.default;
  const PwaInstallPrompt = pwaInstallModule?.default;
  const firstReadingPromptVisible = mode === 'full'
    && firstReadingLoaded
    && !tourOpen
    && (firstReading.status === 'not_started' || firstReading.status === 'in_progress');
  return (
    <div class="calc" data-subject-mode={subjectMode}>
      <form class="calc__form shell" onSubmit={compute} aria-busy={busy}>
        <div class="core calc__core">
          <div class="calc__fields">
            <BirthFields
              locale={locale}
              dateId="birth-date"
              timeId="birth-time"
              placeId="place"
              date={date}
              time={time}
              timeKnown={timeKnown}
              city={city}
              onDateChange={setDate}
              onTimeChange={setTime}
              onTimeKnownChange={setTimeKnown}
              onCityChange={setCity}
              onWarm={loadEngine}
              showUnknownTime={mode !== 'rising'}
              requireKnownTime
              timeHelp={mode === 'rising' ? t(locale, 'risingTimeHelp') : t(locale, 'chartTimeHelp')}
              placeHelp={t(locale, 'searchGeo')}
            />

            {mode === 'full' && (
              <div class="field">
                <label class="field__label" for="house-system">{t(locale, 'houseSystem')}</label>
                <select
                  id="house-system" class="field__input"
                  value={houseSystem}
                  onChange={(e) => setHouseSystem((e.target as HTMLSelectElement).value as HouseSystem)}
                >
                  <option value="whole">{t(locale, 'wholeSignDefault')}</option>
                  <option value="placidus">{t(locale, 'placidus')}</option>
                </select>
                {locale === 'en' && (
                  <>
                    <p class="field__help calc__house-terms">
                      <AstroTerm
                        term="whole-sign-houses"
                        label={t(locale, 'wholeSignDefault')}
                        surface="birth-chart-form"
                      />
                      <span aria-hidden="true"> · </span>
                      <AstroTerm term="placidus" label={t(locale, 'placidus')} surface="birth-chart-form" />
                    </p>
                    <p class="field__help calc__context-cue">{t(locale, 'contextHelpCue')}</p>
                  </>
                )}
              </div>
            )}
          </div>

          <button class="btn btn--primary calc__submit" type="submit" disabled={!canCompute || busy}>
            <span>
              {busy ? t(locale, 'computing')
                : mode === 'moon' ? t(locale, 'findMoonSign')
                : mode === 'rising' ? t(locale, 'findRisingSign')
                : subjectMode === 'other'
                  ? otherSubjectCopy.submit
                  : t(locale, 'getBirthChart')}
            </span>
            <span class="orb">↗</span>
          </button>
          <p class="calc__privacy">
            {subjectMode === 'other' ? otherSubjectCopy.privacy : t(locale, 'privacyDevice')}
          </p>
          {error && <p class="calc__error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
        </div>
      </form>

      {positionsOnly && PositionsOnlyView && (
        <>
          {subjectMode === 'other' && (
            <p class="notice" role="status" data-chart-subject>{otherSubjectNotice}</p>
          )}
          <PositionsOnlyView chart={positionsOnly} locale={locale} />
        </>
      )}

      {chart && sun && moon && (
        <div class="calc__result" ref={resultRef}>
          <h2 class="sr-only" tabIndex={-1} ref={resultHeadingRef}>
            {subjectMode === 'other'
              ? otherSubjectCopy.heading(personName)
              : mode === 'moon'
              ? t(locale, 'yourMoonSign')
              : mode === 'rising'
                ? t(locale, 'yourRisingSign')
                : t(locale, 'birthChart')}
          </h2>
          {/* Notices */}
          {chart.flags.includes('dst-gap') && (
            <p class="notice" role="status">{t(locale, 'dstGapNotice')}</p>
          )}
          {chart.flags.includes('dst-fold') && (
            <p class="notice" role="status">{t(locale, 'dstFoldNotice')}</p>
          )}
          {chart.flags.includes('lmt') && (
            <p class="notice" role="status">{t(locale, 'lmtNotice')} ({city?.tz}). <a href={localizePath(locale, '/methodology/')}>{t(locale, 'howWeCompute')}</a>.</p>
          )}
          {chart.flags.includes('polar-fallback') && (
            <p class="notice" role="status">{t(locale, 'polarNotice')}</p>
          )}
          {chart.flags.includes('no-time') && (
            <p class="notice" role="status">
              {t(locale, 'noTimeNotice')}
              {moonAmbiguous && ` ${t(locale, 'moonAmbiguousNotice')}`}
            </p>
          )}
          {fromLink && (
            <p class="notice" role="status">
              {t(locale, 'fromLinkNotice')}
            </p>
          )}
          {subjectMode === 'other' ? (
            <p class="notice" role="status" data-chart-subject>
              {otherSubjectNotice}
            </p>
          ) : personName && (
            <p class="notice" data-chart-person>
              {personChartCopy(personName)}
            </p>
          )}

          {/* Big three / hero cards */}
          <div class={`calc__three calc__three--${heroCards.length}`}>
            {heroCards.map(({ kind, title, lon }) => {
              if (lon === null) {
                return (
                  <div class="three-card shell" key={kind}>
                    <div class="core three-card__core">
                      <span class="mono--label">{title}</span>
                      <p class="three-card__missing">{t(locale, 'needsBirthTime')}</p>
                    </div>
                  </div>
                );
              }
              const s = signForLongitude(lon);
              return (
                <div class="three-card shell tinted" style={`--sign:${s.hue}`} key={kind}>
                  <div class="core tinted three-card__core">
                    <span class="mono--label">{title}</span>
                    <span class="three-card__sign">
                      <picture class="three-card__icon">
                        <source srcset={`/assets/zodiac-icons/128/${s.slug}.avif`} type="image/avif" />
                        <img src={`/assets/zodiac-icons/128/${s.slug}.webp`} width="44" height="44" alt="" decoding="async" />
                      </picture>
                      {signName(s, locale)}
                    </span>
                    <span class="mono three-card__deg">{formatLongitude(lon, locale)}</span>
                    {showsEnglishInterpretation && <p class="three-card__read">{bigThree(kind, s.slug)}</p>}
                    <a class="three-card__more" href={localizePath(locale, `/${s.slug}/`)}>{t(locale, 'read')} {signName(s, locale)} →</a>
                  </div>
                </div>
              );
            })}
          </div>

          {firstReadingPromptVisible && (
            <aside class="calc__first-reading shell" aria-labelledby="first-reading-title" data-first-reading-prompt>
              <div class="core calc__first-reading-core">
                <div class="calc__first-reading-copy">
                  <span class="mono--label">{t(locale, 'firstReadingLabel')}</span>
                  <h2 id="first-reading-title">
                    {firstReading.status === 'in_progress'
                      ? t(locale, 'firstReadingResumeTitle')
                      : t(locale, 'firstReadingTitle')}
                  </h2>
                  <p>
                    {firstReading.status === 'in_progress'
                      ? t(locale, 'firstReadingResumeBody')
                      : t(locale, 'firstReadingBody')}
                  </p>
                  {firstReading.status === 'in_progress' && (
                    <span class="mono calc__first-reading-progress">
                      {t(locale, 'firstReadingStep')} {firstReading.step + 1} / 4
                    </span>
                  )}
                </div>
                <div class="calc__first-reading-actions">
                  <button class="btn btn--primary" type="button" onClick={startFirstReading} data-first-reading-start>
                    <span>{firstReading.status === 'in_progress'
                      ? t(locale, 'firstReadingResume')
                      : t(locale, 'firstReadingStart')}</span>
                    <span class="orb">→</span>
                  </button>
                  <button class="btn btn--ghost" type="button" onClick={dismissFirstReading} data-first-reading-dismiss>
                    {t(locale, 'firstReadingExplore')}
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Moon-mode extra: phase at birth */}
          {mode === 'moon' && (
            <p class="calc__phase mono">{t(locale, 'moonPhaseAtBirth')}: {moonPhaseLabel(locale, moonPhaseName(chart.input.utc))}</p>
          )}

          {/* Rising-mode extra: chart ruler */}
          {mode === 'rising' && asc !== null && (() => {
            const rising = signForLongitude(asc);
            const rulerName = rising.ruler === 'Pluto' || rising.ruler === 'Uranus' || rising.ruler === 'Neptune'
              ? (rising.classicRuler ?? rising.ruler)
              : rising.ruler;
            const ruler = chart.bodies.find((b) => b.body === rulerName);
            return ruler ? (
              <p class="calc__phase mono">
                {t(locale, 'chartRuler')}{locale === 'fr' ? '\u202f:' : ':'} {planetLabel(locale, rulerName)} <PlanetGlyph body={rulerName} size={13} class="calc__pg" /> {t(locale, 'readIn')} {signName(signForLongitude(ruler.lon), locale)} - {t(locale, 'planetSteering')}
              </p>
            ) : null;
          })()}

          {/* Wheel + inspector + placements (full mode) — the Chart Explorer */}
          {mode !== 'full' && chart && (
            <EvidenceDisclosure label={detailLabels.lead.replace(/\s*—\s*$/, '')}>
              <p class="calc__receipt mono" data-chart-receipt>
                {chart.input.utc.toISOString().replace('T', ' · ').slice(0, 21)} UTC
                {city ? ` · ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°` : ''}
                {chart.houses ? ` · ${chart.houses.system === 'whole' ? t(locale, 'wholeSignHouses') : t(locale, 'placidusHouses')}` : ''}
                {' · '}{t(locale, 'engine')}{chart.engineVersion}
              </p>
            </EvidenceDisclosure>
          )}

          {mode === 'full' && scene && (
            <>
              <div class={`calc__wheel shell${tourOpen ? ' calc__wheel--tour' : ''}`}>
                <div class="core calc__wheel-core">
                  <div class="xplr">
                    <div class="xplr__stage">
                      <div
                        class="xplr__wheelbox"
                        ref={wheelboxRef}
                        tabIndex={0}
                        role="group"
                        aria-label={t(locale, 'explorerLabel')}
                        onKeyDown={onWheelKeyDown}
                        data-spotlight-id={spotlight?.id}
                        data-spotlight-run={spotlight?.run}
                        data-spotlight-motion={spotlight?.motion}
                        data-spotlight-phase={spotlight?.phase}
                      >
                        <Wheel
                          bodies={chart.bodies.filter((b) => b.body !== 'South Node')}
                          asc={asc}
                          mc={chart.angles?.mc ?? null}
                          cusps={viewCusps}
                          aspects={lens === 'natal'
                            ? chart.aspects.filter((a) => a.orb < 6 && aspectTypes.includes(a.type))
                            : []}
                          renderOverlay={lensRing ?? undefined}
                          animate
                          interactive={{
                            scene: viewScene ?? scene,
                            selection,
                            emphasis: viewEmphasis,
                            onSelect: applySelect,
                            label: t(locale, 'explorerLabel'),
                            spotlight,
                          }}
                        />
                        {spotlight && selection && entityId(selection) === spotlight.id && (
                          <div
                            key={spotlight.run}
                            class="xplr__spotlight-cue"
                            data-motion={spotlight.motion}
                            data-phase={spotlight.phase}
                            aria-hidden="true"
                          >
                            <span>{russianCopy?.chart.wheelActions.spotlight ?? 'Highlighted on this chart'}</span>
                            <strong>{describeSelection(selection)}</strong>
                          </div>
                        )}
                      </div>
                      {!tourOpen && (
                        <div class="calc__lens-rail" role="group" aria-label={lensLabels.rail}>
                          {(['natal', 'sky', 'progressed', 'return'] as const).map((id) => (
                            <button
                              key={id}
                              type="button"
                              class={`calc__lens-btn${lens === id ? ' is-active' : ''}`}
                              aria-pressed={lens === id}
                              onClick={() => void selectLens(id)}
                              data-lens-btn={id}
                            >
                              {lensLabels[id]}
                            </button>
                          ))}
                        </div>
                      )}
                      <LayerChips
                        aspectTypes={aspectTypes}
                        onAspectTypes={setAspectTypes}
                        showHouses={showHouses}
                        onShowHouses={setShowHouses}
                        hasHouses={chart.houses != null}
                        locale={locale}
                      />
                      {lens !== 'natal' && lensMod && (
                        <lensMod.default
                          lens={lens}
                          chart={chart}
                          locale={locale}
                          loadEngine={loadEngine}
                          track={track}
                          onRing={onLensRing}
                        />
                      )}
                    </div>
                    <div class="xplr__aside">
                      {tourOpen && tourMod ? (
                        <tourMod.ChartTour
                        scene={scene}
                        chart={chart}
                        locale={locale}
                        variant={tourKind ?? 'full'}
                        initialStep={tourKind === 'quick' ? firstReading.step : 0}
                        moonAmbiguous={moonAmbiguous}
                        selection={selection}
                        loadEngine={loadEngine}
                        buildScene={buildSceneModel}
                        topAspects={topAspects}
                        readAspect={natalAspectLine}
                        readHouse={planetInHouseLine}
                        renderInspector={(inspScene, banner) => (
                          <Inspector
                            scene={inspScene}
                            selection={selection}
                            onSelect={applySelect}
                            locale={locale}
                            banner={banner}
                          />
                        )}
                        onSelect={applySelect}
                        onAnnounce={setAnnounce}
                        onVisual={setTourVisual}
                        onEnsure={({ houses, allAspects }) => {
                          if (houses) setShowHouses(true);
                          if (allAspects) setAspectTypes(ALL_ASPECT_TYPES);
                        }}
                        onTrack={track}
                        onProgress={(step) => {
                          if (tourKind !== 'quick') return;
                          persistFirstReading('in_progress', step);
                          track('first_reading_step', { step: String(step + 1) });
                          keepWheelAboveTour();
                        }}
                        onComplete={completeFirstReading}
                        onOpenForecast={() => {
                          track('next_action_clicked', { state: 'guide_complete', action: 'year_ahead' });
                          void selectLens('return');
                        }}
                        onSave={() => {
                          if (tourKind === 'quick') {
                            track('next_action_clicked', { state: 'guide_complete', action: 'save' });
                          }
                          exitTour();
                          void openSavePrompt('tour');
                        }}
                          onShare={shareChartFromAction}
                          onExit={exitTour}
                          returnFocus={() => wheelboxRef.current?.focus()}
                        />
                      ) : (
                        <Inspector
                          scene={scene}
                          selection={selection}
                          onSelect={applySelect}
                          locale={locale}
                        />
                      )}
                      {shareInput && (
                        <ChartActionDock
                          tourOpen={tourOpen}
                          shareOnly={firstReadingPromptVisible}
                          actionLabel={wheelActionCopy.actions}
                          signature={showsEnglishInterpretation && signature ? {
                            headline: signature.title,
                            evidence: signature.summary,
                          } : null}
                          signatureLabel={subjectMode === 'other'
                            ? wheelActionCopy.signatureOther
                            : wheelActionCopy.signatureSelf}
                          guideLabel={firstReading.status === 'complete'
                            ? wheelActionCopy.replay
                            : wheelActionCopy.guide}
                          shareLabel={subjectMode === 'other'
                            ? wheelActionCopy.shareOther
                            : t(locale, 'shareChart')}
                          shareStatusLabel={card === 'busy'
                            ? t(locale, 'rendering')
                            : card === 'saved'
                              ? t(locale, 'cardSaved')
                              : subjectMode === 'other'
                                ? wheelActionCopy.shareOther
                                : t(locale, 'shareChart')}
                          compareLabel={subjectMode === 'other'
                            ? mineHandoff
                              ? wheelActionCopy.compareMine
                              : wheelActionCopy.compareAdd
                            : undefined}
                          compareHref={compareWithMineHref}
                          anotherLabel={wheelActionCopy.another}
                          anotherHref={anotherChartHref}
                          onGuide={() => {
                            track('next_action_clicked', {
                              state: firstReading.status === 'complete' ? 'guide_complete' : 'chart_result',
                              action: firstReading.status === 'complete' ? 'replay_guide' : 'full_tour',
                            });
                            void startTour('full');
                          }}
                          onShare={shareChartFromAction}
                          shareDisabled={card === 'busy'}
                        />
                      )}
                    </div>
                  </div>
                  <p class="sr-only" role="status">{announce}</p>
                </div>
              </div>

              {/* A visual story leads; exact data remains available below. */}
              {showsEnglishInterpretation && reading && (
                <ReadingPath
                  placements={reading.ps}
                  topAspects={reading.top}
                  weather={reading.weather}
                  risingLon={asc}
                  housesKnown={chart.houses != null}
                  selection={selection}
                  onShowOnChart={showOnChartFromReading}
                />
              )}

              {mode === 'full' && showsEnglishInterpretation && ApproachRead && (
                <ApproachRead chart={chart} locale={locale} moonAmbiguous={moonAmbiguous} />
              )}

              {mode === 'full' && showsEnglishInterpretation && CommunicationRead && (
                <CommunicationRead chart={chart} locale={locale} />
              )}
            </>
          )}

          {/* One primary action, derived from the visitor's current state. */}
          <div class="calc__actions">
            {savePromptOpen ? (
              <form class="calc__save-prompt" onSubmit={submitSaveName} data-save-prompt>
                <label class="sr-only" for="chart-save-name">{chartBookCopy.label}</label>
                <input
                  ref={saveNameRef}
                  class="field__input calc__save-name"
                  id="chart-save-name"
                  value={saveDraft}
                  maxLength={NAME_MAX}
                  onInput={(e) => setSaveDraft((e.currentTarget as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Escape') return;
                    e.preventDefault();
                    closeSavePrompt();
                  }}
                />
                <button class="btn btn--primary" type="submit">{chartBookCopy.save}</button>
                <button class="btn btn--ghost" type="button" onClick={() => void commitSave(undefined, 'skip')}>
                  {chartBookCopy.skip}
                </button>
              </form>
            ) : mode === 'full' ? (
              !firstReadingLoaded
                || firstReading.status === 'not_started'
                || firstReading.status === 'in_progress' ? null
                : saved !== 'saved' ? (
                <button
                  ref={saveButtonRef}
                  class="btn btn--primary"
                  type="button"
                  onClick={() => {
                    track('next_action_clicked', {
                      state: firstReading.status === 'complete' ? 'guide_complete' : 'exploring',
                      action: 'save',
                    });
                    void openSavePrompt();
                  }}
                  data-save-chart
                  data-primary-action="save"
                >
                  <span>{t(locale, 'saveThisChart')}</span>
                  <span class="orb">+</span>
                </button>
              ) : (
                <a
                  class="btn btn--primary"
                  href="/today/"
                  title={russianCopy?.chart.englishOnlyTitle}
                  onClick={() => track('next_action_clicked', { state: 'saved', action: 'today' })}
                  data-primary-action="today"
                >
                  <span>{t(locale, 'seeTodaySky')}{russianCopy?.chart.englishOnlySuffix ?? ''}</span>
                  <span class="orb">→</span>
                </a>
              )
            ) : (
              <>
                <button
                  ref={saveButtonRef}
                  class="btn btn--primary"
                  type="button"
                  onClick={() => void openSavePrompt()}
                  aria-disabled={saved === 'saved'}
                  data-save-chart
                >
                  <span>{saved === 'saved' ? t(locale, 'chartSavedDevice') : t(locale, 'saveThisChart')}</span>
                  <span class="orb">{saved === 'saved' ? '✓' : '+'}</span>
                </button>
                <a class="btn btn--ghost" href={localizePath(locale, '/birth-chart/')}><span>{t(locale, 'getBirthChart')}</span><span class="orb">↗</span></a>
              </>
            )}
          </div>
          {mode === 'full'
            && saved !== 'saved'
            && firstReading.status !== 'not_started'
            && firstReading.status !== 'in_progress'
            && <p class="calc__saved">{t(locale, 'saveYearAheadNote')}</p>}
          {saved === 'saved' && <p class="sr-only" role="status">{t(locale, 'chartSavedStatus')}</p>}
          {saved === 'full' && <p class="calc__error" role="alert">{t(locale, 'chartSaveFull')}</p>}
          {saved === 'error' && <p class="calc__error" role="alert">{t(locale, 'chartSaveError')}</p>}
          {saved === 'saved' && <p class="calc__saved">{t(locale, 'chartSavedBeforeLink')} <a href={localizePath(locale, '/profile/')}>{t(locale, 'chartSavedLink')}</a> {t(locale, 'chartSavedAfterLink')}</p>}
          {mode === 'full' && shareInput && (
            <details class="calc__more" data-chart-more>
              <summary class="calc__more-summary">
                <span>{t(locale, 'chartActionsMore')}</span>
                <span class="orb" aria-hidden="true">+</span>
              </summary>
              <div class="calc__more-body">
                {CopyLinkButton && (
                  <div class="calc__more-copy">
                    <CopyLinkButton
                      url={shareUrl()}
                      state={share}
                      onStateChange={setShare}
                      idleLabel={t(locale, 'copyChartLink')}
                      copiedLabel={t(locale, 'linkCopied')}
                      ariaLabel={t(locale, 'linkToChart')}
                      buttonClass="btn btn--glass"
                      dataHook="share"
                    >
                      <p class="calc__share-note">{t(locale, 'shareNote')}</p>
                      {share === 'copied' && (
                        <p class="sr-only" role="status">{t(locale, 'chartLinkCopied')}</p>
                      )}
                    </CopyLinkButton>
                  </div>
                )}
                {card === 'saved' && (
                  <p class="sr-only" role="status">{t(locale, 'chartCardSaved')}</p>
                )}
                {(saved === 'saved' || firstReading.status === 'complete') && CalendarSubscribe && (
                  <CalendarSubscribe
                    locale={locale}
                    positions={{
                      bodies: chart.bodies,
                      angles: chart.angles ? { asc: chart.angles.asc, mc: chart.angles.mc } : null,
                      houseSystem: chart.houses?.system ?? houseSystem,
                      engineVersion: chart.engineVersion,
                    }}
                  />
                )}
                {card === 'error' && <p class="calc__error" role="alert">{t(locale, 'cardError')}</p>}
              </div>
            </details>
          )}
          {mode === 'full' && saved === 'saved' && registryAuraLink && (
            <p class="calc__saved" data-registry-aura-chart-link>
              {registryAuraLink.context === 'return'
                ? registryAuraCopy.return
                : registryAuraCopy.discover}{' '}
              <a href={registryAuraLink.href} onClick={() => {
                for (const event of registryAuraChartAnalytics(registryAuraLink.context)) {
                  trackAnalytics(event.name, event.properties);
                }
              }}>
                {registryAuraLink.context === 'return'
                  ? registryAuraCopy.returnLink
                  : registryAuraCopy.discoverLink}
              </a>
            </p>
          )}
          {a2hsHint && (
            <div class="notice calc__a2hs" role="status">
              <span>{a2hsHint.message}</span>
              <button
                type="button"
                class="place__clear"
                aria-label={a2hsHint.dismissLabel}
                onClick={() => {
                  setA2hsHint(null);
                  if (a2hsHint.platform !== 'ios') loadPushOptIn();
                }}
              >×</button>
            </div>
          )}
          {PushOptIn && locale !== 'ru' && <PushOptIn locale={locale} />}

          {mode === 'full' && scene && (
            <details
              class="calc__detail"
              data-detail
              data-evidence-disclosure
              open={detailOpen}
              onToggle={onDetailToggle}
            >
              <summary class="calc__detail-summary">
                {detailLabels.lead}<span class="mono">{placements.length}</span>{detailLabels.placements}
                {locale === 'ru'
                  ? tp('ru', 'aspects', chart.aspects.length, russianCopy!.plurals)
                  : <><span class="mono">{chart.aspects.length}</span>{detailLabels.aspects}</>}
              </summary>
              <div class="calc__detail-body">
                <p class="calc__receipt mono" data-chart-receipt>
                  {chart.input.utc.toISOString().replace('T', ' · ').slice(0, 21)} UTC
                  {city ? ` · ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°` : ''}
                  {chart.houses ? ` · ${chart.houses.system === 'whole' ? t(locale, 'wholeSignHouses') : t(locale, 'placidusHouses')}` : ''}
                  {' · '}{t(locale, 'engine')}{chart.engineVersion}
                </p>
                <div class="calc__table-wrap">
                  <table class="calc__table">
                    <thead>
                      <tr><th>{t(locale, 'body')}</th><th>{t(locale, 'position')}</th><th>{t(locale, 'sign')}</th>{chart.houses && <th>{t(locale, 'house')}</th>}<th><span class="sr-only">{t(locale, 'motion')}</span></th></tr>
                    </thead>
                    <tbody>
                      {placements.map((p) => {
                        const inScene = scene.bodies.some((b) => b.body === p.body);
                        const isSel = selection?.kind === 'body' && selection.body === p.body;
                        const hue = signForLongitude(p.lon).hue;
                        return (
                          <tr key={p.body} data-selected={isSel ? 'true' : undefined} style={isSel ? `--sign:${hue}` : undefined}>
                            <td>
                              {inScene ? (
                                <button
                                  class="calc__rowbtn"
                                  type="button"
                                  aria-pressed={isSel}
                                  onClick={() => applySelect(isSel ? null : { kind: 'body', body: p.body })}
                                >
                                  <span class="calc__glyph"><PlanetGlyph body={p.body} size={15} /></span> {planetLabel(locale, p.body)}
                                </button>
                              ) : (
                                <><span class="calc__glyph"><PlanetGlyph body={p.body} size={15} /></span> {planetLabel(locale, p.body)}</>
                              )}
                            </td>
                            <td class="mono">{p.label.split(' ')[0]}</td>
                            <td><SignChip lon={p.lon} locale={locale} /></td>
                            {chart.houses && <td class="mono">{p.house}</td>}
                            <td class="mono calc__retro">{p.retrograde ? 'Rx' : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {chart.aspects.length > 0 && (
                  <section class="calc__aspects" aria-labelledby="calc-aspects-title">
                    <h3 id="calc-aspects-title">{t(locale, 'aspectsFound')} - {locale === 'ru'
                      ? tp('ru', 'aspects', chart.aspects.length, russianCopy!.plurals)
                      : <>{chart.aspects.length} {t(locale, 'found')}</>}</h3>
                    <ul>
                      {chart.aspects.map((a) => {
                        const ref: EntityRef = { kind: 'aspect', a: a.a, b: a.b, type: a.type };
                        const inScene = aspectTypes.includes(a.type)
                          && scene.aspects.some((x) => x.a === a.a && x.b === a.b && x.type === a.type);
                        const isSel = selection?.kind === 'aspect'
                          && selection.a === a.a && selection.b === a.b && selection.type === a.type;
                        const line = (
                          <>
                            <PlanetGlyph body={a.a} size={13} class="calc__pg" /> {planetLabel(locale, a.a)} <AspectGlyph type={a.type} size={13} class="calc__pg" /> {aspectLabel(locale, a.type)} <PlanetGlyph body={a.b} size={13} class="calc__pg" /> {planetLabel(locale, a.b)} · {t(locale, 'orb')} {a.orb.toFixed(1)}° {a.applying ? `· ${t(locale, 'applying')}` : ''}
                          </>
                        );
                        return (
                          <li key={`${a.a}${a.b}${a.type}`} class="mono" data-selected={isSel ? 'true' : undefined}>
                            {inScene ? (
                              <button class="calc__rowbtn" type="button" aria-pressed={isSel} onClick={() => applySelect(isSel ? null : ref)}>
                                {line}
                              </button>
                            ) : line}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            </details>
          )}

          {/* The one sanctioned records bridge on a tool page: the sun
              sign's canonical record, one quiet click into the collector's
              wing. Records register — no market language (mirrors CollectBand). */}
          {mode === 'full' && sunSign && (
            <aside class="calc__record">
              <span class="calc__record-label mono">{t(locale, 'recordLabel')}</span>
              <span class="calc__record-text">{signName(sunSign, locale)} {t(locale, 'recordOneOfTwelve')}</span>
              <a
                class="calc__record-link"
                href={`/registry/${sunSign.slug}/`}
                title={russianCopy?.chart.englishOnlyTitle}
              >{t(locale, 'recordViewLink')}</a>
            </aside>
          )}
        </div>
      )}

      {chart && shareInput && shareDialogOpen && ShareDialog && (
        <ShareDialog
          chart={chart}
          locale={locale}
          card={card}
          onCardStateChange={setCard}
          onClose={closeShareDialog}
        />
      )}

      {PwaInstallPrompt && locale !== 'ru' && (
        <PwaInstallPrompt locale={locale} computationCount={pwaComputationCount} />
      )}
    </div>
  );
}
