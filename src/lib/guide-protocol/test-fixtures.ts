import {
  GUIDE_CLOUD_PROCESSING_PURPOSE,
  GUIDE_SCHEMAS,
  type GuideAccountTurnRequestDraftV1,
  type GuideContextSourceDraftV1,
  type GuideConversationDraftV1,
  type GuideDraftHandoffDraftV1,
  type GuideEphemeralTurnRequestDraftV1,
  type GuideMessageDraftV1,
} from './types';

export const GUIDE_TEST_IDS = {
  conversation: '11111111-1111-4111-8111-111111111111',
  session: '12121212-1212-4121-8121-121212121212',
  account: '22222222-2222-4222-8222-222222222222',
  localOwner: '33333333-3333-4333-8333-333333333333',
  turnOne: '44444444-4444-4444-8444-444444444444',
  turnTwo: '55555555-5555-4555-8555-555555555555',
  messageOne: '66666666-6666-4666-8666-666666666666',
  messageTwo: '77777777-7777-4777-8777-777777777777',
  messageThree: '88888888-8888-4888-8888-888888888888',
  messageFour: '99999999-9999-4999-8999-999999999999',
  operation: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  operationTwo: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  attempt: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  attemptTwo: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  handoff: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  person: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  ownerChart: '10101010-1010-4101-8101-101010101010',
  disclosure: '20202020-2020-4202-8202-202020202020',
  authSession: '30303030-3030-4303-8303-303030303030',
  preview: '40404040-4040-4404-8404-404040404040',
  lineage: '41414141-4141-4414-8414-414141414141',
  turnThree: '51515151-5151-4515-8515-515151515151',
  messageFive: '61616161-6161-4616-8616-616161616161',
  messageSix: '71717171-7171-4717-8717-717171717171',
} as const;

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

export function rootChartSource(
  overrides: Partial<GuideContextSourceDraftV1> = {},
): GuideContextSourceDraftV1 {
  return {
    sourceId: GUIDE_TEST_IDS.ownerChart,
    kind: 'owner_chart',
    sourceRevision: 1,
    title: 'My chart',
    facts: null,
    subject: {
      boundary: 'root_user',
      subjectId: 'self',
      subjectName: 'You',
      subjectIsUser: true,
    },
    containsThirdPartyData: false,
    persistence: 'account_reference',
    contentDigest: DIGEST_A,
    ...overrides,
  };
}

export function skySource(
  overrides: Partial<GuideContextSourceDraftV1> = {},
): GuideContextSourceDraftV1 {
  return {
    sourceId: 'sky:2026-08-12',
    kind: 'today_sky',
    sourceRevision: 1,
    title: "Today's sky",
    facts: null,
    subject: {
      boundary: 'public_reference',
      subjectId: 'sky:2026-08-12',
      subjectName: null,
      subjectIsUser: false,
    },
    containsThirdPartyData: false,
    persistence: 'account_reference',
    contentDigest: DIGEST_B,
    ...overrides,
  };
}

export function attachmentSource(
  overrides: Partial<GuideContextSourceDraftV1> = {},
): GuideContextSourceDraftV1 {
  return {
    sourceId: 'learn:retrograde',
    kind: 'learn_term',
    sourceRevision: 1,
    title: 'Retrograde',
    facts: null,
    subject: {
      boundary: 'public_reference',
      subjectId: 'learn:retrograde',
      subjectName: null,
      subjectIsUser: false,
    },
    containsThirdPartyData: false,
    persistence: 'account_reference',
    contentDigest: 'c'.repeat(64),
    ...overrides,
  };
}

export function guideMessage(
  overrides: Partial<GuideMessageDraftV1> = {},
): GuideMessageDraftV1 {
  const author = overrides.author ?? 'guide';
  return {
    messageId: GUIDE_TEST_IDS.messageTwo,
    turnId: GUIDE_TEST_IDS.turnOne,
    sequence: 2,
    author,
    content: 'A practical way to use this is to slow down and check the details.',
    contextRevision: 0,
    createdAt: '2026-08-12T01:01:00.000Z',
    generation: author === 'guide' ? {
      modelId: 'gpt-5.6-luna',
      promptVersion: 'guide-prompt.draft.v1',
      policyVersion: 'guide-policy.draft.v1',
      protocolSchema: GUIDE_SCHEMAS.conversation,
      generatedAt: '2026-08-12T01:01:00.000Z',
    } : null,
    ...overrides,
  };
}

