import { describe, expect, it } from 'vitest';
import { GUIDE_LIMITS, GUIDE_SCHEMAS } from './types';
import {
  GUIDE_TEST_IDS,
  accountTurn,
  attachmentSource,
  draftHandoff,
  ephemeralTurn,
  guideConversation,
  guideMessage,
  rootChartSource,
  skySource,
} from './test-fixtures';
import {
  guideUtf8Bytes,
  parseGuideAccountContextMutationDraftV1,
  parseGuideContextMutationDraftV1,
  parseGuideContextSourceDraftV1,
  parseGuideConversationDraftV1,
  parseGuideConversationPageDraftV1,
  parseGuideDraftHandoffDraftV1,
  parseGuideExplicitAnonymousImportDraftV1,
  parseGuideExplicitAnonymousImportJsonDraftV1,
  parseGuideExportDraftV1,
  parseGuideMessageDraftV1,
  parseGuideMessagePageDraftV1,
  parseGuideStreamEventDraftV1,
  parseGuideSubjectDraftV1,
  parseGuideTurnRequestDraftV1,
  parseGuideTurnRequestJsonDraftV1,
  parseGuideTurnRejectionDraftV1,
  parseGuideTurnOperationReceiptDraftV1,
} from './validators';

function copy<T>(value: T): T {
  return structuredClone(value);
}

describe('Guide draft conversation validation', () => {
  it('accepts exact general and daily records with opaque conversation IDs', () => {
    expect(parseGuideConversationDraftV1(guideConversation())).not.toBeNull();
    const daily = guideConversation({
      kind: 'daily',
      dailyAnchor: { localDate: '2026-08-12', timeZone: 'Asia/Bangkok' },
      session: {
        sessionId: GUIDE_TEST_IDS.session,
        localDate: '2026-08-12',
        timeZone: 'Asia/Bangkok',
        calendar: 'gregorian',
      },
    });
    expect(parseGuideConversationDraftV1(daily)).not.toBeNull();
    expect(daily.conversationId).toBe(GUIDE_TEST_IDS.conversation);
    expect(daily.session?.sessionId).toBe(GUIDE_TEST_IDS.session);
    expect(daily.session?.sessionId).not.toBe(daily.conversationId);
  });

  it('rejects downgrade, unknown keys, and kind/anchor mismatches', () => {
    expect(parseGuideConversationDraftV1({
      ...guideConversation(), schema: 'zodiacs.guide.conversation.v0',
    })).toBeNull();
    expect(parseGuideConversationDraftV1({
      ...guideConversation(), hiddenPrompt: 'do not accept me',
    })).toBeNull();
    expect(parseGuideConversationDraftV1({
      ...guideConversation(), dailyAnchor: { localDate: '2026-08-12', timeZone: 'UTC' },
    })).toBeNull();
    expect(parseGuideConversationDraftV1(guideConversation({
      kind: 'daily', dailyAnchor: { localDate: '2026-02-30', timeZone: 'Asia/Bangkok' },
    }))).toBeNull();
    expect(parseGuideConversationDraftV1(guideConversation({
      kind: 'daily', dailyAnchor: { localDate: '2026-08-11', timeZone: 'Asia/Bangkok' },
    }))).toBeNull();
  });

  it('requires account ownership for sync but permits account-bound memory-only state', () => {
    expect(parseGuideConversationDraftV1(guideConversation({
      ownerBoundary: { kind: 'anonymous', localOwnerId: GUIDE_TEST_IDS.localOwner },
      persistence: 'account_synced',
    }))).toBeNull();
    expect(parseGuideConversationDraftV1(guideConversation({
      persistence: 'memory_only',
    }))).not.toBeNull();
  });

  it('keeps device-only saved-person context out of an account-synced snapshot', () => {
    const savedPerson = attachmentSource({
      kind: 'saved_person',
      sourceId: GUIDE_TEST_IDS.person,
      subject: {
        boundary: 'saved_person',
        subjectId: GUIDE_TEST_IDS.person,
        subjectName: 'Alex',
        subjectIsUser: false,
      },
      containsThirdPartyData: true,
      persistence: 'local_only',
      facts: 'Alex has a Taurus Sun.',
    });
    expect(parseGuideConversationDraftV1(guideConversation({
      attachments: [savedPerson],
    }))).toBeNull();
    expect(parseGuideConversationDraftV1(guideConversation({
      persistence: 'memory_only',
      attachments: [savedPerson],
    }))).not.toBeNull();
  });

  it('enforces ordered server sequences and monotonic cutoffs', () => {
    const unordered = guideConversation();
    unordered.messages[1]!.sequence = 1;
    expect(parseGuideConversationDraftV1(unordered)).toBeNull();
    expect(parseGuideConversationDraftV1(guideConversation({
      modelHistoryStartSequence: 6,
    }))).toBeNull();
  });
});

