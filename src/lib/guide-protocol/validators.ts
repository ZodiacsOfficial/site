import {
  GUIDE_CLOUD_PROCESSING_PURPOSE,
  GUIDE_INACTIVITY_RETENTION,
  GUIDE_LIMITS,
  GUIDE_SCHEMAS,
  type GuideAccountContextMutationDraftV1,
  type GuideAccountSourceReferenceDraftV1,
  type GuideAccountTurnRequestDraftV1,
  type GuideBaseContextDraftV1,
  type GuideBaseContextSlotDraftV1,
  type GuideContextMutationDraftV1,
  type GuideContextOperationReceiptDraftV1,
  type GuideContextSourceDraftV1,
  type GuideConversationDraftV1,
  type GuideConversationPageDraftV1,
  type GuideConversationSummaryDraftV1,
  type GuideDailyAnchorDraftV1,
  type GuideDraftHandoffDraftV1,
  type GuideExplicitAnonymousImportDraftV1,
  type GuideEphemeralContextDraftV1,
  type GuideEphemeralTurnRequestDraftV1,
  type GuideExportDraftV1,
  type GuideGenerationMetadataDraftV1,
  type GuideMessageDraftV1,
  type GuideMessagePageDraftV1,
  type GuideLocalDaySessionDraftV1,
  type GuideOwnerBoundaryDraftV1,
  type GuideSourceReferenceDraftV1,
  type GuideStreamEventDraftV1,
  type GuideSubjectDraftV1,
  type GuideTurnRequestDraftV1,
  type GuideTurnRejectionDraftV1,
  type GuideTurnOperationReceiptDraftV1,
} from './types.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SOURCE_ID = /^[a-z0-9][a-z0-9._:-]*$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const SEMANTIC_VERIFIER = /^(?:[1-9][0-9]{0,5}:|local:)[a-f0-9]{64}$/u;
const SERVER_SEMANTIC_VERIFIER = /^[1-9][0-9]{0,5}:[a-f0-9]{64}$/u;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._:+/-]*$/u;
const CURSOR = /^[A-Za-z0-9._~-]+$/u;
const LABEL_CONTROL = /[\p{Cc}\p{Cf}]/u;
const PROSE_CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/u;
const BIDI_CONTROL = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

const SOURCE_KINDS = new Set([
  'owner_chart',
  'today_sky',
  'today',
  'site_page',
  'chart',
  'saved_person',
  'historical_date',
  'reading',
  'learn_term',
  'calibration',
  'shared_check_in',
]);

const ACCOUNT_REFERENCE_SOURCE_KINDS = new Set([
  'today',
  'site_page',
  'historical_date',
  'learn_term',
]);

const PRIVATE_UUID_SOURCE_KINDS = new Set([
  'owner_chart',
  'chart',
  'saved_person',
  'historical_date',
  'reading',
  'calibration',
  'shared_check_in',
]);

const INVALIDATION_REASONS = new Set([
  'profile_changed',
  'profile_deleted',
  'source_changed',
  'source_deleted',
  'consent_revoked',
  'calibration_cleared',
  'shared_check_ins_disabled',
  'entitlement_lost',
  'owner_boundary_changed',
]);

const STREAM_ERRORS = new Set([
  'disabled',
  'unauthorized',
  'consent_required',
  'entitlement_required',
  'revision_conflict',
  'context_changed',
  'request_too_large',
  'rate_limited',
  'temporarily_unavailable',
  'invalid_response',
]);

export function guideUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

function isWellFormed(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function boundedText(
  value: unknown,
  maxCodePoints: number,
  maxBytes: number,
  mode: 'label' | 'prose',
  allowEmpty = false,
): value is string {
  if (typeof value !== 'string'
    || !isWellFormed(value)
    || value !== value.trim()
    || (!allowEmpty && value.length === 0)
    || [...value].length > maxCodePoints
    || guideUtf8Bytes(value) > maxBytes) return false;
  if (mode === 'label') return !LABEL_CONTROL.test(value);
  return !PROSE_CONTROL.test(value) && !BIDI_CONTROL.test(value);
}

function boundedDelta(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && isWellFormed(value)
    && [...value].length <= GUIDE_LIMITS.streamDeltaCodePoints
    && guideUtf8Bytes(value) <= GUIDE_LIMITS.streamDeltaBytes
    && !PROSE_CONTROL.test(value)
    && !BIDI_CONTROL.test(value);
}

function activeSourceIds(base: GuideBaseContextDraftV1): string[] {
  return [base.ownerChart.source?.sourceId, base.todaySky.source?.sourceId]
    .filter((sourceId): sourceId is string => Boolean(sourceId));
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function isRevision(value: unknown, minimum = 0): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= minimum
    && value < Number.MAX_SAFE_INTEGER;
}

function isSourceId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= GUIDE_LIMITS.sourceIdBytes
    && guideUtf8Bytes(value) <= GUIDE_LIMITS.sourceIdBytes
    && SOURCE_ID.test(value);
}

