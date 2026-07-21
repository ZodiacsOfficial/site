import { hasDailyEmailRevocation } from '../../src/lib/email/daily-config.js';
import { dailyEmailPage } from '../../src/lib/email/daily-page.js';
import { getDailyContactEmail, removeDailySunSegment } from '../../src/lib/email/daily-resend.js';
import { getAdminEmailUser, revokeDailyEmailPreference } from '../../src/lib/email/daily-server.js';
import { verifyDailyUnsubscribeToken } from '../../src/lib/email/daily-unsubscribe-token.js';
import { dailyRecipientHash } from '../../src/lib/daily-email/identity.js';

function send(res: any, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(body);
}

function tokenFromBody(body: unknown): string {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as { token?: unknown };
      if (typeof parsed.token === 'string') return parsed.token;
    } catch {
      return new URLSearchParams(body).get('token') ?? '';
    }
  }
  if (body && typeof body === 'object' && typeof (body as { token?: unknown }).token === 'string') {
    return (body as { token: string }).token;
  }
  return '';
}

function maskedEmail(email: string | null): string {
  if (!email) return 'this address';
  const at = email.indexOf('@');
  return at > 0 ? `${email[0]}…${email.slice(at)}` : 'this address';
}

async function currentEmailForClaim(
  userId: string,
  recipientHash: string,
): Promise<string | null> {
  const user = await getAdminEmailUser(userId);
  if (!user) return null;
  const currentHash = dailyRecipientHash(
    user.email,
    process.env.DAILY_EMAIL_RECIPIENT_HASH_SECRET ?? '',
  );
  return currentHash === recipientHash ? user.email : null;
}

async function currentSunEmailForClaim(
  contactId: string,
  recipientHash: string,
): Promise<string | null> {
  const email = await getDailyContactEmail(contactId);
  if (!email) return null;
  const currentHash = dailyRecipientHash(
    email,
    process.env.DAILY_EMAIL_RECIPIENT_HASH_SECRET ?? '',
  );
  return currentHash === recipientHash ? email : null;
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    send(res, 405, dailyEmailPage('That link cannot be used', 'Open the unsubscribe link from a daily email.'));
    return;
  }

  // Query-token POST supports RFC 8058 one-click mail clients; the visible
  // GET remains read-only and presents a human confirmation button.
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  const token = queryToken || (req.method === 'POST' ? tokenFromBody(req.body) : '');
  const secret = process.env.DAILY_EMAIL_UNSUBSCRIBE_SECRET ?? '';
  const claim = verifyDailyUnsubscribeToken(token, secret);
  if (!claim || !hasDailyEmailRevocation(process.env)) {
    send(res, 400, dailyEmailPage('That link has a problem', 'Open a current daily email and try its unsubscribe link again.'));
    return;
  }

  const listName = claim.kind === 'sun' ? 'sun-sign daily' : 'personal daily brief';

  if (req.method === 'GET') {
    let email: string | null = null;
    try {
      if (claim.kind === 'sun') {
        email = await currentSunEmailForClaim(claim.contactId, claim.recipientHash);
      } else {
        email = await currentEmailForClaim(claim.userId, claim.recipientHash);
      }
    } catch {
      // The confirmation page remains available while provider reads recover.
    }
    send(res, 200, dailyEmailPage(
      'Unsubscribe?',
      `This stops the ${listName} for ${maskedEmail(email)}. One click, effective immediately.`,
      { action: '/api/email/unsubscribe', token, label: 'Confirm unsubscribe' },
    ));
    return;
  }

  // Revoke only the list named in the signed claim before touching provider
  // routing metadata. A chart-tier stop deliberately leaves the Sun tier
  // intact, so its already-confirmed delivery can resume on the next edition.
  try {
    await revokeDailyEmailPreference(claim.recipientHash, claim);
  } catch {
    send(res, 502, dailyEmailPage(
      'Please try again',
      `We could not stop the ${listName} just now. Your link will keep working.`,
    ));
    return;
  }

  try {
    if (claim.kind === 'sun') {
      const currentEmail = await currentSunEmailForClaim(claim.contactId, claim.recipientHash);
      if (currentEmail) await removeDailySunSegment({ contactId: claim.contactId });
    }
  } catch {
    // Resend membership never grants consent. The authoritative transaction above
    // already stopped the Sun tier, so provider cleanup cannot turn a
    // successful unsubscribe back into active consent.
  }
  send(res, 200, dailyEmailPage(
    'Done — you’re unsubscribed.',
    `No more ${listName}. If you change your mind, restart below — a fresh confirmation email comes first.`,
    {
      kind: 'link',
      href: claim.kind === 'sun' ? '/horoscopes/#daily-email' : '/profile/#daily-brief',
      label: 'Restart the daily',
    },
  ));
}
