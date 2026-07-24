import { isAllowedEmailCaptureRequest } from '../email/request.js';
import { hasExactJsonContentType, requestBodyWithinLimit } from './request.js';

export function sendInviteJson(
  res: any,
  status: number,
  body: Record<string, unknown>,
): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.end(JSON.stringify(body));
}
export function allowInviteMethods(res: any, methods: string[]): void {
  res.setHeader('Allow', methods.join(', '));
}

export function validInviteBrowserRequest(req: any, requiresJson = false): boolean {
  return isAllowedEmailCaptureRequest(req)
    && (!requiresJson || (hasExactJsonContentType(req) && requestBodyWithinLimit(req)));
}

export function queryValue(req: any, key: string): string {
  const value = req.query?.[key];
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}
