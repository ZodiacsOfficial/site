import { sendInviteJson, validInviteBrowserRequest } from '../api.js';
import { compatibilityInviteCreationEnabled } from '../config.js';
import {
  clearInviteCapabilityCookie,
  inviteCapabilityCookie,
  inviteSessionHandle,
} from '../request.js';
import { readCompatibilityInvite } from '../server.js';
import {
  compatibilityInviteTokenHash,
  validCompatibilityInviteSessionHandle,
} from '../token.js';

function clearSelectedCookie(res: any, handle: string): void {
  if (validCompatibilityInviteSessionHandle(handle)) {
    res.setHeader('Set-Cookie', clearInviteCapabilityCookie(handle));
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendInviteJson(res, 405, { error: 'method' });
    return;
  }
  if (!validInviteBrowserRequest(req)) {
    sendInviteJson(res, 403, { error: 'forbidden' });
    return;
  }
  const handle = inviteSessionHandle(req);
  if (!handle) {
    sendInviteJson(res, 200, { state: 'unavailable' });
    return;
  }
  if (!compatibilityInviteCreationEnabled(process.env)) {
    clearSelectedCookie(res, handle);
    sendInviteJson(res, 200, { state: 'unavailable' });
    return;
  }
  const hash = compatibilityInviteTokenHash(inviteCapabilityCookie(req, handle));
  if (!hash) {
    clearSelectedCookie(res, handle);
    sendInviteJson(res, 200, { state: 'unavailable' });
    return;
  }
  try {
    const result = await readCompatibilityInvite(hash);
    if (result.outcome !== 'ready') {
      clearSelectedCookie(res, handle);
      sendInviteJson(res, 200, { state: 'unavailable' });
      return;
    }
    sendInviteJson(res, 200, { state: 'ready', payload: result.payload });
  } catch {
    sendInviteJson(res, 503, { state: 'unavailable' });
  }
}