function sourceIdMatchesKind(kind: string, sourceId: string): boolean {
  if (PRIVATE_UUID_SOURCE_KINDS.has(kind)) return isUuid(sourceId);
  if (kind === 'today_sky' || kind === 'today') {
    const prefix = kind === 'today_sky' ? 'sky:' : 'today:';
    return sourceId.startsWith(prefix) && isLocalDate(sourceId.slice(prefix.length));
  }
  if (kind === 'learn_term') return /^learn:[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(sourceId);
  if (kind === 'site_page') return /^page:[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(sourceId);
  return false;
}

function isVersion(value: unknown): value is string {
  return typeof value === 'string'
    && guideUtf8Bytes(value) <= GUIDE_LIMITS.versionBytes
    && VERSION.test(value);
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2199 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isTimeZone(value: unknown): value is string {
  if (!boundedText(value, 128, 128, 'label')) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function parseDailyAnchor(value: unknown): GuideDailyAnchorDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, ['localDate', 'timeZone'])) return null;
  return isLocalDate(value.localDate) && isTimeZone(value.timeZone)
    ? value as unknown as GuideDailyAnchorDraftV1
    : null;
}

function parseLocalDaySession(value: unknown): GuideLocalDaySessionDraftV1 | null {
  if (!isRecord(value)
    || !hasExactKeys(value, ['calendar', 'localDate', 'sessionId', 'timeZone'])) return null;
  return isUuid(value.sessionId)
    && isLocalDate(value.localDate)
    && isTimeZone(value.timeZone)
    && value.calendar === 'gregorian'
    ? value as unknown as GuideLocalDaySessionDraftV1
    : null;
}

function parseOwnerBoundary(value: unknown): GuideOwnerBoundaryDraftV1 | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'anonymous') {
    return hasExactKeys(value, ['kind', 'localOwnerId']) && isUuid(value.localOwnerId)
      ? value as unknown as GuideOwnerBoundaryDraftV1
      : null;
  }
  if (value.kind === 'account') {
    return hasExactKeys(value, ['accountId', 'kind']) && isUuid(value.accountId)
      ? value as unknown as GuideOwnerBoundaryDraftV1
      : null;
  }
  return null;
}

export function parseGuideSubjectDraftV1(value: unknown): GuideSubjectDraftV1 | null {
  if (!isRecord(value)
    || !hasExactKeys(value, ['boundary', 'subjectId', 'subjectIsUser', 'subjectName'])) return null;
  if (value.boundary === 'root_user') {
    return value.subjectId === 'self'
      && value.subjectIsUser === true
      && boundedText(
        value.subjectName,
        GUIDE_LIMITS.subjectNameCodePoints,
        GUIDE_LIMITS.subjectNameBytes,
        'label',
      )
      ? value as unknown as GuideSubjectDraftV1
      : null;
  }
  if (value.boundary === 'saved_person') {
    return isUuid(value.subjectId)
      && value.subjectIsUser === false
      && boundedText(
        value.subjectName,
        GUIDE_LIMITS.subjectNameCodePoints,
        GUIDE_LIMITS.subjectNameBytes,
        'label',
      )
      ? value as unknown as GuideSubjectDraftV1
      : null;
  }
  if (value.boundary === 'public_reference') {
    const nameValid = value.subjectName === null || boundedText(
      value.subjectName,
      GUIDE_LIMITS.subjectNameCodePoints,
      GUIDE_LIMITS.subjectNameBytes,
      'label',
    );
    return isSourceId(value.subjectId) && value.subjectIsUser === false && nameValid
      ? value as unknown as GuideSubjectDraftV1
      : null;
  }
  return null;
}

export function parseGuideContextSourceDraftV1(value: unknown): GuideContextSourceDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'containsThirdPartyData', 'contentDigest', 'facts', 'kind', 'persistence', 'sourceId',
    'sourceRevision', 'subject', 'title',
  ])) return null;
  if (!isSourceId(value.sourceId)
    || typeof value.kind !== 'string'
    || !SOURCE_KINDS.has(value.kind)
    || !isRevision(value.sourceRevision, 1)
    || !boundedText(
      value.title,
      GUIDE_LIMITS.sourceTitleCodePoints,
      GUIDE_LIMITS.sourceTitleBytes,
      'label',
    )
    || typeof value.containsThirdPartyData !== 'boolean'
    || (value.persistence !== 'local_only' && value.persistence !== 'account_reference')
    || typeof value.contentDigest !== 'string'
    || !DIGEST.test(value.contentDigest)) return null;

  const subject = parseGuideSubjectDraftV1(value.subject);
  if (!subject) return null;
  if (value.persistence === 'local_only') {
    if (!boundedText(
      value.facts,
      GUIDE_LIMITS.sourceFactsCodePoints,
      GUIDE_LIMITS.sourceFactsBytes,
      'prose',
    )) return null;
  } else if (value.facts !== null) return null;
  if (!sourceIdMatchesKind(String(value.kind), value.sourceId as string)) return null;
  if (value.kind === 'owner_chart' && subject.boundary !== 'root_user') return null;
  if (value.kind === 'today_sky' && subject.boundary !== 'public_reference') return null;
  if (value.kind === 'site_page' && subject.boundary !== 'public_reference') return null;
  if (value.kind === 'learn_term' && subject.boundary !== 'public_reference') return null;
  if (value.kind === 'saved_person'
    && (subject.boundary !== 'saved_person' || value.persistence !== 'local_only')) return null;
  if (value.kind === 'chart'
    && value.persistence === 'account_reference'
    && subject.boundary !== 'root_user') return null;
  if (subject.boundary === 'saved_person' && value.persistence !== 'local_only') return null;
  if (subject.boundary === 'saved_person' && value.containsThirdPartyData !== true) return null;
  if (subject.boundary !== 'saved_person' && value.containsThirdPartyData !== false) return null;
  return value as unknown as GuideContextSourceDraftV1;
}