export function guideConversation(
  overrides: Partial<GuideConversationDraftV1> = {},
): GuideConversationDraftV1 {
  const messages: GuideMessageDraftV1[] = [
    guideMessage({
      messageId: GUIDE_TEST_IDS.messageOne,
      sequence: 1,
      author: 'user',
      content: 'What should I pay attention to today?',
      generation: null,
      createdAt: '2026-08-12T01:00:00.000Z',
    }),
    guideMessage(),
    guideMessage({
      messageId: GUIDE_TEST_IDS.messageThree,
      turnId: GUIDE_TEST_IDS.turnTwo,
      sequence: 3,
      author: 'user',
      content: 'How can I make that concrete?',
      generation: null,
      createdAt: '2026-08-12T01:02:00.000Z',
    }),
    guideMessage({
      messageId: GUIDE_TEST_IDS.messageFour,
      turnId: GUIDE_TEST_IDS.turnTwo,
      sequence: 4,
      content: 'Pick one small task and give it your full attention.',
      createdAt: '2026-08-12T01:03:00.000Z',
      generation: {
        modelId: 'gpt-5.6-luna',
        promptVersion: 'guide-prompt.draft.v1',
        policyVersion: 'guide-policy.draft.v1',
        protocolSchema: GUIDE_SCHEMAS.conversation,
        generatedAt: '2026-08-12T01:03:00.000Z',
      },
    }),
  ];
  return {
    schema: GUIDE_SCHEMAS.conversation,
    conversationId: GUIDE_TEST_IDS.conversation,
    session: null,
    kind: 'general',
    dailyAnchor: null,
    ownerBoundary: { kind: 'account', accountId: GUIDE_TEST_IDS.account },
    persistence: 'account_synced',
    revision: 2,
    nextSequence: 5,
    modelHistoryStartSequence: 1,
    contextRevision: 0,
    contextEpoch: 0,
    modelContextState: 'active',
    baseContext: {
      ownerChart: { slot: 'owner_chart', state: 'active', source: rootChartSource() },
      todaySky: { slot: 'today_sky', state: 'active', source: skySource() },
    },
    attachments: [],
    messages,
    contextOperations: [],
    createdAt: '2026-08-12T01:00:00.000Z',
    lastActivityAt: '2026-08-12T01:03:00.000Z',
    ...overrides,
  };
}

export function accountTurn(
  overrides: Partial<GuideAccountTurnRequestDraftV1> = {},
): GuideAccountTurnRequestDraftV1 {
  return {
    schema: GUIDE_SCHEMAS.accountTurn,
    mode: 'account',
    conversationId: GUIDE_TEST_IDS.conversation,
    turnId: GUIDE_TEST_IDS.turnThree,
    operationId: GUIDE_TEST_IDS.operation,
    attemptId: GUIDE_TEST_IDS.attempt,
    retryOfAttemptId: null,
    baseRevision: 2,
    contextEpoch: 0,
    clientAuthEpoch: 1,
    userMessage: {
      messageId: GUIDE_TEST_IDS.messageFive,
      content: 'What is one useful next step?',
    },
    consent: {
      purpose: GUIDE_CLOUD_PROCESSING_PURPOSE,
      policyVersion: 'guide-cloud-processing.draft.v1',
      consentRevision: 1,
      disclosureId: GUIDE_TEST_IDS.disclosure,
      disclosedContextEpoch: 0,
      contextScopeDigest: 'd'.repeat(64),
    },
    ...overrides,
  };
}

export function ephemeralTurn(
  overrides: Partial<GuideEphemeralTurnRequestDraftV1> = {},
): GuideEphemeralTurnRequestDraftV1 {
  const conversation = guideConversation({
    baseContext: {
      ownerChart: {
        slot: 'owner_chart',
        state: 'active',
        source: rootChartSource({
          persistence: 'local_only',
          facts: 'Sun in Leo. Moon in Taurus.',
        }),
      },
      todaySky: {
        slot: 'today_sky',
        state: 'active',
        source: skySource({ persistence: 'local_only', facts: 'The Moon is in Virgo.' }),
      },
    },
  });
  return {
    ...accountTurn(),
    schema: GUIDE_SCHEMAS.ephemeralTurn,
    mode: 'ephemeral',
    ephemeralContext: {
      baseContext: conversation.baseContext,
      attachments: conversation.attachments,
      history: conversation.messages.slice(0, 2),
      modelHistoryStartSequence: conversation.modelHistoryStartSequence,
    },
    ...overrides,
  };
}

export function draftHandoff(
  overrides: Partial<GuideDraftHandoffDraftV1> = {},
): GuideDraftHandoffDraftV1 {
  return {
    schema: GUIDE_SCHEMAS.handoff,
    handoffId: GUIDE_TEST_IDS.handoff,
    conversationId: GUIDE_TEST_IDS.conversation,
    origin: 'today',
    delivery: 'requires_user_action',
    draftText: 'Help me make sense of today in practical terms.',
    sourceRefs: [{ sourceId: 'sky:2026-08-12', sourceRevision: 1 }],
    createdAt: '2026-08-12T01:04:00.000Z',
    ...overrides,
  };
}
