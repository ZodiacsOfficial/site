/**
 * Lazy, framework-free assistant dialog. The classic page loader imports the
 * stable /assets/assistant-ui.js bundle only after a visitor asks for it.
 * Saved-chart birth inputs are used locally when houses need recomputing; the
 * request contains placement lines only, never a name or birth detail.
 */
import './assistant.css';
import { houseOf, wholeSignCusps } from '../engine/houses';
import { normalizeLocale as normalizeSiteLocale, type ReleasedLocale as Locale } from '../i18n/core';
import { PROFILE_KEY } from '../profile/schema';
import {
  TODAY_CHART_EVENT,
  TODAY_CHART_PREFERENCE_KEY,
  parseTodayChartPreference,
} from '../profile/today-chart';
import { encodeChartLink } from '../share';
import { degreeInSign, signForLongitude } from '../signs';
import {
  assistantEvidenceLabel,
  assistantEvidenceSelection,
  normalizeAssistantEvidence,
  type AssistantEvidence,
} from './evidence';

export type AssistantLocale = Locale;

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StoredBody {
  body: string;
  lon: number;
  retrograde: boolean;
}

export interface StoredChart {
  id: string;
  updatedAt: string;
  birth: {
    date: string;
    time: string | null;
    timeKnown: boolean;
    place: {
      lat: number;
      lon: number;
      tz: string;
    } | null;
  };
  summary: {
    houseSystem: 'whole' | 'placidus';
    bodies: StoredBody[];
    angles: { asc: number; mc: number } | null;
  };
}

interface Copy {
  title: string;
  close: string;
  intro: string;
  log: string;
  input: string;
  placeholder: string;
  send: string;
  stop: string;
  newline: string;
  chartOn: string;
  chartOff: string;
  chartReading: string;
  thinking: string;
  stopped: string;
  complete: string;
  empty: string;
  unavailable: string;
  disabled: string;
  rateLimited: string;
  user: string;
  assistant: string;
  privacy: string;
  consentTitle: string;
  consentBody: string;
  consentConfirm: string;
  consentCancel: string;
  sources: string;
  evidence: string;
  removeEvidence: string;
  openInChart: string;
  contextChanged: string;
}