describe('Guide draft source and ownership validation', () => {
  it('accepts only stable public site-page sources without URLs or queries', () => {
    const page = attachmentSource({
      sourceId: 'page:birth-chart',
      kind: 'site_page',
      title: 'Birth chart',
      facts: 'Calculate and read a birth chart on Zodiacs.org.',
      subject: {
        boundary: 'public_reference',
        subjectId: 'page:birth-chart',
        subjectName: null,
        subjectIsUser: false,
      },
      persistence: 'local_only',
    });
    expect(parseGuideContextSourceDraftV1(page)).not.toBeNull();
    expect(parseGuideContextSourceDraftV1({
      ...page,
      sourceId: 'page:/birth-chart/?name=private',
    })).toBeNull();
    expect(parseGuideContextSourceDraftV1({
      ...page,
      subject: {
        boundary: 'root_user', subjectId: 'self', subjectName: 'You', subjectIsUser: true,
      },
    })).toBeNull();
  });

  it('uses code-point and UTF-8 limits without truncation', () => {
    const exact = attachmentSource({ title: '🪐'.repeat(80) });
    expect(guideUtf8Bytes(exact.title)).toBe(GUIDE_LIMITS.sourceTitleBytes);
    expect(parseGuideContextSourceDraftV1(exact)?.title).toBe(exact.title);
    expect(parseGuideContextSourceDraftV1(attachmentSource({
      title: '🪐'.repeat(81),
    }))).toBeNull();

    const exactMessage = guideMessage({ content: '🪐'.repeat(GUIDE_LIMITS.messageCodePoints) });
    expect(guideUtf8Bytes(exactMessage.content)).toBe(GUIDE_LIMITS.messageBytes);
    expect(parseGuideMessageDraftV1(exactMessage)).not.toBeNull();
    expect(parseGuideMessageDraftV1(guideMessage({
      content: '🪐'.repeat(GUIDE_LIMITS.messageCodePoints + 1),
    }))).toBeNull();
  });

  it('rejects ill-formed Unicode, controls, localized IDs, and silent trimming', () => {
    expect(parseGuideContextSourceDraftV1(attachmentSource({ facts: 'bad\ud800text' }))).toBeNull();
    expect(parseGuideContextSourceDraftV1(attachmentSource({ title: 'bad\nlabel' }))).toBeNull();
    expect(parseGuideContextSourceDraftV1(attachmentSource({ sourceId: 'Learn:Rétrograde' }))).toBeNull();
    expect(parseGuideMessageDraftV1(guideMessage({ content: ' padded ' }))).toBeNull();
    expect(parseGuideMessageDraftV1(guideMessage({ content: 'hidden\u202eright-to-left' }))).toBeNull();
  });

  it('makes subject ownership explicit and never treats a saved person as the user', () => {
    expect(parseGuideSubjectDraftV1({
      boundary: 'saved_person',
      subjectId: GUIDE_TEST_IDS.person,
      subjectName: 'Alex',
      subjectIsUser: true,
    })).toBeNull();
    expect(parseGuideSubjectDraftV1({
      boundary: 'root_user', subjectId: 'self', subjectName: 'You', subjectIsUser: false,
    })).toBeNull();

    const savedPerson = attachmentSource({
      kind: 'saved_person',
      sourceId: GUIDE_TEST_IDS.person,
      subject: {
        boundary: 'saved_person',
        subjectId: GUIDE_TEST_IDS.person,
        subjectName: 'Alex',
        subjectIsUser: false,
      },
      containsThirdPartyData: true,
      persistence: 'local_only',
      facts: 'Alex has a Taurus Sun.',
    });
    expect(parseGuideContextSourceDraftV1(savedPerson)).not.toBeNull();
    expect(parseGuideContextSourceDraftV1({
      ...savedPerson, persistence: 'account_reference',
    })).toBeNull();
  });

  it('requires an explicitly self-owned chart for an account chart reference', () => {
    const otherChart = rootChartSource({
      kind: 'chart',
      subject: {
        boundary: 'saved_person',
        subjectId: GUIDE_TEST_IDS.person,
        subjectName: 'Alex',
        subjectIsUser: false,
      },
    });
    expect(parseGuideContextSourceDraftV1(otherChart)).toBeNull();
  });
});

