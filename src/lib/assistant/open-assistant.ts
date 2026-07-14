/**
 * Lazy, framework-free assistant dialog. The classic page loader imports the
 * stable /assets/assistant-ui.js bundle only after a visitor asks for it.
 * Saved-chart birth inputs are used locally when houses need recomputing; the
 * request contains placement lines only, never a name or birth detail.
 */
import './assistant.css';
import { houseOf, wholeSignCusps } from '../engine/houses';
import { normalizeLocale as normalizeSiteLocale, type Locale } from '../i18n/core';
import { PROFILE_KEY } from '../profile/schema';
import { degreeInSign, signForLongitude } from '../signs';

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

interface StoredChart {
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
    privacy: "The assistant can be wrong. Conversations aren't stored by us.",
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
    privacy: 'El asistente puede equivocarse. Nosotros no guardamos las conversaciones.',
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
    privacy: 'O assistente pode errar. Não armazenamos as conversas.',
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
    privacy: 'L’assistant peut se tromper. Nous ne conservons pas les conversations.',
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
  return {
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

/** Newest saved chart, matching the site's returning-visitor heuristic. */
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

function readLatestSavedChart(): StoredChart | null {
  try {
    return latestSavedChartFromJson(localStorage.getItem(PROFILE_KEY));
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

function setBusy(busy: boolean): void {
  activeRequest = busy ? activeRequest : null;
  panel?.setAttribute('aria-busy', String(busy));
  if (stopButton) stopButton.hidden = !busy;
  syncSendState();
  syncChartButton();
}

function refreshSavedChart(): void {
  savedChart = readLatestSavedChart();
  chartEnabled = false;
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

  const userMessage: AssistantMessage = { role: 'user', content: question };
  const requestMessages = messages.concat(userMessage).slice(-MAX_MESSAGES);
  appendMessage('user', question);
  textarea.value = '';
  syncTextareaHeight();
  const assistantMessage = appendMessage('assistant', '');
  assistantMessage.article.setAttribute('aria-busy', 'true');

  activeRequest = new AbortController();
  setBusy(true);

  let answer = '';
  try {
    let chart: string | undefined;
    const shouldAttachChart = Boolean(savedChart) && (chartEnabled || questionRequestsMyChart(question));
    if (shouldAttachChart && savedChart) {
      chartEnabled = true;
      syncChartButton();
      setStatus(currentCopy().chartReading);
      chartSummaryPromise ??= placementSummaryForChart(savedChart);
      const resolved = await chartSummaryPromise;
      if (chartEnabled && resolved) chart = resolved;
    }
    setStatus(currentCopy().thinking);

    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: requestMessages, ...(chart ? { chart } : {}) }),
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
    assistantMessage.article.removeAttribute('aria-busy');
    messages = [...requestMessages, { role: 'assistant' as const, content: answer }].slice(-MAX_MESSAGES);
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

  chartButton = document.createElement('button');
  chartButton.type = 'button';
  chartButton.className = 'zassistant__chart-chip';
  chartButton.hidden = true;
  chartButton.addEventListener('click', () => {
    chartEnabled = !chartEnabled;
    syncChartButton();
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

  panel.append(header, intro, chartButton, transcript, status, form, privacy);
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
}

/** Open the assistant dialog. Safe to call repeatedly on the same page. */
export async function openAssistant(
  requestedLocale?: string,
  from?: HTMLElement | null,
): Promise<void> {
  await ensureStylesheet();
  locale = normalizeLocale(requestedLocale);
  if (!root) build();
  applyCopy();
  refreshSavedChart();
  if (root!.hidden) {
    opener = from ?? (document.activeElement as HTMLElement | null);
    previousOverflow = document.documentElement.style.overflow;
  }
  root!.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  setStatus();
  textarea!.focus();
  track('assistant_open');
}