const COPY: Record<AssistantLocale, Copy> = {
  en: {
    title: 'Ask Zodiacs',
    close: 'Close assistant',
    intro: 'Ask about signs, houses, aspects, timing, or a saved chart.',
    log: 'Conversation',
    input: 'Your question',
    placeholder: 'Ask an astrology question…',
    send: 'Send',
    stop: 'Stop',
    newline: 'Shift + Enter for a new line',
    chartOn: 'Using my chart',
    chartOff: 'Use my chart',
    chartReading: 'Reading the placements in your saved chart…',
    thinking: 'Writing an answer…',
    stopped: 'Stopped.',
    complete: 'Answer complete.',
    empty: 'Write a question first.',
    unavailable: 'The assistant is unavailable right now. Please try again later.',
    disabled: 'The assistant is not available on this site right now.',
    rateLimited: "That's everything for today — the assistant caps out at 30 messages a day.",
    user: 'You',
    assistant: 'Zodiacs',
    privacy: "The assistant can be wrong. Answers are generated; astrology here is symbolic, not deterministic. Conversations aren't stored by us.",
    consentTitle: 'Before your chart is attached',
    consentBody: "While “Using my chart” is on, each question and the placement lines below will be sent to Anthropic. Zodiacs.org does not attach your saved name, birth date, time, place, or coordinates, and does not store the conversation.",
    consentConfirm: 'Attach my chart',
    consentCancel: 'Keep it private',
    sources: 'From this site:',
    evidence: 'Sent with your question; birth details stay private. Full placements send only while “Using my chart” is on',
    removeEvidence: 'Remove chart evidence',
    openInChart: 'Open in your chart',
    contextChanged: 'That chart context changed. Choose “Ask why this matters” again from Today.',
  },
  es: {
    title: 'Pregúntale a Zodiacs',
    close: 'Cerrar asistente',
    intro: 'Pregunta sobre signos, casas, aspectos, ciclos o una carta guardada.',
    log: 'Conversación',
    input: 'Tu pregunta',
    placeholder: 'Haz una pregunta de astrología…',
    send: 'Enviar',
    stop: 'Detener',
    newline: 'Mayús + Intro para una línea nueva',
    chartOn: 'Usando mi carta',
    chartOff: 'Usar mi carta',
    chartReading: 'Leyendo las posiciones de tu carta guardada…',
    thinking: 'Escribiendo una respuesta…',
    stopped: 'Detenido.',
    complete: 'Respuesta completa.',
    empty: 'Escribe una pregunta primero.',
    unavailable: 'El asistente no está disponible ahora. Inténtalo de nuevo más tarde.',
    disabled: 'El asistente no está disponible en este sitio ahora mismo.',
    rateLimited: 'Eso es todo por hoy: el asistente tiene un límite de 30 mensajes al día.',
    user: 'Tú',
    assistant: 'Zodiacs',
    privacy: "El asistente puede equivocarse. Las respuestas son generadas; aquí la astrología es simbólica, no determinista. Nosotros no guardamos las conversaciones.",
    consentTitle: 'Antes de adjuntar tu carta',
    consentBody: 'Mientras «Usando mi carta» esté activo, cada pregunta y las posiciones que aparecen abajo se enviarán a Anthropic. Zodiacs.org no adjunta tu nombre, fecha, hora, lugar de nacimiento ni coordenadas guardados, y no conserva la conversación.',
    consentConfirm: 'Adjuntar mi carta',
    consentCancel: 'Mantenerla privada',
    sources: 'De este sitio:',
    evidence: 'Se enviará con tu pregunta; los datos de nacimiento siguen privados. Las posiciones completas solo se envían mientras «Usando mi carta» esté activo',
    removeEvidence: 'Quitar evidencia de la carta',
    openInChart: 'Abrir en tu carta',
    contextChanged: 'El contexto de esa carta cambió. Vuelve a elegir «Preguntar por qué importa» desde Today.',
  },
  pt: {
    title: 'Pergunte ao Zodiacs',
    close: 'Fechar assistente',
    intro: 'Pergunte sobre signos, casas, aspectos, ciclos ou um mapa salvo.',
    log: 'Conversa',
    input: 'Sua pergunta',
    placeholder: 'Faça uma pergunta sobre astrologia…',
    send: 'Enviar',
    stop: 'Parar',
    newline: 'Shift + Enter para uma nova linha',
    chartOn: 'Usando meu mapa',
    chartOff: 'Usar meu mapa',
    chartReading: 'Lendo as posições do seu mapa salvo…',
    thinking: 'Escrevendo uma resposta…',
    stopped: 'Interrompido.',
    complete: 'Resposta concluída.',
    empty: 'Escreva uma pergunta primeiro.',
    unavailable: 'O assistente não está disponível agora. Tente novamente mais tarde.',
    disabled: 'O assistente não está disponível neste site agora.',
    rateLimited: 'Isso é tudo por hoje — o assistente tem um limite de 30 mensagens por dia.',
    user: 'Você',
    assistant: 'Zodiacs',
    privacy: "O assistente pode errar. As respostas são geradas; aqui a astrologia é simbólica, não determinista. Não armazenamos as conversas.",
    consentTitle: 'Antes de anexar seu mapa',
    consentBody: 'Enquanto “Usando meu mapa” estiver ativo, cada pergunta e as posições abaixo serão enviadas à Anthropic. O Zodiacs.org não anexa seu nome, data, hora, local de nascimento nem coordenadas salvos e não armazena a conversa.',
    consentConfirm: 'Anexar meu mapa',
    consentCancel: 'Manter privado',
    sources: 'Deste site:',
    evidence: 'Será enviada com sua pergunta; os dados de nascimento continuam privados. As posições completas só são enviadas enquanto “Usando meu mapa” estiver ativo',
    removeEvidence: 'Remover evidência do mapa',
    openInChart: 'Abrir no seu mapa',
    contextChanged: 'O contexto desse mapa mudou. Escolha novamente “Perguntar por que isso importa” em Today.',
  },
  fr: {
    title: 'Pose une question à Zodiacs',
    close: 'Fermer l’assistant',
    intro: 'Pose une question sur les signes, les maisons, les aspects, les cycles ou un thème enregistré.',
    log: 'Conversation',
    input: 'Ta question',
    placeholder: 'Pose une question sur l’astrologie…',
    send: 'Envoyer',
    stop: 'Arrêter',
    newline: 'Maj + Entrée pour aller à la ligne',
    chartOn: 'Avec mon thème',
    chartOff: 'Utiliser mon thème',
    chartReading: 'Lecture des positions de ton thème enregistré…',
    thinking: 'Rédaction de la réponse…',
    stopped: 'Interrompu.',
    complete: 'Réponse terminée.',
    empty: 'Écris d’abord une question.',
    unavailable: 'L’assistant est indisponible pour le moment. Réessaie plus tard.',
    disabled: 'L’assistant n’est pas disponible sur ce site pour le moment.',
    rateLimited: 'C’est tout pour aujourd’hui — l’assistant est limité à 30 messages par jour.',
    user: 'Toi',
    assistant: 'Zodiacs',
    privacy: "L’assistant peut se tromper. Les réponses sont générées ; l’astrologie est ici symbolique, non déterministe. Nous ne conservons pas les conversations.",
    consentTitle: 'Avant de joindre votre thème',
    consentBody: 'Tant que « Avec mon thème » est activé, chaque question et les positions ci-dessous sont envoyées à Anthropic. Zodiacs.org ne joint aucun nom, date, heure, lieu de naissance ou coordonnée provenant du thème enregistré, et ne conserve pas la conversation.',
    consentConfirm: 'Joindre mon thème',
    consentCancel: 'Le garder privé',
    sources: 'Depuis ce site :',
    evidence: 'Envoyé avec ta question ; les données de naissance restent privées. Les positions complètes ne sont envoyées que lorsque « Avec mon thème » est activé',
    removeEvidence: 'Retirer cet élément du thème',
    openInChart: 'Ouvrir dans ton thème',
    contextChanged: 'Le contexte de ce thème a changé. Choisis à nouveau « Demander pourquoi » depuis Today.',
  },
  it: {
    title: 'Chiedi a Zodiacs',
    close: 'Chiudi l’assistente',
    intro: 'Fai una domanda su segni, case, aspetti, cicli o un tema salvato.',
    log: 'Conversazione',
    input: 'La tua domanda',
    placeholder: 'Fai una domanda di astrologia…',
    send: 'Invia',
    stop: 'Interrompi',
    newline: 'Maiusc + Invio per andare a capo',
    chartOn: 'Con il mio tema',
    chartOff: 'Usa il mio tema',
    chartReading: 'Lettura delle posizioni nel tuo tema salvato…',
    thinking: 'Scrittura della risposta…',
    stopped: 'Interrotto.',
    complete: 'Risposta completata.',
    empty: 'Prima scrivi una domanda.',
    unavailable: 'L’assistente non è disponibile in questo momento. Riprova più tardi.',
    disabled: 'L’assistente non è disponibile su questo sito in questo momento.',
    rateLimited: 'Per oggi è tutto — l’assistente ha un limite di 30 messaggi al giorno.',
    user: 'Tu',
    assistant: 'Zodiacs',
    privacy: "L’assistente può sbagliare. Le risposte sono generate; qui l’astrologia è simbolica, non deterministica. Non conserviamo le conversazioni.",
    consentTitle: 'Prima di allegare il tuo tema',
    consentBody: 'Finché “Con il mio tema” è attivo, ogni domanda e le posizioni qui sotto vengono inviate ad Anthropic. Zodiacs.org non allega il nome, la data, l’ora, il luogo di nascita o le coordinate salvati e non conserva la conversazione.',
    consentConfirm: 'Allega il mio tema',
    consentCancel: 'Tienilo privato',
    sources: 'Da questo sito:',
    evidence: 'Inviato con la domanda; i dati di nascita restano privati. Le posizioni complete vengono inviate solo mentre “Con il mio tema” è attivo',
    removeEvidence: 'Rimuovi il dato del tema',
    openInChart: 'Apri nel tuo tema',
    contextChanged: 'Il contesto del tema è cambiato. Scegli di nuovo “Chiedi perché conta” da Today.',
  },
};

