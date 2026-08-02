import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isReleasedLocale, type ReleasedLocale } from '../i18n/core';
import { getSupabaseClient } from '../supabase/client';

export const ASSISTANT_SESSION_STORAGE_KEY = 'zodiacs.assistant.session.v2';
export const ASSISTANT_MEMORY_EVENT = 'zodiacs:assistant-memory';
export const ASSISTANT_MEMORY_VERSION = 2 as const;

const MAX_QUESTION_LENGTH = 1_200;
const MAX_ANSWER_LENGTH = 16_000;
const MAX_TITLE_LENGTH = 120;
const MAX_TURNS = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface AssistantVisibleTurn {
  id: string;
  question: string;
  answer: string;
  completedAt: string;
}

export interface AssistantMemoryThread {
  version: typeof ASSISTANT_MEMORY_VERSION;
  id: string;
  locale: ReleasedLocale;
  title: string;
  chartId: string | null;
  createdAt: string;
  expiresAt: string | null;
  turns: AssistantVisibleTurn[];
}

export interface AssistantSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CreateAssistantSessionOptions {
  locale: ReleasedLocale;
  title?: string;
  chartId?: string | null;
  id?: string;
  now?: Date;
}

export interface AssistantMemoryImportResult {
  threadId: string;
  expiresAt: string;
  insertedTurns: number;
}

export type AssistantMemorySaveOutcome = 'saved' | 'duplicate' | 'unavailable';
export type AssistantMemoryLimitCode = 'thread_limit' | 'thread_turn_limit' | 'total_turn_limit';

export type AssistantMemoryChangeDetail = {
  mode: 'session' | 'account';
  action: 'saved' | 'cleared' | 'opted-in' | 'opted-out' | 'deleted';
  threadId?: string;
};

interface ThreadRow {
  id: string;
  locale: string;
  title: string;
  chart_id: string | null;
  created_at: string;
  expires_at: string;
}

interface TurnRow {
  id: string;
  thread_id: string;
  question: string;
  answer: string;
  completed_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Stable PostgREST markers for account-memory capacity failures. */
export function assistantMemoryLimitCode(error: unknown): AssistantMemoryLimitCode | null {
  const message = error instanceof Error
    ? error.message
    : isRecord(error) && typeof error.message === 'string' ? error.message : '';
  for (const code of ['thread_turn_limit', 'total_turn_limit', 'thread_limit'] as const) {
    if (message.includes(`assistant_memory_limit:${code}`)) return code;
  }
  return null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isVisibleText(value: unknown, maximum: number): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maximum;
}

function parseTurn(value: unknown): AssistantVisibleTurn | null {
  if (!isRecord(value)
      || !isUuid(value.id)
      || !isVisibleText(value.question, MAX_QUESTION_LENGTH)
      || !isVisibleText(value.answer, MAX_ANSWER_LENGTH)
      || !isIsoDate(value.completedAt)) return null;

  return {
    id: value.id,
    question: value.question,
    answer: value.answer,
    completedAt: new Date(value.completedAt).toISOString(),
  };
}

function parseThread(value: unknown): AssistantMemoryThread | null {
  if (!isRecord(value)
      || value.version !== ASSISTANT_MEMORY_VERSION
      || !isUuid(value.id)
      || typeof value.locale !== 'string'
      || !isReleasedLocale(value.locale)
      || !isVisibleText(value.title, MAX_TITLE_LENGTH)
      || value.title !== value.title.trim()
      || (value.chartId !== null && !isUuid(value.chartId))
      || !isIsoDate(value.createdAt)
      || (value.expiresAt !== null && !isIsoDate(value.expiresAt))
      || !Array.isArray(value.turns)
      || value.turns.length > MAX_TURNS) return null;

  const turns = value.turns.map(parseTurn);
  if (turns.some((turn) => turn === null)) return null;
  if (new Set(turns.map((turn) => turn!.id)).size !== turns.length) return null;

  return {
    version: ASSISTANT_MEMORY_VERSION,
    id: value.id,
    locale: value.locale,
    title: value.title,
    chartId: value.chartId,
    createdAt: new Date(value.createdAt).toISOString(),
    expiresAt: value.expiresAt === null ? null : new Date(value.expiresAt).toISOString(),
    turns: turns as AssistantVisibleTurn[],
  };
}

function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Secure UUID generation is unavailable');
  }
  return globalThis.crypto.randomUUID();
}

