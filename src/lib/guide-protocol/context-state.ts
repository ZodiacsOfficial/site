import {
  GUIDE_LIMITS,
  type GuideBaseContextDraftV1,
  type GuideContextMutationDraftV1,
  type GuideContextOperationReceiptDraftV1,
  type GuideContextSourceDraftV1,
  type GuideConversationDraftV1,
  type GuideMessageDraftV1,
} from './types.js';
import {
  guideUtf8Bytes,
  parseGuideContextMutationDraftV1,
  parseGuideConversationDraftV1,
} from './validators.js';

const SERVER_SEMANTIC_VERIFIER = /^[1-9][0-9]{0,5}:[a-f0-9]{64}$/u;
const LOCAL_SEMANTIC_VERIFIER = /^local:[a-f0-9]{64}$/u;

export type GuideContextMutationResult =
  | {
    outcome: 'applied' | 'unchanged' | 'replayed';
    state: GuideConversationDraftV1;
    receipt: GuideContextOperationReceiptDraftV1;
    activityDirective: 'advance_with_server_time' | 'preserve';
  }
  | {
    outcome:
      | 'invalid_state'
      | 'invalid_mutation'
      | 'invalid_semantic_verifier'
      | 'conversation_mismatch'
      | 'revision_conflict'
      | 'mutation_conflict'
      | 'source_conflict'
      | 'source_not_found'
      | 'stale_source_revision'
      | 'source_revision_conflict'
      | 'source_limit_reached'
      | 'invalid_projection';
    state: GuideConversationDraftV1;
  };

function activeBaseSourceIds(base: GuideBaseContextDraftV1): string[] {
  return [base.ownerChart.source?.sourceId, base.todaySky.source?.sourceId]
    .filter((sourceId): sourceId is string => Boolean(sourceId));
}

function sourceIdExists(
  base: GuideBaseContextDraftV1,
  attachments: GuideContextSourceDraftV1[],
  sourceId: string,
  ignoredAttachmentIndex = -1,
): boolean {
  return activeBaseSourceIds(base).includes(sourceId)
    || attachments.some((source, index) => index !== ignoredAttachmentIndex && source.sourceId === sourceId);
}