const MAX_INPUT = 1_200;
const MAX_MESSAGES = 12;
const MAX_CHART_CONTEXT = 2_000;
const STYLESHEET_HREF = '/assets/assistant-ui.css';
let stylesheetPromise: Promise<void> | null = null;

let root: HTMLDivElement | null = null;
let panel: HTMLDivElement | null = null;
let title: HTMLHeadingElement | null = null;
let closeButton: HTMLButtonElement | null = null;
let intro: HTMLParagraphElement | null = null;
let transcript: HTMLDivElement | null = null;
let status: HTMLParagraphElement | null = null;
let form: HTMLFormElement | null = null;
let textarea: HTMLTextAreaElement | null = null;
let sendButton: HTMLButtonElement | null = null;
let stopButton: HTMLButtonElement | null = null;
let chartButton: HTMLButtonElement | null = null;
let evidenceChip: HTMLDivElement | null = null;
let evidenceText: HTMLParagraphElement | null = null;
let evidenceRemoveButton: HTMLButtonElement | null = null;
let newlineHint: HTMLSpanElement | null = null;
let privacy: HTMLParagraphElement | null = null;
let opener: HTMLElement | null = null;
let activeRequest: AbortController | null = null;
let previousOverflow = '';
let locale: AssistantLocale = 'en';
let messages: AssistantMessage[] = [];
let savedChart: StoredChart | null = null;
let chartEnabled = false;
let chartSummaryPromise: Promise<string | null> | null = null;
let activeEvidence: AssistantEvidence | null = null;
let activeEvidenceChartId: string | null = null;
let contextualDraft: string | null = null;

class AssistantFailure extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const currentCopy = () => COPY[locale];

function ensureStylesheet(): Promise<void> {
  if (stylesheetPromise) return stylesheetPromise;
  const existing = document.querySelector<HTMLLinkElement>(`link[href="${STYLESHEET_HREF}"]`);
  const link = existing ?? document.createElement('link');
  if (!existing) {
    link.rel = 'stylesheet';
    link.href = STYLESHEET_HREF;
    link.dataset.assistantStyles = '';
  }
  stylesheetPromise = new Promise((resolve) => {
    if (link.sheet) {
      resolve();
      return;
    }
    link.addEventListener('load', () => resolve(), { once: true });
    // A missing build artifact is caught by check-dist. Resolve here so a
    // transient stylesheet error cannot leave the launcher permanently inert.
    link.addEventListener('error', () => resolve(), { once: true });
  });
  if (!existing) document.head.appendChild(link);
  return stylesheetPromise;
}

function normalizeLocale(value?: string): AssistantLocale {
  return normalizeSiteLocale(value ?? document.documentElement.lang);
}

function track(name: string): void {
  (window as unknown as {
    zodiacsAnalytics?: { track?: (event: string) => void };
  }).zodiacsAnalytics?.track?.(name);
}

function finiteLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;
}