describe('Guide draft command and transport validation', () => {
  it('accepts exact context operations and rejects unknown fields', () => {
    const mutation = {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 2,
      operation: 'attach',
      source: attachmentSource(),
    } as const;
    expect(parseGuideContextMutationDraftV1(mutation)).not.toBeNull();
    expect(parseGuideContextMutationDraftV1({ ...mutation, ownerAccountId: GUIDE_TEST_IDS.account })).toBeNull();
  });

  it('keeps handoffs draft-only and bounded', () => {
    expect(parseGuideDraftHandoffDraftV1(draftHandoff())).not.toBeNull();
    expect(parseGuideDraftHandoffDraftV1({
      ...draftHandoff(), delivery: 'send_now',
    })).toBeNull();
    expect(parseGuideDraftHandoffDraftV1(draftHandoff({
      draftText: 'a'.repeat(GUIDE_LIMITS.draftCodePoints + 1),
    }))).toBeNull();
  });

  it('keeps owner, entitlement, model choice, and prompt content out of turn requests', () => {
    expect(parseGuideTurnRequestDraftV1(accountTurn())).not.toBeNull();
    for (const extra of [
      { accountId: GUIDE_TEST_IDS.account },
      { entitlement: 'allowed' },
      { model: 'gpt-5.6-luna' },
      { systemPrompt: 'secret' },
      { store: true },
    ]) {
      expect(parseGuideTurnRequestDraftV1({ ...accountTurn(), ...extra })).toBeNull();
    }
  });

  it('accepts bounded ephemeral context and rejects requests over 64 KiB UTF-8', () => {
    expect(parseGuideTurnRequestDraftV1(ephemeralTurn())).not.toBeNull();
    const accountReference = ephemeralTurn();
    accountReference.ephemeralContext.baseContext.ownerChart.source = rootChartSource();
    expect(parseGuideTurnRequestDraftV1(accountReference)).toBeNull();
    const huge = ephemeralTurn();
    huge.ephemeralContext.attachments = [0, 1, 2].map((index) => attachmentSource({
      sourceId: `learn:large-${index}`,
      facts: '🪐'.repeat(3_000),
      contentDigest: String(index + 1).repeat(64),
    }));
    huge.ephemeralContext.history = [0, 1, 2].map((index) => guideMessage({
      messageId: [
        GUIDE_TEST_IDS.messageOne,
        GUIDE_TEST_IDS.messageTwo,
        GUIDE_TEST_IDS.messageThree,
      ][index],
      sequence: index + 1,
      author: index % 2 === 0 ? 'user' : 'guide',
      content: '🪐'.repeat(2_400),
      generation: index % 2 === 0 ? null : guideMessage().generation,
    }));
    expect(guideUtf8Bytes(JSON.stringify(huge))).toBeGreaterThan(GUIDE_LIMITS.requestBytes);
    expect(parseGuideTurnRequestDraftV1(huge)).toBeNull();
  });

  it('keeps saved-person context out of initial cloud turn payloads', () => {
    const request = ephemeralTurn();
    request.ephemeralContext.attachments = [attachmentSource({
      kind: 'saved_person',
      sourceId: 'person:ffffffff-ffff-4fff-8fff-ffffffffffff',
      subject: {
        boundary: 'saved_person',
        subjectId: GUIDE_TEST_IDS.person,
        subjectName: 'Alex',
        subjectIsUser: false,
      },
      persistence: 'local_only',
    })];
    expect(parseGuideTurnRequestDraftV1(request)).toBeNull();
  });

  it('accepts app-owned stream events and forbids text-bearing errors', () => {
    const event = {
      schema: GUIDE_SCHEMAS.streamEvent,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      eventSequence: 0,
      clientAuthEpoch: 1,
      type: 'accepted',
      conversationRevision: 3,
    } as const;
    expect(parseGuideStreamEventDraftV1(event)).not.toBeNull();
    expect(parseGuideStreamEventDraftV1({
      schema: GUIDE_SCHEMAS.streamEvent,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      eventSequence: 1,
      clientAuthEpoch: 1,
      type: 'delta',
      delta: ' next ',
    })).not.toBeNull();
    expect(parseGuideStreamEventDraftV1({
      schema: GUIDE_SCHEMAS.streamEvent,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      eventSequence: 1,
      clientAuthEpoch: 1,
      type: 'delta',
      delta: '',
    })).toBeNull();
    expect(parseGuideTurnRejectionDraftV1({
      schema: GUIDE_SCHEMAS.turnRejection,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      clientAuthEpoch: 1,
      code: 'unauthorized',
      retryable: false,
    })).not.toBeNull();
    expect(parseGuideTurnRejectionDraftV1({
      schema: GUIDE_SCHEMAS.turnRejection,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      clientAuthEpoch: 1,
      code: 'temporarily_unavailable',
      retryable: true,
    })).not.toBeNull();
    expect(parseGuideTurnRejectionDraftV1({
      schema: GUIDE_SCHEMAS.turnRejection,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      clientAuthEpoch: 1,
      code: 'unauthorized',
      retryable: false,
      detail: 'no private text is allowed',
    })).toBeNull();
    expect(parseGuideStreamEventDraftV1({
      schema: GUIDE_SCHEMAS.streamEvent,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      eventSequence: 0,
      clientAuthEpoch: 1,
      type: 'error',
      code: 'temporarily_unavailable',
      retryable: false,
      detail: 'the private prompt or user text must not appear here',
    })).toBeNull();
    expect(parseGuideStreamEventDraftV1({
      schema: GUIDE_SCHEMAS.streamEvent,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      eventSequence: 1,
      clientAuthEpoch: 1,
      type: 'error',
      code: 'temporarily_unavailable',
      retryable: false,
    })).not.toBeNull();
    expect(parseGuideStreamEventDraftV1({
      schema: GUIDE_SCHEMAS.streamEvent,
      conversationId: GUIDE_TEST_IDS.conversation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      attemptId: GUIDE_TEST_IDS.attempt,
      eventSequence: 1,
      clientAuthEpoch: 1,
      type: 'error',
      code: 'temporarily_unavailable',
      retryable: true,
    })).toBeNull();
  });
});

