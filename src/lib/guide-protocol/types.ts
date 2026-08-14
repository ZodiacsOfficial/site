/**
 * Shared Guide protocol draft.
 *
 * This is deliberately a dormant contract module. Only the hard-disabled
 * server foundation imports it; no website client does, and the draft is not
 * a published iOS wire format.
 */
export const GUIDE_PROTOCOL_DRAFT_VERSION = 1 as const;
export const GUIDE_PROTOCOL_DRAFT_STATUS = 'ios_reconciliation_required' as const;

export const GUIDE_SCHEMAS = {
  conversation: 'zodiacs.guide.conversation.draft.v1',
  contextMutation: 'zodiacs.guide.context-mutation.draft.v1',
  accountContextMutation: 'zodiacs.guide.account-context-mutation.draft.v1',
  handoff: 'zodiacs.guide.handoff.draft.v1',
  accountTurn: 'zodiacs.guide.account-turn.draft.v1',
  ephemeralTurn: 'zodiacs.guide.ephemeral-turn.draft.v1',
  turnReceipt: 'zodiacs.guide.turn-receipt.draft.v1',
  anonymousImport: 'zodiacs.guide.anonymous-import.draft.v1',
  streamEvent: 'zodiacs.guide.stream-event.draft.v1',
  turnRejection: 'zodiacs.guide.turn-rejection.draft.v1',
  conversationPage: 'zodiacs.guide.conversation-page.draft.v1',
  messagePage: 'zodiacs.guide.message-page.draft.v1',
  export: 'zodiacs.guide.export.draft.v1',
} as const;

export const GUIDE_LIMITS = {
  requestBytes: 64 * 1024,
  modelWindowBytes: 48 * 1024,
  modelWindowMessages: 12,
  visibleSources: 5,
  sourceIdBytes: 120,
  sourceTitleCodePoints: 80,
  sourceTitleBytes: 320,
  sourceFactsCodePoints: 3_500,
  sourceFactsBytes: 14_000,
  subjectNameCodePoints: 80,
  subjectNameBytes: 320,
  messageCodePoints: 2_400,
  messageBytes: 9_600,
  draftCodePoints: 2_000,
  draftBytes: 8_000,
  streamDeltaCodePoints: 2_400,
  streamDeltaBytes: 9_600,
  versionBytes: 128,
  pageSize: 100,
  cursorBytes: 1_024,
  conversationMessages: 1_000,
  contextOperationReceipts: 1_000,
  exportConversations: 1_000,
} as const;

/** A calendar duration, not a fixed 365-day duration. */
export const GUIDE_INACTIVITY_RETENTION = 'P12M' as const;
export const GUIDE_CLOUD_PROCESSING_PURPOSE = 'guide_cloud_processing' as const;
export const GUIDE_CONVERSATION_SYNC_PURPOSE = 'guide_conversation_sync' as const;

export type GuideConversationKind = 'general' | 'daily';
export type GuidePersistenceMode = 'memory_only' | 'account_synced';

export interface GuideDailyAnchorDraftV1 {
  localDate: string;
  timeZone: string;
}

/** Local-day continuity metadata; `sessionId` is opaque, never date-derived. */
export interface GuideLocalDaySessionDraftV1 {
  sessionId: string;
  localDate: string;
  timeZone: string;
  calendar: 'gregorian';
}

/**
 * `accountId` is server-derived/read-only in authenticated records. It is
 * intentionally absent from every client mutation and turn request.
 */
export type GuideOwnerBoundaryDraftV1 =
  | { kind: 'anonymous'; localOwnerId: string }
  | { kind: 'account'; accountId: string };

export type GuideSubjectDraftV1 =
  | {
    boundary: 'root_user';
    subjectId: 'self';
    subjectName: string;
    subjectIsUser: true;
  }
  | {
    boundary: 'saved_person';
    subjectId: string;
    subjectName: string;
    subjectIsUser: false;
  }
  | {
    boundary: 'public_reference';
    subjectId: string;
    subjectName: string | null;
    subjectIsUser: false;
  };

export type GuideSourceKind =
  | 'owner_chart'
  | 'today_sky'
  | 'today'
  | 'site_page'
  | 'chart'
  | 'saved_person'
  | 'historical_date'
  | 'reading'
  | 'learn_term'
  | 'calibration'
  | 'shared_check_in';

export interface GuideContextSourceDraftV1 {
  sourceId: string;
  kind: GuideSourceKind;
  sourceRevision: number;
  title: string;
  /** Full model-visible facts exist only in device-local state. */
  facts: string | null;
  subject: GuideSubjectDraftV1;
  /** Mixed-subject sources are rejected in Draft V1. */
  containsThirdPartyData: boolean;
  persistence: 'local_only' | 'account_reference';
  /** Digest of the complete model-visible source projection. */
  contentDigest: string;
}