function parseStoredChart(value: unknown): StoredChart | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const rawBirth = candidate.birth;
  const rawSummary = candidate.summary;
  if (!rawBirth || typeof rawBirth !== 'object' || Array.isArray(rawBirth)) return null;
  if (!rawSummary || typeof rawSummary !== 'object' || Array.isArray(rawSummary)) return null;

  const birth = rawBirth as Record<string, unknown>;
  const summary = rawSummary as Record<string, unknown>;
  const bodies = Array.isArray(summary.bodies)
    ? summary.bodies.flatMap((body): StoredBody[] => {
        if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
        const record = body as Record<string, unknown>;
        if (typeof record.body !== 'string' || !record.body.trim() || !finiteLongitude(record.lon)) return [];
        return [{ body: record.body.trim(), lon: record.lon, retrograde: record.retrograde === true }];
      })
    : [];
  if (!bodies.length) return null;

  let angles: StoredChart['summary']['angles'] = null;
  if (summary.angles && typeof summary.angles === 'object' && !Array.isArray(summary.angles)) {
    const rawAngles = summary.angles as Record<string, unknown>;
    if (finiteLongitude(rawAngles.asc) && finiteLongitude(rawAngles.mc)) {
      angles = { asc: rawAngles.asc, mc: rawAngles.mc };
    }
  }

  let place: StoredChart['birth']['place'] = null;
  if (birth.place && typeof birth.place === 'object' && !Array.isArray(birth.place)) {
    const rawPlace = birth.place as Record<string, unknown>;
    if (
      typeof rawPlace.lat === 'number' && Number.isFinite(rawPlace.lat)
      && typeof rawPlace.lon === 'number' && Number.isFinite(rawPlace.lon)
      && typeof rawPlace.tz === 'string' && rawPlace.tz.trim()
    ) {
      place = { lat: rawPlace.lat, lon: rawPlace.lon, tz: rawPlace.tz };
    }
  }

  const houseSystem = summary.houseSystem === 'placidus' ? 'placidus' : 'whole';
  if (typeof candidate.id !== 'string' || !candidate.id) return null;
  return {
    id: candidate.id,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '',
    birth: {
      date: typeof birth.date === 'string' ? birth.date : '',
      time: typeof birth.time === 'string' ? birth.time : null,
      timeKnown: birth.timeKnown === true,
      place,
    },
    summary: { houseSystem, bodies, angles },
  };
}

/** Legacy fallback for devices that have not chosen a Today chart yet. */
export function latestSavedChartFromJson(raw: string | null): StoredChart | null {
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as { version?: unknown; charts?: unknown };
    if (profile?.version !== 1 || !Array.isArray(profile.charts)) return null;
    return profile.charts
      .map(parseStoredChart)
      .filter((chart): chart is StoredChart => chart !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
  } catch {
    return null;
  }
}

/** The explicit Today chart wins; an invalid/missing choice falls back once. */
export function selectedSavedChartFromJson(
  rawProfile: string | null,
  rawPreference: string | null,
): StoredChart | null {
  if (!rawProfile) return null;
  try {
    const profile = JSON.parse(rawProfile) as { version?: unknown; charts?: unknown };
    if (profile?.version !== 1 || !Array.isArray(profile.charts)) return null;
    const charts = profile.charts
      .map(parseStoredChart)
      .filter((chart): chart is StoredChart => chart !== null);
    const preferredId = parseTodayChartPreference(rawPreference)?.chartId;
    return charts.find((chart) => chart.id === preferredId)
      ?? charts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
      ?? null;
  } catch {
    return null;
  }
}

function readSelectedSavedChart(): StoredChart | null {
  try {
    const preferenceRaw = localStorage.getItem(TODAY_CHART_PREFERENCE_KEY);
    const selected = selectedSavedChartFromJson(
      localStorage.getItem(PROFILE_KEY),
      preferenceRaw,
    );
    if (selected && parseTodayChartPreference(preferenceRaw)?.chartId !== selected.id) {
      localStorage.setItem(TODAY_CHART_PREFERENCE_KEY, JSON.stringify({
        version: 1,
        chartId: selected.id,
      }));
    } else if (!selected && preferenceRaw !== null) {
      localStorage.removeItem(TODAY_CHART_PREFERENCE_KEY);
    }
    return selected;
  } catch {
    return null;
  }
}

function placementLabel(lon: number): string {
  const sign = signForLongitude(lon);
  const within = degreeInSign(lon);
  const minutes = Math.floor((within - Math.floor(within)) * 60 + 1e-7);
  return `${Math.floor(within)}°${String(minutes).padStart(2, '0')}′ ${sign.name}`;
}

function validCusps(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 12 && value.every(finiteLongitude);
}

/**
 * Resolve a saved chart to body/angle + sign + degree + house lines. Birth
 * inputs are read only to compute Placidus locally and never enter the result.
 */
export async function placementSummaryForChart(chart: StoredChart): Promise<string | null> {
  let bodies = chart.summary.bodies;
  let angles = chart.birth.timeKnown ? chart.summary.angles : null;
  let cusps: number[] | null = null;

  if (chart.birth.timeKnown && angles && chart.summary.houseSystem === 'whole') {
    cusps = wholeSignCusps(angles.asc);
  }

  const canResolvePlacidus = chart.summary.houseSystem === 'placidus'
    && chart.birth.timeKnown
    && chart.birth.place !== null
    && /^\d{4}-\d{2}-\d{2}$/.test(chart.birth.date)
    && typeof chart.birth.time === 'string'
    && /^\d{2}:\d{2}$/.test(chart.birth.time);

  if (canResolvePlacidus) {
    try {
      const [{ computeChart }, { resolveLocalToUtc }] = await Promise.all([
        import('../engine/full'),
        import('../time/localToUtc'),
      ]);
      const place = chart.birth.place!;
      const resolved = resolveLocalToUtc(chart.birth.date, chart.birth.time!, place.tz);
      const computed = computeChart({
        utc: resolved.utc,
        latitude: place.lat,
        longitude: place.lon,
        houseSystem: 'placidus',
        timeKnown: true,
        flags: resolved.flags,
      });
      bodies = computed.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde }));
      angles = computed.angles ? { asc: computed.angles.asc, mc: computed.angles.mc } : null;
      cusps = validCusps(computed.houses?.cusps) ? computed.houses.cusps : null;
    } catch {
      // Stored placements remain usable. Without a local house result, omit
      // houses instead of guessing from a Placidus ASC.
      cusps = null;
    }
  }

  const lines = bodies.map(({ body, lon, retrograde }) => {
    const house = cusps ? houseOf(lon, cusps) : null;
    return `${body}: ${placementLabel(lon)}${house ? ` · house ${house}` : ''}${retrograde ? ' · retrograde' : ''}`;
  });
  if (angles) {
    for (const [label, lon] of [['ASC', angles.asc], ['MC', angles.mc]] as const) {
      const house = cusps ? houseOf(lon, cusps) : null;
      lines.push(`${label}: ${placementLabel(lon)}${house ? ` · house ${house}` : ''}`);
    }
  }
  if (!lines.length) return null;
  return `Tropical chart placements:\n${lines.join('\n')}`.slice(0, MAX_CHART_CONTEXT);
}