describe('Guide pages and export validation', () => {
  it('requires ordered bounded pages with opaque cursors', () => {
    const messages = guideConversation().messages.slice(0, 2);
    expect(parseGuideMessagePageDraftV1({
      schema: GUIDE_SCHEMAS.messagePage,
      conversationId: GUIDE_TEST_IDS.conversation,
      snapshotRevision: 2,
      order: 'sequence_asc',
      messages,
      nextCursor: 'opaque_cursor-1',
    })).not.toBeNull();
    expect(parseGuideMessagePageDraftV1({
      schema: GUIDE_SCHEMAS.messagePage,
      conversationId: GUIDE_TEST_IDS.conversation,
      snapshotRevision: 2,
      order: 'sequence_asc',
      messages: [...messages].reverse(),
      nextCursor: null,
    })).toBeNull();
    expect(parseGuideMessagePageDraftV1({
      schema: GUIDE_SCHEMAS.messagePage,
      conversationId: GUIDE_TEST_IDS.conversation,
      snapshotRevision: 2,
      order: 'sequence_asc',
      messages: [messages[0], { ...messages[1]!, messageId: messages[0]!.messageId }],
      nextCursor: null,
    })).toBeNull();

    expect(parseGuideConversationPageDraftV1({
      schema: GUIDE_SCHEMAS.conversationPage,
      snapshotAt: '2026-08-12T02:00:00.000Z',
      order: 'last_activity_desc_conversation_id_desc',
      conversations: [{
        conversationId: GUIDE_TEST_IDS.conversation,
        session: null,
        kind: 'general',
        dailyAnchor: null,
        revision: 2,
        createdAt: '2026-08-12T01:00:00.000Z',
        lastActivityAt: '2026-08-12T01:03:00.000Z',
      }],
      nextCursor: null,
    })).not.toBeNull();
    expect(parseGuideConversationPageDraftV1({
      schema: GUIDE_SCHEMAS.conversationPage,
      snapshotAt: '2026-08-12T01:02:00.000Z',
      order: 'last_activity_desc_conversation_id_desc',
      conversations: [{
        conversationId: GUIDE_TEST_IDS.conversation,
        session: null,
        kind: 'general',
        dailyAnchor: null,
        revision: 2,
        createdAt: '2026-08-12T01:00:00.000Z',
        lastActivityAt: '2026-08-12T01:03:00.000Z',
      }],
      nextCursor: null,
    })).toBeNull();
    const tied = [{
      conversationId: GUIDE_TEST_IDS.localOwner,
      session: null,
      kind: 'general' as const,
      dailyAnchor: null,
      revision: 2,
      createdAt: '2026-08-12T01:00:00.000Z',
      lastActivityAt: '2026-08-12T01:03:00.000Z',
    }, {
      conversationId: GUIDE_TEST_IDS.conversation,
      session: null,
      kind: 'general' as const,
      dailyAnchor: null,
      revision: 2,
      createdAt: '2026-08-12T01:00:00.000Z',
      lastActivityAt: '2026-08-12T01:03:00.000Z',
    }];
    expect(parseGuideConversationPageDraftV1({
      schema: GUIDE_SCHEMAS.conversationPage,
      snapshotAt: '2026-08-12T02:00:00.000Z',
      order: 'last_activity_desc_conversation_id_desc',
      conversations: tied,
      nextCursor: null,
    })).not.toBeNull();
    expect(parseGuideConversationPageDraftV1({
      schema: GUIDE_SCHEMAS.conversationPage,
      snapshotAt: '2026-08-12T02:00:00.000Z',
      order: 'last_activity_desc_conversation_id_desc',
      conversations: [...tied].reverse(),
      nextCursor: null,
    })).toBeNull();
  });

  it('keeps Guide export separate and fails closed on incomplete records', () => {
    const exported = {
      schema: GUIDE_SCHEMAS.export,
      accountId: GUIDE_TEST_IDS.account,
      exportedAt: '2026-08-12T02:00:00.000Z',
      retention: 'P12M',
      conversations: [
        { state: 'active', conversation: guideConversation(), deletedAt: null },
        {
          state: 'deleted',
          conversationId: GUIDE_TEST_IDS.localOwner,
          terminalRevision: 4,
          deletedAt: '2026-08-12T01:30:00.000Z',
        },
      ],
    } as const;
    expect(parseGuideExportDraftV1(exported, GUIDE_TEST_IDS.account)).not.toBeNull();
    expect(parseGuideExportDraftV1(exported, GUIDE_TEST_IDS.localOwner)).toBeNull();
    const incomplete = copy(exported) as any;
    delete incomplete.conversations[0].conversation.messages;
    expect(parseGuideExportDraftV1(incomplete, GUIDE_TEST_IDS.account)).toBeNull();
    expect(parseGuideExportDraftV1({
      ...exported,
      accountId: GUIDE_TEST_IDS.localOwner,
    }, GUIDE_TEST_IDS.account)).toBeNull();
    expect(parseGuideExportDraftV1({
      ...exported,
      conversations: [{
        state: 'active',
        conversation: guideConversation({
          ownerBoundary: { kind: 'anonymous', localOwnerId: GUIDE_TEST_IDS.localOwner },
          persistence: 'memory_only',
        }),
        deletedAt: null,
      }],
    }, GUIDE_TEST_IDS.account)).toBeNull();
  });
});

