import { getSupabaseClient } from '../supabase/client';
import { isAccountV2Id } from '../account-v2/storage-identity';
import { parseLivingMoment } from './schema';
import {
  LIVING_CHART_MOMENT_SCHEMA,
  type LivingChartOwnerScope,
  type LivingMomentV1,
} from './types';

export const LIVING_CHART_CLOUD_MOMENT_SCHEMA = 'zodiacs.living-chart.cloud-moment.v1' as const;
export const LIVING_CHART_SYNC_CONSENT_PURPOSE = 'living_chart_sync' as const;
export const LIVING_CHART_SYNC_POLICY_VERSION = 'living-chart-sync-2026-08-18.v1' as const;
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.PUBLIC_SUPABASE_ANON_KEY) as string | undefined;
const MAX_CLOUD_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_CLOUD_SNAPSHOT_BYTES = 10 * 1024 * 1024;
const MAX_CLOUD_SNAPSHOT_ROWS = 1_000;

export type LivingChartConsentState = 'pending' | 'granted' | 'withdrawn';

export interface LivingChartCloudConsent {
  state: LivingChartConsentState;
  consentEpoch: number;
  policyVersion: string | null;
}

export type LivingChartConsentMutationResult =
  | { outcome: 'updated'; consent: LivingChartCloudConsent }
  | { outcome: 'stale'; consent: LivingChartCloudConsent }
  | { outcome: 'temporarily_disabled' }
  | { outcome: 'consent_epoch_limit_reached' };

export interface LivingChartCloudMomentPayload {
  schema: typeof LIVING_CHART_CLOUD_MOMENT_SCHEMA;
  primaryChartId: string;
  occurredAt: string;
  timePrecision: LivingMomentV1['timePrecision'];
  category?: LivingMomentV1['category'];
  note?: string;
  forecast: LivingMomentV1['forecast'];
  reflectionQuestionId: string;
}

