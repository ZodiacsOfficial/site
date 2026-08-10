import {
  collectRegistryNews,
  type RegistryNewsDependencies,
  type RegistryNewsResponse,
} from '../_registry/news-wire.js';

export const config = { maxDuration: 10 };

interface CachePolicy {
  browser: string;
  vercel?: string;
}

const HEALTHY_CACHE: CachePolicy = {
  browser: 'public, max-age=60, s-maxage=900, stale-while-revalidate=3600, stale-if-error=86400',
  vercel: 'public, max-age=900, stale-while-revalidate=3600, stale-if-error=86400',
};
const RETRY_CACHE: CachePolicy = {
  browser: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300, stale-if-error=3600',
  vercel: 'public, max-age=60, stale-while-revalidate=300, stale-if-error=3600',
};
const NO_STORE: CachePolicy = { browser: 'private, no-store' };

function sendJson(
  res: any,
  status: number,
  body: RegistryNewsResponse | { error: 'method' },
  cache: CachePolicy,
): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', cache.browser);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (cache.vercel) res.setHeader('Vercel-CDN-Cache-Control', cache.vercel);
  res.end(JSON.stringify(body));
}

export async function handleRegistryNews(
  req: any,
  res: any,
  dependencies: RegistryNewsDependencies = {},
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'method' }, NO_STORE);
    return;
  }

  const collection = await collectRegistryNews(dependencies);
  sendJson(
    res,
    200,
    collection.response,
    collection.successfulSources > 0 ? HEALTHY_CACHE : RETRY_CACHE,
  );
}

export default async function handler(req: any, res: any): Promise<void> {
  return handleRegistryNews(req, res);
}
