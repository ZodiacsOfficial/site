import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import {
  GUIDE_LIMITS,
  GUIDE_SCHEMAS,
  type GuideContextSourceDraftV1,
  type GuideStreamErrorCode,
  type GuideStreamEventDraftV1,
  type GuideTurnRejectionDraftV1,
  type GuideTurnRequestDraftV1,
} from '../guide-protocol/types.js';
import { createGuideEphemeralContextScopeDigestDraftV1 } from '../guide-protocol/adapters.js';
import { parseGuideTurnRequestDraftV1 } from '../guide-protocol/validators.js';
import { accountRequestHeader, isExactAccountOrigin, strictBearerToken } from '../account-api/request.js';
import {
  type GuideHydratedModelSource,
  type GuideProviderCompletion,
  type GuideProviderFailureCode,
  type GuideProviderProjection,
  GuideProviderFailure,
} from './openai.js';
import {
  GUIDE_CLOUD_DISCLOSURE_POLICY_VERSION,
  GUIDE_PROVIDER_MODEL,
  GUIDE_SAFETY_RESPONSE_MODEL,
} from './policy.js';
import { guideSafetyCompletion, streamSafeGuideOpenAIResponse } from './safety.js';
import { classifyGuideCurrentTurnSafety } from './local-safety.js';
import { GuideQuotaController, GuideQuotaError, type GuideQuotaLease } from './quota.js';
import {
  guideAnonymousPrincipal,
  guideOperationHash,
  type GuideAnonymousPrincipal,
} from './security.js';
import {
  resolveGuidePageKnowledge,
  selectGuideKnowledge,
} from '../guide-knowledge/retriever.js';

type Environment = Record<string, unknown>;
const GUIDE_ACTION = 'turn';

interface GuideAuthorizedTurn {
  projection: GuideProviderProjection;
  reserve: (options?: { trustedSafetyBypass?: 'crisis' }) => Promise<{
    acceptedRevision: number;
    release?: () => void;
    commit: (completion: GuideProviderCompletion) => Promise<{
      conversationRevision: number;
      message: Extract<GuideStreamEventDraftV1, { type: 'completed' }>['message'];
    }>;
  }>;
}

export type GuideAuthorityDecision =
  | { ok: true; turn: GuideAuthorizedTurn }
  | {
    ok: false;
    status: 401 | 403 | 409 | 413 | 429 | 503;
    code: GuideStreamErrorCode;
    retryable: boolean;
  };

interface GuideAuthorityContext {
  bearerToken: string | null;
  anonymous: GuideAnonymousPrincipal | null;
  env: Environment;
  now: number;
  signal: AbortSignal;
}

type GuideAuthorizeTurn = (
  request: GuideTurnRequestDraftV1,
  context: GuideAuthorityContext,
) => Promise<GuideAuthorityDecision>;

interface GuideHandlerDependencies {
  env: Environment;
  now: () => number;
  protocolReady: boolean;
  authorizeTurn?: GuideAuthorizeTurn;
  streamProvider: typeof streamSafeGuideOpenAIResponse;
  quotaController?: GuideQuotaController;
  fetcher: typeof fetch;
  uuid: () => string;
}

const DEFAULT_DEPENDENCIES: GuideHandlerDependencies = {
  env: process.env,
  now: Date.now,
  protocolReady: true,
  streamProvider: streamSafeGuideOpenAIResponse,
  fetcher: fetch,
  uuid: randomUUID,
};

