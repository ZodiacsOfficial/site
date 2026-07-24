import { waitUntil } from '@vercel/functions';
import {
  allowInviteMethods,
  sendInviteJson,
  validInviteBrowserRequest,
} from '../../src/lib/invite/api.js';
import { hasCompatibilityInviteContract } from '../../src/lib/invite/config.js';
import { dispatchCompatibilityInviteCompletionEmail } from '../../src/lib/invite/email.js';
import {
  clearInviteCapabilityCookie,
  inviteCapabilityCookie,
  inviteSessionHandle,
} from '../../src/lib/invite/request.js';
import { completeCompatibilityInvite } from '../../src/lib/invite/server.js';
import { compatibilityInviteTokenHash } from '../../src/lib/invite/token.js';
import { isEmptyJsonBody } from '../../src/lib/invite/validate.js';

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    allowInviteMethods(res, ['POST']);
    sendInviteJson(res, 405, { error: 'method' });
    return;
  }
  if (!validInviteBrowserRequest(req, true)) {
    sendInviteJson(res, 403, { error: 'forbidden' });
    return;
  }
  if (!hasCompatibilityInviteContract(process.env)) {
    sendInviteJson(res, 404, { error: 'not_found' });
    return;
  }
  if (!isEmptyJsonBody(req.body)) {
    sendInviteJson(res, 400, { error: 'invalid_request' });
    return;
  }
  const handle = inviteSessionHandle(req);
  if (!handle) {
    sendInviteJson(res, 200, { outcome: 'unavailable', notification: 'skipped' });
    return;
  }
  const hash = compatibilityInviteTokenHash(inviteCapabilityCookie(req, handle));
  if (!hash) {
    res.setHeader('Set-Cookie', clearInviteCapabilityCookie(handle));
    sendInviteJson(res, 200, { outcome: 'unavailable', notification: 'skipped' });
    return;
  }
  try {
    const result = await completeCompatibilityInvite(hash);
    res.setHeader('Set-Cookie', clearInviteCapabilityCookie(handle));
    if (result.outcome === 'unavailable') {
      sendInviteJson(res, 200, { outcome: 'unavailable', notification: 'skipped' });
      return;
    }
    const shouldNotify = Boolean(
      result.notify
      && result.inviteId
      && result.ownerUserId
      && result.label
      && result.completedAt,
    );
    if (shouldNotify) {
      waitUntil(dispatchCompatibilityInviteCompletionEmail({
        inviteId: result.inviteId!,
        ownerUserId: result.ownerUserId!,
        label: result.label!,
        completedAt: result.completedAt!,
        notify: true,
      }).then(() => undefined));
    }
    sendInviteJson(res, 200, {
      outcome: result.outcome,
      notification: shouldNotify ? 'queued' : 'skipped',
    });
  } catch {
    sendInviteJson(res, 503, { error: 'unavailable' });
  }
}