function browserSessionStorage(): AssistantSessionStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function emitMemoryChange(detail: AssistantMemoryChangeDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AssistantMemoryChangeDetail>(ASSISTANT_MEMORY_EVENT, {
    detail,
  }));
}

export function createAssistantSessionThread({
  locale,
  title = 'Ask Zodiacs',
  chartId = null,
  id = randomUuid(),
  now = new Date(),
}: CreateAssistantSessionOptions): AssistantMemoryThread {
  const candidate = parseThread({
    version: ASSISTANT_MEMORY_VERSION,
    id,
    locale,
    title: title.trim(),
    chartId,
    createdAt: now.toISOString(),
    expiresAt: null,
    turns: [],
  });
  if (!candidate) throw new Error('Invalid assistant session');
  return candidate;
}

export function loadAssistantSession(
  storage: AssistantSessionStorage | null = browserSessionStorage(),
): AssistantMemoryThread | null {
  if (!storage) return null;
  let serialized: string | null = null;
  try {
    serialized = storage.getItem(ASSISTANT_SESSION_STORAGE_KEY);
    if (!serialized) return null;
    const parsed = parseThread(JSON.parse(serialized));
    if (parsed && parsed.expiresAt === null) return parsed;
  } catch {
    // Invalid or unavailable browser storage is treated as an empty session.
  }
  try {
    storage.removeItem(ASSISTANT_SESSION_STORAGE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
  return null;
}

export function saveAssistantSession(
  thread: AssistantMemoryThread,
  storage: AssistantSessionStorage | null = browserSessionStorage(),
): boolean {
  if (!storage) return false;
  const parsed = parseThread(thread);
  if (!parsed || parsed.expiresAt !== null) return false;
  try {
    storage.setItem(ASSISTANT_SESSION_STORAGE_KEY, JSON.stringify(parsed));
    emitMemoryChange({ mode: 'session', action: 'saved', threadId: parsed.id });
    return true;
  } catch {
    return false;
  }
}

export function appendAssistantCompletedTurn(
  thread: AssistantMemoryThread,
  turn: AssistantVisibleTurn,
): AssistantMemoryThread {
  const parsedThread = parseThread(thread);
  const parsedTurn = parseTurn(turn);
  if (!parsedThread || !parsedTurn) throw new Error('Invalid completed assistant turn');

  const existing = parsedThread.turns.find((candidate) => candidate.id === parsedTurn.id);
  if (existing) {
    if (existing.question !== parsedTurn.question || existing.answer !== parsedTurn.answer) {
      throw new Error('Assistant turn id conflict');
    }
    return parsedThread;
  }
  if (parsedThread.turns.length >= MAX_TURNS) {
    throw new Error('Assistant session turn limit reached');
  }
  return { ...parsedThread, turns: [...parsedThread.turns, parsedTurn] };
}

export function clearAssistantSession(
  storage: AssistantSessionStorage | null = browserSessionStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(ASSISTANT_SESSION_STORAGE_KEY);
    emitMemoryChange({ mode: 'session', action: 'cleared' });
    return true;
  } catch {
    return false;
  }
}

async function authenticatedClient(): Promise<{ client: SupabaseClient; userId: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, userId: data.user.id };
}

export async function getAssistantMemoryOptIn(): Promise<boolean> {
  const account = await authenticatedClient();
  if (!account) return false;
  const { data, error } = await account.client
    .from('profiles')
    .select('assistant_memory_opt_in')
    .eq('user_id', account.userId)
    .maybeSingle<{ assistant_memory_opt_in: boolean | null }>();
  if (error) throw error;
  return data?.assistant_memory_opt_in === true;
}