function parseBaseSlot(value: unknown, expectedSlot: 'owner_chart' | 'today_sky'):
GuideBaseContextSlotDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, ['slot', 'source', 'state'])) return null;
  if (value.slot !== expectedSlot
    || (value.state !== 'active' && value.state !== 'unavailable' && value.state !== 'revoked')) return null;
  if (value.state === 'active') {
    const source = parseGuideContextSourceDraftV1(value.source);
    return source?.kind === expectedSlot ? value as unknown as GuideBaseContextSlotDraftV1 : null;
  }
  return value.source === null ? value as unknown as GuideBaseContextSlotDraftV1 : null;
}

export function parseGuideBaseContextDraftV1(value: unknown): GuideBaseContextDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, ['ownerChart', 'todaySky'])) return null;
  return parseBaseSlot(value.ownerChart, 'owner_chart')
    && parseBaseSlot(value.todaySky, 'today_sky')
    ? value as unknown as GuideBaseContextDraftV1
    : null;
}

function parseGeneration(value: unknown): GuideGenerationMetadataDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'generatedAt', 'modelId', 'policyVersion', 'promptVersion', 'protocolSchema',
  ])) return null;
  return value.protocolSchema === GUIDE_SCHEMAS.conversation
    && isVersion(value.modelId)
    && isVersion(value.promptVersion)
    && isVersion(value.policyVersion)
    && isTimestamp(value.generatedAt)
    ? value as unknown as GuideGenerationMetadataDraftV1
    : null;
}

export function parseGuideMessageDraftV1(value: unknown): GuideMessageDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'author', 'content', 'contextRevision', 'createdAt', 'generation',
    'messageId', 'sequence', 'turnId',
  ])) return null;
  if (!isUuid(value.messageId)
    || !isUuid(value.turnId)
    || !isRevision(value.sequence, 1)
    || (value.author !== 'user' && value.author !== 'guide')
    || !boundedText(
      value.content,
      GUIDE_LIMITS.messageCodePoints,
      GUIDE_LIMITS.messageBytes,
      'prose',
    )
    || !isRevision(value.contextRevision)
    || !isTimestamp(value.createdAt)) return null;
  if (value.author === 'user' && value.generation !== null) return null;
  if (value.author === 'guide' && !parseGeneration(value.generation)) return null;
  return value as unknown as GuideMessageDraftV1;
}

function parseReceipt(value: unknown): GuideContextOperationReceiptDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'operationId', 'outcome', 'resultRevision', 'semanticVerifier',
  ])) return null;
  return isUuid(value.operationId)
    && typeof value.semanticVerifier === 'string'
    && SEMANTIC_VERIFIER.test(value.semanticVerifier)
    && isRevision(value.resultRevision)
    && (value.outcome === 'applied' || value.outcome === 'unchanged')
    ? value as unknown as GuideContextOperationReceiptDraftV1
    : null;
}

function unique<T>(values: T[]): boolean {
  return new Set(values).size === values.length;
}

function contextBytes(baseContext: GuideBaseContextDraftV1, attachments: GuideContextSourceDraftV1[]): number {
  return guideUtf8Bytes(JSON.stringify({ baseContext, attachments }));
}

