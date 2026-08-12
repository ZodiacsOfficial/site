export const RELEASED_LOCALES = ['en', 'es', 'pt', 'fr', 'it'] as const;
export type ReleasedLocale = typeof RELEASED_LOCALES[number];

export const BODY_NAMES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node',
] as const;
export type BodyName = typeof BODY_NAMES[number];

export type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

export interface AssistantChartV2 {
  positionsToken: string;
  retrogradeBodies: BodyName[];
  cusps?: number[];
}

export interface AssistantRequestV2 {
  version: 2;
  locale: ReleasedLocale;
  pagePath?: string;
  messages: ConversationMessage[];
  chart?: AssistantChartV2;
}

export interface ParsedAssistantRequest {
  protocol: 'legacy' | 'v2';
  version: 1 | 2;
  locale: ReleasedLocale;
  pagePath?: string;
  messages: ConversationMessage[];
  chart?: AssistantChartV2;
  legacyChart?: string;
}

export type FollowUpRequirement = 'none' | 'chart' | 'houses' | 'transits';

export interface AssistantReceipt {
  label: string;
  factIds: string[];
  sourceIds: string[];
}

export interface AssistantFollowUp {
  question: string;
  requires: FollowUpRequirement;
  factIds: string[];
  sourceIds: string[];
}

export interface AssistantResult {
  answer: string;
  receipts: AssistantReceipt[];
  followUps: AssistantFollowUp[];
}

export interface CanonicalSource {
  id: string;
  path: string;
  title: string;
  heading?: string;
}

export interface AssistantReceiptWithSources extends AssistantReceipt {
  sources: CanonicalSource[];
}

export interface AssistantGuideMeta {
  capabilities: {
    chart: boolean;
    houses: boolean;
    transits: boolean;
  };
  receipts: AssistantReceiptWithSources[];
  followUps: AssistantFollowUp[];
}

export type PublicErrorCode =
  | 'maintenance'
  | 'quota_unavailable'
  | 'visitor_limit'
  | 'service_budget'
  | 'provider_unavailable'
  | 'invalid_request'
  | 'safety_routing';

export const MAX_MESSAGE_CHARS = 1_200;
export const MAX_PRIOR_TURNS = 6;
export const MAX_MESSAGES = MAX_PRIOR_TURNS * 2 + 1;
export const MAX_LEGACY_CHART_CHARS = 2_000;
export const MAX_RECEIPTS = 4;
export const MAX_FOLLOW_UPS = 2;

const BODY_NAME_SET: ReadonlySet<string> = new Set(BODY_NAMES);
const LOCALE_SET: ReadonlySet<string> = new Set(RELEASED_LOCALES);
const V2_BODY_KEYS = new Set(['version', 'locale', 'pagePath', 'messages', 'chart']);
const V2_CHART_KEYS = new Set(['positionsToken', 'retrogradeBodies', 'cusps']);
const MESSAGE_KEYS = new Set(['role', 'content']);
const PAGE_PATH_RE = /^\/$|^\/[a-z0-9][a-z0-9/_-]*\/$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(record).every((key) => allowed.has(key));
}

function parseJsonObject(input: unknown): Record<string, unknown> | null {
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isRecord(value) ? value : null;
}

function trimWholeTurns(messages: ConversationMessage[], allowLegacyOrphan: boolean): ConversationMessage[] | null {
  let normalized = messages;

  // The cached v1 client used a blind last-12-message slice. On its seventh
  // question that produces one leading assistant message. Drop only that
  // precisely recognizable orphan; v2 never accepts it.
  if (allowLegacyOrphan && normalized[0]?.role === 'assistant') normalized = normalized.slice(1);
  if (!normalized.length || normalized[0]?.role !== 'user' || normalized.at(-1)?.role !== 'user') return null;

  for (let index = 0; index < normalized.length; index += 1) {
    const expected: ConversationRole = index % 2 === 0 ? 'user' : 'assistant';
    if (normalized[index]?.role !== expected) return null;
  }

  if (normalized.length <= MAX_MESSAGES) return normalized;
  // A valid user-ending conversation has an odd length. Removing complete
  // user/assistant pairs preserves both alternation and the current question.
  const pairsToDrop = Math.ceil((normalized.length - MAX_MESSAGES) / 2);
  return normalized.slice(pairsToDrop * 2);
}

