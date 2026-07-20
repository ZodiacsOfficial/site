import { createHash } from 'node:crypto';
import { hasDailyChartEmailProvider, hasDailyChartPreferenceAccess } from '../../src/lib/email/daily-config.js';
import { isIanaTimezone } from '../../src/lib/email/daily-chart-token.js';
import { createDailyChartOptInToken } from '../../src/lib/email/daily-chart-token.js';
import { isAllowedEmailCaptureRequest } from '../../src/lib/email/request.js';
import {
  authenticateEmailUser,
  deleteDailyChartPreference,
  deletePendingDailyChartPreference,
  getDailyChartPreference,
  getOwnedDailyChart,
  pauseOrCancelDailyChartForDeletion,
  replacePendingDailyChartPreference,
  replaceConfirmedDailyChartPreferenceWithPending,
  savePendingDailyChartPreference,
  updateConfirmedDailyChartPreference,
} from '../../src/lib/email/daily-server.js';
import { sendDailyChartConfirmation } from '../../src/lib/email/daily-resend.js';
import { dailyRecipientHash } from '../../src/lib/daily-email/identity.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHART_RESEND_DEBOUNCE_MS = 60_000;

function sendJson(res: any, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function parseBody(input: unknown): { chartId: string; timezone: string } | null {
  let body = input;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return null; }
  }
  if (!body || typeof body !== 'object') return null;
  const candidate = body as { chartId?: unknown; timezone?: unknown };
  return typeof candidate.chartId === 'string'
    && UUID.test(candidate.chartId)
    && isIanaTimezone(candidate.timezone)
    ? { chartId: candidate.chartId, timezone: candidate.timezone }
    : null;
}

function parsePauseBody(input: unknown): { chartId: string } | null {
  let body = input;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return null; }
  }
  if (!body || typeof body !== 'object') return null;
  const chartId = (body as { chartId?: unknown }).chartId;
  return typeof chartId === 'string' && UUID.test(chartId) ? { chartId } : null;
}

function isResendBody(input: unknown): boolean {
  let body = input;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return false; }
  }
  return Boolean(body
    && typeof body === 'object'
    && !Array.isArray(body)
    && (body as { action?: unknown }).action === 'resend');
}

