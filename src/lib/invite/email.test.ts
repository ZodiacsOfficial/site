import { describe, expect, it, vi } from 'vitest';
import {
  compatibilityInviteRecipientHash,
  dispatchCompatibilityInviteCompletionEmail,
  renderCompatibilityInviteCompletionEmail,
} from './email';

const OWNER_ID = '110e8400-e29b-41d4-a716-446655440000';
const INVITE_ID = '330e8400-e29b-41d4-a716-446655440000';
const ENV = {
  PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
  COMPAT_INVITE_RECIPIENT_HASH_SECRET: 's'.repeat(32),
  RESEND_API_KEY: 'resend-test',
  RESEND_FROM_EMAIL: 'Zodiacs <admin@zodiacs.org>',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Phase 4 completion email', () => {
  it('matches the approved one-shot copy in HTML and plain text', () => {
    const email = renderCompatibilityInviteCompletionEmail(
      'Frida <private>',
      '2026-07-24T08:15:00.000Z',
    );
    expect(email.subject).toBe('Your invitation was read');
    expect(email.text).toContain('COMPATIBILITY INVITATION · FRIDAY, JULY 24, 2026');
    expect(email.text).toContain('The link has closed, and the positions it carried are deleted.');
    expect(email.text).toContain('Nothing recurring, nothing else to manage.');
    expect(email.html).toContain('Frida &lt;private&gt;');
    expect(email.html).not.toContain('<img');
    expect(email.html).not.toMatch(/tracking|pixel|open[_-]?track/iu);
  });

  it('uses a keyed, normalized recipient digest instead of an address', () => {
    const env = { COMPAT_INVITE_RECIPIENT_HASH_SECRET: 's'.repeat(32) };
    const first = compatibilityInviteRecipientHash('Person@Example.com', env);
    expect(first).toBe(compatibilityInviteRecipientHash('person@example.com', env));
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    expect(first).not.toContain('person');
    expect(() => compatibilityInviteRecipientHash('a@example.com', {
      COMPAT_INVITE_RECIPIENT_HASH_SECRET: 'short',
    })).toThrow(/at least 32/u);
  });

  it('does not call the provider after the durable delivery claim reports a duplicate', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith(`/auth/v1/admin/users/${OWNER_ID}`)) {
        return json({ id: OWNER_ID, email: 'owner@example.com' });
      }
      if (url.endsWith('/rest/v1/rpc/reserve_compatibility_invite_delivery')) {
        return json({ outcome: 'duplicate', state: 'sent' });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(dispatchCompatibilityInviteCompletionEmail({
      inviteId: INVITE_ID,
      ownerUserId: OWNER_ID,
      label: 'Private chart',
      completedAt: '2026-07-24T08:15:00.000Z',
      notify: true,
    }, ENV, fetcher)).resolves.toEqual({ outcome: 'duplicate' });

    expect(fetcher.mock.calls.some(([input]) => String(input).includes('api.resend.com'))).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('records the provider receipt after a successful send', async () => {
    let finalizeBody: Record<string, unknown> | null = null;
    const fetcher = vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      if (url.endsWith(`/auth/v1/admin/users/${OWNER_ID}`)) {
        return json({ id: OWNER_ID, email: 'owner@example.com' });
      }
      if (url.endsWith('/rest/v1/rpc/reserve_compatibility_invite_delivery')) {
        return json({ outcome: 'reserved' });
      }
      if (url === 'https://api.resend.com/emails') {
        expect(new Headers(init?.headers).get('Idempotency-Key'))
          .toBe(`compat-invite-${INVITE_ID}`);
        return json({ id: 'receipt_1234' }, 200);
      }
      if (url.endsWith('/rest/v1/rpc/finalize_compatibility_invite_delivery')) {
        finalizeBody = JSON.parse(String(init?.body));
        return json({ outcome: 'finalized', state: 'sent' });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(dispatchCompatibilityInviteCompletionEmail({
      inviteId: INVITE_ID,
      ownerUserId: OWNER_ID,
      label: 'Private chart',
      completedAt: '2026-07-24T08:15:00.000Z',
      notify: true,
    }, ENV, fetcher)).resolves.toEqual({
      outcome: 'sent',
      providerReceipt: 'receipt_1234',
    });

    expect(finalizeBody).toMatchObject({
      candidate_invite_id: INVITE_ID,
      candidate_outcome: 'sent',
      candidate_provider_receipt: 'receipt_1234',
      candidate_provider_status: 200,
    });
  });

  it('finalizes a failed claim when the provider rejects the send', async () => {
    let finalizeBody: Record<string, unknown> | null = null;
    const fetcher = vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      if (url.endsWith(`/auth/v1/admin/users/${OWNER_ID}`)) {
        return json({ id: OWNER_ID, email: 'owner@example.com' });
      }
      if (url.endsWith('/rest/v1/rpc/reserve_compatibility_invite_delivery')) {
        return json({ outcome: 'reserved' });
      }
      if (url === 'https://api.resend.com/emails') {
        return json({ error: 'provider failure' }, 500);
      }
      if (url.endsWith('/rest/v1/rpc/finalize_compatibility_invite_delivery')) {
        finalizeBody = JSON.parse(String(init?.body));
        return json({ outcome: 'finalized', state: 'failed' });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(dispatchCompatibilityInviteCompletionEmail({
      inviteId: INVITE_ID,
      ownerUserId: OWNER_ID,
      label: 'Private chart',
      completedAt: '2026-07-24T08:15:00.000Z',
      notify: true,
    }, ENV, fetcher)).resolves.toEqual({ outcome: 'failed' });

    expect(finalizeBody).toMatchObject({
      candidate_invite_id: INVITE_ID,
      candidate_outcome: 'failed',
      candidate_provider_receipt: null,
      candidate_provider_status: 500,
    });
  });
});