function firstHeader(value: unknown): string {
  if (Array.isArray(value)) return value.length === 1 && typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function action(req: any): typeof GUIDE_ACTION | null {
  const query = req.query;
  if (!query || typeof query !== 'object' || Array.isArray(query)) return null;
  const keys = Object.keys(query);
  return keys.length === 1 && keys[0] === 'action' && query.action === GUIDE_ACTION
    ? GUIDE_ACTION
    : null;
}

function setPrivateHeaders(res: any, contentType: string): void {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Vary', 'Authorization, Cookie, Origin');
}

function sendJson(res: any, status: number, body: unknown): void {
  if (res.destroyed || res.writableEnded) return;
  res.statusCode = status;
  setPrivateHeaders(res, 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function startEventStream(res: any): void {
  res.statusCode = 200;
  setPrivateHeaders(res, 'text/event-stream; charset=utf-8');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

function writeEvent(res: any, event: GuideStreamEventDraftV1): boolean {
  if (res.destroyed || res.writableEnded) return false;
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  return true;
}

function rejection(
  request: GuideTurnRequestDraftV1,
  code: GuideStreamErrorCode,
  retryable: boolean,
): GuideTurnRejectionDraftV1 {
  return {
    schema: GUIDE_SCHEMAS.turnRejection,
    conversationId: request.conversationId,
    turnId: request.turnId,
    attemptId: request.attemptId,
    clientAuthEpoch: request.clientAuthEpoch,
    code,
    retryable,
  };
}

type RawTurnResult =
  | { ok: true; request: GuideTurnRequestDraftV1 }
  | { ok: false; status: 400 | 413 };

function declaredBodyBytes(req: any): number | null | 'invalid' {
  const value = accountRequestHeader(req, 'content-length').trim();
  if (!value) return null;
  if (!/^\d{1,6}$/u.test(value)) return 'invalid';
  const bytes = Number(value);
  return Number.isSafeInteger(bytes) && bytes > 1 ? bytes : 'invalid';
}

/** Reads and bounds raw UTF-8 before parsing JSON. api/guide.ts disables helpers. */
export async function readGuideHttpTurnRequest(req: any): Promise<RawTurnResult> {
  const contentType = firstHeader(req.headers?.['content-type'])
    || (typeof req.get === 'function' ? req.get('content-type') : '');
  if (typeof contentType !== 'string'
    || contentType.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    return { ok: false, status: 400 };
  }
  const declared = declaredBodyBytes(req);
  if (declared === 'invalid') return { ok: false, status: 400 };
  if (declared !== null && declared > GUIDE_LIMITS.requestBytes) return { ok: false, status: 413 };

  let bytes: Buffer;
  let preset: unknown;
  try {
    preset = req.body;
  } catch {
    return { ok: false, status: 400 };
  }
  if (typeof preset === 'string') {
    bytes = Buffer.from(preset, 'utf8');
  } else if (Buffer.isBuffer(preset) || preset instanceof Uint8Array) {
    bytes = Buffer.from(preset);
  } else if (preset !== undefined && preset !== null) {
    // A parsed object means the runtime touched JSON before this guard.
    return { ok: false, status: 400 };
  } else if (req && typeof req[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for await (const chunk of req as AsyncIterable<unknown>) {
        const part = typeof chunk === 'string'
          ? Buffer.from(chunk, 'utf8')
          : Buffer.isBuffer(chunk) || chunk instanceof Uint8Array
            ? Buffer.from(chunk)
            : null;
        if (!part) return { ok: false, status: 400 };
        total += part.byteLength;
        if (total > GUIDE_LIMITS.requestBytes) return { ok: false, status: 413 };
        chunks.push(part);
      }
    } catch {
      return { ok: false, status: 400 };
    }
    bytes = Buffer.concat(chunks, total);
  } else {
    return { ok: false, status: 400 };
  }
  if (bytes.byteLength > GUIDE_LIMITS.requestBytes) return { ok: false, status: 413 };
  if (declared !== null && declared !== bytes.byteLength) return { ok: false, status: 400 };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, status: 400 };
  }
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, status: 400 };
  }
  const request = parseGuideTurnRequestDraftV1(body);
  return request ? { ok: true, request } : { ok: false, status: 400 };
}

function providerError(code: GuideProviderFailureCode): {
  code: GuideStreamErrorCode;
  status: 413 | 429 | 503;
} {
  if (code === 'rate_limited') return { code: 'rate_limited', status: 429 };
  if (code === 'response_too_large' || code === 'invalid_input') {
    return { code: 'invalid_response', status: 413 };
  }
  if (code === 'invalid_response') return { code: 'invalid_response', status: 503 };
  return { code: 'temporarily_unavailable', status: 503 };
}

function requestAbort(req: any, res: any) {
  const controller = new AbortController();
  let disconnected = false;
  const abort = () => {
    disconnected = true;
    if (!controller.signal.aborted) controller.abort();
  };
  const sourceAbort = () => abort();
  if (req.signal && typeof req.signal.addEventListener === 'function') {
    if (req.signal.aborted) abort();
    else req.signal.addEventListener('abort', sourceAbort, { once: true });
  }
  if (typeof req.once === 'function') {
    req.once('aborted', abort);
    req.once('error', abort);
  }
  if (typeof res.once === 'function') res.once('close', abort);
  return {
    signal: controller.signal,
    disconnected: () => disconnected || req.aborted === true || res.destroyed === true,
    cleanup: () => {
      req.signal?.removeEventListener?.('abort', sourceAbort);
      req.off?.('aborted', abort);
      req.off?.('error', abort);
      res.off?.('close', abort);
    },
  };
}

