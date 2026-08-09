import {
  MAX_MESSAGE_CHARS,
  type AssistantResult,
  type ConversationMessage,
} from './contracts.js';
import type { OpenAIUsage } from './budget.js';

export const OPENAI_MODEL = 'gpt-5.6-terra';
export const OPENAI_MAX_OUTPUT_TOKENS = 900;
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODERATIONS_URL = 'https://api.openai.com/v1/moderations';

const ID_ARRAY_SCHEMA = {
  type: 'array',
  maxItems: 8,
  items: { type: 'string', minLength: 1, maxLength: 160 },
} as const;

export const ASSISTANT_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'receipts', 'followUps'],
  properties: {
    // A completed answer is replayed as an assistant message on the next
    // turn, so its output bound must equal the conversation-message bound.
    answer: { type: 'string', minLength: 1, maxLength: MAX_MESSAGE_CHARS },
    receipts: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'factIds', 'sourceIds'],
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 160 },
          factIds: ID_ARRAY_SCHEMA,
          sourceIds: ID_ARRAY_SCHEMA,
        },
      },
    },
    followUps: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'requires', 'factIds', 'sourceIds'],
        properties: {
          question: { type: 'string', minLength: 1, maxLength: 200 },
          requires: { type: 'string', enum: ['none', 'chart', 'houses', 'transits'] },
          factIds: ID_ARRAY_SCHEMA,
          sourceIds: ID_ARRAY_SCHEMA,
        },
      },
    },
  },
} as const;

export interface OpenAIRequestOptions {
  instructions: string;
  messages: ConversationMessage[];
  safetyIdentifier: string;
}

export function buildResponsesRequest(options: OpenAIRequestOptions): Record<string, unknown> {
  return {
    model: OPENAI_MODEL,
    store: false,
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
    reasoning: { effort: 'low' },
    text: {
      verbosity: 'low',
      format: {
        type: 'json_schema',
        name: 'ask_zodiacs_result',
        strict: true,
        schema: ASSISTANT_RESULT_SCHEMA,
      },
    },
    safety_identifier: options.safetyIdentifier,
    instructions: options.instructions,
    input: options.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export type ModerationResult = 'clear' | 'flagged' | 'unavailable' | 'aborted';

export async function moderateInput(
  fetchImpl: typeof fetch,
  apiKey: string,
  input: string,
  signal: AbortSignal,
  log: (line: string) => void = () => {},
): Promise<ModerationResult> {
  let response: Response;
  try {
    response = await fetchImpl(OPENAI_MODERATIONS_URL, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({ model: 'omni-moderation-latest', input }),
      signal,
    });
  } catch {
    return signal.aborted ? 'aborted' : 'unavailable';
  }
  if (!response.ok) {
    let providerCode = 'unknown';
    try {
      const payload = await response.json() as { error?: { code?: unknown; type?: unknown } };
      const candidate = typeof payload.error?.code === 'string'
        ? payload.error.code
        : payload.error?.type;
      if (typeof candidate === 'string' && /^[a-z0-9_.-]{1,64}$/i.test(candidate)) {
        providerCode = candidate;
      }
    } catch {
      // The status and bounded provider code are sufficient operational evidence.
    }
    log(`stage=moderation code=provider_error status=${response.status} provider_code=${providerCode}`);
    return 'unavailable';
  }
  try {
    const payload = await response.json() as { results?: Array<{ flagged?: unknown }> };
    const flagged = payload.results?.[0]?.flagged;
    return typeof flagged === 'boolean' ? (flagged ? 'flagged' : 'clear') : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

function responseText(payload: Record<string, unknown>): { text?: string; refusal?: boolean } {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return { text: payload.output_text };
  if (!Array.isArray(payload.output)) return {};
  const text: string[] = [];
  for (const item of payload.output) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (record.type !== 'message' || !Array.isArray(record.content)) continue;
    for (const content of record.content) {
      if (!content || typeof content !== 'object') continue;
      const part = content as Record<string, unknown>;
      if (part.type === 'refusal') return { refusal: true };
      if (part.type === 'output_text' && typeof part.text === 'string') text.push(part.text);
    }
  }
  return text.length ? { text: text.join('') } : {};
}

export type GenerationResult =
  | { kind: 'ok'; result: unknown; usage: OpenAIUsage | null }
  | { kind: 'refusal'; usage: OpenAIUsage | null }
  | { kind: 'unavailable'; status: number }
  | { kind: 'aborted'; status: 0 };

function tokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function responseUsage(value: unknown): OpenAIUsage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const inputTokens = tokenCount(record.input_tokens);
  const outputTokens = tokenCount(record.output_tokens);
  if (inputTokens === null || outputTokens === null) return null;

  const usage: OpenAIUsage = { input_tokens: inputTokens, output_tokens: outputTokens };
  if (record.cache_write_tokens !== undefined) {
    const cacheWrites = tokenCount(record.cache_write_tokens);
    if (cacheWrites === null) return null;
    usage.cache_write_tokens = cacheWrites;
  }
  if (record.input_tokens_details !== undefined) {
    if (!record.input_tokens_details
      || typeof record.input_tokens_details !== 'object'
      || Array.isArray(record.input_tokens_details)) return null;
    const details = record.input_tokens_details as Record<string, unknown>;
    const cached = details.cached_tokens === undefined ? 0 : tokenCount(details.cached_tokens);
    const cacheWrites = details.cache_write_tokens === undefined ? undefined : tokenCount(details.cache_write_tokens);
    if (cached === null || cacheWrites === null) return null;
    usage.input_tokens_details = {
      cached_tokens: cached,
      ...(cacheWrites === undefined ? {} : { cache_write_tokens: cacheWrites }),
    };
  }
  return usage;
}

export async function generateAssistantResult(
  fetchImpl: typeof fetch,
  apiKey: string,
  options: OpenAIRequestOptions,
  signal: AbortSignal,
): Promise<GenerationResult> {
  let response: Response;
  try {
    // Native fetch makes exactly one request. There is intentionally no SDK
    // retry layer (`maxRetries: 0` in SDK terms).
    response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify(buildResponsesRequest(options)),
      signal,
    });
  } catch {
    return signal.aborted ? { kind: 'aborted', status: 0 } : { kind: 'unavailable', status: 0 };
  }
  if (!response.ok) return { kind: 'unavailable', status: response.status };

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { kind: 'unavailable', status: 502 };
    payload = parsed as Record<string, unknown>;
  } catch {
    return { kind: 'unavailable', status: 502 };
  }
  const usage = responseUsage(payload.usage);
  if (payload.status === 'incomplete') return { kind: 'unavailable', status: 502 };
  const output = responseText(payload);
  if (output.refusal) return { kind: 'refusal', usage };
  if (!output.text) return { kind: 'unavailable', status: 502 };
  try {
    return { kind: 'ok', result: JSON.parse(output.text) as AssistantResult, usage };
  } catch {
    return { kind: 'unavailable', status: 502 };
  }
}
