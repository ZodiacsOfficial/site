import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from '../supabase/client';
import {
  ASSISTANT_SESSION_STORAGE_KEY,
  appendAssistantCompletedTurn,
  assistantMemoryLimitCode,
  clearAssistantSession,
  createAssistantSessionThread,
  deleteAllAssistantThreads,
  deleteAssistantThread,
  enableAssistantMemoryAndImportSession,
  importAssistantSession,
  loadAssistantSession,
  onAssistantMemoryAuthChange,
  saveAssistantCompletedTurn,
  saveAssistantSession,
  setAssistantMemoryOptIn,
  type AssistantSessionStorage,
  type AssistantVisibleTurn,
} from './memory';

vi.mock('../supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

const THREAD_ID = '71000000-0000-4000-8000-000000000001';
const TURN_ID = '72000000-0000-4000-8000-000000000001';
const CHART_ID = '73000000-0000-4000-8000-000000000001';
const CREATED_AT = new Date('2026-08-02T07:00:00.000Z');

class MemoryStorage implements AssistantSessionStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function turn(overrides: Partial<AssistantVisibleTurn> = {}): AssistantVisibleTurn {
  return {
    id: TURN_ID,
    question: 'What is the strongest pattern in this chart?',
    answer: 'The visible chart facts emphasize a Sun–Saturn square.',
    completedAt: '2026-08-02T07:01:00.000Z',
    ...overrides,
  };
}

function session() {
  return appendAssistantCompletedTurn(createAssistantSessionThread({
    locale: 'en',
    title: 'Strongest chart pattern',
    chartId: CHART_ID,
    id: THREAD_ID,
    now: CREATED_AT,
  }), turn());
}

function accountClient(rpc: ReturnType<typeof vi.fn>): SupabaseClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: '70000000-0000-4000-8000-000000000001' } },
        error: null,
      }),
    },
    rpc,
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.mocked(getSupabaseClient).mockReset();
});