export async function setAssistantMemoryOptIn(enabled: boolean): Promise<boolean> {
  const account = await authenticatedClient();
  if (!account) return false;
  const { data, error } = await account.client.rpc('assistant_memory_set_opt_in', {
    p_enabled: enabled,
  });
  if (error) throw error;
  if (!isRecord(data) || data.enabled !== enabled) throw new Error('Invalid assistant memory response');
  emitMemoryChange({ mode: 'account', action: enabled ? 'opted-in' : 'opted-out' });
  return true;
}

export async function importAssistantSession(
  thread: AssistantMemoryThread,
): Promise<AssistantMemoryImportResult | null> {
  const parsed = parseThread(thread);
  if (!parsed || parsed.expiresAt !== null) throw new Error('Invalid assistant session');
  const account = await authenticatedClient();
  if (!account) return null;
  const { data, error } = await account.client.rpc('assistant_memory_import_thread', {
    p_thread_id: parsed.id,
    p_locale: parsed.locale,
    p_title: parsed.title,
    p_chart_id: parsed.chartId,
    p_turns: parsed.turns,
  });
  if (error) throw error;
  if (!isRecord(data)
      || data.thread_id !== parsed.id
      || !isIsoDate(data.expires_at)
      || !Number.isInteger(data.inserted_turns)
      || Number(data.inserted_turns) < 0) {
    throw new Error('Invalid assistant memory import response');
  }
  const result = {
    threadId: parsed.id,
    expiresAt: new Date(data.expires_at).toISOString(),
    insertedTurns: Number(data.inserted_turns),
  };
  emitMemoryChange({ mode: 'account', action: 'saved', threadId: result.threadId });
  return result;
}

/**
 * Consent boundary for “Remember this conversation”. The database enables
 * memory and imports every completed visible turn in one transaction, so a
 * rejected import cannot leave the profile opted in without its thread.
 */
export async function enableAssistantMemoryAndImportSession(
  thread: AssistantMemoryThread,
): Promise<AssistantMemoryImportResult | null> {
  const parsed = parseThread(thread);
  if (!parsed || parsed.expiresAt !== null) throw new Error('Invalid assistant session');
  const account = await authenticatedClient();
  if (!account) return null;
  const { data, error } = await account.client.rpc('assistant_memory_enable_and_import_thread', {
    p_thread_id: parsed.id,
    p_locale: parsed.locale,
    p_title: parsed.title,
    p_chart_id: parsed.chartId,
    p_turns: parsed.turns,
  });
  if (error) throw error;
  if (!isRecord(data)
      || data.thread_id !== parsed.id
      || !isIsoDate(data.expires_at)
      || !Number.isInteger(data.inserted_turns)
      || Number(data.inserted_turns) < 0) {
    throw new Error('Invalid assistant memory import response');
  }
  const result = {
    threadId: parsed.id,
    expiresAt: new Date(data.expires_at).toISOString(),
    insertedTurns: Number(data.inserted_turns),
  };
  emitMemoryChange({ mode: 'account', action: 'opted-in', threadId: result.threadId });
  return result;
}

export async function saveAssistantCompletedTurn(
  threadId: string,
  turn: AssistantVisibleTurn,
): Promise<AssistantMemorySaveOutcome> {
  if (!isUuid(threadId)) throw new Error('Invalid assistant thread id');
  const parsed = parseTurn(turn);
  if (!parsed) throw new Error('Invalid completed assistant turn');
  const account = await authenticatedClient();
  if (!account) return 'unavailable';
  const { data, error } = await account.client.rpc('assistant_memory_save_turn', {
    p_thread_id: threadId,
    p_turn_id: parsed.id,
    p_question: parsed.question,
    p_answer: parsed.answer,
    p_completed_at: parsed.completedAt,
  });
  if (error) throw error;
  if (!isRecord(data)
      || (data.outcome !== 'saved'
        && data.outcome !== 'duplicate'
        && data.outcome !== 'unavailable')) {
    throw new Error('Invalid assistant memory save response');
  }
  if (data.outcome !== 'unavailable') {
    emitMemoryChange({ mode: 'account', action: 'saved', threadId });
  }
  return data.outcome;
}

