import { describe, expect, it } from 'vitest';
import { parseReadyRemoteChart } from './remote-chart';

const BODY = Array.from({ length: 12 }, (_, index) => index * 20);

function response(): Record<string, unknown> {
  return {
    outcome: 'ready',
    chart_id: '11111111-1111-4111-8111-111111111111',
    label: 'My chart',
    subject_kind: 'self',
    subject_attestation: 'self_declared_v1',
    revision: 3,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    derived: {
      positions: { b: BODY, a: [42, 140], h: 'w', v: '1.2.3' },
      time_known: true,
      sun_sign: 'aries',
      engine_version: '1.2.3',
      house_system: 'whole',
    },
    birth: {
      date: '1990-01-01',
      time: '12:34',
      timeKnown: true,
      place: {
        name: 'Bangkok', admin1: 'Bangkok', country: 'TH',
        lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok',
      },
    },
  };
}

describe('decrypted account chart projection', () => {
  it('accepts only the self-attested ready shape and omits encrypted internals', () => {
    expect(parseReadyRemoteChart(response())).toMatchObject({
      chartId: '11111111-1111-4111-8111-111111111111',
      revision: 3,
      birth: { date: '1990-01-01' },
    });
    expect(JSON.stringify(parseReadyRemoteChart(response()))).not.toContain('ciphertext');
    expect(parseReadyRemoteChart({ ...response(), encrypted_source: {} })).toBeNull();
    expect(parseReadyRemoteChart({ ...response(), subject_kind: 'other' })).toBeNull();
  });

  it('rejects birth/derived time mismatches and extra private fields', () => {
    const mismatch = response();
    mismatch.derived = { ...(mismatch.derived as object), time_known: false };
    expect(parseReadyRemoteChart(mismatch)).toBeNull();
    const extra = response();
    extra.birth = { ...(extra.birth as object), email: 'private@example.com' };
    expect(parseReadyRemoteChart(extra)).toBeNull();
  });

  it('uses the upload protocol code-point and UTF-8 limits for restored labels', () => {
    expect(parseReadyRemoteChart({ ...response(), label: '🪐'.repeat(100) })).not.toBeNull();
    expect(parseReadyRemoteChart({ ...response(), label: 'a'.repeat(121) })).toBeNull();

    const byteOverflow = '🪐'.repeat(121);
    expect(new TextEncoder().encode(byteOverflow).byteLength).toBeGreaterThan(480);
    expect(parseReadyRemoteChart({ ...response(), label: byteOverflow })).toBeNull();
  });
});