export type GuideBaseSlotKind = 'owner_chart' | 'today_sky';

export interface GuideBaseContextSlotDraftV1 {
  slot: GuideBaseSlotKind;
  state: 'active' | 'unavailable' | 'revoked';
  source: GuideContextSourceDraftV1 | null;
}

export interface GuideBaseContextDraftV1 {
  ownerChart: GuideBaseContextSlotDraftV1;
  todaySky: GuideBaseContextSlotDraftV1;
}

export interface GuideGenerationMetadataDraftV1 {
  modelId: string;
  promptVersion: string;
  policyVersion: string;
  protocolSchema: typeof GUIDE_SCHEMAS.conversation;
  generatedAt: string;
}

export interface GuideMessageDraftV1 {
  messageId: string;
  turnId: string;
  sequence: number;
  author: 'user' | 'guide';
  content: string;
  contextRevision: number;
  createdAt: string;
  generation: GuideGenerationMetadataDraftV1 | null;
}

export interface GuideContextOperationReceiptDraftV1 {
  operationId: string;
  semanticVerifier: string;
  resultRevision: number;
  outcome: 'applied' | 'unchanged';
}

export interface GuideConversationDraftV1 {
  schema: typeof GUIDE_SCHEMAS.conversation;
  conversationId: string;
  /** Daily-only continuity metadata; general conversations are not day-bound. */
  session: GuideLocalDaySessionDraftV1 | null;
  kind: GuideConversationKind;
  dailyAnchor: GuideDailyAnchorDraftV1 | null;
  ownerBoundary: GuideOwnerBoundaryDraftV1;
  persistence: GuidePersistenceMode;
  revision: number;
  nextSequence: number;
  modelHistoryStartSequence: number;
  contextRevision: number;
  contextEpoch: number;
  modelContextState: 'active' | 'disabled';
  baseContext: GuideBaseContextDraftV1;
  attachments: GuideContextSourceDraftV1[];
  messages: GuideMessageDraftV1[];
  contextOperations: GuideContextOperationReceiptDraftV1[];
  createdAt: string;
  lastActivityAt: string;
}

interface GuideContextMutationBaseDraftV1 {
  schema: typeof GUIDE_SCHEMAS.contextMutation;
  conversationId: string;
  operationId: string;
  baseRevision: number;
}

export type GuideContextInvalidationReason =
  | 'profile_changed'
  | 'profile_deleted'
  | 'source_changed'
  | 'source_deleted'
  | 'consent_revoked'
  | 'calibration_cleared'
  | 'shared_check_ins_disabled'
  | 'entitlement_lost'
  | 'owner_boundary_changed';

export type GuideContextMutationDraftV1 =
  | (GuideContextMutationBaseDraftV1 & {
    operation: 'attach';
    source: GuideContextSourceDraftV1;
  })
  | (GuideContextMutationBaseDraftV1 & {
    operation: 'replace';
    targetSourceId: string;
    replacement: GuideContextSourceDraftV1;
  })
  | (GuideContextMutationBaseDraftV1 & {
    operation: 'remove';
    sourceId: string;
  })
  | (GuideContextMutationBaseDraftV1 & {
    operation: 'clear';
    scope: 'visible_attachments';
  })
  | (GuideContextMutationBaseDraftV1 & {
    operation: 'set_base';
    slot: GuideBaseSlotKind;
    state: 'active' | 'unavailable';
    source: GuideContextSourceDraftV1 | null;
  })
  | (GuideContextMutationBaseDraftV1 & {
    operation: 'restore_model_context';
    reason: 'consent_granted' | 'entitlement_restored';
  })
  | (GuideContextMutationBaseDraftV1 & {
    operation: 'invalidate';
    target:
      | { kind: 'base'; slot: GuideBaseSlotKind }
      | { kind: 'attachment'; sourceId: string }
      | { kind: 'all_model_context' };
    reason: GuideContextInvalidationReason;
  });

export interface GuideAccountSourceReferenceDraftV1 {
  kind: GuideSourceKind;
  sourceId: string;
  sourceRevision: number;
}

interface GuideAccountContextMutationBaseDraftV1 {
  schema: typeof GUIDE_SCHEMAS.accountContextMutation;
  conversationId: string;
  operationId: string;
  baseRevision: number;
  clientAuthEpoch: number;
}

/**
 * Untrusted authenticated-client wire. The server derives the account and
 * hydrates every reference from account-v2 or a public source catalog.
 */