function hydrateSource(source: GuideContextSourceDraftV1): GuideHydratedModelSource {
  return {
    kind: source.kind,
    title: source.title,
    facts: source.facts ?? '',
    subject: source.subject,
    containsThirdPartyData: source.containsThirdPartyData,
  };
}

function projectionFromEphemeral(
  request: Extract<GuideTurnRequestDraftV1, { mode: 'ephemeral' }>,
): GuideProviderProjection | null {
  const base = request.ephemeralContext.baseContext;
  const pageSources = request.ephemeralContext.attachments.filter(({ kind }) => kind === 'site_page');
  if (pageSources.length > 1) return null;
  const pageSourceId = pageSources[0]?.sourceId ?? null;
  if (pageSourceId && !resolveGuidePageKnowledge(pageSourceId)) return null;
  return {
    baseContext: {
      ownerChart: {
        slot: 'owner_chart',
        state: base.ownerChart.state,
        source: base.ownerChart.source ? hydrateSource(base.ownerChart.source) : null,
      },
      todaySky: {
        slot: 'today_sky',
        state: base.todaySky.state,
        source: base.todaySky.source ? hydrateSource(base.todaySky.source) : null,
      },
    },
    // A client-visible page source is only a selector. Its client facts are
    // discarded and replaced by the server-curated knowledge projection.
    attachments: request.ephemeralContext.attachments
      .filter(({ kind }) => kind !== 'site_page')
      .map(hydrateSource),
    publicKnowledge: selectGuideKnowledge(request.userMessage.content, pageSourceId),
    history: request.ephemeralContext.history.map(({ author, content }) => ({ author, content })),
    userMessage: request.userMessage.content,
  };
}

function containsForbiddenSavedPerson(projection: GuideProviderProjection): boolean {
  const sources: GuideHydratedModelSource[] = [
    projection.baseContext.ownerChart.source,
    projection.baseContext.todaySky.source,
    ...projection.attachments,
  ].filter((source): source is GuideHydratedModelSource => source !== null);
  return sources.some((source) => source.subject.boundary === 'saved_person');
}

function guideSecret(env: Environment): unknown {
  return env.GUIDE_SESSION_SECRET ?? env.ASSISTANT_SALT;
}

function defaultAuthority(
  dependencies: GuideHandlerDependencies,
  quota: GuideQuotaController,
): GuideAuthorizeTurn {
  return async (request, context) => {
    if (request.mode !== 'ephemeral' || !context.anonymous) {
      return { ok: false, status: 503, code: 'temporarily_unavailable', retryable: true };
    }
    if (request.consent.policyVersion !== GUIDE_CLOUD_DISCLOSURE_POLICY_VERSION) {
      return { ok: false, status: 403, code: 'consent_required', retryable: false };
    }
    const digest = await createGuideEphemeralContextScopeDigestDraftV1(request);
    if (!digest || digest !== request.consent.contextScopeDigest) {
      return { ok: false, status: 403, code: 'consent_required', retryable: false };
    }
    const projection = projectionFromEphemeral(request);
    if (!projection) {
      return { ok: false, status: 409, code: 'context_changed', retryable: false };
    }
    if (containsForbiddenSavedPerson(projection)) {
      return { ok: false, status: 403, code: 'consent_required', retryable: false };
    }
    const operationHash = guideOperationHash(
      guideSecret(context.env),
      request.conversationId,
      request.operationId,
    );
    if (!operationHash) {
      return { ok: false, status: 503, code: 'temporarily_unavailable', retryable: true };
    }
    return {
      ok: true,
      turn: {
        projection,
        reserve: async (options) => {
          // High-confidence crisis guidance is a local, constant response. It
          // must remain available if provider credentials or quota are down.
          const quotaInput = {
            quotaHash: context.anonymous!.quotaHash,
            principalHash: context.anonymous!.principalHash,
            conversationId: request.conversationId,
            operationHash,
            now: context.now,
            env: context.env,
            signal: context.signal,
          };
          const lease: GuideQuotaLease = options?.trustedSafetyBypass === 'crisis'
            ? quota.reserveLocal(quotaInput, 'crisis')
            : await quota.reserve(quotaInput);
          const acceptedRevision = request.baseRevision + 1;
          return {
            acceptedRevision,
            release: lease.release,
            commit: async (completion) => {
              if (completion.modelId !== GUIDE_PROVIDER_MODEL
                && completion.modelId !== GUIDE_SAFETY_RESPONSE_MODEL) {
                throw new GuideProviderFailure('invalid_response');
              }
              const lastSequence = request.ephemeralContext.history.reduce(
                (maximum, message) => Math.max(maximum, message.sequence),
                request.ephemeralContext.modelHistoryStartSequence - 1,
              );
              const generatedAt = new Date(dependencies.now()).toISOString();
              return {
                conversationRevision: acceptedRevision + 1,
                message: {
                  messageId: dependencies.uuid(),
                  turnId: request.turnId,
                  sequence: lastSequence + 2,
                  author: 'guide',
                  content: completion.outputText,
                  contextRevision: request.contextEpoch,
                  createdAt: generatedAt,
                  generation: {
                    modelId: completion.modelId,
                    promptVersion: completion.promptVersion,
                    policyVersion: completion.policyVersion,
                    protocolSchema: GUIDE_SCHEMAS.conversation,
                    generatedAt,
                  },
                },
              };
            },
          };
        },
      },
    };
  };
}

