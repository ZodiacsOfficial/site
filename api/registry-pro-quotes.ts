import { checkRateLimit } from '@vercel/firewall';
import {
  PRO_QUOTES_RATE_LIMIT_ID,
  handleProQuotes,
} from '../src/pro/server/quote-gateway.mjs';

export const config = { maxDuration: 15 };

export async function checkProQuotePlatformRateLimit(req: any) {
  return checkRateLimit(PRO_QUOTES_RATE_LIMIT_ID, { headers: req.headers });
}

export default async function handler(req: any, res: any): Promise<void> {
  return handleProQuotes(req, res, { rateLimit: checkProQuotePlatformRateLimit });
}
