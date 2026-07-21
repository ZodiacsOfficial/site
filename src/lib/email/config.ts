export const EMAIL_PROVIDERS = ['resend', 'buttondown', 'loops'] as const;
export type EmailProviderName = typeof EMAIL_PROVIDERS[number];

type Environment = Record<string, unknown>;

function value(env: Environment, key: string): string {
  const raw = env[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

export function emailProviderName(env: Environment): EmailProviderName | null {
  const provider = value(env, 'EMAIL_PROVIDER').toLowerCase();
  return EMAIL_PROVIDERS.includes(provider as EmailProviderName)
    ? provider as EmailProviderName
    : null;
}

export function validLoopsFormEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:'
      && url.hostname === 'app.loops.so'
      && /^\/api\/newsletter-form\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
      && url.username === ''
      && url.password === ''
      && url.search === ''
      && url.hash === '';
  } catch {
    return false;
  }
}

/**
 * The same predicate is used at static-build time and in the Vercel function.
 * It returns only a boolean, so no provider secret can cross into client code.
 */
export function hasEmailCaptureProvider(env: Environment): boolean {
  switch (emailProviderName(env)) {
    case 'resend':
      return value(env, 'RESEND_API_KEY') !== ''
        && value(env, 'RESEND_CONTACTS_API_KEY') !== ''
        && value(env, 'RESEND_API_KEY') !== value(env, 'RESEND_CONTACTS_API_KEY')
        && value(env, 'RESEND_FROM_EMAIL') !== ''
        && value(env, 'EMAIL_CONFIRM_SECRET').length >= 32;
    case 'buttondown':
      // Buttondown creates API subscribers as unactivated by default and sends
      // its own confirmation email. The adapter deliberately never sends type.
      return value(env, 'BUTTONDOWN_API_KEY') !== '';
    case 'loops': {
      // Loops currently applies double opt-in to form endpoints only. Requiring
      // this explicit acknowledgement prevents an API-contact configuration
      // from silently becoming single opt-in.
      const endpoint = value(env, 'LOOPS_FORM_ENDPOINT');
      return validLoopsFormEndpoint(endpoint)
        && value(env, 'LOOPS_DOUBLE_OPT_IN_CONFIRMED') === '1';
    }
    default:
      return false;
  }
}

export function environmentValue(env: Environment, key: string): string {
  return value(env, key);
}
