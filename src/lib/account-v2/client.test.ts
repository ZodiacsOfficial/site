import { describe, expect, it, vi } from 'vitest';
import {
  AccountV2ClientError,
  bootstrapAccountV2,
  deleteSyncedChart,
  downloadAccountExport,
  finishZodiacsAccountDeletion,
  getZodiacsAccountDeletionStatus,
  prepareZodiacsAccountDeletion,
  putSelfChart,
  recordChartSyncConsent,
} from './client';

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature';
const DEVICE = '11111111-1111-4111-8111-111111111111';
const MUTATION = '22222222-2222-4222-8222-222222222222';
const RECOVERY_SECRET = 'A'.repeat(43);

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('account v2 browser client', () => {
  it('sends owner-free bootstrap and explicit consent requests', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ outcome: 'ready', chart_sync_consent: 'pending', cursor: 0 }))
      .mockResolvedValueOnce(json({ outcome: 'granted', purpose: 'chart_sync', event_id: 1 }));
    await bootstrapAccountV2(TOKEN, DEVICE, fetcher);
    await recordChartSyncConsent(TOKEN, 'grant', MUTATION, fetcher);

    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/account/bootstrap');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      deviceId: DEVICE,
      platform: 'web',
    });
    const consent = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body));
    expect(consent).toMatchObject({
      decision: 'grant',
      mutationId: MUTATION,
      policyVersion: 'chart-sync-2026-08-12.v1',
    });
    expect(JSON.stringify(consent)).not.toContain('userId');
  });

  it('does not make consent withdrawal depend on a client policy version', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({
      outcome: 'withdrawn', purpose: 'chart_sync', event_id: 2,
    }));
    await recordChartSyncConsent(TOKEN, 'withdraw', MUTATION, fetcher);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      mutationId: MUTATION,
      decision: 'withdraw',
    });
  });

  it('never serializes the browser-local semantic fingerprint', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ outcome: 'saved', revision: 1 }))
      .mockResolvedValueOnce(json({ outcome: 'deleted', revision: 2 }));
    const chart = {
      deviceId: DEVICE,
      chartId: DEVICE,
      baseRevision: 0,
      mutationId: MUTATION,
      label: 'My chart',
      subjectKind: 'self' as const,
      selfAttestation: true as const,
      birth: { date: '1990-01-01', time: null, timeKnown: false, place: null },
      derived: {
        positions: { b: [1], h: 'w' as const, v: '1' },
        timeKnown: false,
        sunSign: 'aries',
        engineVersion: '1',
        houseSystem: 'whole' as const,
      },
      semanticFingerprint: 'must-stay-local',
    };
    await putSelfChart(TOKEN, chart, fetcher);
    await deleteSyncedChart(TOKEN, {
      deviceId: DEVICE,
      chartId: DEVICE,
      baseRevision: 1,
      mutationId: MUTATION,
      semanticFingerprint: 'must-stay-local',
    } as Parameters<typeof deleteSyncedChart>[1], fetcher);

    for (const [, init] of fetcher.mock.calls) {
      expect(String(init?.body)).not.toContain('semanticFingerprint');
    }
  });

  it('validates the export schema', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(
      { schema: 'zodiacs.account.export.v1' },
      200,
      { 'Content-Disposition': 'attachment; filename="zodiacs-account-export.json"' },
    ));
    await expect(downloadAccountExport(TOKEN, fetcher)).resolves.toMatchObject({
      filename: 'zodiacs-account-export.json',
    });
  });

  it('prepares with auth, then checks and finishes only with the same-origin recovery proof', async () => {
    const preparedAt = '2026-08-12T00:00:00.000Z';
    const expiresAt = '2026-08-13T00:00:00.000Z';
    const completedAt = '2026-08-12T00:01:00.000Z';
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({
        outcome: 'prepared', requestId: MUTATION, preparedAt, expiresAt,
        dailySunRevoked: false, dailySunReconciliationRequired: true,
      }))
      .mockResolvedValueOnce(json({
        outcome: 'prepared', requestId: MUTATION, preparedAt, expiresAt, completedAt: null,
        dailySunRevoked: false, dailySunReconciliationRequired: true,
      }))
      .mockResolvedValueOnce(json({
        outcome: 'completed', requestId: MUTATION, completedAt,
        dailySunRevoked: false, dailySunReconciliationRequired: true,
      }));
    const recovery = { requestId: MUTATION, recoverySecret: RECOVERY_SECRET };
    await expect(prepareZodiacsAccountDeletion(TOKEN, recovery, fetcher))
      .resolves.toMatchObject({
        outcome: 'prepared', requestId: MUTATION,
        dailySunRevoked: false, dailySunReconciliationRequired: true,
      });
    await expect(getZodiacsAccountDeletionStatus(recovery, fetcher))
      .resolves.toMatchObject({
        outcome: 'prepared', completedAt: null,
        dailySunRevoked: false, dailySunReconciliationRequired: true,
      });
    await expect(finishZodiacsAccountDeletion(recovery, fetcher))
      .resolves.toMatchObject({
        outcome: 'completed', requestId: MUTATION,
        dailySunRevoked: false, dailySunReconciliationRequired: true,
      });

    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/account/delete-prepare');
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
    });
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      confirmation: 'DELETE',
      requestId: MUTATION,
      recoverySecret: RECOVERY_SECRET,
    });
    for (const index of [1, 2]) {
      expect(fetcher.mock.calls[index]?.[0]).toBe(index === 1
        ? '/api/account/delete-status'
        : '/api/account/delete-finish');
      expect(fetcher.mock.calls[index]?.[1]?.headers).not.toHaveProperty('Authorization');
      expect(fetcher.mock.calls[index]?.[1]?.credentials).toBe('same-origin');
      expect(fetcher.mock.calls[index]?.[1]?.redirect).toBe('error');
      expect(JSON.parse(String(fetcher.mock.calls[index]?.[1]?.body))).toEqual(recovery);
      expect(String(fetcher.mock.calls[index]?.[0])).not.toContain(RECOVERY_SECRET);
    }
  });

  it('fails closed on invalid tokens and non-JSON API failures', async () => {
    await expect(bootstrapAccountV2('not-a-token', DEVICE)).rejects.toMatchObject({
      code: 'unauthorized',
    });
    const fetcher = vi.fn().mockResolvedValue(new Response('gateway', { status: 503 }));
    await expect(bootstrapAccountV2(TOKEN, DEVICE, fetcher)).rejects.toBeInstanceOf(AccountV2ClientError);
  });

  it('rejects malformed deletion recovery capabilities before making a request', async () => {
    const fetcher = vi.fn();
    await expect(getZodiacsAccountDeletionStatus({
      requestId: MUTATION,
      recoverySecret: 'not-a-256-bit-secret',
    }, fetcher)).rejects.toMatchObject({ code: 'invalid_request' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fails closed when a deletion receipt omits Daily Sun reconciliation truth', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({
      outcome: 'completed',
      requestId: MUTATION,
      completedAt: '2026-08-12T00:01:00.000Z',
    }));
    await expect(finishZodiacsAccountDeletion({
      requestId: MUTATION,
      recoverySecret: RECOVERY_SECRET,
    }, fetcher)).rejects.toMatchObject({ code: 'invalid_response' });
  });
});