export type GuideAccountContextMutationDraftV1 =
  | (GuideAccountContextMutationBaseDraftV1 & {
    operation: 'attach';
    sourceRef: GuideAccountSourceReferenceDraftV1;
  })
  | (GuideAccountContextMutationBaseDraftV1 & {
    operation: 'replace';
    targetSourceId: string;
    replacementRef: GuideAccountSourceReferenceDraftV1;
  })
  | (GuideAccountContextMutationBaseDraftV1 & {
    operation: 'remove';
    sourceId: string;
  })
  | (GuideAccountContextMutationBaseDraftV1 & {
    operation: 'clear';
    scope: 'visible_attachments';
  });

export interface GuideSourceReferenceDraftV1 {
  sourceId: string;
  sourceRevision: number;
}

export type GuideHandoffOrigin =
  | 'today'
  | 'chart'
  | 'people'
  | 'look_back'
  | 'readings'
  | 'learn';

export interface GuideDraftHandoffDraftV1 {
  schema: typeof GUIDE_SCHEMAS.handoff;
  handoffId: string;
  conversationId: string;
  origin: GuideHandoffOrigin;
  delivery: 'requires_user_action';
  draftText: string;
  sourceRefs: GuideSourceReferenceDraftV1[];
  createdAt: string;
}

export interface GuideCloudConsentEvidenceDraftV1 {
  purpose: typeof GUIDE_CLOUD_PROCESSING_PURPOSE;
  policyVersion: string;
  consentRevision: number;
  disclosureId: string;
  disclosedContextEpoch: number;
  contextScopeDigest: string;
}

interface GuideTurnBaseDraftV1 {
  conversationId: string;
  turnId: string;
  operationId: string;
  attemptId: string;
  retryOfAttemptId: string | null;
  baseRevision: number;
  contextEpoch: number;
  clientAuthEpoch: number;
  userMessage: {
    messageId: string;
    content: string;
  };
  consent: GuideCloudConsentEvidenceDraftV1;
}

/** Authenticated request. The server hydrates owner/context/history by ID. */
export interface GuideAccountTurnRequestDraftV1 extends GuideTurnBaseDraftV1 {
  schema: typeof GUIDE_SCHEMAS.accountTurn;
  mode: 'account';
}

export interface GuideEphemeralContextDraftV1 {
  baseContext: GuideBaseContextDraftV1;
  attachments: GuideContextSourceDraftV1[];
  history: GuideMessageDraftV1[];
  modelHistoryStartSequence: number;
}

/** Signed-out/non-synced request. The protected server must never persist it. */
export interface GuideEphemeralTurnRequestDraftV1 extends GuideTurnBaseDraftV1 {
  schema: typeof GUIDE_SCHEMAS.ephemeralTurn;
  mode: 'ephemeral';
  ephemeralContext: GuideEphemeralContextDraftV1;
}

export type GuideTurnRequestDraftV1 =
  | GuideAccountTurnRequestDraftV1
  | GuideEphemeralTurnRequestDraftV1;

interface GuideStreamEventBaseDraftV1 {
  schema: typeof GUIDE_SCHEMAS.streamEvent;
  conversationId: string;
  turnId: string;
  attemptId: string;
  eventSequence: number;
  clientAuthEpoch: number;
}

export type GuideStreamErrorCode =
  | 'disabled'
  | 'unauthorized'
  | 'consent_required'
  | 'entitlement_required'
  | 'revision_conflict'
  | 'context_changed'
  | 'request_too_large'
  | 'rate_limited'
  | 'temporarily_unavailable'
  | 'invalid_response';

export type GuideStreamEventDraftV1 =
  | (GuideStreamEventBaseDraftV1 & {
    type: 'accepted';
    conversationRevision: number;
  })
  | (GuideStreamEventBaseDraftV1 & {
    type: 'delta';
    delta: string;
  })
  | (GuideStreamEventBaseDraftV1 & {
    type: 'completed';
    message: GuideMessageDraftV1;
    conversationRevision: number;
  })
  | (GuideStreamEventBaseDraftV1 & {
    type: 'cancelled';
    reason: 'client_cancelled' | 'context_invalidated' | 'consent_revoked' | 'entitlement_lost';
  })
  | (GuideStreamEventBaseDraftV1 & {
    type: 'error';
    code: GuideStreamErrorCode;
    /** Post-accept failures cannot safely reuse the already-advanced turn. */
    retryable: false;
  });

/** Strict non-stream response when a turn is rejected before `accepted`. */
export interface GuideTurnRejectionDraftV1 {
  schema: typeof GUIDE_SCHEMAS.turnRejection;
  conversationId: string;
  turnId: string;
  attemptId: string;
  clientAuthEpoch: number;
  code: GuideStreamErrorCode;
  retryable: boolean;
}