export function parseGuideConversationDraftV1(value: unknown): GuideConversationDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'attachments', 'baseContext', 'contextEpoch', 'contextOperations',
    'contextRevision', 'conversationId', 'createdAt', 'dailyAnchor', 'kind',
    'lastActivityAt', 'messages', 'modelContextState', 'modelHistoryStartSequence', 'nextSequence',
    'ownerBoundary', 'persistence', 'revision', 'schema', 'session',
  ])) return null;
  if (value.schema !== GUIDE_SCHEMAS.conversation
    || !isUuid(value.conversationId)
    || (value.session !== null && !parseLocalDaySession(value.session))
    || (value.kind !== 'general' && value.kind !== 'daily')
    || (value.kind === 'general'
      ? value.dailyAnchor !== null || value.session !== null
      : !parseDailyAnchor(value.dailyAnchor) || !parseLocalDaySession(value.session))
    || !parseOwnerBoundary(value.ownerBoundary)
    || (value.persistence !== 'memory_only' && value.persistence !== 'account_synced')
    || !isRevision(value.revision)
    || !isRevision(value.nextSequence, 1)
    || !isRevision(value.modelHistoryStartSequence, 1)
    || value.modelHistoryStartSequence > value.nextSequence
    || !isRevision(value.contextRevision)
    || !isRevision(value.contextEpoch)
    || (value.modelContextState !== 'active' && value.modelContextState !== 'disabled')
    || value.contextRevision > value.revision
    || value.contextEpoch > value.contextRevision
    || !isTimestamp(value.createdAt)
    || !isTimestamp(value.lastActivityAt)
    || Date.parse(value.lastActivityAt) < Date.parse(value.createdAt)) return null;

  const session = value.session === null ? null : parseLocalDaySession(value.session);
  const dailyAnchor = value.dailyAnchor === null ? null : parseDailyAnchor(value.dailyAnchor);
  if (value.kind === 'daily' && (!session || !dailyAnchor
    || session.localDate !== dailyAnchor.localDate
    || session.timeZone !== dailyAnchor.timeZone)) return null;

  const owner = parseOwnerBoundary(value.ownerBoundary);
  if (!owner || (value.persistence === 'account_synced' && owner.kind !== 'account')) return null;
  if (owner.kind === 'anonymous' && value.persistence !== 'memory_only') return null;

  const base = parseGuideBaseContextDraftV1(value.baseContext);
  if (!base || !Array.isArray(value.attachments)
    || value.attachments.length > GUIDE_LIMITS.visibleSources) return null;
  const attachments = value.attachments.map(parseGuideContextSourceDraftV1);
  if (attachments.some((source) => source === null)) return null;
  const validAttachments = attachments as GuideContextSourceDraftV1[];
  const allSourceIds = [...activeSourceIds(base), ...validAttachments.map(({ sourceId }) => sourceId)];
  if (!unique(allSourceIds)
    || contextBytes(base, validAttachments) > GUIDE_LIMITS.modelWindowBytes) return null;
  if (value.persistence === 'account_synced'
    && validAttachments.some(({ persistence }) => persistence !== 'account_reference')) return null;
  if (value.persistence === 'account_synced'
    && [base.ownerChart.source, base.todaySky.source]
      .some((source) => source !== null && source.persistence !== 'account_reference')) return null;
  if (owner.kind === 'anonymous'
    && [...validAttachments, base.ownerChart.source, base.todaySky.source]
      .some((source) => source !== null && source.persistence !== 'local_only')) return null;

  if (!Array.isArray(value.messages)
    || value.messages.length > GUIDE_LIMITS.conversationMessages) return null;
  const messages = value.messages.map(parseGuideMessageDraftV1);
  if (messages.some((message) => message === null)) return null;
  const validMessages = messages as GuideMessageDraftV1[];
  if (!unique(validMessages.map(({ messageId }) => messageId))) return null;
  let priorSequence = 0;
  let priorContextRevision = 0;
  const turnState = new Map<string, { contextRevision: number; userSeen: boolean; guideSeen: boolean }>();
  for (const message of validMessages) {
    if (message.sequence <= priorSequence
      || message.sequence >= (value.nextSequence as number)
      || message.contextRevision > (value.contextRevision as number)
      || message.contextRevision < priorContextRevision
      || Date.parse(message.createdAt) < Date.parse(value.createdAt as string)
      || Date.parse(message.createdAt) > Date.parse(value.lastActivityAt as string)) return null;
    const priorTurn = turnState.get(message.turnId);
    if (message.author === 'user') {
      if (priorTurn) return null;
      turnState.set(message.turnId, {
        contextRevision: message.contextRevision, userSeen: true, guideSeen: false,
      });
    } else {
      if (!priorTurn || !priorTurn.userSeen || priorTurn.guideSeen
        || priorTurn.contextRevision !== message.contextRevision) return null;
      priorTurn.guideSeen = true;
    }
    priorSequence = message.sequence;
    priorContextRevision = message.contextRevision;
  }

  if (!Array.isArray(value.contextOperations)
    || value.contextOperations.length > GUIDE_LIMITS.contextOperationReceipts) return null;
  const receipts = value.contextOperations.map(parseReceipt);
  if (receipts.some((receipt) => receipt === null)) return null;
  const validReceipts = receipts as GuideContextOperationReceiptDraftV1[];
  if (!unique(validReceipts.map(({ operationId }) => operationId))
    || validReceipts.some(({ resultRevision }) => resultRevision > (value.revision as number))) return null;
  if (value.persistence === 'account_synced'
    && validReceipts.some(({ semanticVerifier }) => semanticVerifier.startsWith('local:'))) return null;
  if (value.persistence === 'memory_only'
    && validReceipts.some(({ semanticVerifier }) => !semanticVerifier.startsWith('local:'))) return null;
  return value as unknown as GuideConversationDraftV1;
}

function validMutationBase(value: Record<string, unknown>): boolean {
  return value.schema === GUIDE_SCHEMAS.contextMutation
    && isUuid(value.conversationId)
    && isUuid(value.operationId)
    && isRevision(value.baseRevision);
}

export function parseGuideContextMutationDraftV1(value: unknown): GuideContextMutationDraftV1 | null {
  if (!isRecord(value) || !validMutationBase(value) || typeof value.operation !== 'string') return null;
  let valid = false;
  if (value.operation === 'attach') {
    valid = hasExactKeys(value, [
      'baseRevision', 'conversationId', 'operation', 'operationId', 'schema', 'source',
    ]) && parseGuideContextSourceDraftV1(value.source) !== null;
  } else if (value.operation === 'replace') {
    valid = hasExactKeys(value, [
      'baseRevision', 'conversationId', 'operation', 'operationId', 'replacement',
      'schema', 'targetSourceId',
    ]) && isSourceId(value.targetSourceId) && parseGuideContextSourceDraftV1(value.replacement) !== null;
  } else if (value.operation === 'remove') {
    valid = hasExactKeys(value, [
      'baseRevision', 'conversationId', 'operation', 'operationId', 'schema', 'sourceId',
    ]) && isSourceId(value.sourceId);
  } else if (value.operation === 'clear') {
    valid = hasExactKeys(value, [
      'baseRevision', 'conversationId', 'operation', 'operationId', 'schema', 'scope',
    ]) && value.scope === 'visible_attachments';
  } else if (value.operation === 'set_base') {
    valid = hasExactKeys(value, [
      'baseRevision', 'conversationId', 'operation', 'operationId', 'schema', 'slot', 'source', 'state',
    ]) && (value.slot === 'owner_chart' || value.slot === 'today_sky')
      && (value.state === 'active' || value.state === 'unavailable')
      && (value.state === 'active'
        ? parseGuideContextSourceDraftV1(value.source)?.kind === value.slot
        : value.source === null);
  } else if (value.operation === 'restore_model_context') {
    valid = hasExactKeys(value, [
      'baseRevision', 'conversationId', 'operation', 'operationId', 'reason', 'schema',
    ]) && (value.reason === 'consent_granted' || value.reason === 'entitlement_restored');
  } else if (value.operation === 'invalidate') {
    valid = hasExactKeys(value, [
      'baseRevision', 'conversationId', 'operation', 'operationId', 'reason', 'schema', 'target',
    ]) && typeof value.reason === 'string' && INVALIDATION_REASONS.has(value.reason)
      && parseInvalidationTarget(value.target);
  }
  if (!valid) return null;
  try {
    return guideUtf8Bytes(JSON.stringify(value)) <= GUIDE_LIMITS.requestBytes
      ? value as unknown as GuideContextMutationDraftV1
      : null;
  } catch {
    return null;
  }
}