function threadFromRows(thread: ThreadRow, turns: TurnRow[]): AssistantMemoryThread | null {
  return parseThread({
    version: ASSISTANT_MEMORY_VERSION,
    id: thread.id,
    locale: thread.locale,
    title: thread.title,
    chartId: thread.chart_id,
    createdAt: thread.created_at,
    expiresAt: thread.expires_at,
    turns: turns
      .filter((turn) => turn.thread_id === thread.id)
      .map((turn) => ({
        id: turn.id,
        question: turn.question,
        answer: turn.answer,
        completedAt: turn.completed_at,
      })),
  });
}

export async function listAssistantThreads(): Promise<AssistantMemoryThread[]> {
  const account = await authenticatedClient();
  if (!account) return [];
  const { data: threadData, error: threadError } = await account.client
    .from('assistant_threads')
    .select('id,locale,title,chart_id,created_at,expires_at')
    .order('created_at', { ascending: false });
  if (threadError) throw threadError;
  const threads = (threadData ?? []) as ThreadRow[];
  if (threads.length === 0) return [];

  const { data: turnData, error: turnError } = await account.client
    .from('assistant_turns')
    .select('id,thread_id,question,answer,completed_at')
    .in('thread_id', threads.map((thread) => thread.id))
    .order('completed_at', { ascending: true });
  if (turnError) throw turnError;
  const turns = (turnData ?? []) as TurnRow[];
  return threads.flatMap((thread) => {
    const parsed = threadFromRows(thread, turns);
    return parsed ? [parsed] : [];
  });
}

export async function loadAssistantThread(threadId: string): Promise<AssistantMemoryThread | null> {
  if (!isUuid(threadId)) return null;
  const account = await authenticatedClient();
  if (!account) return null;
  const { data: threadData, error: threadError } = await account.client
    .from('assistant_threads')
    .select('id,locale,title,chart_id,created_at,expires_at')
    .eq('id', threadId)
    .maybeSingle<ThreadRow>();
  if (threadError) throw threadError;
  if (!threadData) return null;

  const { data: turnData, error: turnError } = await account.client
    .from('assistant_turns')
    .select('id,thread_id,question,answer,completed_at')
    .eq('thread_id', threadId)
    .order('completed_at', { ascending: true });
  if (turnError) throw turnError;
  return threadFromRows(threadData, (turnData ?? []) as TurnRow[]);
}

export async function deleteAssistantThread(threadId: string): Promise<boolean> {
  if (!isUuid(threadId)) return false;
  const account = await authenticatedClient();
  if (!account) return false;
  const { data, error } = await account.client.rpc('assistant_memory_delete_thread', {
    p_thread_id: threadId,
  });
  if (error) throw error;
  if (data === true) emitMemoryChange({ mode: 'account', action: 'deleted', threadId });
  return data === true;
}

export async function deleteAllAssistantThreads(): Promise<number> {
  const account = await authenticatedClient();
  if (!account) return 0;
  const { data, error } = await account.client.rpc('assistant_memory_delete_all');
  if (error) throw error;
  if (typeof data !== 'number' || !Number.isInteger(data) || data < 0) {
    throw new Error('Invalid assistant memory deletion response');
  }
  emitMemoryChange({ mode: 'account', action: 'deleted' });
  return data;
}

export function onAssistantMemoryChange(
  callback: (detail: AssistantMemoryChangeDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: Event) => {
    callback((event as CustomEvent<AssistantMemoryChangeDetail>).detail);
  };
  window.addEventListener(ASSISTANT_MEMORY_EVENT, listener);
  return () => window.removeEventListener(ASSISTANT_MEMORY_EVENT, listener);
}

export function onAssistantMemoryAuthChange(
  callback: (session: Session | null) => void,
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    callback(null);
    return () => {};
  }
  // Subscribe before reading the initial session. If an auth event wins that
  // race, its value is newer than the in-flight getSession result and must not
  // be overwritten when that older promise eventually resolves.
  let receivedAuthEvent = false;
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    receivedAuthEvent = true;
    callback(session);
  });
  void client.auth.getSession().then(({ data: initial }) => {
    if (!receivedAuthEvent) callback(initial.session ?? null);
  });
  return () => data.subscription.unsubscribe();
}