interface MutationProjection {
  changed: boolean;
  baseContext: GuideBaseContextDraftV1;
  attachments: GuideContextSourceDraftV1[];
  modelContextState: 'active' | 'disabled';
  failure?:
    | 'source_conflict'
    | 'source_not_found'
    | 'stale_source_revision'
    | 'source_revision_conflict'
    | 'source_limit_reached';
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  )).join(',')}}`;
}

function sourceEqual(left: GuideContextSourceDraftV1, right: GuideContextSourceDraftV1): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function sourceUpdateFailure(
  current: GuideContextSourceDraftV1,
  replacement: GuideContextSourceDraftV1,
): MutationProjection['failure'] | null {
  if (current.sourceId !== replacement.sourceId) return null;
  if (replacement.sourceRevision < current.sourceRevision) return 'stale_source_revision';
  if (replacement.sourceRevision === current.sourceRevision && !sourceEqual(current, replacement)) {
    return 'source_revision_conflict';
  }
  return null;
}

function projectMutation(
  state: GuideConversationDraftV1,
  mutation: GuideContextMutationDraftV1,
): MutationProjection {
  const attachments = [...state.attachments];
  const baseContext = state.baseContext;
  const modelContextState = state.modelContextState;

  if (mutation.operation === 'attach') {
    if (sourceIdExists(baseContext, attachments, mutation.source.sourceId)) {
      return { changed: false, baseContext, attachments, modelContextState, failure: 'source_conflict' };
    }
    if (attachments.length >= GUIDE_LIMITS.visibleSources) {
      return { changed: false, baseContext, attachments, modelContextState, failure: 'source_limit_reached' };
    }
    return {
      changed: true,
      baseContext,
      attachments: [...attachments, mutation.source],
      modelContextState,
    };
  }

  if (mutation.operation === 'replace') {
    const index = attachments.findIndex(({ sourceId }) => sourceId === mutation.targetSourceId);
    if (index < 0) {
      return { changed: false, baseContext, attachments, modelContextState, failure: 'source_not_found' };
    }
    if (sourceIdExists(baseContext, attachments, mutation.replacement.sourceId, index)) {
      return { changed: false, baseContext, attachments, modelContextState, failure: 'source_conflict' };
    }
    const current = attachments[index]!;
    const updateFailure = sourceUpdateFailure(current, mutation.replacement);
    if (updateFailure) {
      return { changed: false, baseContext, attachments, modelContextState, failure: updateFailure };
    }
    if (sourceEqual(current, mutation.replacement)) {
      return { changed: false, baseContext, attachments, modelContextState };
    }
    const replacement = [...attachments];
    replacement[index] = mutation.replacement;
    return { changed: true, baseContext, attachments: replacement, modelContextState };
  }

  if (mutation.operation === 'remove') {
    const next = attachments.filter(({ sourceId }) => sourceId !== mutation.sourceId);
    return {
      changed: next.length !== attachments.length, baseContext, attachments: next, modelContextState,
    };
  }

  if (mutation.operation === 'clear') {
    return { changed: attachments.length > 0, baseContext, attachments: [], modelContextState };
  }

  if (mutation.operation === 'set_base') {
    const key = mutation.slot === 'owner_chart' ? 'ownerChart' : 'todaySky';
    const otherKey = mutation.slot === 'owner_chart' ? 'todaySky' : 'ownerChart';
    const current = baseContext[key];
    if (mutation.source) {
      if (baseContext[otherKey].source?.sourceId === mutation.source.sourceId
        || attachments.some(({ sourceId }) => sourceId === mutation.source?.sourceId)) {
        return { changed: false, baseContext, attachments, modelContextState, failure: 'source_conflict' };
      }
      if (current.source) {
        const updateFailure = sourceUpdateFailure(current.source, mutation.source);
        if (updateFailure) {
          return { changed: false, baseContext, attachments, modelContextState, failure: updateFailure };
        }
      }
    }
    const nextSlot = { slot: mutation.slot, state: mutation.state, source: mutation.source } as const;
    if (canonicalJson(current) === canonicalJson(nextSlot)) {
      return { changed: false, baseContext, attachments, modelContextState };
    }
    return {
      changed: true,
      baseContext: { ...baseContext, [key]: nextSlot },
      attachments,
      modelContextState,
    };
  }

  if (mutation.operation === 'restore_model_context') {
    return {
      changed: modelContextState !== 'active',
      baseContext,
      attachments,
      modelContextState: 'active',
    };
  }

  if (mutation.target.kind === 'attachment') {
    const targetSourceId = mutation.target.sourceId;
    const next = attachments.filter(({ sourceId }) => sourceId !== targetSourceId);
    return {
      changed: next.length !== attachments.length, baseContext, attachments: next, modelContextState,
    };
  }

  if (mutation.target.kind === 'all_model_context') {
    return {
      changed: modelContextState !== 'disabled',
      baseContext,
      attachments,
      modelContextState: 'disabled',
    };
  }

  const key = mutation.target.slot === 'owner_chart' ? 'ownerChart' : 'todaySky';
  const slot = baseContext[key];
  if (slot.state === 'revoked') {
    return { changed: false, baseContext, attachments, modelContextState };
  }
  return {
    changed: true,
    baseContext: {
      ...baseContext,
      [key]: { slot: mutation.target.slot, state: 'revoked', source: null },
    },
    attachments,
    modelContextState,
  };
}

/**
 * Applies a previously validated context mutation. Synced state requires a
 * server HMAC; memory-only state requires a local digest that is never
 * persisted or uploaded.
 */
export function applyGuideContextMutation(
  candidateState: GuideConversationDraftV1,
  candidateMutation: GuideContextMutationDraftV1,
  semanticVerifier: string,
): GuideContextMutationResult {
  const state = parseGuideConversationDraftV1(candidateState);
  if (!state) return { outcome: 'invalid_state', state: candidateState };
  const mutation = parseGuideContextMutationDraftV1(candidateMutation);
  if (!mutation) return { outcome: 'invalid_mutation', state };
  const verifierValid = state.persistence === 'account_synced'
    ? SERVER_SEMANTIC_VERIFIER.test(semanticVerifier)
    : LOCAL_SEMANTIC_VERIFIER.test(semanticVerifier);
  if (!verifierValid) {
    return { outcome: 'invalid_semantic_verifier', state };
  }
  if (mutation.conversationId !== state.conversationId) {
    return { outcome: 'conversation_mismatch', state };
  }

  const prior = state.contextOperations.find(({ operationId }) => operationId === mutation.operationId);
  if (prior) {
    return prior.semanticVerifier === semanticVerifier
      ? { outcome: 'replayed', state, receipt: prior, activityDirective: 'preserve' }
      : { outcome: 'mutation_conflict', state };
  }
  if (mutation.baseRevision !== state.revision) return { outcome: 'revision_conflict', state };

  const projection = projectMutation(state, mutation);
  if (projection.failure) return { outcome: projection.failure, state };
  const resultRevision = projection.changed ? state.revision + 1 : state.revision;
  const receipt: GuideContextOperationReceiptDraftV1 = {
    operationId: mutation.operationId,
    semanticVerifier,
    resultRevision,
    outcome: projection.changed ? 'applied' : 'unchanged',
  };
  const nextState: GuideConversationDraftV1 = {
    ...state,
    revision: resultRevision,
    contextRevision: projection.changed ? state.contextRevision + 1 : state.contextRevision,
    contextEpoch: projection.changed ? state.contextEpoch + 1 : state.contextEpoch,
    modelHistoryStartSequence: projection.changed
      ? Math.max(state.modelHistoryStartSequence, state.nextSequence)
      : state.modelHistoryStartSequence,
    baseContext: projection.baseContext,
    attachments: projection.attachments,
    modelContextState: projection.modelContextState,
    // This is a bounded projection cache. Synced durable receipts live in a
    // separate owner-scoped operation table, so privacy mutations never block.
    contextOperations: [...state.contextOperations, receipt]
      .slice(-GUIDE_LIMITS.contextOperationReceipts),
  };
  const validatedNextState = parseGuideConversationDraftV1(nextState);
  if (!validatedNextState) return { outcome: 'invalid_projection', state };
  return {
    outcome: projection.changed ? 'applied' : 'unchanged',
    state: validatedNextState,
    receipt,
    activityDirective: projection.changed
      && ['attach', 'replace', 'remove', 'clear'].includes(mutation.operation)
      ? 'advance_with_server_time'
      : 'preserve',
  };
}

/**
 * Visible messages remain in the conversation. Only this projection is sent
 * to the model, so a context cutoff always dominates ordinary window trim.
 */
export function guideModelHistory(
  state: GuideConversationDraftV1,
): GuideMessageDraftV1[] {
  const valid = parseGuideConversationDraftV1(state);
  if (!valid || valid.modelContextState !== 'active') return [];
  const eligible = valid.messages.filter(
    ({ sequence }) => sequence >= valid.modelHistoryStartSequence,
  );
  const selected: GuideMessageDraftV1[] = [];
  let bytes = 0;
  for (let index = eligible.length - 1; index >= 0; index -= 1) {
    const message = eligible[index];
    // Reserve one message for the new user turn.
    if (!message || selected.length >= GUIDE_LIMITS.modelWindowMessages - 1) break;
    const messageBytes = guideUtf8Bytes(message.content);
    if (bytes + messageBytes > GUIDE_LIMITS.modelWindowBytes) break;
    selected.push(message);
    bytes += messageBytes;
  }
  selected.reverse();
  while (selected[0]?.author === 'guide') selected.shift();
  return selected;
}