export function createGuideHandler(overrides: Partial<GuideHandlerDependencies> = {}) {
  const dependencies: GuideHandlerDependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const quota = dependencies.quotaController ?? new GuideQuotaController(dependencies.fetcher);
  const authorizeTurn = dependencies.authorizeTurn ?? defaultAuthority(dependencies, quota);

  return async function handleGuideApi(req: any, res: any): Promise<void> {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }
    if (action(req) !== GUIDE_ACTION) {
      sendJson(res, 404, { error: 'invalid_action' });
      return;
    }
    if (dependencies.env.GUIDE_KILL_SWITCH === '1') {
      sendJson(res, 503, { error: 'disabled' });
      return;
    }
    if (!isExactAccountOrigin(req, dependencies.env)) {
      sendJson(res, 403, { error: 'forbidden' });
      return;
    }

    const connection = requestAbort(req, res);
    try {
      const decoded = await readGuideHttpTurnRequest(req);
      if (decoded.ok === false) {
        sendJson(res, decoded.status, {
          error: decoded.status === 413 ? 'request_too_large' : 'invalid_request',
        });
        return;
      }
      const request = decoded.request;
      if (!dependencies.protocolReady) {
        sendJson(res, 503, rejection(request, 'disabled', false));
        return;
      }

      const authorization = accountRequestHeader(req, 'authorization').trim();
      const bearerToken = strictBearerToken(req);
      if (request.mode === 'account' && !bearerToken) {
        sendJson(res, 401, rejection(request, 'unauthorized', false));
        return;
      }
      if (request.mode === 'ephemeral' && authorization) {
        sendJson(res, 400, { error: 'ambiguous_authority' });
        return;
      }

      const anonymous = request.mode === 'ephemeral'
        ? guideAnonymousPrincipal(req, guideSecret(dependencies.env))
        : null;
      if (request.mode === 'ephemeral' && !anonymous) {
        sendJson(res, 503, rejection(request, 'temporarily_unavailable', true));
        return;
      }
      if (anonymous?.setCookie) res.setHeader('Set-Cookie', anonymous.setCookie);

      let authority: GuideAuthorityDecision;
      try {
        authority = await authorizeTurn(request, {
          bearerToken,
          anonymous,
          env: dependencies.env,
          now: dependencies.now(),
          signal: connection.signal,
        });
      } catch {
        if (!connection.disconnected()) {
          sendJson(res, 503, rejection(request, 'temporarily_unavailable', true));
        }
        return;
      }
      if (authority.ok === false) {
        if (authority.status === 429) res.setHeader('Retry-After', '60');
        sendJson(res, authority.status, rejection(request, authority.code, authority.retryable));
        return;
      }
      if (containsForbiddenSavedPerson(authority.turn.projection)) {
        sendJson(res, 403, rejection(request, 'consent_required', false));
        return;
      }

      const localCrisis = classifyGuideCurrentTurnSafety(
        authority.turn.projection.userMessage,
      ) === 'crisis';
      const apiKey = dependencies.env.OPENAI_API_KEY;
      if (!localCrisis && (typeof apiKey !== 'string' || !apiKey)) {
        sendJson(res, 503, rejection(request, 'temporarily_unavailable', true));
        return;
      }

      let reservation: Awaited<ReturnType<GuideAuthorizedTurn['reserve']>>;
      try {
        reservation = await authority.turn.reserve(
          localCrisis ? { trustedSafetyBypass: 'crisis' } : undefined,
        );
      } catch (error) {
        if (connection.disconnected()) return;
        if (error instanceof GuideQuotaError) {
          if (error.code === 'operation_replay') {
            sendJson(
              res,
              409,
              rejection(request, 'revision_conflict', false),
            );
            return;
          }
          const rateLimited = error.code === 'rate_limited';
          if (rateLimited) res.setHeader('Retry-After', '60');
          sendJson(
            res,
            rateLimited ? 429 : 503,
            rejection(
              request,
              rateLimited ? 'rate_limited' : 'temporarily_unavailable',
              true,
            ),
          );
          return;
        }
        sendJson(res, 503, rejection(request, 'temporarily_unavailable', true));
        return;
      }

      let eventSequence = 0;
      startEventStream(res);
      writeEvent(res, {
        schema: GUIDE_SCHEMAS.streamEvent,
        conversationId: request.conversationId,
        turnId: request.turnId,
        attemptId: request.attemptId,
        eventSequence,
        clientAuthEpoch: request.clientAuthEpoch,
        type: 'accepted',
        conversationRevision: reservation.acceptedRevision,
      });
      eventSequence += 1;

      try {
        const writeDelta = async (delta: string) => {
          if (connection.signal.aborted || !writeEvent(res, {
            schema: GUIDE_SCHEMAS.streamEvent,
            conversationId: request.conversationId,
            turnId: request.turnId,
            attemptId: request.attemptId,
            eventSequence,
            clientAuthEpoch: request.clientAuthEpoch,
            type: 'delta',
            delta,
          })) throw new GuideProviderFailure('cancelled');
          eventSequence += 1;
        };
        const completion = localCrisis
          ? guideSafetyCompletion('crisis')
          : await dependencies.streamProvider(
              apiKey,
              authority.turn.projection,
              writeDelta,
              connection.signal,
            );
        if (localCrisis) await writeDelta(completion.outputText);
        if (completion.modelId !== GUIDE_PROVIDER_MODEL
          && completion.modelId !== GUIDE_SAFETY_RESPONSE_MODEL) {
          throw new GuideProviderFailure('invalid_response');
        }
        const committed = await reservation.commit(completion);
        writeEvent(res, {
          schema: GUIDE_SCHEMAS.streamEvent,
          conversationId: request.conversationId,
          turnId: request.turnId,
          attemptId: request.attemptId,
          eventSequence,
          clientAuthEpoch: request.clientAuthEpoch,
          type: 'completed',
          conversationRevision: committed.conversationRevision,
          message: committed.message,
        });
        if (!res.writableEnded && !res.destroyed) res.end();
      } catch (error) {
        if (connection.disconnected()) return;
        if (error instanceof GuideProviderFailure && error.code === 'cancelled') {
          writeEvent(res, {
            schema: GUIDE_SCHEMAS.streamEvent,
            conversationId: request.conversationId,
            turnId: request.turnId,
            attemptId: request.attemptId,
            eventSequence,
            clientAuthEpoch: request.clientAuthEpoch,
            type: 'cancelled',
            reason: 'client_cancelled',
          });
        } else {
          const mapped = providerError(
            error instanceof GuideProviderFailure ? error.code : 'unavailable',
          );
          writeEvent(res, {
            schema: GUIDE_SCHEMAS.streamEvent,
            conversationId: request.conversationId,
            turnId: request.turnId,
            attemptId: request.attemptId,
            eventSequence,
            clientAuthEpoch: request.clientAuthEpoch,
            type: 'error',
            code: mapped.code,
            // Draft v1 cannot replay an already accepted user turn safely.
            // Retryable failures are therefore rejected before SSE begins.
            retryable: false,
          });
        }
        if (!res.writableEnded && !res.destroyed) res.end();
      } finally {
        reservation.release?.();
      }
    } finally {
      connection.cleanup();
    }
  };
}

export const handleGuideApi = createGuideHandler();