function parseGuideAccountSourceReferenceDraftV1(
  value: unknown,
): GuideAccountSourceReferenceDraftV1 | null {
  if (!isRecord(value)
    || !hasExactKeys(value, ['kind', 'sourceId', 'sourceRevision'])
    || typeof value.kind !== 'string'
    || !ACCOUNT_REFERENCE_SOURCE_KINDS.has(value.kind)
    || !isSourceId(value.sourceId)
    || !isRevision(value.sourceRevision, 1)) return null;
  if (!sourceIdMatchesKind(value.kind, value.sourceId as string)) return null;
  return value as unknown as GuideAccountSourceReferenceDraftV1;
}

export function parseGuideAccountContextMutationDraftV1(
  value: unknown,
): GuideAccountContextMutationDraftV1 | null {
  if (!isRecord(value)
    || value.schema !== GUIDE_SCHEMAS.accountContextMutation
    || !isUuid(value.conversationId)
    || !isUuid(value.operationId)
    || !isRevision(value.baseRevision)
    || !isRevision(value.clientAuthEpoch)
    || typeof value.operation !== 'string') return null;
  let valid = false;
  if (value.operation === 'attach') {
    valid = hasExactKeys(value, [
      'baseRevision', 'clientAuthEpoch', 'conversationId', 'operation', 'operationId',
      'schema', 'sourceRef',
    ]) && parseGuideAccountSourceReferenceDraftV1(value.sourceRef) !== null;
  } else if (value.operation === 'replace') {
    valid = hasExactKeys(value, [
      'baseRevision', 'clientAuthEpoch', 'conversationId', 'operation', 'operationId',
      'replacementRef', 'schema', 'targetSourceId',
    ]) && isSourceId(value.targetSourceId)
      && parseGuideAccountSourceReferenceDraftV1(value.replacementRef) !== null;
  } else if (value.operation === 'remove') {
    valid = hasExactKeys(value, [
      'baseRevision', 'clientAuthEpoch', 'conversationId', 'operation', 'operationId',
      'schema', 'sourceId',
    ]) && isSourceId(value.sourceId);
  } else if (value.operation === 'clear') {
    valid = hasExactKeys(value, [
      'baseRevision', 'clientAuthEpoch', 'conversationId', 'operation', 'operationId',
      'schema', 'scope',
    ]) && value.scope === 'visible_attachments';
  }
  if (!valid) return null;
  return guideUtf8Bytes(JSON.stringify(value)) <= GUIDE_LIMITS.requestBytes
    ? value as unknown as GuideAccountContextMutationDraftV1
    : null;
}

function parseInvalidationTarget(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'all_model_context') return hasExactKeys(value, ['kind']);
  if (value.kind === 'base') {
    return hasExactKeys(value, ['kind', 'slot'])
      && (value.slot === 'owner_chart' || value.slot === 'today_sky');
  }
  if (value.kind === 'attachment') {
    return hasExactKeys(value, ['kind', 'sourceId']) && isSourceId(value.sourceId);
  }
  return false;
}

function parseSourceReference(value: unknown): GuideSourceReferenceDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, ['sourceId', 'sourceRevision'])) return null;
  return isSourceId(value.sourceId) && isRevision(value.sourceRevision, 1)
    ? value as unknown as GuideSourceReferenceDraftV1
    : null;
}

export function parseGuideDraftHandoffDraftV1(value: unknown): GuideDraftHandoffDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'conversationId', 'createdAt', 'delivery', 'draftText', 'handoffId',
    'origin', 'schema', 'sourceRefs',
  ])) return null;
  if (value.schema !== GUIDE_SCHEMAS.handoff
    || !isUuid(value.handoffId)
    || !isUuid(value.conversationId)
    || !['today', 'chart', 'people', 'look_back', 'readings', 'learn'].includes(String(value.origin))
    || value.delivery !== 'requires_user_action'
    || !boundedText(
      value.draftText,
      GUIDE_LIMITS.draftCodePoints,
      GUIDE_LIMITS.draftBytes,
      'prose',
    )
    || !Array.isArray(value.sourceRefs)
    || value.sourceRefs.length > GUIDE_LIMITS.visibleSources
    || !isTimestamp(value.createdAt)) return null;
  const refs = value.sourceRefs.map(parseSourceReference);
  if (refs.some((ref) => ref === null)
    || !unique((refs as GuideSourceReferenceDraftV1[]).map(({ sourceId }) => sourceId))) return null;
  return guideUtf8Bytes(JSON.stringify(value)) <= GUIDE_LIMITS.requestBytes
    ? value as unknown as GuideDraftHandoffDraftV1
    : null;
}