/**
 * Private chart handoff for a grounded answer. Birth inputs remain in the
 * fragment and therefore never reach the server; the query only selects the
 * natal point that the evidence named.
 */
export function chartHrefForAssistantEvidence(
  chart: StoredChart,
  evidence: AssistantEvidence,
  requestedLocale: AssistantLocale = 'en',
): string | null {
  const place = chart.birth.place;
  if (!place) return null;
  const prefix = requestedLocale === 'en' ? '' : `/${requestedLocale}`;
  const token = encodeChartLink({
    date: chart.birth.date,
    time: chart.birth.time,
    timeKnown: chart.birth.timeKnown,
    lat: place.lat,
    lon: place.lon,
    tz: place.tz,
    houseSystem: chart.summary.houseSystem,
  });
  const fragment = new URLSearchParams({
    c: token,
    sel: assistantEvidenceSelection(evidence),
  });
  return `${prefix}/birth-chart/#${fragment}`;
}

export interface ParsedAssistantFrame {
  delta?: string;
  done?: boolean;
  error?: string;
}

/** Parse one SSE frame without trusting or rendering server HTML. */
export function parseAssistantSseFrame(frame: string): ParsedAssistantFrame {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n');
  if (!data) return {};
  if (data === '[DONE]') return { done: true };
  try {
    const parsed = JSON.parse(data) as { t?: unknown; error?: unknown };
    if (typeof parsed.error === 'string') return { error: parsed.error };
    if (typeof parsed.t === 'string') return { delta: parsed.t };
  } catch {
    return { error: 'unavailable' };
  }
  return {};
}

export async function consumeAssistantStream(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<void> {
  if (!response.body) throw new AssistantFailure('unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const consumeFrame = (frame: string): boolean => {
    const parsed = parseAssistantSseFrame(frame);
    if (parsed.error) throw new AssistantFailure(parsed.error);
    if (parsed.delta) onDelta(parsed.delta);
    return parsed.done === true;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let boundary = buffer.match(/\r?\n\r?\n/);
    while (boundary?.index !== undefined) {
      const frame = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);
      if (consumeFrame(frame)) {
        await reader.cancel().catch(() => {});
        return;
      }
      boundary = buffer.match(/\r?\n\r?\n/);
    }
    if (done) break;
  }
  if (buffer.trim() && consumeFrame(buffer)) return;
  throw new AssistantFailure('unavailable');
}

/**
 * Turn bare same-site /paths/ into anchors after streaming completes. Text is
 * always inserted with text nodes; model output is never assigned to HTML.
 */