describe('assistant session memory', () => {
  it('persists only a versioned thread in the supplied session store', () => {
    const storage = new MemoryStorage();
    const thread = session();

    expect(saveAssistantSession(thread, storage)).toBe(true);
    expect(loadAssistantSession(storage)).toEqual(thread);
    expect(JSON.parse(storage.values.get(ASSISTANT_SESSION_STORAGE_KEY)!)).toEqual({
      version: 2,
      id: THREAD_ID,
      locale: 'en',
      title: 'Strongest chart pattern',
      chartId: CHART_ID,
      createdAt: CREATED_AT.toISOString(),
      expiresAt: null,
      turns: [turn()],
    });
  });

  it('keeps completed-turn appends idempotent and rejects conflicting replay', () => {
    const first = session();
    expect(appendAssistantCompletedTurn(first, turn())).toEqual(first);
    expect(() => appendAssistantCompletedTurn(first, turn({ answer: 'Different answer' })))
      .toThrow('turn id conflict');
  });

  it('deletes malformed or account-shaped data instead of restoring it', () => {
    const storage = new MemoryStorage();
    storage.setItem(ASSISTANT_SESSION_STORAGE_KEY, JSON.stringify({
      ...session(),
      expiresAt: '2026-10-31T07:00:00.000Z',
    }));
    expect(loadAssistantSession(storage)).toBeNull();
    expect(storage.getItem(ASSISTANT_SESSION_STORAGE_KEY)).toBeNull();

    storage.setItem(ASSISTANT_SESSION_STORAGE_KEY, '{broken');
    expect(loadAssistantSession(storage)).toBeNull();
    expect(storage.getItem(ASSISTANT_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('clears the session key without touching any unrelated browser state', () => {
    const storage = new MemoryStorage();
    storage.setItem(ASSISTANT_SESSION_STORAGE_KEY, JSON.stringify(session()));
    storage.setItem('unrelated', 'keep');
    expect(clearAssistantSession(storage)).toBe(true);
    expect(storage.getItem(ASSISTANT_SESSION_STORAGE_KEY)).toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
  });
});

describe('assistant account memory', () => {
  it('recognizes stable account-memory cap markers without classifying transient failures', () => {
    expect(assistantMemoryLimitCode(new Error('assistant_memory_limit:thread_limit'))).toBe('thread_limit');
    expect(assistantMemoryLimitCode({ message: 'assistant_memory_limit:thread_turn_limit' })).toBe('thread_turn_limit');
    expect(assistantMemoryLimitCode({ message: 'assistant_memory_limit:total_turn_limit' })).toBe('total_turn_limit');
    expect(assistantMemoryLimitCode(new Error('network unavailable'))).toBeNull();
  });

  it('does not replay a stale initial session after a newer auth event', async () => {
    let resolveInitial!: (value: { data: { session: unknown } }) => void;
    const initial = new Promise<{ data: { session: unknown } }>((resolve) => { resolveInitial = resolve; });
    let authListener: ((_event: string, session: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockReturnValue(initial),
        onAuthStateChange: vi.fn((listener) => {
          authListener = listener as (_event: string, session: unknown) => void;
          return { data: { subscription: { unsubscribe } } };
        }),
      },
    } as unknown as SupabaseClient);

    const seen: Array<string | null> = [];
    const cleanup = onAssistantMemoryAuthChange((value) => seen.push(value?.user.id ?? null));
    authListener!('SIGNED_OUT', null);
    resolveInitial({ data: { session: { user: { id: 'stale-user' } } } });
    await initial;
    await Promise.resolve();

    expect(seen).toEqual([null]);
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('imports only visible session fields through the atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        thread_id: THREAD_ID,
        expires_at: '2026-10-31T07:00:00.000Z',
        inserted_turns: 1,
      },
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue(accountClient(rpc));

    await expect(importAssistantSession(session())).resolves.toEqual({
      threadId: THREAD_ID,
      expiresAt: '2026-10-31T07:00:00.000Z',
      insertedTurns: 1,
    });
    expect(rpc).toHaveBeenCalledWith('assistant_memory_import_thread', {
      p_thread_id: THREAD_ID,
      p_locale: 'en',
      p_title: 'Strongest chart pattern',
      p_chart_id: CHART_ID,
      p_turns: [turn()],
    });
    expect(JSON.stringify(rpc.mock.calls[0])).not.toMatch(/expiresAt|createdAt|provider|token|place|birth/iu);
  });

  it('enables memory and imports the visible session through one consent RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        thread_id: THREAD_ID,
        expires_at: '2026-10-31T07:00:00.000Z',
        inserted_turns: 1,
      },
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue(accountClient(rpc));

    await expect(enableAssistantMemoryAndImportSession(session())).resolves.toEqual({
      threadId: THREAD_ID,
      expiresAt: '2026-10-31T07:00:00.000Z',
      insertedTurns: 1,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('assistant_memory_enable_and_import_thread', {
      p_thread_id: THREAD_ID,
      p_locale: 'en',
      p_title: 'Strongest chart pattern',
      p_chart_id: CHART_ID,
      p_turns: [turn()],
    });
  });

  it('saves a completed pair idempotently without provider or chart payloads', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { outcome: 'duplicate' }, error: null });
    vi.mocked(getSupabaseClient).mockReturnValue(accountClient(rpc));
    await expect(saveAssistantCompletedTurn(THREAD_ID, turn())).resolves.toBe('duplicate');
    expect(rpc).toHaveBeenCalledWith('assistant_memory_save_turn', {
      p_thread_id: THREAD_ID,
      p_turn_id: TURN_ID,
      p_question: turn().question,
      p_answer: turn().answer,
      p_completed_at: turn().completedAt,
    });
  });

  it('uses dedicated RPCs for opt-out, per-thread deletion, and delete-all', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { enabled: false }, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: 3, error: null });
    vi.mocked(getSupabaseClient).mockReturnValue(accountClient(rpc));

    await expect(setAssistantMemoryOptIn(false)).resolves.toBe(true);
    await expect(deleteAssistantThread(THREAD_ID)).resolves.toBe(true);
    await expect(deleteAllAssistantThreads()).resolves.toBe(3);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      'assistant_memory_set_opt_in',
      'assistant_memory_delete_thread',
      'assistant_memory_delete_all',
    ]);
  });

  it('fails closed when there is no authenticated Supabase client', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);
    await expect(importAssistantSession(session())).resolves.toBeNull();
    await expect(saveAssistantCompletedTurn(THREAD_ID, turn())).resolves.toBe('unavailable');
    await expect(setAssistantMemoryOptIn(true)).resolves.toBe(false);
  });
});
