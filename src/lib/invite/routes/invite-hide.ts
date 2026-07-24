import { authenticateEmailUser } from '../../email/daily-server.js';
import { allowInviteMethods, sendInviteJson, validInviteBrowserRequest } from '../api.js';
import { hasCompatibilityInviteContract } from '../config.js';
import { hideCompatibilityInvite } from '../server.js';
import { parseInviteIdBody } from '../validate.js';

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
  try {
    const owner = await authenticateEmailUser(req);
    if (!owner) {
      sendInviteJson(res, 401, { error: 'sign_in_required' });
      return;
    }
    const inviteId = parseInviteIdBody(req.body);
    if (!inviteId) {
      sendInviteJson(res, 400, { error: 'invalid_request' });
      return;
    }
    const outcome = await hideCompatibilityInvite(owner.id, inviteId);
    if (outcome === 'not_found') {
      sendInviteJson(res, 404, { error: 'not_found' });
      return;
    }
    if (outcome === 'active') {
      sendInviteJson(res, 409, { error: 'invitation_active' });
      return;
    }
    sendInviteJson(res, 200, { hidden: true });
  } catch {
    sendInviteJson(res, 503, { error: 'unavailable' });
  }
}