function validTurnBase(value: Record<string, unknown>): boolean {
  if (!isUuid(value.conversationId)
    || !isUuid(value.turnId)
    || !isUuid(value.operationId)
    || !isUuid(value.attemptId)
    || (value.retryOfAttemptId !== null && !isUuid(value.retryOfAttemptId))
    || value.retryOfAttemptId === value.attemptId
    || !isRevision(value.baseRevision)
    || !isRevision(value.contextEpoch)
    || !isRevision(value.clientAuthEpoch)
    || !isRecord(value.userMessage)
    || !hasExactKeys(value.userMessage, ['content', 'messageId'])
    || !isUuid(value.userMessage.messageId)
    || !boundedText(
      value.userMessage.content,
      GUIDE_LIMITS.messageCodePoints,
      GUIDE_LIMITS.messageBytes,
      'prose',
    )
    || !isRecord(value.consent)
    || !hasExactKeys(value.consent, [
      'consentRevision', 'contextScopeDigest', 'disclosedContextEpoch',
      'disclosureId', 'policyVersion', 'purpose',
    ])
    || value.consent.purpose !== GUIDE_CLOUD_PROCESSING_PURPOSE
    || !isVersion(value.consent.policyVersion)
    || !isRevision(value.consent.consentRevision, 1)
    || !isUuid(value.consent.disclosureId)
    || !isRevision(value.consent.disclosedContextEpoch)
    || value.consent.disclosedContextEpoch !== value.contextEpoch
    || typeof value.consent.contextScopeDigest !== 'string'
    || !DIGEST.test(value.consent.contextScopeDigest)) return false;
  return true;
}

function parseEphemeralContext(value: unknown): GuideEphemeralContextDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'attachments', 'baseContext', 'history', 'modelHistoryStartSequence',
  ])) return null;
  const base = parseGuideBaseContextDraftV1(value.baseContext);
  if (!base
    || !isRevision(value.modelHistoryStartSequence, 1)
    || !Array.isArray(value.attachments)
    || value.attachments.length > GUIDE_LIMITS.visibleSources) return null;
  const attachments = value.attachments.map(parseGuideContextSourceDraftV1);
  if (attachments.some((source) => source === null)) return null;
  const validAttachments = attachments as GuideContextSourceDraftV1[];
  if (!unique([...activeSourceIds(base), ...validAttachments.map(({ sourceId }) => sourceId)])
    || contextBytes(base, validAttachments) > GUIDE_LIMITS.modelWindowBytes) return null;
  const allSources = [base.ownerChart.source, base.todaySky.source, ...validAttachments];
  if (allSources.some((source) => source !== null && source.persistence !== 'local_only')) return null;
  if (validAttachments.some(({ kind, subject }) => (
    kind === 'saved_person' || subject.boundary === 'saved_person'
  ))) return null;
  if (!Array.isArray(value.history)
    || value.history.length > GUIDE_LIMITS.modelWindowMessages - 1) return null;
  const history = value.history.map(parseGuideMessageDraftV1);
  if (history.some((message) => message === null)) return null;
  let prior = 0;
  for (const message of history as GuideMessageDraftV1[]) {
    if (message.sequence <= prior || message.sequence < value.modelHistoryStartSequence) return null;
    prior = message.sequence;
  }
  return value as unknown as GuideEphemeralContextDraftV1;
}

export function parseGuideTurnRequestDraftV1(value: unknown): GuideTurnRequestDraftV1 | null {
  if (!isRecord(value) || !validTurnBase(value)) return null;
  let parsed: GuideTurnRequestDraftV1 | null = null;
  if (value.mode === 'account'
    && value.schema === GUIDE_SCHEMAS.accountTurn
    && hasExactKeys(value, [
      'attemptId', 'baseRevision', 'clientAuthEpoch', 'consent', 'contextEpoch', 'conversationId',
      'mode', 'operationId', 'retryOfAttemptId', 'schema', 'turnId', 'userMessage',
    ])) {
    parsed = value as unknown as GuideAccountTurnRequestDraftV1;
  } else if (value.mode === 'ephemeral'
    && value.schema === GUIDE_SCHEMAS.ephemeralTurn
    && hasExactKeys(value, [
      'attemptId', 'baseRevision', 'clientAuthEpoch', 'consent', 'contextEpoch', 'conversationId',
      'ephemeralContext', 'mode', 'operationId', 'retryOfAttemptId', 'schema',
      'turnId', 'userMessage',
    ])
    && parseEphemeralContext(value.ephemeralContext)) {
    parsed = value as unknown as GuideEphemeralTurnRequestDraftV1;
  }
  if (!parsed) return null;
  if (parsed.mode === 'ephemeral') {
    const modelBytes = contextBytes(
      parsed.ephemeralContext.baseContext,
      parsed.ephemeralContext.attachments,
    ) + parsed.ephemeralContext.history.reduce(
      (total, message) => total + guideUtf8Bytes(message.content),
      guideUtf8Bytes(parsed.userMessage.content),
    );
    if (modelBytes > GUIDE_LIMITS.modelWindowBytes) return null;
  }
  try {
    return guideUtf8Bytes(JSON.stringify(value)) <= GUIDE_LIMITS.requestBytes ? parsed : null;
  } catch {
    return null;
  }
}

function validStreamBase(value: Record<string, unknown>): boolean {
  return value.schema === GUIDE_SCHEMAS.streamEvent
    && isUuid(value.conversationId)
    && isUuid(value.turnId)
    && isUuid(value.attemptId)
    && isRevision(value.eventSequence)
    && isRevision(value.clientAuthEpoch);
}

