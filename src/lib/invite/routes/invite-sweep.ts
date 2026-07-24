import { allowInviteMethods, sendInviteJson } from '../api.js';
import {
  compatibilityInviteSweepSecret,
  hasCompatibilityInviteContract,
} from '../config.js';
import { bearer } from '../request.js';
import { pruneCompatibilityInvites } from '../server.js';
import { constantTimeSecretMatch } from '../token.js';

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    allowInviteMethods(res, ['POST']);
    sendInviteJson(res, 405, { error: 'method' });
    return;
  }
  const expected = compatibilityInviteSweepSecret(process.env);
  if (!hasCompatibilityInviteContract(process.env)
    || !expected
    || !constantTimeSecretMatch(bearer(req), expected)) {
    sendInviteJson(res, 404, { error: 'not_found' });
    return;
  }
  try {
    let expired = 0;
    let pruned = 0;
    let batches = 0;
    for (; batches < 32; batches += 1) {
      const result = await pruneCompatibilityInvites(256);
      expired += result.expired;
      pruned += result.pruned;
      if (result.expired < 256 && result.pruned < 256) {
        batches += 1;
        break;
      }
    }
    sendInviteJson(res, 200, { expired, pruned, batches });
  } catch {
    sendInviteJson(res, 503, { error: 'unavailable' });
  }
}
