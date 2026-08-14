import { describe, expect, it } from 'vitest';
import { GUIDE_SCHEMAS, type GuideContextMutationDraftV1 } from './types';
import {
  GUIDE_TEST_IDS,
  attachmentSource,
  guideConversation,
  rootChartSource,
} from './test-fixtures';
import { applyGuideContextMutation, guideModelHistory } from './context-state';

const VERIFIER_A = `1:${'a'.repeat(64)}`;
const VERIFIER_B = `1:${'b'.repeat(64)}`;
const LOCAL_VERIFIER = `local:${'c'.repeat(64)}`;

function attachMutation(
  overrides: Partial<Extract<GuideContextMutationDraftV1, { operation: 'attach' }>> = {},
): Extract<GuideContextMutationDraftV1, { operation: 'attach' }> {
  return {
    schema: GUIDE_SCHEMAS.contextMutation,
    conversationId: GUIDE_TEST_IDS.conversation,
    operationId: GUIDE_TEST_IDS.operation,
    baseRevision: 2,
    operation: 'attach',
    source: attachmentSource(),
    ...overrides,
  };
}

describe('Guide context state', () => {
  it('attaches atomically, advances the context epoch, and cuts off old model history', () => {
    const before = guideConversation();
    const result = applyGuideContextMutation(before, attachMutation(), VERIFIER_A);
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;

    expect(result.state.attachments.map(({ sourceId }) => sourceId)).toEqual(['learn:retrograde']);
    expect(result.state.revision).toBe(3);
    expect(result.state.contextRevision).toBe(1);
    expect(result.state.contextEpoch).toBe(1);
    expect(result.state.modelHistoryStartSequence).toBe(5);
    expect(result.state.messages).toEqual(before.messages);
    expect(guideModelHistory(result.state)).toEqual([]);
  });

  it('replays an exact verified operation and rejects semantic reuse or stale revisions', () => {
    const applied = applyGuideContextMutation(guideConversation(), attachMutation(), VERIFIER_A);
    expect(applied.outcome).toBe('applied');
    if (applied.outcome !== 'applied') return;

    const replay = applyGuideContextMutation(applied.state, attachMutation(), VERIFIER_A);
    expect(replay.outcome).toBe('replayed');
    expect(replay.state).toEqual(applied.state);

    expect(applyGuideContextMutation(applied.state, attachMutation(), VERIFIER_B).outcome)
      .toBe('mutation_conflict');
    expect(applyGuideContextMutation(applied.state, attachMutation({
      operationId: GUIDE_TEST_IDS.operationTwo,
      source: attachmentSource({ sourceId: 'learn:saturn' }),
    }), VERIFIER_B).outcome).toBe('revision_conflict');
  });

  it('uses a local-only verifier for offline memory state and never accepts it for sync', () => {
    const memory = guideConversation({
      persistence: 'memory_only',
    });
    expect(applyGuideContextMutation(memory, attachMutation(), VERIFIER_A).outcome)
      .toBe('invalid_semantic_verifier');
    expect(applyGuideContextMutation(memory, attachMutation(), LOCAL_VERIFIER).outcome)
      .toBe('applied');
    expect(applyGuideContextMutation(guideConversation(), attachMutation(), LOCAL_VERIFIER).outcome)
      .toBe('invalid_semantic_verifier');
  });

  it('replaces one source in place and never partially applies a colliding replacement', () => {
    const initial = guideConversation({
      revision: 3,
      contextRevision: 1,
      contextEpoch: 1,
      attachments: [
        attachmentSource(),
        attachmentSource({ sourceId: 'learn:saturn', title: 'Saturn', contentDigest: 'd'.repeat(64) }),
      ],
    });
    const conflict: GuideContextMutationDraftV1 = {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 3,
      operation: 'replace',
      targetSourceId: 'learn:retrograde',
      replacement: attachmentSource({ sourceId: 'learn:saturn' }),
    };
    const rejected = applyGuideContextMutation(initial, conflict, VERIFIER_A);
    expect(rejected.outcome).toBe('source_conflict');
    expect(rejected.state).toEqual(initial);

    const replacement: GuideContextMutationDraftV1 = {
      ...conflict,
      replacement: attachmentSource({
        sourceId: 'learn:jupiter', title: 'Jupiter', contentDigest: 'e'.repeat(64),
      }),
    };
    const applied = applyGuideContextMutation(initial, replacement, VERIFIER_A);
    expect(applied.outcome).toBe('applied');
    if (applied.outcome !== 'applied') return;
    expect(applied.state.attachments.map(({ sourceId }) => sourceId))
      .toEqual(['learn:jupiter', 'learn:saturn']);
  });

  it('removes and clears visible attachments without removing permanent base slots', () => {
    const initial = guideConversation({ attachments: [attachmentSource()] });
    const clear: GuideContextMutationDraftV1 = {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 2,
      operation: 'clear',
      scope: 'visible_attachments',
    };
    const result = applyGuideContextMutation(initial, clear, VERIFIER_A);
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.state.attachments).toEqual([]);
    expect(result.state.baseContext.ownerChart.state).toBe('active');
    expect(result.state.baseContext.todaySky.state).toBe('active');

    const removeBase: GuideContextMutationDraftV1 = {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operationTwo,
      baseRevision: result.state.revision,
      operation: 'remove',
      sourceId: initial.baseContext.ownerChart.source!.sourceId,
    };
    const unchanged = applyGuideContextMutation(result.state, removeBase, VERIFIER_B);
    expect(unchanged.outcome).toBe('unchanged');
    if (unchanged.outcome !== 'unchanged') return;
    expect(unchanged.state.baseContext.ownerChart.state).toBe('active');
  });

  it('revokes a base slot or all model context while leaving earlier bubbles displayable', () => {
    const revokeOwner: GuideContextMutationDraftV1 = {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 2,
      operation: 'invalidate',
      target: { kind: 'base', slot: 'owner_chart' },
      reason: 'profile_deleted',
    };
    const ownerResult = applyGuideContextMutation(guideConversation(), revokeOwner, VERIFIER_A);
    expect(ownerResult.outcome).toBe('applied');
    if (ownerResult.outcome !== 'applied') return;
    expect(ownerResult.state.baseContext.ownerChart).toEqual({
      slot: 'owner_chart', state: 'revoked', source: null,
    });
    expect(ownerResult.state.baseContext.todaySky.state).toBe('active');
    expect(ownerResult.state.messages).toHaveLength(4);
    expect(guideModelHistory(ownerResult.state)).toEqual([]);

    const revokeAll: GuideContextMutationDraftV1 = {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 2,
      operation: 'invalidate',
      target: { kind: 'all_model_context' },
      reason: 'consent_revoked',
    };
    const allResult = applyGuideContextMutation(
      guideConversation({ attachments: [attachmentSource()] }),
      revokeAll,
      VERIFIER_A,
    );
    expect(allResult.outcome).toBe('applied');
    if (allResult.outcome !== 'applied') return;
    expect(allResult.state.attachments).toEqual([attachmentSource()]);
    expect(allResult.state.baseContext.ownerChart.state).toBe('active');
    expect(allResult.state.baseContext.todaySky.state).toBe('active');
    expect(allResult.state.modelContextState).toBe('disabled');
    expect(guideModelHistory(allResult.state)).toEqual([]);
  });

  it('enforces the five-source tray bound without evicting a source implicitly', () => {
    const attachments = Array.from({ length: 5 }, (_, index) => attachmentSource({
      sourceId: `learn:term-${index}`,
      title: `Term ${index}`,
      contentDigest: String(index + 1).repeat(64),
    }));
    const initial = guideConversation({ attachments });
    const result = applyGuideContextMutation(initial, attachMutation({
      source: attachmentSource({ sourceId: 'learn:sixth' }),
    }), VERIFIER_A);
    expect(result.outcome).toBe('source_limit_reached');
    expect(result.state.attachments).toEqual(attachments);
  });

  it('rejects a projection that would violate sync-source or context-size policy', () => {
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
    expect(applyGuideContextMutation(guideConversation(), attachMutation({
      source: savedPerson,
    }), VERIFIER_A).outcome).toBe('invalid_projection');

    const memory = guideConversation({
      persistence: 'memory_only',
    });
    expect(applyGuideContextMutation(memory, attachMutation({
      source: savedPerson,
    }), LOCAL_VERIFIER).outcome).toBe('applied');

    const bloated = attachmentSource({
      persistence: 'local_only',
      facts: '🪐'.repeat(3_500),
      contentDigest: 'f'.repeat(64),
    });
    const largeState = guideConversation({
      persistence: 'memory_only',
      attachments: [0, 1, 2].map((index) => ({
        ...bloated,
        sourceId: `learn:large-${index}`,
        contentDigest: String(index + 1).repeat(64),
      })),
    });
    expect(applyGuideContextMutation(largeState, attachMutation({
      source: {
        ...bloated,
        sourceId: 'learn:large-final',
        contentDigest: '4'.repeat(64),
      },
    }), LOCAL_VERIFIER).outcome).toBe('invalid_projection');
  });

  it('projects only post-cutoff messages while preserving chronological order', () => {
    const state = guideConversation({ modelHistoryStartSequence: 3 });
    const projected = guideModelHistory(state);
    expect(projected.map(({ sequence }) => sequence)).toEqual([3, 4]);
    expect(state.messages.map(({ sequence }) => sequence)).toEqual([1, 2, 3, 4]);
  });

  it('rejects stale same-source rollback and treats an exact replacement as unchanged', () => {
    const current = attachmentSource({ sourceRevision: 2 });
    const initial = guideConversation({
      revision: 3,
      contextRevision: 1,
      contextEpoch: 1,
      attachments: [current],
    });
    const replace = (replacement: typeof current, targetSourceId = current.sourceId) => ({
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 3,
      operation: 'replace' as const,
      targetSourceId,
      replacement,
    });
    expect(applyGuideContextMutation(initial, replace(current), VERIFIER_A).outcome)
      .toBe('unchanged');
    expect(applyGuideContextMutation(initial, replace(attachmentSource({
      sourceRevision: 1,
    })), VERIFIER_A).outcome).toBe('stale_source_revision');
    expect(applyGuideContextMutation(initial, replace(attachmentSource({
      sourceRevision: 2,
      contentDigest: '9'.repeat(64),
    })), VERIFIER_A).outcome).toBe('source_revision_conflict');
    expect(applyGuideContextMutation(initial, replace(current, 'learn:missing'), VERIFIER_A).outcome)
      .toBe('source_not_found');
  });

  it('reactivates a trusted base slot and records server-time activity intent separately', () => {
    const revoke = {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 2,
      operation: 'invalidate' as const,
      target: { kind: 'base' as const, slot: 'owner_chart' as const },
      reason: 'profile_changed' as const,
    };
    const revoked = applyGuideContextMutation(guideConversation(), revoke, VERIFIER_A);
    expect(revoked.outcome).toBe('applied');
    if (revoked.outcome !== 'applied') return;
    expect(revoked.activityDirective).toBe('preserve');

    const restored = applyGuideContextMutation(revoked.state, {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operationTwo,
      baseRevision: 3,
      operation: 'set_base',
      slot: 'owner_chart',
      state: 'active',
      source: rootChartSource({ sourceRevision: 2, contentDigest: '8'.repeat(64) }),
    }, VERIFIER_B);
    expect(restored.outcome).toBe('applied');
    if (restored.outcome !== 'applied') return;
    expect(restored.state.baseContext.ownerChart.state).toBe('active');
    expect(restored.activityDirective).toBe('preserve');

    const attached = applyGuideContextMutation(guideConversation(), attachMutation(), VERIFIER_A);
    expect(attached.outcome === 'applied' && attached.activityDirective)
      .toBe('advance_with_server_time');
  });

  it('compacts the projection receipt cache without blocking a privacy invalidation', () => {
    const receipts = Array.from({ length: 1_000 }, (_, index) => ({
      operationId: `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`,
      semanticVerifier: `1:${(index % 16).toString(16).repeat(64)}`,
      resultRevision: 2,
      outcome: 'unchanged' as const,
    }));
    const state = guideConversation({ contextOperations: receipts });
    const result = applyGuideContextMutation(state, {
      schema: GUIDE_SCHEMAS.contextMutation,
      conversationId: GUIDE_TEST_IDS.conversation,
      operationId: GUIDE_TEST_IDS.operation,
      baseRevision: 2,
      operation: 'invalidate',
      target: { kind: 'all_model_context' },
      reason: 'entitlement_lost',
    }, VERIFIER_A);
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.state.contextOperations).toHaveLength(1_000);
    expect(result.state.contextOperations.at(-1)?.operationId).toBe(GUIDE_TEST_IDS.operation);
    expect(result.state.modelContextState).toBe('disabled');
  });
});
