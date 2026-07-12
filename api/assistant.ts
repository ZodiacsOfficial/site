// Vercel serverless function. Keep this endpoint isolated from ../src: the static
// site and its page bundles must never pull server-only code into a page closure.
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { ASSISTANT_CONTEXT } from './_assistant/context.js';
import { ASSISTANT_PERSONA } from './_assistant/persona.js';

const MODEL = 'claude-haiku-4-5';
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1_200;
const MAX_CHART_CHARS = 2_000;
const DAILY_LIMIT = 30;
const INSTANCE_LIMIT = 5;
const INSTANCE_WINDOW_MS = 60_000;

type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

interface AssistantRequestBody {
  messages: ConversationMessage[];
  chart?: string;
}

interface Usage {
  input_tokens?: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  output_tokens?: number;
}

interface MessageStreamLike extends AsyncIterable<any> {
  withResponse?: () => Promise<unknown>;
  finalMessage: () => Promise<{ usage?: Usage }>;
  abort?: () => void;
}

interface AnthropicLike {
  messages: {
    stream: (params: Record<string, unknown>) => MessageStreamLike;
  };
}

interface HandlerDependencies {
  env: NodeJS.ProcessEnv;
  fetch: typeof fetch;
  now: () => number;
  createAnthropic: (apiKey: string) => AnthropicLike;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: HandlerDependencies = {
  env: process.env,
  fetch: globalThis.fetch,
  now: Date.now,
  createAnthropic: (apiKey) => new Anthropic({ apiKey }) as AnthropicLike,
  log: (line) => console.info(line),
};

function firstHeader(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function requestHeader(req: any, name: string): string {
  if (typeof req.get === 'function') {
    const value = req.get(name);
    if (typeof value === 'string') return value;
  }
  return firstHeader(req.headers?.[name.toLowerCase()]);
}

function hostname(value: string): string {
  const first = value.split(',')[0]?.trim().toLowerCase() ?? '';
  if (!first) return '';
  try {
    return new URL(first.includes('://') ? first : `https://${first}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Only a request from the production site or its own Vercel preview may proceed. */
export function isAllowedSiteRequest(req: any): boolean {
  const source = requestHeader(req, 'origin') || requestHeader(req, 'referer');
  if (!source) return false;

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return false;
  }

  if (sourceUrl.protocol !== 'https:') return false;
  const sourceHost = sourceUrl.hostname.toLowerCase();
  const requestHost = hostname(requestHeader(req, 'x-forwarded-host') || requestHeader(req, 'host'));
  if (!requestHost || sourceHost !== requestHost) return false;

  return sourceHost === 'zodiacs.org' || sourceHost === 'www.zodiacs.org' || sourceHost.endsWith('.vercel.app');
}

export function hashVisitor(salt: string, clientIp: string): string {
  return createHash('sha256').update(salt).update(clientIp).digest('hex');
}

function clientIp(req: any): string {
  const forwarded = requestHeader(req, 'x-forwarded-for').split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const direct = requestHeader(req, 'x-real-ip').trim();
  if (direct) return direct;
  return typeof req.socket?.remoteAddress === 'string' && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

export function parseRequestBody(input: unknown): AssistantRequestBody | null {
  let body = input;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (!body || typeof body !== 'object') return null;
  const candidate = body as Record<string, unknown>;
  if (!Array.isArray(candidate.messages) || candidate.messages.length === 0) return null;
  if (candidate.chart !== undefined && typeof candidate.chart !== 'string') return null;

  const messages: ConversationMessage[] = [];
  for (const message of candidate.messages.slice(-MAX_MESSAGES)) {
    if (!message || typeof message !== 'object') return null;
    const record = message as Record<string, unknown>;
    if ((record.role !== 'user' && record.role !== 'assistant') || typeof record.content !== 'string') return null;
    if (!record.content.trim()) return null;
    messages.push({ role: record.role, content: record.content.slice(0, MAX_MESSAGE_CHARS) });
  }

  const chart = typeof candidate.chart === 'string' ? candidate.chart.slice(0, MAX_CHART_CHARS) : undefined;
  return chart === undefined ? { messages } : { messages, chart };
}

function modelMessages(body: AssistantRequestBody): Array<Record<string, unknown>> {
  const messages: Array<Record<string, unknown>> = body.messages.map((message) => ({ ...message }));
  if (body.chart === undefined) return messages;

  const chartBlock = { type: 'text', text: `Visitor's chart summary:\n${body.chart}` };
  const message = messages.at(-1);
  if (message?.role === 'user') {
    message.content = [
      { type: 'text', text: message.content },
      chartBlock,
    ];
    return messages;
  }

  messages.push({ role: 'user', content: [chartBlock] });
  return messages;
}

export function parseQuotaCount(payload: unknown): number | null {
  if (typeof payload === 'number' && Number.isSafeInteger(payload) && payload >= 0) return payload;
  if (typeof payload === 'string' && /^\d+$/.test(payload)) {
    const count = Number(payload);
    return Number.isSafeInteger(count) ? count : null;
  }
  if (Array.isArray(payload)) return payload.length === 1 ? parseQuotaCount(payload[0]) : null;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['assistant_quota_bump', 'count', 'today_count']) {
      if (key in record) return parseQuotaCount(record[key]);
    }
  }
  return null;
}

class InstanceRateLimiter {
  private readonly requests = new Map<string, number[]>();
  private checks = 0;

  allow(visitorHash: string, now: number): boolean {
    const cutoff = now - INSTANCE_WINDOW_MS;
    this.checks += 1;
    if (this.checks % 256 === 0) {
      for (const [key, times] of this.requests) {
        if (!times.length || times[times.length - 1] <= cutoff) this.requests.delete(key);
      }
    }
    const recent = (this.requests.get(visitorHash) ?? []).filter((time) => time > cutoff);
    if (recent.length >= INSTANCE_LIMIT) {
      this.requests.set(visitorHash, recent);
      return false;
    }
    recent.push(now);
    this.requests.set(visitorHash, recent);
    return true;
  }
}

function sendJson(res: any, status: number, body: Record<string, string>): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function startEventStream(res: any): void {
  res.statusCode = 200;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

async function bumpDailyQuota(
  fetchImpl: typeof fetch,
  supabaseUrl: string,
  serviceKey: string,
  visitorHash: string,
): Promise<number | null> {
  try {
    const response = await fetchImpl(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/assistant_quota_bump`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ visitor_hash: visitorHash }),
    });
    if (!response.ok) return null;
    return parseQuotaCount(await response.json());
  } catch {
    return null;
  }
}

export function createAssistantHandler(overrides: Partial<HandlerDependencies> = {}) {
  const dependencies: HandlerDependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const instanceRateLimiter = new InstanceRateLimiter();

  return async function handler(req: any, res: any): Promise<void> {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJson(res, 405, { error: 'method' });
      return;
    }

    if (!isAllowedSiteRequest(req)) {
      sendJson(res, 403, { error: 'forbidden' });
      return;
    }

    const env = dependencies.env;
    if (env.ASSISTANT_ENABLED !== '1') {
      sendJson(res, 503, { error: 'disabled' });
      return;
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    const salt = env.ASSISTANT_SALT;
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!apiKey || !salt || !supabaseUrl || !serviceKey) {
      sendJson(res, 503, { error: 'unavailable' });
      return;
    }

    const body = parseRequestBody(req.body);
    if (!body) {
      sendJson(res, 400, { error: 'invalid' });
      return;
    }

    const visitorHash = hashVisitor(salt, clientIp(req));
    if (!instanceRateLimiter.allow(visitorHash, dependencies.now())) {
      sendJson(res, 429, { error: 'limit' });
      return;
    }

    const dailyCount = await bumpDailyQuota(dependencies.fetch, supabaseUrl, serviceKey, visitorHash);
    if (dailyCount === null) {
      sendJson(res, 503, { error: 'unavailable' });
      return;
    }
    if (dailyCount > DAILY_LIMIT) {
      sendJson(res, 429, { error: 'limit' });
      return;
    }

    let stream: MessageStreamLike;
    let disconnected = false;
    const connectionClosed = () => (
      disconnected
      || req.signal?.aborted === true
      || req.aborted === true
      || res.destroyed === true
      || res.writableEnded === true
    );
    const abortOnDisconnect = () => {
      disconnected = true;
      if (typeof stream?.abort === 'function') stream.abort();
    };
    const removeDisconnectListeners = () => {
      if (req.signal && typeof req.signal.removeEventListener === 'function') {
        req.signal.removeEventListener('abort', abortOnDisconnect);
      }
      if (typeof req.off === 'function') req.off('aborted', abortOnDisconnect);
      if (typeof res.off === 'function') res.off('close', abortOnDisconnect);
    };
    try {
      const anthropic = dependencies.createAnthropic(apiKey);
      stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 500,
        system: [
          { type: 'text', text: ASSISTANT_PERSONA },
          { type: 'text', text: ASSISTANT_CONTEXT, cache_control: { type: 'ephemeral' } },
        ],
        messages: modelMessages(body),
        metadata: { user_id: visitorHash },
      });
      if (req.signal && typeof req.signal.addEventListener === 'function') {
        req.signal.addEventListener('abort', abortOnDisconnect, { once: true });
      }
      if (typeof req.once === 'function') req.once('aborted', abortOnDisconnect);
      if (typeof res.once === 'function') res.once('close', abortOnDisconnect);
      if (connectionClosed()) {
        abortOnDisconnect();
        removeDisconnectListeners();
        return;
      }
      if (stream.withResponse) await stream.withResponse();
    } catch {
      removeDisconnectListeners();
      if (connectionClosed()) return;
      sendJson(res, 502, { error: 'unavailable' });
      return;
    }

    let started = false;
    try {
      for await (const event of stream) {
        if (event?.type !== 'content_block_delta' || event.delta?.type !== 'text_delta' || !event.delta.text) continue;
        if (!started) {
          startEventStream(res);
          started = true;
        }
        res.write(`data: ${JSON.stringify({ t: event.delta.text })}\n\n`);
      }

      const message = await stream.finalMessage();
      const usage = message.usage ?? {};
      dependencies.log(
        `assistant_usage input_tokens=${usage.input_tokens ?? 0} cached_tokens=${usage.cache_read_input_tokens ?? 0} cache_creation_input_tokens=${usage.cache_creation_input_tokens ?? 0} output_tokens=${usage.output_tokens ?? 0}`,
      );
      if (!started) {
        startEventStream(res);
        started = true;
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {
      if (connectionClosed()) return;
      if (!started) {
        sendJson(res, 502, { error: 'unavailable' });
        return;
      }
      if (typeof stream.abort === 'function') stream.abort();
      res.write(`data: ${JSON.stringify({ error: 'unavailable' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } finally {
      removeDisconnectListeners();
    }
  };
}

export default createAssistantHandler();
