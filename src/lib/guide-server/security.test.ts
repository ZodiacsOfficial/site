import { describe, expect, it } from 'vitest';
import { guideOperationHash } from './security';

const SECRET = 'guide-test-secret-that-is-long-enough-for-hmac';
const CONVERSATION = '11111111-1111-4111-8111-111111111111';
const OPERATION = '22222222-2222-4222-8222-222222222222';

describe('Guide durable operation identity', () => {
  it('derives one opaque key across instances without exposing protocol IDs', () => {
    const first = guideOperationHash(SECRET, CONVERSATION, OPERATION);
    const second = guideOperationHash(SECRET, CONVERSATION, OPERATION);

    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(second).toBe(first);
    expect(first).not.toContain(CONVERSATION);
    expect(first).not.toContain(OPERATION);
  });

  it('domain-separates conversations, operations, and secret rotations', () => {
    const original = guideOperationHash(SECRET, CONVERSATION, OPERATION);
    expect(guideOperationHash(
      SECRET,
      '33333333-3333-4333-8333-333333333333',
      OPERATION,
    )).not.toBe(original);
    expect(guideOperationHash(
      SECRET,
      CONVERSATION,
      '44444444-4444-4444-8444-444444444444',
    )).not.toBe(original);
    expect(guideOperationHash(`${SECRET}-rotated`, CONVERSATION, OPERATION)).not.toBe(original);
  });

  it('fails closed for malformed IDs or signing secrets', () => {
    expect(guideOperationHash('short', CONVERSATION, OPERATION)).toBeNull();
    expect(guideOperationHash(SECRET, 'not-a-uuid', OPERATION)).toBeNull();
    expect(guideOperationHash(SECRET, CONVERSATION, 'not-a-uuid')).toBeNull();
  });
});