export interface GuideConversationSummaryDraftV1 {
  conversationId: string;
  session: GuideLocalDaySessionDraftV1 | null;
  kind: GuideConversationKind;
  dailyAnchor: GuideDailyAnchorDraftV1 | null;
  revision: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface GuideConversationPageDraftV1 {
  schema: typeof GUIDE_SCHEMAS.conversationPage;
  snapshotAt: string;
  order: 'last_activity_desc_conversation_id_desc';
  conversations: GuideConversationSummaryDraftV1[];
  nextCursor: string | null;
}

export interface GuideMessagePageDraftV1 {
  schema: typeof GUIDE_SCHEMAS.messagePage;
  conversationId: string;
  snapshotRevision: number;
  order: 'sequence_asc';
  messages: GuideMessageDraftV1[];
  nextCursor: string | null;
}

export interface GuideExportActiveConversationDraftV1 {
  state: 'active';
  conversation: GuideConversationDraftV1;
  deletedAt: null;
}

export interface GuideExportDeletedConversationDraftV1 {
  state: 'deleted';
  conversationId: string;
  terminalRevision: number;
  deletedAt: string;
}

export type GuideExportConversationDraftV1 =
  | GuideExportActiveConversationDraftV1
  | GuideExportDeletedConversationDraftV1;

/** Separate draft export; it does not widen `zodiacs.account.export.v1`. */
export interface GuideExportDraftV1 {
  schema: typeof GUIDE_SCHEMAS.export;
  accountId: string;
  exportedAt: string;
  retention: typeof GUIDE_INACTIVITY_RETENTION;
  conversations: GuideExportConversationDraftV1[];
}

export type GuideProcessingConsentState = 'pending' | 'granted' | 'withdrawn';
export type GuideSyncConsentState = 'pending' | 'granted' | 'withdrawn';
export type GuideEntitlementState = 'unknown' | 'allowed' | 'denied' | 'expired';

export interface GuideAuthorizationStateDraftV1 {
  cloudProcessingConsent: GuideProcessingConsentState;
  conversationSyncConsent: GuideSyncConsentState;
  generationEntitlement: GuideEntitlementState;
}

export interface GuideExplicitAnonymousImportDraftV1 {
  schema: typeof GUIDE_SCHEMAS.anonymousImport;
  operationId: string;
  previewId: string;
  conversationId: string;
  localOwnerId: string;
  lineageId: string;
  previewRevision: number;
  previewContextEpoch: number;
  snapshotDigest: string;
  clientAuthEpoch: number;
  confirmation: 'IMPORT';
}

export interface GuideAnonymousImportPreviewAuthorityDraftV1 {
  authenticatedAccountId: string;
  clientAuthEpoch: number;
  provenance: 'anonymous_never_bound';
  provenanceSource: 'account_v2_boundary';
  lineageId: string;
  lineageState: 'unclaimed';
  lineageVerifier: string;
  previewId: string;
  conversationId: string;
  localOwnerId: string;
  previewRevision: number;
  previewContextEpoch: number;
  snapshotDigest: string;
  semanticVerifier: string;
}

export interface GuideTurnOperationReceiptDraftV1 {
  schema: typeof GUIDE_SCHEMAS.turnReceipt;
  conversationId: string;
  operationId: string;
  turnId: string;
  userMessageId: string;
  semanticVerifier: string;
  status: 'reserved' | 'completed' | 'cancelled' | 'failed_before_provider';
  activeAttemptId: string;
  resultRevision: number | null;
  responseMessageId: string | null;
}

export type GuideLiveOwnerFenceDraftV1 =
  | {
    kind: 'account';
    accountId: string;
    sessionId: string;
    clientAuthEpoch: number;
  }
  | {
    kind: 'anonymous';
    localOwnerId: string;
    clientAuthEpoch: number;
  };

export interface GuideStreamLiveAuthorityDraftV1 {
  owner: GuideLiveOwnerFenceDraftV1;
  contextEpoch: number;
}

export interface GuideStreamAccumulatorDraftV1 {
  conversationId: string;
  turnId: string;
  attemptId: string;
  userMessageId: string;
  requestBaseRevision: number;
  acceptedRevision: number | null;
  contextEpoch: number;
  contextRevision: number;
  ownerFence: GuideLiveOwnerFenceDraftV1;
  clientAuthEpoch: number;
  expectedAssistantSequence: number;
  nextEventSequence: number;
  status: 'waiting' | 'streaming' | 'completed' | 'cancelled' | 'failed';
  partialText: string;
  completedMessage: GuideMessageDraftV1 | null;
  errorCode: GuideStreamErrorCode | null;
  lastEvent: GuideStreamEventDraftV1 | null;
}