function parseMessages(value: unknown, strict: boolean): ConversationMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 101) return null;
  const messages: ConversationMessage[] = [];
  for (const item of value) {
    if (!isRecord(item) || (strict && !hasOnlyKeys(item, MESSAGE_KEYS))) return null;
    if ((item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return null;
    if (!item.content.trim()) return null;
    if (strict && item.content.length > MAX_MESSAGE_CHARS) return null;
    messages.push({
      role: item.role,
      content: strict ? item.content : item.content.slice(0, MAX_MESSAGE_CHARS),
    });
  }
  return trimWholeTurns(messages, !strict);
}

function parseChart(value: unknown): AssistantChartV2 | null {
  if (!isRecord(value) || !hasOnlyKeys(value, V2_CHART_KEYS)) return null;
  if (typeof value.positionsToken !== 'string' || value.positionsToken.length > 256) return null;
  if (!Array.isArray(value.retrogradeBodies)) return null;

  const retrogradeBodies: BodyName[] = [];
  const seen = new Set<string>();
  for (const body of value.retrogradeBodies) {
    if (typeof body !== 'string' || !BODY_NAME_SET.has(body) || seen.has(body)) return null;
    seen.add(body);
    retrogradeBodies.push(body as BodyName);
  }

  let cusps: number[] | undefined;
  if (value.cusps !== undefined) {
    if (!Array.isArray(value.cusps)
      || value.cusps.length !== 12
      || !value.cusps.every((cusp) => typeof cusp === 'number' && Number.isFinite(cusp) && cusp >= 0 && cusp < 360)) {
      return null;
    }
    cusps = [...value.cusps];
  }

  return cusps
    ? { positionsToken: value.positionsToken, retrogradeBodies, cusps }
    : { positionsToken: value.positionsToken, retrogradeBodies };
}

export function parseAssistantRequest(input: unknown): ParsedAssistantRequest | null {
  const body = parseJsonObject(input);
  if (!body) return null;

  if (body.version === 2) {
    if (!hasOnlyKeys(body, V2_BODY_KEYS)) return null;
    if (typeof body.locale !== 'string' || !LOCALE_SET.has(body.locale)) return null;
    if (body.pagePath !== undefined
      && (typeof body.pagePath !== 'string' || body.pagePath.length > 200 || !PAGE_PATH_RE.test(body.pagePath))) return null;
    const messages = parseMessages(body.messages, true);
    if (!messages) return null;
    const chart = body.chart === undefined ? undefined : parseChart(body.chart);
    if (body.chart !== undefined && !chart) return null;
    return {
      protocol: 'v2',
      version: 2,
      locale: body.locale as ReleasedLocale,
      ...(body.pagePath === undefined ? {} : { pagePath: body.pagePath as string }),
      messages,
      ...(chart ? { chart } : {}),
    };
  }

  // Seven-day cached-client bridge. Deliberately accepts only the old chart
  // string and message fields; all newly built clients use v2.
  if ('version' in body && body.version !== 1) return null;
  const messages = parseMessages(body.messages, false);
  if (!messages || (body.chart !== undefined && typeof body.chart !== 'string')) return null;
  return {
    protocol: 'legacy',
    version: 1,
    locale: 'en',
    messages,
    ...(typeof body.chart === 'string'
      ? { legacyChart: body.chart.slice(0, MAX_LEGACY_CHART_CHARS) }
      : {}),
  };
}

/** Kept for old tests/importers during the one-deploy compatibility bridge. */
export const parseRequestBody = parseAssistantRequest;