export function parseGuideStreamEventDraftV1(value: unknown): GuideStreamEventDraftV1 | null {
  if (!isRecord(value) || !validStreamBase(value) || typeof value.type !== 'string') return null;
  let valid = false;
  if (value.type === 'accepted') {
    valid = hasExactKeys(value, [
      'attemptId', 'clientAuthEpoch', 'conversationId', 'conversationRevision', 'eventSequence',
      'schema', 'turnId', 'type',
    ]) && isRevision(value.conversationRevision);
  } else if (value.type === 'delta') {
    valid = hasExactKeys(value, [
      'attemptId', 'clientAuthEpoch', 'conversationId', 'delta', 'eventSequence', 'schema', 'turnId', 'type',
    ]) && boundedDelta(value.delta);
  } else if (value.type === 'completed') {
    const message = parseGuideMessageDraftV1(value.message);
    valid = hasExactKeys(value, [
      'attemptId', 'clientAuthEpoch', 'conversationId', 'conversationRevision', 'eventSequence',
      'message', 'schema', 'turnId', 'type',
    ]) && isRevision(value.conversationRevision)
      && message?.author === 'guide'
      && message.turnId === value.turnId;
  } else if (value.type === 'cancelled') {
    valid = hasExactKeys(value, [
      'attemptId', 'clientAuthEpoch', 'conversationId', 'eventSequence', 'reason', 'schema', 'turnId', 'type',
    ]) && [
      'client_cancelled', 'context_invalidated', 'consent_revoked', 'entitlement_lost',
    ].includes(String(value.reason));
  } else if (value.type === 'error') {
    valid = hasExactKeys(value, [
      'attemptId', 'clientAuthEpoch', 'code', 'conversationId', 'eventSequence', 'retryable',
      'schema', 'turnId', 'type',
    ]) && typeof value.code === 'string'
      && STREAM_ERRORS.has(value.code)
      && value.retryable === false;
  }
  return valid ? value as unknown as GuideStreamEventDraftV1 : null;
}

export function parseGuideTurnRejectionDraftV1(value: unknown): GuideTurnRejectionDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'attemptId', 'clientAuthEpoch', 'code', 'conversationId', 'retryable', 'schema', 'turnId',
  ]) || value.schema !== GUIDE_SCHEMAS.turnRejection
    || !isUuid(value.conversationId)
    || !isUuid(value.turnId)
    || !isUuid(value.attemptId)
    || !isRevision(value.clientAuthEpoch)
    || typeof value.code !== 'string'
    || !STREAM_ERRORS.has(value.code)
    || typeof value.retryable !== 'boolean') return null;
  return value as unknown as GuideTurnRejectionDraftV1;
}

function parseSummary(value: unknown): GuideConversationSummaryDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'conversationId', 'createdAt', 'dailyAnchor', 'kind', 'lastActivityAt', 'revision', 'session',
  ])) return null;
  return isUuid(value.conversationId)
    && (value.session === null || Boolean(parseLocalDaySession(value.session)))
    && (value.kind === 'general' || value.kind === 'daily')
    && (value.kind === 'general'
      ? value.dailyAnchor === null && value.session === null
      : Boolean(parseDailyAnchor(value.dailyAnchor)) && Boolean(parseLocalDaySession(value.session)))
    && isRevision(value.revision)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.lastActivityAt)
    && Date.parse(value.lastActivityAt as string) >= Date.parse(value.createdAt as string)
    && (value.kind !== 'daily'
      || (value.dailyAnchor as GuideDailyAnchorDraftV1).localDate
        === (value.session as GuideLocalDaySessionDraftV1).localDate)
    && (value.kind !== 'daily'
      || (value.dailyAnchor as GuideDailyAnchorDraftV1).timeZone
        === (value.session as GuideLocalDaySessionDraftV1).timeZone)
    ? value as unknown as GuideConversationSummaryDraftV1
    : null;
}

function validCursor(value: unknown): value is string | null {
  return value === null || (typeof value === 'string'
    && value.length > 0
    && guideUtf8Bytes(value) <= GUIDE_LIMITS.cursorBytes
    && CURSOR.test(value));
}

export function parseGuideConversationPageDraftV1(value: unknown): GuideConversationPageDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'conversations', 'nextCursor', 'order', 'schema', 'snapshotAt',
  ])
    || value.schema !== GUIDE_SCHEMAS.conversationPage
    || value.order !== 'last_activity_desc_conversation_id_desc'
    || !isTimestamp(value.snapshotAt)
    || !Array.isArray(value.conversations)
    || value.conversations.length > GUIDE_LIMITS.pageSize
    || !validCursor(value.nextCursor)) return null;
  const conversations = value.conversations.map(parseSummary);
  const validConversations = conversations as GuideConversationSummaryDraftV1[];
  const correctlyOrdered = validConversations.every((conversation, index) => {
    const prior = validConversations[index - 1];
    if (!prior) return true;
    const priorTime = Date.parse(prior.lastActivityAt);
    const currentTime = Date.parse(conversation.lastActivityAt);
    return priorTime > currentTime
      || (priorTime === currentTime && prior.conversationId > conversation.conversationId);
  });
  return conversations.some((conversation) => conversation === null)
    || !unique(validConversations.map(({ conversationId }) => conversationId))
    || validConversations.some(({ lastActivityAt }) => (
      Date.parse(lastActivityAt) > Date.parse(value.snapshotAt as string)
    ))
    || !correctlyOrdered
    ? null
    : value as unknown as GuideConversationPageDraftV1;
}

export function parseGuideMessagePageDraftV1(value: unknown): GuideMessagePageDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'conversationId', 'messages', 'nextCursor', 'order', 'schema', 'snapshotRevision',
  ]) || value.schema !== GUIDE_SCHEMAS.messagePage
    || !isUuid(value.conversationId)
    || value.order !== 'sequence_asc'
    || !isRevision(value.snapshotRevision)
    || !Array.isArray(value.messages)
    || value.messages.length > GUIDE_LIMITS.pageSize
    || !validCursor(value.nextCursor)) return null;
  const messages = value.messages.map(parseGuideMessageDraftV1);
  if (messages.some((message) => message === null)) return null;
  const validMessages = messages as GuideMessageDraftV1[];
  if (!unique(validMessages.map(({ messageId }) => messageId))) return null;
  let prior = 0;
  for (const message of validMessages) {
    if (message.sequence <= prior) return null;
    prior = message.sequence;
  }
  return value as unknown as GuideMessagePageDraftV1;
}

