function first(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

export function requestHeader(req: any, name: string): string {
  if (typeof req.get === 'function') {
    const found = req.get(name);
    if (typeof found === 'string') return found;
  }
  return first(req.headers?.[name.toLowerCase()]);
}

function hostname(value: string): string {
  const candidate = value.split(',')[0]?.trim().toLowerCase() ?? '';
  if (!candidate) return '';
  try {
    return new URL(candidate.includes('://') ? candidate : `https://${candidate}`).hostname;
  } catch {
    return '';
  }
}

/** Same-origin only; production and the exact Vercel preview host are valid. */
export function isAllowedEmailCaptureRequest(req: any): boolean {
  const source = requestHeader(req, 'origin') || requestHeader(req, 'referer');
  if (!source) return false;
  try {
    const url = new URL(source);
    const requestHost = hostname(
      requestHeader(req, 'x-forwarded-host') || requestHeader(req, 'host'),
    );
    return url.protocol === 'https:'
      && url.hostname.toLowerCase() === requestHost
      && (requestHost === 'zodiacs.org'
        || requestHost === 'www.zodiacs.org'
        || requestHost.endsWith('.vercel.app'));
  } catch {
    return false;
  }
}