export interface LivingChartCloudSnapshotRow {
  momentId: string;
  consentEpoch: number;
  revision: number;
  payload: LivingChartCloudMomentPayload | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type LivingChartCloudMutationResult =
  | { outcome: 'saved'; revision: number; updatedAt: string }
  | { outcome: 'conflict'; revision: number; deleted: boolean }
  | { outcome: 'moment_limit_reached' | 'consent_required' | 'consent_stale' | 'mutation_conflict' | 'temporarily_disabled' };

export type LivingChartCloudDeleteResult =
  | { outcome: 'deleted' | 'already_deleted'; revision: number; updatedAt: string }
  | { outcome: 'conflict'; revision: number; deleted: boolean }
  | { outcome: 'consent_stale' | 'mutation_conflict' };

export type LivingChartCloudSnapshotResult =
  | {
      outcome: 'ready';
      consentEpoch: number;
      moments: LivingChartCloudSnapshotRow[];
    }
  | { outcome: 'consent_required' | 'consent_stale' };

type LivingChartCloudSnapshotPage =
  | {
      outcome: 'ready';
      consentEpoch: number;
      moments: LivingChartCloudSnapshotRow[];
      hasMore: boolean;
      nextAfter: string | null;
    }
  | { outcome: 'consent_required' | 'consent_stale' };

export interface LivingChartCloudClient {
  readConsent(): Promise<LivingChartCloudConsent>;
  setConsent(
    decision: 'grant' | 'withdraw',
    mutationId: string,
    expectedConsentEpoch: number,
  ): Promise<LivingChartConsentMutationResult>;
  put(moment: LivingMomentV1, consentEpoch: number, mutationId: string): Promise<LivingChartCloudMutationResult>;
  delete(moment: LivingMomentV1, consentEpoch: number, mutationId: string): Promise<LivingChartCloudDeleteResult>;
  snapshot(consentEpoch: number): Promise<LivingChartCloudSnapshotResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeInteger(value: unknown, minimum = 0): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum;
}

function instant(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function unwrapRpcData(value: unknown): unknown {
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

export function livingMomentCloudPayload(moment: LivingMomentV1): LivingChartCloudMomentPayload {
  return {
    schema: LIVING_CHART_CLOUD_MOMENT_SCHEMA,
    primaryChartId: moment.primaryChartId,
    occurredAt: moment.occurredAt,
    timePrecision: moment.timePrecision,
    ...(moment.category === undefined ? {} : { category: moment.category }),
    ...(moment.note === undefined ? {} : { note: moment.note }),
    forecast: moment.forecast,
    reflectionQuestionId: moment.reflectionQuestionId,
  };
}

function parseCloudPayload(value: unknown): LivingChartCloudMomentPayload | null {
  if (!isRecord(value) || value.schema !== LIVING_CHART_CLOUD_MOMENT_SCHEMA) return null;
  // Reuse the local strict parser so cloud content cannot widen the IndexedDB
  // schema. Synthetic metadata is discarded after validation.
  const owner: LivingChartOwnerScope = { kind: 'account', accountId: '00000000-0000-4000-8000-000000000000' };
  const parsed = parseLivingMoment({
    id: '00000000-0000-4000-8000-000000000001',
    owner,
    ...value,
    schema: LIVING_CHART_MOMENT_SCHEMA,
    revision: 1,
    baseRevision: 0,
    syncState: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  });
  if (!parsed) return null;
  return livingMomentCloudPayload(parsed);
}

export function cloudSnapshotMoment(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  row: LivingChartCloudSnapshotRow,
): LivingMomentV1 | null {
  if (!row.payload || row.deletedAt !== null) return null;
  return parseLivingMoment({
    id: row.momentId,
    owner,
    ...row.payload,
    schema: LIVING_CHART_MOMENT_SCHEMA,
    revision: row.revision,
    baseRevision: row.revision,
    syncState: 'synced',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: null,
  });
}

function parseConsentRow(value: unknown): LivingChartCloudConsent | null {
  if (!isRecord(value)
    || value.purpose !== LIVING_CHART_SYNC_CONSENT_PURPOSE
    || (value.state !== 'pending' && value.state !== 'granted' && value.state !== 'withdrawn')
    || !safeInteger(value.consent_epoch, 0)
    || (value.policy_version !== null && typeof value.policy_version !== 'string')) return null;
  return {
    state: value.state,
    consentEpoch: value.consent_epoch,
    policyVersion: value.policy_version,
  };
}

function parseConsentMutation(value: unknown): LivingChartConsentMutationResult | null {
  if (!isRecord(value)
    || (value.outcome !== 'granted'
      && value.outcome !== 'withdrawn'
      && value.outcome !== 'consent_stale'
      && value.outcome !== 'temporarily_disabled'
      && value.outcome !== 'consent_epoch_limit_reached')) return null;
  if (value.outcome === 'temporarily_disabled' || value.outcome === 'consent_epoch_limit_reached') {
    return { outcome: value.outcome };
  }
  if (value.outcome === 'consent_stale') {
    if ((value.state !== 'pending' && value.state !== 'granted' && value.state !== 'withdrawn')
      || !safeInteger(value.current_consent_epoch, 0)) return null;
    return {
      outcome: 'stale',
      consent: {
        state: value.state,
        consentEpoch: value.current_consent_epoch,
        policyVersion: value.state === 'granted' ? LIVING_CHART_SYNC_POLICY_VERSION : null,
      },
    };
  }
  if (value.purpose !== LIVING_CHART_SYNC_CONSENT_PURPOSE
    || !safeInteger(value.consent_epoch, 1)) return null;
  return {
    outcome: 'updated',
    consent: {
      state: value.outcome,
      consentEpoch: value.consent_epoch,
      policyVersion: value.outcome === 'granted' ? LIVING_CHART_SYNC_POLICY_VERSION : null,
    },
  };
}

export function parseLivingChartCloudConsentMutationResult(
  value: unknown,
): LivingChartConsentMutationResult | null {
  return parseConsentMutation(value);
}

function parseMutation(value: unknown): LivingChartCloudMutationResult | null {
  if (!isRecord(value) || typeof value.outcome !== 'string') return null;
  if (value.outcome === 'saved'
    && safeInteger(value.revision, 1)
    && instant(value.updated_at ?? value.updatedAt)) {
    return {
      outcome: 'saved',
      revision: value.revision,
      updatedAt: (value.updated_at ?? value.updatedAt) as string,
    };
  }
  if (value.outcome === 'conflict'
    && safeInteger(value.current_revision ?? value.revision, 1)
    && typeof value.deleted === 'boolean') {
    return {
      outcome: 'conflict',
      revision: (value.current_revision ?? value.revision) as number,
      deleted: value.deleted,
    };
  }
  if (value.outcome === 'moment_limit_reached'
    || value.outcome === 'consent_required'
    || value.outcome === 'consent_stale'
    || value.outcome === 'mutation_conflict'
    || value.outcome === 'temporarily_disabled') return { outcome: value.outcome };
  return null;
}

function parseDeleteMutation(value: unknown): LivingChartCloudDeleteResult | null {
  if (!isRecord(value) || typeof value.outcome !== 'string') return null;
  if ((value.outcome === 'deleted' || value.outcome === 'already_deleted')
    && safeInteger(value.revision, 1)
    && instant(value.updated_at ?? value.updatedAt)) {
    return {
      outcome: value.outcome,
      revision: value.revision,
      updatedAt: (value.updated_at ?? value.updatedAt) as string,
    };
  }
  if (value.outcome === 'conflict'
    && safeInteger(value.current_revision ?? value.revision, 1)
    && typeof value.deleted === 'boolean') {
    return {
      outcome: 'conflict',
      revision: (value.current_revision ?? value.revision) as number,
      deleted: value.deleted,
    };
  }
  if (value.outcome === 'consent_stale' || value.outcome === 'mutation_conflict') {
    return { outcome: value.outcome };
  }
  return null;
}

export function parseLivingChartCloudDeleteResult(value: unknown): LivingChartCloudDeleteResult | null {
  return parseDeleteMutation(value);
}

function parseSnapshotRow(value: unknown): LivingChartCloudSnapshotRow | null {
  if (!isRecord(value)
    || !isAccountV2Id(value.moment_id)
    || !safeInteger(value.consent_epoch, 1)
    || !safeInteger(value.revision, 1)
    || !instant(value.created_at)
    || !instant(value.updated_at)
    || (value.deleted_at !== null && !instant(value.deleted_at))) return null;
  const payload = value.payload === null ? null : parseCloudPayload(value.payload);
  if (value.payload !== null && !payload) return null;
  if ((payload === null) !== (value.deleted_at !== null)) return null;
  return {
    momentId: value.moment_id.toLowerCase(),
    consentEpoch: value.consent_epoch,
    revision: value.revision,
    payload,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    deletedAt: value.deleted_at,
  };
}

function parseSnapshotPage(value: unknown): LivingChartCloudSnapshotPage | null {
  if (!isRecord(value) || typeof value.outcome !== 'string') return null;
  if (value.outcome === 'consent_required' || value.outcome === 'consent_stale') {
    return { outcome: value.outcome };
  }
  if (value.outcome !== 'ready'
    || value.purpose !== LIVING_CHART_SYNC_CONSENT_PURPOSE
    || !safeInteger(value.consent_epoch, 1)
    || !Array.isArray(value.moments)
    || value.moments.length > 50
    || typeof value.has_more !== 'boolean'
    || (value.next_after !== null && !isAccountV2Id(value.next_after))) return null;
  const moments = value.moments.map(parseSnapshotRow);
  return moments.some((moment) => moment === null)
    ? null
    : {
        outcome: 'ready',
        consentEpoch: value.consent_epoch,
        moments: moments as LivingChartCloudSnapshotRow[],
        hasMore: value.has_more,
        nextAfter: typeof value.next_after === 'string' ? value.next_after.toLowerCase() : null,
      };
}

export async function collectLivingChartSnapshotPages(
  consentEpoch: number,
  fetchPage: (after: string | null) => Promise<unknown>,
): Promise<LivingChartCloudSnapshotResult> {
  const moments: LivingChartCloudSnapshotRow[] = [];
  const seen = new Set<string>();
  let after: string | null = null;
  let totalBytes = 0;
  let pageCount = 0;
  for (;;) {
    if (pageCount >= 20) throw new Error('living-chart-cloud-snapshot-too-large');
    pageCount += 1;
    const parsed = parseSnapshotPage(unwrapRpcData(await fetchPage(after)));
    if (!parsed) throw new Error('living-chart-cloud-invalid-snapshot');
    if (parsed.outcome !== 'ready') return parsed;
    if (parsed.consentEpoch !== consentEpoch) throw new Error('living-chart-cloud-stale-snapshot');
    let lastSeen = after;
    for (const row of parsed.moments) {
      if (seen.has(row.momentId)
        || (lastSeen !== null && row.momentId <= lastSeen)) {
        throw new Error('living-chart-cloud-invalid-snapshot-order');
      }
      seen.add(row.momentId);
      moments.push(row);
      totalBytes += new TextEncoder().encode(JSON.stringify(row)).byteLength;
      if (moments.length > MAX_CLOUD_SNAPSHOT_ROWS || totalBytes > MAX_CLOUD_SNAPSHOT_BYTES) {
        throw new Error('living-chart-cloud-snapshot-too-large');
      }
      lastSeen = row.momentId;
    }
    if (!parsed.hasMore) {
      if (parsed.nextAfter !== null) throw new Error('living-chart-cloud-invalid-snapshot-cursor');
      return { outcome: 'ready', consentEpoch, moments };
    }
    const last = parsed.moments.at(-1)?.momentId ?? null;
    if (!parsed.nextAfter || parsed.nextAfter !== last || parsed.nextAfter === after) {
      throw new Error('living-chart-cloud-invalid-snapshot-cursor');
    }
    after = parsed.nextAfter;
  }
}

export function createLivingChartCloudClient(
  expectedAccountId: string,
  fetcher: typeof fetch = fetch,
): LivingChartCloudClient | null {
  const client = getSupabaseClient();
  if (!client || !SUPABASE_URL || !SUPABASE_KEY || !isAccountV2Id(expectedAccountId)) return null;
  const accountId = expectedAccountId.toLowerCase();

  const request = async (path: string, init: RequestInit): Promise<unknown> => {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const session = sessionData.session;
    if (sessionError || !session || session.user.id.toLowerCase() !== accountId) {
      throw new Error('living-chart-account-changed');
    }
    const accessToken = session.access_token;
    const { data: verified, error: verificationError } = await client.auth.getUser(accessToken);
    if (verificationError || verified.user?.id.toLowerCase() !== accountId) {
      throw new Error('living-chart-account-changed');
    }
    let response: Response;
    let responseText: string;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 15_000);
    try {
      response = await fetcher(`${SUPABASE_URL}${path}`, {
        ...init,
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${accessToken}`,
          ...init.headers,
        },
      });
      // Keep the timeout active through body consumption; fetch can resolve at
      // headers while a stalled or hostile body never completes.
      responseText = await response.text();
    } catch {
      throw new Error('living-chart-cloud-network');
    } finally {
      globalThis.clearTimeout(timeout);
    }
    if (new TextEncoder().encode(responseText).byteLength > MAX_CLOUD_RESPONSE_BYTES) {
      throw new Error('living-chart-cloud-response-too-large');
    }
    if (!response.ok) throw new Error(`living-chart-cloud-http-${response.status}`);
    // Discard a response after an account switch. The captured bearer token
    // still guaranteed that the request itself could only touch account A.
    const { data: currentData, error: currentError } = await client.auth.getUser();
    if (currentError || currentData.user?.id.toLowerCase() !== accountId) {
      throw new Error('living-chart-account-changed');
    }
    try {
      return JSON.parse(responseText) as unknown;
    } catch {
      throw new Error('living-chart-cloud-invalid-json');
    }
  };

  const rpc = (name: string, body: Record<string, unknown>) => request(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    async readConsent() {
      const value = await request(`/rest/v1/living_chart_sync_consents?select=purpose,state,consent_epoch,policy_version&user_id=eq.${encodeURIComponent(accountId)}&purpose=eq.${LIVING_CHART_SYNC_CONSENT_PURPOSE}`, {
        method: 'GET',
      });
      const rows = Array.isArray(value) ? value : null;
      if (!rows || rows.length > 1) throw new Error('living-chart-cloud-invalid-consent');
      if (rows.length === 0) return { state: 'pending', consentEpoch: 0, policyVersion: null };
      const parsed = parseConsentRow(rows[0]);
      if (!parsed) throw new Error('living-chart-cloud-invalid-consent');
      return parsed;
    },
    async setConsent(decision, mutationId, expectedConsentEpoch) {
      const result = await rpc('set_living_chart_sync_consent', {
        candidate_decision: decision,
        candidate_mutation_id: mutationId,
        candidate_expected_consent_epoch: expectedConsentEpoch,
        candidate_policy_version: decision === 'grant' ? LIVING_CHART_SYNC_POLICY_VERSION : null,
      });
      const parsed = parseConsentMutation(unwrapRpcData(result));
      if (!parsed) throw new Error('living-chart-cloud-invalid-consent-response');
      return parsed;
    },
    async put(moment, consentEpoch, mutationId) {
      const result = await rpc('put_living_chart_moment', {
        candidate_moment_id: moment.id,
        candidate_base_revision: moment.baseRevision,
        candidate_consent_epoch: consentEpoch,
        candidate_mutation_id: mutationId,
        candidate_payload: livingMomentCloudPayload(moment),
      });
      const parsed = parseMutation(unwrapRpcData(result));
      if (!parsed) throw new Error('living-chart-cloud-invalid-put-response');
      return parsed;
    },
    async delete(moment, consentEpoch, mutationId) {
      const result = await rpc('delete_living_chart_moment', {
        candidate_moment_id: moment.id,
        candidate_base_revision: moment.baseRevision,
        candidate_consent_epoch: consentEpoch,
        candidate_mutation_id: mutationId,
      });
      const parsed = parseDeleteMutation(unwrapRpcData(result));
      if (!parsed) throw new Error('living-chart-cloud-invalid-delete-response');
      return parsed;
    },
    async snapshot(consentEpoch) {
      return collectLivingChartSnapshotPages(consentEpoch, (after) => (
        rpc('living_chart_sync_snapshot', {
          candidate_consent_epoch: consentEpoch,
          candidate_after_moment_id: after,
        })
      ));
    },
  };
}

export async function getLivingChartCloudAccountId(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user?.id?.toLowerCase() ?? null;
}

const cloudAuthListeners = new Set<() => void>();
let stopCloudAuthSubscription: (() => void) | null = null;

export function subscribeLivingChartCloudAuth(listener: () => void): () => void {
  cloudAuthListeners.add(listener);
  if (!stopCloudAuthSubscription) {
    const client = getSupabaseClient();
    if (client) {
      const { data } = client.auth.onAuthStateChange(() => {
        for (const notify of [...cloudAuthListeners]) notify();
      });
      stopCloudAuthSubscription = () => data.subscription.unsubscribe();
    }
  }
  return () => {
    cloudAuthListeners.delete(listener);
    if (cloudAuthListeners.size === 0 && stopCloudAuthSubscription) {
      stopCloudAuthSubscription();
      stopCloudAuthSubscription = null;
    }
  };
}