export function renderAssistantText(container: HTMLElement, text: string): void {
  container.textContent = '';
  const pattern = /(^|[\s([])(\/(?!\/)[^\s<>"`]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index + match[1].length;
    let path = match[2];
    while (/[.,!?;:)\]]$/.test(path)) path = path.slice(0, -1);
    if (!path || path.includes('\\')) continue;
    let valid = false;
    try {
      valid = new URL(path, window.location.origin).origin === window.location.origin;
    } catch {
      valid = false;
    }
    if (!valid) continue;
    container.append(document.createTextNode(text.slice(cursor, start)));
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.textContent = path;
    anchor.className = 'zassistant__link';
    container.append(anchor);
    cursor = start + path.length;
  }
  container.append(document.createTextNode(text.slice(cursor)));
}

function scrollTranscript(): void {
  requestAnimationFrame(() => {
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  });
}

function appendMessage(role: AssistantMessage['role'], content: string): {
  article: HTMLElement;
  body: HTMLParagraphElement;
} {
  const article = document.createElement('article');
  article.className = `zassistant__message zassistant__message--${role}`;
  const label = document.createElement('span');
  label.className = 'zassistant__speaker mono';
  label.textContent = role === 'user' ? currentCopy().user : currentCopy().assistant;
  const body = document.createElement('p');
  body.className = 'zassistant__message-body';
  body.textContent = content;
  article.append(label, body);
  transcript?.appendChild(article);
  if (intro) intro.hidden = true;
  scrollTranscript();
  return { article, body };
}

function setStatus(message = ''): void {
  if (status) status.textContent = message;
}

function syncTextareaHeight(): void {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
}

function syncSendState(): void {
  if (!sendButton || !textarea) return;
  sendButton.disabled = Boolean(activeRequest) || !textarea.value.trim();
}

function syncChartButton(): void {
  if (!chartButton) return;
  chartButton.hidden = !savedChart;
  chartButton.disabled = Boolean(activeRequest);
  chartButton.setAttribute('aria-pressed', String(chartEnabled));
  chartButton.classList.toggle('is-active', chartEnabled);
  chartButton.textContent = chartEnabled ? currentCopy().chartOn : currentCopy().chartOff;
}

function syncEvidenceChip(): void {
  if (!evidenceChip || !evidenceText || !evidenceRemoveButton) return;
  evidenceChip.hidden = activeEvidence === null;
  evidenceText.textContent = activeEvidence
    ? `${currentCopy().evidence}: ${assistantEvidenceLabel(activeEvidence)}`
    : '';
  evidenceRemoveButton.textContent = currentCopy().removeEvidence;
  if (textarea) {
    if (activeEvidence) textarea.setAttribute('aria-describedby', evidenceText.id);
    else textarea.removeAttribute('aria-describedby');
  }
}

function clearAssistantEvidence(clearPrefill: boolean): void {
  activeEvidence = null;
  activeEvidenceChartId = null;
  if (clearPrefill && textarea && contextualDraft && textarea.value === contextualDraft) {
    textarea.value = '';
    syncTextareaHeight();
    syncSendState();
  }
  contextualDraft = null;
  syncEvidenceChip();
}

function setBusy(busy: boolean): void {
  activeRequest = busy ? activeRequest : null;
  panel?.setAttribute('aria-busy', String(busy));
  if (stopButton) stopButton.hidden = !busy;
  if (evidenceRemoveButton) evidenceRemoveButton.disabled = busy;
  syncSendState();
  syncChartButton();
}

function refreshSavedChart(): void {
  // A consent card on screen previews the chart that was saved when it
  // opened. Once the saved chart changes, that preview no longer describes
  // what a later confirmation would send, so the card is withdrawn rather
  // than left to grant consent for text the visitor never saw.
  dismissPendingConsent?.();
  savedChart = readSelectedSavedChart();
  if (activeEvidence && activeEvidenceChartId !== savedChart?.id) {
    clearAssistantEvidence(true);
    setStatus(currentCopy().contextChanged);
  }
  chartEnabled = false;
  chartConsented = false;
  chartSummaryPromise = null;
  syncChartButton();
}

function friendlyFailure(code: string): string {
  if (code === 'limit' || code === '429') return currentCopy().rateLimited;
  if (code === 'disabled') return currentCopy().disabled;
  return currentCopy().unavailable;
}

async function failureCode(response: Response): Promise<string> {
  if (response.status === 429) return 'limit';
  try {
    const data = await response.json() as { error?: unknown };
    if (typeof data.error === 'string') return data.error;
  } catch {
    // Status is enough for the generic state.
  }
  return response.status === 503 ? 'unavailable' : String(response.status);
}

function abortRequest(): void {
  if (!activeRequest) return;
  activeRequest.abort();
}

let chartConsented = false;
/** Withdraws an on-screen consent card, declining it, when set. */
let dismissPendingConsent: (() => void) | null = null;

/**
 * Plain-language consent with an exact preview of the payload. Resolves
 * true only when the visitor confirms; the summary shown is the same
 * string the request will carry.
 */
async function requestChartConsent(): Promise<boolean> {
  if (chartConsented) return true;
  const log = transcript;
  if (!savedChart || !log) return false;
  chartSummaryPromise ??= placementSummaryForChart(savedChart);
  const summary = await chartSummaryPromise;
  if (!summary) return false;
  return new Promise((resolve) => {
    const copy = currentCopy();
    const card = document.createElement('section');
    card.className = 'zassistant__consent';
    const heading = document.createElement('h3');
    heading.textContent = copy.consentTitle;
    const body = document.createElement('p');
    body.textContent = copy.consentBody;
    const preview = document.createElement('pre');
    preview.className = 'zassistant__consent-preview';
    preview.textContent = summary;
    const row = document.createElement('div');
    row.className = 'zassistant__consent-actions';
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'zassistant__consent-confirm';
    confirm.textContent = copy.consentConfirm;
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'zassistant__consent-cancel';
    cancel.textContent = copy.consentCancel;
    const settle = (granted: boolean) => {
      card.remove();
      dismissPendingConsent = null;
      chartConsented = granted;
      if (!granted) chartEnabled = false;
      syncChartButton();
      resolve(granted);
    };
    dismissPendingConsent = () => settle(false);
    confirm.addEventListener('click', () => settle(true));
    cancel.addEventListener('click', () => settle(false));
    row.append(confirm, cancel);
    card.append(heading, body, preview, row);
    log.append(card);
    scrollTranscript();
    confirm.focus();
  });
}

/** Append the internal-source row beneath a completed answer. */
function appendSourcesRow(container: HTMLElement, text: string): void {
  const paths = [...new Set([...text.matchAll(/(?:^|[\s([])(\/(?!\/)[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?)/g)]
    .map((match) => match[1].endsWith('/') ? match[1] : `${match[1]}/`))].slice(0, 4);
  if (paths.length === 0) return;
  const row = document.createElement('p');
  row.className = 'zassistant__sources';
  row.append(document.createTextNode(`${currentCopy().sources} `));
  paths.forEach((path, index) => {
    if (index > 0) row.append(document.createTextNode(' · '));
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.textContent = path;
    row.append(anchor);
  });
  container.append(row);
}

function appendChartEvidenceLink(
  container: HTMLElement,
  chart: StoredChart | null,
  evidence: AssistantEvidence | null,
): void {
  if (!chart || !evidence) return;
  const href = chartHrefForAssistantEvidence(chart, evidence, locale);
  if (!href) return;
  const row = document.createElement('p');
  row.className = 'zassistant__chart-link-row';
  const anchor = document.createElement('a');
  anchor.className = 'zassistant__chart-link';
  anchor.href = href;
  anchor.textContent = `${currentCopy().openInChart} →`;
  row.append(anchor);
  container.append(row);
}

function questionRequestsMyChart(question: string): boolean {
  const normalized = question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return /\b(?:my (?:birth )?chart|mi carta(?: natal)?)\b/.test(normalized);
}

async function submitQuestion(): Promise<void> {
  if (!textarea || activeRequest) return;
  const question = textarea.value.trim();
  if (!question) {
    setStatus(currentCopy().empty);
    return;
  }

  if (activeEvidence) {
    const selectedNow = readSelectedSavedChart();
    if (!activeEvidenceChartId || selectedNow?.id !== activeEvidenceChartId) {
      clearAssistantEvidence(true);
      setStatus(currentCopy().contextChanged);
      return;
    }
    savedChart = selectedNow;
  }

  const userMessage: AssistantMessage = { role: 'user', content: question };
  const requestMessages = messages.concat(userMessage).slice(-MAX_MESSAGES);
  const evidenceIdentity = activeEvidence;
  const evidenceForRequest = activeEvidence ? { ...activeEvidence } : null;
  const chartForRequest = savedChart;
  appendMessage('user', question);
  textarea.value = '';
  contextualDraft = null;
  syncTextareaHeight();
  const assistantMessage = appendMessage('assistant', '');
  assistantMessage.article.setAttribute('aria-busy', 'true');

  activeRequest = new AbortController();
  setBusy(true);

  let answer = '';
  try {
    let chart: string | undefined;
    const wantsChart = Boolean(savedChart) && (chartEnabled || questionRequestsMyChart(question));
    if (wantsChart && savedChart) {
      setStatus(currentCopy().chartReading);
      const granted = await requestChartConsent();
      if (granted) {
        chartEnabled = true;
        syncChartButton();
        chartSummaryPromise ??= placementSummaryForChart(savedChart);
        const resolved = await chartSummaryPromise;
        if (chartEnabled && resolved) chart = resolved;
      }
    }
    setStatus(currentCopy().thinking);

    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: requestMessages,
        ...(chart ? { chart } : {}),
        ...(evidenceForRequest ? { evidence: evidenceForRequest } : {}),
      }),
      signal: activeRequest.signal,
    });
    if (!response.ok) throw new AssistantFailure(await failureCode(response));

    await consumeAssistantStream(response, (delta) => {
      answer += delta;
      assistantMessage.body.textContent = answer;
      scrollTranscript();
    });
    if (!answer.trim()) throw new AssistantFailure('unavailable');

    renderAssistantText(assistantMessage.body, answer);
    appendSourcesRow(assistantMessage.body, answer);
    appendChartEvidenceLink(assistantMessage.article, chartForRequest, evidenceForRequest);
    assistantMessage.article.removeAttribute('aria-busy');
    messages = [...requestMessages, { role: 'assistant' as const, content: answer }].slice(-MAX_MESSAGES);
    if (activeEvidence === evidenceIdentity) clearAssistantEvidence(false);
    setStatus(currentCopy().complete);
    track('assistant_reply');
  } catch (error) {
    assistantMessage.article.removeAttribute('aria-busy');
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    if (!answer) assistantMessage.article.remove();
    else assistantMessage.article.classList.add('is-partial');
    if (aborted) {
      setStatus(currentCopy().stopped);
    } else {
      const code = error instanceof AssistantFailure ? error.code : 'unavailable';
      setStatus(friendlyFailure(code));
    }
  } finally {
    setBusy(false);
    if (root && !root.hidden) textarea.focus();
  }
}

