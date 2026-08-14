import { h } from 'preact';
import render from 'preact-render-to-string';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import AccountSyncV2Panel, {
  accountDeletionCompletionMessage,
  displayAccountV2Error,
  reconcileBootstrapConsentMetadata,
  reconcilePulledConsent,
} from './AccountSyncV2Panel';
import { AccountV2ClientError } from '../lib/account-v2/client';
import type { AccountSyncMetadataV1 } from '../lib/account-v2/types';

describe('AccountSyncV2Panel server-safe shell', () => {
  it('renders nothing unless the server-computed flag is exactly enabled', () => {
    expect(render(h(AccountSyncV2Panel, { enabled: false }))).toBe('');
  });

  it('states the account-free, private, self-chart-only promise before hydration', () => {
    const markup = render(h(AccountSyncV2Panel, { enabled: true }));
    expect(markup).toContain('Optional Zodiacs account');
    expect(markup).toContain('Charts work without an account');
    expect(markup).toContain('one self chart');
    expect(markup).toContain('Nothing becomes public');
    expect(markup.toLowerCase()).not.toContain('astrofolio');
  });

  it('explains that an unknown result keeps a reconciliation-safe retry identity', () => {
    const message = displayAccountV2Error(
      new AccountV2ClientError('network_unavailable', 0),
      true,
    );
    expect(message).toContain('may have completed');
    expect(message).toContain('saved request identity');
    expect(message).toContain('only when nothing changed');
  });

  it('removes phantom cloud selection after a lost withdrawal response', () => {
    const metadata: AccountSyncMetadataV1 = {
      version: 1,
      accountId: '11111111-1111-4111-8111-111111111111',
      deviceId: '22222222-2222-4222-8222-222222222222',
      serverCursor: '4',
      pendingConsentOperation: {
        version: 1,
        operation: 'consent',
        decision: 'withdraw',
        mutationId: '33333333-3333-4333-8333-333333333333',
        semanticFingerprint: 'a'.repeat(64),
      },
      charts: [{
        chartId: '44444444-4444-4444-8444-444444444444',
        selectedForSync: true,
        serverRevision: 2,
        pendingOperation: {
          version: 1,
          operation: 'delete_chart',
          mutationId: '55555555-5555-4555-8555-555555555555',
          chartId: '44444444-4444-4444-8444-444444444444',
          baseRevision: 2,
          semanticFingerprint: 'b'.repeat(64),
        },
      }],
    };

    const reconciled = reconcileBootstrapConsentMetadata(metadata, 'withdrawn');
    expect(reconciled?.pendingConsentOperation).toBeNull();
    expect(reconciled?.charts[0]).toMatchObject({
      selectedForSync: false,
      pendingOperation: null,
    });
  });

  it('reconciles consent changed on another device before advancing the pull cursor', () => {
    const metadata: AccountSyncMetadataV1 = {
      version: 1,
      accountId: '11111111-1111-4111-8111-111111111111',
      deviceId: '22222222-2222-4222-8222-222222222222',
      serverCursor: '4',
      pendingConsentOperation: null,
      charts: [{
        chartId: '44444444-4444-4444-8444-444444444444',
        selectedForSync: true,
        serverRevision: 2,
        pendingOperation: null,
      }],
    };

    const withdrawn = reconcilePulledConsent(metadata, 'withdraw');
    expect(withdrawn?.consent).toBe('withdrawn');
    expect(withdrawn?.metadata.charts[0]).toMatchObject({
      selectedForSync: false,
      pendingOperation: null,
    });
    expect(reconcilePulledConsent(withdrawn!.metadata, 'grant')?.consent)
      .toBe('granted');
  });

  it('keeps cloud reconciliation available while local consent is off', async () => {
    const source = await readFile(new URL('./AccountSyncV2Panel.tsx', import.meta.url), 'utf8');
    expect(source).toContain('setAccount({ ...account, ...refreshed });');
    expect(source).toContain('disabled={busy}>Check cloud</button>');
  });

  it('keeps an age-ineligible chart local and clears the pending retry', async () => {
    const source = await readFile(new URL('./AccountSyncV2Panel.tsx', import.meta.url), 'utf8');
    expect(source).toContain("result.outcome === 'ineligible_age'");
    expect(source).toContain('pendingOperation: null');
    expect(source).toContain('limited to adults aged 18 or older');
  });

  it('revalidates profile access and ownership immediately before an upload', async () => {
    const source = await readFile(new URL('./AccountSyncV2Panel.tsx', import.meta.url), 'utf8');
    const upload = source.slice(
      source.indexOf('async function onPutChart('),
      source.indexOf('async function onDeleteSyncedChart('),
    );
    const send = upload.indexOf('await putSelfChart(session.access_token, wire)');
    expect(upload).toContain('const accessGeneration = profileAccessGeneration.current;');
    const checks = [...upload.matchAll(/assertActiveProfileBoundaryCurrent\(/gu)]
      .map((match) => match.index);
    expect(checks.length).toBeGreaterThanOrEqual(3);
    expect(send).toBeGreaterThan(checks[1]);
    expect(send).toBeLessThan(checks[2]);
  });

  it('does not recreate account metadata after an access-only device clear', async () => {
    const source = await readFile(new URL('./AccountSyncV2Panel.tsx', import.meta.url), 'utf8');
    const helper = source.slice(
      source.indexOf('function activeProfileBoundaryCurrent('),
      source.indexOf('function beginAuthTransition('),
    );
    expect(source).toContain('return generation === profileAccessGeneration.current;');
    expect(helper).toContain('!profileAccessGenerationCurrent(generation)');
    expect(helper).toContain('!profileAccessAllowed()');
    expect(helper).toContain('const owner = readLocalAccountOwner(storage);');
    expect(helper).toContain("owner.status === 'ready' && owner.accountId === accountId");

    for (const action of ['onConsent', 'onPutChart', 'onDeleteCloud']) {
      const start = source.indexOf(`async function ${action}(`);
      const next = source.indexOf('\n  async function ', start + 1);
      const body = source.slice(start, next === -1 ? undefined : next);
      expect(body, action).toContain('const accessGeneration = profileAccessGeneration.current;');
      expect(body.match(/assertActiveProfileBoundaryCurrent\(/gu)?.length, action)
        .toBeGreaterThanOrEqual(2);
    }
  });

  it('does not overclaim Daily Sun cleanup after a recovered deletion response', () => {
    expect(accountDeletionCompletionMessage(false, {
      dailySunRevoked: false,
      dailySunReconciliationRequired: true,
    })).toContain('cleanup could not be confirmed');
    expect(accountDeletionCompletionMessage(true, {
      dailySunRevoked: true,
      dailySunReconciliationRequired: false,
    })).toContain('subscription for this email was deleted');
  });

  it('retries a completed receipt and retains its recovery proof while provider cleanup is pending', async () => {
    const source = await readFile(new URL('./AccountSyncV2Panel.tsx', import.meta.url), 'utf8');
    expect(source).toContain("!completed || deletionReceipt?.dailySunReconciliationRequired");
    expect(source).toContain("status.outcome === 'prepared' || status.dailySunReconciliationRequired");
    expect(source).toContain('preserveRecovery || clearConfirmedAccountDeletionRequest');
  });

  it('keeps export, withdrawal, and permanent deletion reachable when sync bootstrap is unavailable', async () => {
    const source = await readFile(new URL('./AccountSyncV2Panel.tsx', import.meta.url), 'utf8');
    expect(source).toContain('Account privacy controls remain available');
    expect(source).toContain('onClick={() => void onPrivacyWithdraw()}');
    expect(source).toContain("onClick={() => setView('deleting')}");
    expect(source.match(/Download account export/gu)?.length).toBeGreaterThanOrEqual(4);
    expect(source.match(/Permanently delete/gu)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("result.outcome === 'not_bootstrapped'");
    expect(source).toContain("result.outcome === 'device_limit_reached'");
    expect(source).toContain('persistAccountPrivacyWithdrawal');
  });
});