export function parseGuideExportDraftV1(
  value: unknown,
  expectedAccountId: unknown,
): GuideExportDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'accountId', 'conversations', 'exportedAt', 'retention', 'schema',
  ]) || value.schema !== GUIDE_SCHEMAS.export
    || !isUuid(value.accountId)
    || !isUuid(expectedAccountId)
    || value.accountId !== expectedAccountId
    || value.retention !== GUIDE_INACTIVITY_RETENTION
    || !isTimestamp(value.exportedAt)
    || !Array.isArray(value.conversations)
    || value.conversations.length > GUIDE_LIMITS.exportConversations) return null;
  const conversationIds: string[] = [];
  for (const item of value.conversations) {
    if (!isRecord(item) || typeof item.state !== 'string') return null;
    if (item.state === 'active') {
      if (!hasExactKeys(item, ['conversation', 'deletedAt', 'state']) || item.deletedAt !== null) return null;
      const conversation = parseGuideConversationDraftV1(item.conversation);
      if (!conversation
        || conversation.persistence !== 'account_synced'
        || conversation.ownerBoundary.kind !== 'account'
        || conversation.ownerBoundary.accountId !== value.accountId) return null;
      conversationIds.push(conversation.conversationId);
    } else if (item.state === 'deleted') {
      if (!hasExactKeys(item, [
        'conversationId', 'deletedAt', 'state', 'terminalRevision',
      ]) || !isUuid(item.conversationId)
        || !isRevision(item.terminalRevision, 1)
        || !isTimestamp(item.deletedAt)) return null;
      conversationIds.push(item.conversationId);
    } else {
      return null;
    }
  }
  return unique(conversationIds) ? value as unknown as GuideExportDraftV1 : null;
}

export function parseGuideTurnOperationReceiptDraftV1(
  value: unknown,
): GuideTurnOperationReceiptDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'activeAttemptId', 'conversationId', 'operationId', 'responseMessageId',
    'resultRevision', 'schema', 'semanticVerifier', 'status', 'turnId', 'userMessageId',
  ]) || value.schema !== GUIDE_SCHEMAS.turnReceipt
    || !isUuid(value.conversationId)
    || !isUuid(value.operationId)
    || !isUuid(value.turnId)
    || !isUuid(value.userMessageId)
    || !isUuid(value.activeAttemptId)
    || typeof value.semanticVerifier !== 'string'
    || !SERVER_SEMANTIC_VERIFIER.test(value.semanticVerifier)
    || !['reserved', 'completed', 'cancelled', 'failed_before_provider'].includes(String(value.status))) {
    return null;
  }
  if (value.status === 'completed') {
    if (!isRevision(value.resultRevision, 1) || !isUuid(value.responseMessageId)) return null;
  } else if (value.resultRevision !== null || value.responseMessageId !== null) return null;
  return value as unknown as GuideTurnOperationReceiptDraftV1;
}

export function parseGuideExplicitAnonymousImportDraftV1(
  value: unknown,
): GuideExplicitAnonymousImportDraftV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    'clientAuthEpoch', 'confirmation', 'conversationId', 'lineageId', 'localOwnerId', 'operationId',
    'previewContextEpoch', 'previewId', 'previewRevision', 'schema', 'snapshotDigest',
  ]) || value.schema !== GUIDE_SCHEMAS.anonymousImport
    || !isUuid(value.operationId)
    || !isUuid(value.previewId)
    || !isUuid(value.conversationId)
    || !isUuid(value.localOwnerId)
    || !isUuid(value.lineageId)
    || !isRevision(value.previewRevision)
    || !isRevision(value.previewContextEpoch)
    || typeof value.snapshotDigest !== 'string'
    || !DIGEST.test(value.snapshotDigest)
    || !isRevision(value.clientAuthEpoch)
    || value.confirmation !== 'IMPORT') return null;
  return value as unknown as GuideExplicitAnonymousImportDraftV1;
}

function parseRawGuideJson<T>(
  raw: unknown,
  parser: (value: unknown) => T | null,
): T | null {
  if (typeof raw !== 'string' || guideUtf8Bytes(raw) > GUIDE_LIMITS.requestBytes) return null;
  try {
    return parser(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Raw HTTP boundaries MUST cap the exact body before decoded validation. */
export function parseGuideTurnRequestJsonDraftV1(raw: unknown): GuideTurnRequestDraftV1 | null {
  return parseRawGuideJson(raw, parseGuideTurnRequestDraftV1);
}

export function parseGuideContextMutationJsonDraftV1(raw: unknown): GuideContextMutationDraftV1 | null {
  return parseRawGuideJson(raw, parseGuideContextMutationDraftV1);
}

export function parseGuideAccountContextMutationJsonDraftV1(
  raw: unknown,
): GuideAccountContextMutationDraftV1 | null {
  return parseRawGuideJson(raw, parseGuideAccountContextMutationDraftV1);
}

export function parseGuideDraftHandoffJsonDraftV1(raw: unknown): GuideDraftHandoffDraftV1 | null {
  return parseRawGuideJson(raw, parseGuideDraftHandoffDraftV1);
}

export function parseGuideExplicitAnonymousImportJsonDraftV1(
  raw: unknown,
): GuideExplicitAnonymousImportDraftV1 | null {
  return parseRawGuideJson(raw, parseGuideExplicitAnonymousImportDraftV1);
}