function focusableControls(): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>('button:not([hidden]):not([disabled]), textarea:not([disabled]), a[href]')]
    .filter((element) => element.getClientRects().length > 0);
}

function closeAssistant(): void {
  if (!root || root.hidden) return;
  abortRequest();
  root.hidden = true;
  document.documentElement.style.overflow = previousOverflow;
  opener?.focus();
  opener = null;
}

function applyCopy(): void {
  const copy = currentCopy();
  if (title) title.textContent = copy.title;
  if (closeButton) closeButton.setAttribute('aria-label', copy.close);
  if (intro) intro.textContent = copy.intro;
  if (transcript) transcript.setAttribute('aria-label', copy.log);
  if (textarea) {
    textarea.setAttribute('aria-label', copy.input);
    textarea.placeholder = copy.placeholder;
  }
  if (sendButton) sendButton.textContent = copy.send;
  if (stopButton) stopButton.textContent = copy.stop;
  if (newlineHint) newlineHint.textContent = copy.newline;
  if (privacy) privacy.textContent = copy.privacy;
  syncChartButton();
  syncEvidenceChip();
}

function build(): void {
  root = document.createElement('div');
  root.className = 'zassistant';
  root.hidden = true;
  root.addEventListener('click', (event) => {
    if (event.target === root) closeAssistant();
  });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = focusableControls();
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  panel = document.createElement('div');
  panel.className = 'zassistant__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'zassistant-title');

  const header = document.createElement('header');
  header.className = 'zassistant__head';
  title = document.createElement('h2');
  title.id = 'zassistant-title';
  title.className = 'zassistant__title';
  closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'zassistant__close';
  closeButton.textContent = '✕';
  closeButton.addEventListener('click', closeAssistant);
  header.append(title, closeButton);

  intro = document.createElement('p');
  intro.className = 'zassistant__intro';

  evidenceChip = document.createElement('div');
  evidenceChip.className = 'zassistant__evidence-chip';
  evidenceChip.hidden = true;
  evidenceText = document.createElement('p');
  evidenceText.id = 'zassistant-evidence';
  evidenceText.className = 'zassistant__evidence-text mono';
  evidenceText.setAttribute('aria-live', 'polite');
  evidenceRemoveButton = document.createElement('button');
  evidenceRemoveButton.type = 'button';
  evidenceRemoveButton.className = 'zassistant__evidence-remove';
  evidenceRemoveButton.addEventListener('click', () => clearAssistantEvidence(true));
  evidenceChip.append(evidenceText, evidenceRemoveButton);

  chartButton = document.createElement('button');
  chartButton.type = 'button';
  chartButton.className = 'zassistant__chart-chip';
  chartButton.hidden = true;
  chartButton.addEventListener('click', () => {
    if (chartEnabled) {
      chartEnabled = false;
      syncChartButton();
      return;
    }
    void requestChartConsent().then((granted) => {
      chartEnabled = granted;
      syncChartButton();
    });
  });

  transcript = document.createElement('div');
  transcript.className = 'zassistant__log';
  transcript.setAttribute('role', 'log');
  transcript.setAttribute('aria-live', 'polite');
  transcript.setAttribute('aria-relevant', 'additions text');

  status = document.createElement('p');
  status.className = 'zassistant__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  form = document.createElement('form');
  form.className = 'zassistant__form';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitQuestion();
  });
  textarea = document.createElement('textarea');
  textarea.className = 'zassistant__input';
  textarea.rows = 2;
  textarea.maxLength = MAX_INPUT;
  textarea.autocomplete = 'off';
  textarea.spellcheck = true;
  textarea.addEventListener('input', () => {
    contextualDraft = null;
    syncTextareaHeight();
    syncSendState();
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form?.requestSubmit();
    }
  });

  const actions = document.createElement('div');
  actions.className = 'zassistant__actions';
  newlineHint = document.createElement('span');
  newlineHint.className = 'zassistant__hint mono';
  sendButton = document.createElement('button');
  sendButton.type = 'submit';
  sendButton.className = 'zassistant__send';
  sendButton.disabled = true;
  stopButton = document.createElement('button');
  stopButton.type = 'button';
  stopButton.className = 'zassistant__stop';
  stopButton.hidden = true;
  stopButton.addEventListener('click', () => abortRequest());
  actions.append(newlineHint, sendButton, stopButton);
  form.append(textarea, actions);

  privacy = document.createElement('p');
  privacy.className = 'zassistant__privacy';

  panel.append(header, intro, evidenceChip, chartButton, transcript, status, form, privacy);
  root.appendChild(panel);
  document.body.appendChild(root);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root && !root.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeAssistant();
    }
  }, true);
  window.addEventListener('zodiacs:profile', () => {
    if (!activeRequest) refreshSavedChart();
  });
  window.addEventListener(TODAY_CHART_EVENT, () => {
    if (!activeRequest) refreshSavedChart();
  });
}