function maskedEmail(email: string): string {
  const at = email.indexOf('@');
  return at > 0 ? `${email[0]}…${email.slice(at)}` : 'this address';
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    sendJson(res, 405, { error: 'method' });
    return;
  }
  if (!isAllowedEmailCaptureRequest(req)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }
  const configured = req.method === 'POST'
    ? hasDailyChartEmailProvider(process.env)
    : hasDailyChartPreferenceAccess(process.env);
  if (!configured) {
    sendJson(res, 503, { error: 'disabled' });
    return;
  }

  try {
    const user = await authenticateEmailUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      const preference = await getDailyChartPreference(user.id);
      const hashSecret = process.env.DAILY_EMAIL_RECIPIENT_HASH_SECRET ?? '';
      const currentRecipientHash = hashSecret.length >= 32
        ? dailyRecipientHash(user.email, hashSecret)
        : null;
      const recipientCurrent = currentRecipientHash === preference?.recipientHash;
      const requiresConfirmation = Boolean(
        preference?.confirmedAt
        && !recipientCurrent,
      );
      sendJson(res, 200, preference
        ? {
          enabled: preference.confirmedAt !== null && recipientCurrent,
          pending: preference.pending,
          paused: preference.paused,
          requiresConfirmation,
          chartId: preference.chartId,
          timezone: preference.timezone,
          confirmedAt: preference.confirmedAt,
          // A pending row may predate an Auth email change. Never label the
          // old request with the new address; resend explicitly moves consent.
          maskedEmail: recipientCurrent && preference.pending
            ? maskedEmail(user.email)
            : null,
        }
        : {
          enabled: false,
          pending: false,
          paused: false,
          requiresConfirmation: false,
          maskedEmail: null,
        });
      return;
    }

    if (req.method === 'DELETE') {
      await deleteDailyChartPreference(user.id);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'PATCH') {
      const input = parsePauseBody(req.body);
      if (!input) {
        sendJson(res, 400, { error: 'invalid' });
        return;
      }
      const result = await pauseOrCancelDailyChartForDeletion(user.id, input.chartId);
      sendJson(res, 200, {
        ok: true,
        paused: result.outcome === 'paused',
        cancelled: result.outcome === 'cancelled',
        selectedChartId: result.selectedChartId,
      });
      return;
    }

    if (isResendBody(req.body)) {
      const existing = await getDailyChartPreference(user.id);
      if (!existing?.pending
        || !existing.chartId
        || !existing.confirmationTokenHash
        || !existing.timezone) {
        sendJson(res, 409, { error: 'not_pending' });
        return;
      }
      const chart = await getOwnedDailyChart(user.id, existing.chartId);
      if (!chart) {
        sendJson(res, 409, { error: 'chart_unavailable' });
        return;
      }
      const recipientHash = dailyRecipientHash(
        user.email,
        process.env.DAILY_EMAIL_RECIPIENT_HASH_SECRET ?? '',
      );
      const token = createDailyChartOptInToken({
        userId: user.id,
        chartId: existing.chartId,
        recipientHash,
        timezone: existing.timezone,
      }, process.env.EMAIL_CONFIRM_SECRET ?? '');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const replaced = await replacePendingDailyChartPreference(
        user.id,
        existing.confirmationTokenHash,
        existing.chartId,
        recipientHash,
        tokenHash,
        existing.timezone,
        {
          notUpdatedAfter: new Date(Date.now() - CHART_RESEND_DEBOUNCE_MS).toISOString(),
        },
      );
      if (!replaced) {
        const latest = await getDailyChartPreference(user.id);
        if (latest?.pending
          && latest.confirmationTokenHash === existing.confirmationTokenHash) {
          res.setHeader('Retry-After', String(CHART_RESEND_DEBOUNCE_MS / 1000));
          sendJson(res, 429, { error: 'rate_limited' });
          return;
        }
        sendJson(res, 409, { error: 'not_pending' });
        return;
      }
      try {
        await sendDailyChartConfirmation(user.email, { chartName: chart.name, token });
      } catch (error) {
        try {
          // Preserve the exact older DOI request if this send failed. The
          // token and recipient in the already-delivered email remain valid;
          // a concurrent confirmation/cancel/resend still wins the CAS.
          await replacePendingDailyChartPreference(
            user.id,
            tokenHash,
            existing.chartId,
            existing.recipientHash,
            existing.confirmationTokenHash,
            existing.timezone,
          );
        } catch {
          // A later action may already own the row. Never overwrite it.
        }
        throw error;
      }
      sendJson(res, 200, { ok: true, pending: true, requestId: tokenHash.slice(0, 16) });
      return;
    }

    const input = parseBody(req.body);
    if (!input) {
      sendJson(res, 400, { error: 'invalid' });
      return;
    }
    const chart = await getOwnedDailyChart(user.id, input.chartId);
    if (!chart) {
      sendJson(res, 404, { error: 'chart_not_found' });
      return;
    }
    const recipientHash = dailyRecipientHash(
      user.email,
      process.env.DAILY_EMAIL_RECIPIENT_HASH_SECRET ?? '',
    );
    const existing = await getDailyChartPreference(user.id);
    if (existing?.confirmedAt && existing.recipientHash === recipientHash) {
      // Once this address has confirmed the chart-tier consent, chart and
      // timezone changes are explicit profile preferences, not new enrollments.
      const updated = await updateConfirmedDailyChartPreference(
        user.id,
        existing.chartId,
        existing.recipientHash,
        existing.timezone,
        existing.confirmedAt,
        input.chartId,
        input.timezone,
      );
      if (!updated) {
        sendJson(res, 409, { error: 'preference_changed' });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        pending: false,
        preference: {
          chartId: input.chartId,
          timezone: input.timezone,
          confirmedAt: existing.confirmedAt,
          paused: false,
        },
      });
      return;
    }
    // An account email change is a new recipient and therefore a new consent
    // boundary. It never transfers confirmed consent to the new address.
    const token = createDailyChartOptInToken({
      userId: user.id,
      chartId: input.chartId,
      recipientHash,
      timezone: input.timezone,
    }, process.env.EMAIL_CONFIRM_SECRET ?? '');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (existing?.confirmedAt) {
      const replaced = await replaceConfirmedDailyChartPreferenceWithPending(
        user.id,
        existing.chartId,
        existing.recipientHash,
        existing.timezone,
        existing.confirmedAt,
        input.chartId,
        recipientHash,
        tokenHash,
        input.timezone,
      );
      if (!replaced) {
        sendJson(res, 409, { error: 'preference_changed' });
        return;
      }
    } else {
      await savePendingDailyChartPreference(
        user.id,
        input.chartId,
        recipientHash,
        tokenHash,
        input.timezone,
      );
    }
    try {
      await sendDailyChartConfirmation(user.email, { chartName: chart.name, token });
    } catch (error) {
      try {
        await deletePendingDailyChartPreference(user.id, tokenHash);
      } catch {
        // A retry replaces the stale pending token hash; never claim success.
      }
      throw error;
    }
    // A stable non-identifying request receipt helps the client suppress
    // accidental repeat taps without exposing an address or auth identifier.
    const requestId = tokenHash.slice(0, 16);
    sendJson(res, 200, { ok: true, pending: true, requestId });
  } catch {
    sendJson(res, 502, { error: 'unavailable' });
  }
}