describe('Guide strict trust-boundary validation', () => {
  it('keeps synced sources reference-only and anonymous sources device-local', () => {
    expect(parseGuideContextSourceDraftV1(rootChartSource({
      facts: 'duplicated private chart facts',
    }))).toBeNull();
    expect(parseGuideContextSourceDraftV1(rootChartSource({
      persistence: 'local_only', facts: null,
    }))).toBeNull();

    const localBase = {
      ownerChart: {
        slot: 'owner_chart' as const,
        state: 'active' as const,
        source: rootChartSource({
          persistence: 'local_only', facts: 'Sun in Leo.',
        }),
      },
      todaySky: {
        slot: 'today_sky' as const,
        state: 'active' as const,
        source: skySource({ persistence: 'local_only', facts: 'Moon in Virgo.' }),
      },
    };
    expect(parseGuideConversationDraftV1(guideConversation({
      ownerBoundary: { kind: 'anonymous', localOwnerId: GUIDE_TEST_IDS.localOwner },
      persistence: 'memory_only',
    }))).toBeNull();
    expect(parseGuideConversationDraftV1(guideConversation({
      ownerBoundary: { kind: 'anonymous', localOwnerId: GUIDE_TEST_IDS.localOwner },
      persistence: 'memory_only',
      baseContext: localBase,
    }))).not.toBeNull();
  });

  it('requires global source uniqueness and conservative single-subject ownership', () => {
    expect(parseGuideConversationDraftV1(guideConversation({
      attachments: [rootChartSource({ kind: 'chart' })],
    }))).toBeNull();
    expect(parseGuideContextSourceDraftV1(attachmentSource({
      subject: {
        boundary: 'root_user', subjectId: 'self', subjectName: 'You', subjectIsUser: true,
      },
    }))).toBeNull();
    expect(parseGuideContextSourceDraftV1(attachmentSource({
      containsThirdPartyData: true,
    }))).toBeNull();
  });

  it('rejects message timestamps and turn ownership that contradict the snapshot', () => {
    const future = guideConversation();
    future.messages[0]!.createdAt = '2026-08-12T03:00:00.000Z';
    expect(parseGuideConversationDraftV1(future)).toBeNull();

    const orphanGuide = guideConversation();
    orphanGuide.messages = [guideMessage({ sequence: 1 })];
    orphanGuide.nextSequence = 2;
    expect(parseGuideConversationDraftV1(orphanGuide)).toBeNull();

    const mixedTurn = guideConversation();
    mixedTurn.contextRevision = 1;
    mixedTurn.contextEpoch = 1;
    mixedTurn.messages[1]!.contextRevision = 1;
    expect(parseGuideConversationDraftV1(mixedTurn)).toBeNull();
  });

  it('accepts only reference-shaped authenticated context mutations', () => {
    const mutation = {
      schema: GUIDE_SCHEMAS.accountContextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 2,
      clientAuthEpoch: 1,
      operation: 'attach',
      sourceRef: {
        kind: 'learn_term',
        sourceId: 'learn:retrograde',
        sourceRevision: 1,
      },
    } as const;
    expect(parseGuideAccountContextMutationDraftV1(mutation)).not.toBeNull();
    expect(parseGuideAccountContextMutationDraftV1({
      ...mutation, source: rootChartSource(),
    })).toBeNull();
    expect(parseGuideAccountContextMutationDraftV1({
      ...mutation,
      sourceRef: { ...mutation.sourceRef, kind: 'owner_chart' },
    })).toBeNull();
    const { clientAuthEpoch: _clientAuthEpoch, ...withoutEpoch } = mutation;
    expect(parseGuideAccountContextMutationDraftV1(withoutEpoch)).toBeNull();
  });

  it('caps the exact raw HTTP body before decoded JSON normalization', () => {
    const encoded = JSON.stringify(accountTurn());
    expect(parseGuideTurnRequestJsonDraftV1(encoded)).not.toBeNull();
    const padded = `${' '.repeat(GUIDE_LIMITS.requestBytes)}${encoded}`;
    expect(guideUtf8Bytes(padded)).toBeGreaterThan(GUIDE_LIMITS.requestBytes);
    expect(parseGuideTurnRequestJsonDraftV1(padded)).toBeNull();
  });

  it('requires literal explicit anonymous import confirmation with no destination account', () => {
    const request = {
      schema: GUIDE_SCHEMAS.anonymousImport,
      operationId: GUIDE_TEST_IDS.operation,
      previewId: GUIDE_TEST_IDS.preview,
      conversationId: GUIDE_TEST_IDS.conversation,
      localOwnerId: GUIDE_TEST_IDS.localOwner,
      lineageId: GUIDE_TEST_IDS.lineage,
      previewRevision: 2,
      previewContextEpoch: 0,
      snapshotDigest: 'e'.repeat(64),
      clientAuthEpoch: 1,
      confirmation: 'IMPORT',
    } as const;
    expect(parseGuideExplicitAnonymousImportDraftV1(request)).not.toBeNull();
    expect(parseGuideExplicitAnonymousImportJsonDraftV1(JSON.stringify(request))).not.toBeNull();
    expect(parseGuideExplicitAnonymousImportDraftV1({
      ...request, confirmation: true,
    })).toBeNull();
    expect(parseGuideExplicitAnonymousImportDraftV1({
      ...request, destinationAccountId: GUIDE_TEST_IDS.account,
    })).toBeNull();
    const { lineageId: _lineageId, ...withoutLineage } = request;
    expect(parseGuideExplicitAnonymousImportDraftV1(withoutLineage)).toBeNull();
  });

  it('accepts only server-HMAC logical turn receipts with coherent terminal fields', () => {
    const receipt = {
      schema: GUIDE_SCHEMAS.turnReceipt,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      turnId: GUIDE_TEST_IDS.turnTwo,
      userMessageId: GUIDE_TEST_IDS.messageThree,
      semanticVerifier: `1:${'a'.repeat(64)}`,
      status: 'completed',
      activeAttemptId: GUIDE_TEST_IDS.attempt,
      resultRevision: 4,
      responseMessageId: GUIDE_TEST_IDS.messageFour,
    } as const;
    expect(parseGuideTurnOperationReceiptDraftV1(receipt)).not.toBeNull();
    expect(parseGuideTurnOperationReceiptDraftV1({
      ...receipt, semanticVerifier: `local:${'a'.repeat(64)}`,
    })).toBeNull();
    expect(parseGuideTurnOperationReceiptDraftV1({
      ...receipt, status: 'reserved', resultRevision: 4,
    })).toBeNull();
  });
});