export type AssistantOpenContext =
  | {
      evidence: AssistantEvidence;
      /** Local-only binding; never included in the API payload. */
      chartId: string;
      suggestedQuestion?: string;
    }
  | {
      evidence?: undefined;
      chartId?: undefined;
      suggestedQuestion?: string;
    };

/** Open the assistant dialog. Safe to call repeatedly on the same page. */
export async function openAssistant(
  requestedLocale?: string,
  from?: HTMLElement | null,
  context?: AssistantOpenContext,
): Promise<void> {
  await ensureStylesheet();
  locale = normalizeLocale(requestedLocale);
  if (!root) build();
  applyCopy();
  refreshSavedChart();
  const requestedEvidence = normalizeAssistantEvidence(context?.evidence);
  const suggestedQuestion = context?.suggestedQuestion?.trim().slice(0, MAX_INPUT) ?? '';
  if (textarea && contextualDraft && textarea.value === contextualDraft) {
    textarea.value = '';
    syncTextareaHeight();
    syncSendState();
  }
  contextualDraft = null;
  activeEvidence = null;
  activeEvidenceChartId = null;
  const contextAccepted = requestedEvidence !== null
    && typeof context?.chartId === 'string'
    && context.chartId === savedChart?.id
    && Boolean(textarea)
    && !textarea!.value.trim();
  if (contextAccepted) {
    activeEvidence = requestedEvidence;
    activeEvidenceChartId = context!.chartId!;
  }
  syncEvidenceChip();
  if ((!requestedEvidence || contextAccepted) && suggestedQuestion && textarea && !textarea.value.trim()) {
    textarea.value = suggestedQuestion;
    contextualDraft = suggestedQuestion;
    syncTextareaHeight();
    syncSendState();
  }
  if (root!.hidden) {
    opener = from ?? (document.activeElement as HTMLElement | null);
    previousOverflow = document.documentElement.style.overflow;
  }
  root!.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  setStatus(requestedEvidence && !contextAccepted ? currentCopy().contextChanged : '');
  textarea!.focus();
  track('assistant_open');
}
