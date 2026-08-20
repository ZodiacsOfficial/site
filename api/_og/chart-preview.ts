import { readFile } from 'node:fs/promises';
import { h } from 'preact';
import {
  type ChartPreviewModel,
  previewModel,
} from './chart-preview-model.js';

export const PREVIEW_KICKER = 'Your chart signature';
export const CHART_PREVIEW_ROUTE_KEY = '__zodiacs_og_route';
export type ChartPreviewRoute = 'link' | 'image';

const PRIVACY_HEADERS = {
  'cache-control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

let previewFonts: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function prepareFonts(): Promise<[ArrayBuffer, ArrayBuffer]> {
  if (previewFonts) return previewFonts;
  const pending = Promise.all([
    readFile(new URL('../../node_modules/@vercel/og/dist/noto-sans-v27-latin-regular.ttf', import.meta.url)),
    readFile(new URL('../og/eb-garamond-latin-500-italic.woff', import.meta.url)),
  ]).then(([normal, italic]): [ArrayBuffer, ArrayBuffer] => [
    exactArrayBuffer(normal),
    exactArrayBuffer(italic),
  ]);
  previewFonts = pending;
  void pending.catch(() => {
    if (previewFonts === pending) previewFonts = null;
  });
  return pending;
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

function errorResponse(status: number): Response {
  return new Response('Chart preview unavailable.', {
    status,
    headers: { ...PRIVACY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function strictPreviewValue(request: Request): string | null {
  const url = new URL(request.url);
  const values = url.searchParams.getAll('p');
  const allowedKeys = [...url.searchParams.keys()].every((key) => key === 'p');
  return allowedKeys && values.length === 1 ? values[0] : null;
}

function previewCard(model: ChartPreviewModel) {
  return h('div', { style: {
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '58px 68px', background: '#060709',
      color: '#EEF1F7', fontFamily: 'sans serif',
    } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      h('div', { style: {
          display: 'flex', fontFamily: 'EB Garamond', fontSize: 28,
          fontStyle: 'italic', color: '#8E96AB',
        } }, PREVIEW_KICKER),
      h('div', { style: { display: 'flex', fontSize: 24, color: '#8E96AB' } }, 'zodiacs.org')),
    h('div', { style: { display: 'flex', gap: '30px', width: '100%' } },
      ...model.placements.map((row) => (
        h('div', { key: row.label, style: {
            flex: 1, minHeight: '360px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(198,204,218,.18)',
            borderRadius: '28px', background: 'rgba(198,204,218,.035)',
          } },
          h('div', { style: { display: 'flex', fontSize: 72, color: row.hue } }, row.sign.slice(0, 3)),
          h('div', { style: { display: 'flex', marginTop: '20px', fontSize: 27, color: '#8E96AB' } }, `${row.label} / ${row.degree}`),
          h('div', { style: { display: 'flex', marginTop: '8px', fontSize: 52 } }, row.sign))
      ))),
    h('div', { style: { display: 'flex', fontSize: 24, color: '#8E96AB' } }, `${model.settings} / Positions only`),
  );
}

export async function handleChartLinkRequest(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405);
  const value = strictPreviewValue(request);
  const model = value === null ? null : previewModel(value);
  if (!model || value === null) return errorResponse(400);

  const url = new URL(request.url);
  const receiver = `${url.origin}/birth-chart/#p=${encodeURIComponent(value)}`;
  const imageUrl = `${url.origin}/api/og/chart-image?p=${encodeURIComponent(value)}`;
  const escapedReceiver = htmlEscape(receiver);
  const escapedImage = htmlEscape(imageUrl);
  const redirectScript = `location.replace(${JSON.stringify(receiver)})`;
  const description = model.placements.some((placement) => placement.label === 'Rising')
    ? 'Sun, Moon and Rising positions — birth details not included.'
    : 'Sun and 12:00 reference Moon positions — birth details not included.';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><meta property="og:title" content="A shared birth chart"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:image" content="${escapedImage}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapedImage}"><title>A shared birth chart</title></head><body><p><a href="${escapedReceiver}">Open the shared chart</a></p><script nonce="chart-preview">${redirectScript}</script><noscript><meta http-equiv="refresh" content="0;url=${escapedReceiver}"></noscript></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      ...PRIVACY_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'nonce-chart-preview'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}

export async function handleChartImageRequest(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405);
  const value = strictPreviewValue(request);
  const model = value === null ? null : previewModel(value);
  if (!model) return errorResponse(400);

  try {
    const { ImageResponse } = await import('@vercel/og');
    const [normalFont, italicFont] = await prepareFonts();
    const rendered = new ImageResponse(previewCard(model), {
      width: 1200,
      height: 630,
      headers: PRIVACY_HEADERS,
      fonts: [
        { name: 'sans serif', data: normalFont, weight: 400, style: 'normal' },
        { name: 'EB Garamond', data: italicFont, weight: 500, style: 'italic' },
      ],
    });
    // Buffer the renderer stream so failures never commit a partial 200 to a crawler.
    const png = await rendered.arrayBuffer();
    return new Response(png, {
      headers: { ...PRIVACY_HEADERS, 'Content-Type': 'image/png' },
    });
  } catch {
    return errorResponse(503);
  }
}

function firstHeader(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function requestOrigin(req: any): string {
  const forwarded = firstHeader(req.headers?.['x-forwarded-host']).split(',')[0]?.trim();
  const host = forwarded || firstHeader(req.headers?.host).trim();
  const trusted = /^(?:zodiacs\.org|www\.zodiacs\.org|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app|localhost(?::\d{1,5})?)$/iu.test(host)
    ? host
    : 'zodiacs.org';
  return `${trusted.startsWith('localhost') ? 'http' : 'https'}://${trusted}`;
}

function strictNodeValue(req: any, route: ChartPreviewRoute): string | null {
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const keys = Object.keys(query);
  if (!keys.every((key) => key === 'p' || key === CHART_PREVIEW_ROUTE_KEY)) return null;
  if (query[CHART_PREVIEW_ROUTE_KEY] !== route || typeof query.p !== 'string') return null;
  return query.p;
}

async function writeNodeResponse(res: any, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export async function handleChartPreviewNodeRequest(
  req: any,
  res: any,
  route: ChartPreviewRoute,
): Promise<void> {
  const value = strictNodeValue(req, route);
  if (value === null) {
    await writeNodeResponse(res, errorResponse(400));
    return;
  }
  const path = route === 'link' ? '/api/og/chart' : '/api/og/chart-image';
  const request = new Request(
    `${requestOrigin(req)}${path}?p=${encodeURIComponent(value)}`,
    { method: typeof req.method === 'string' ? req.method : 'GET' },
  );
  const response = route === 'link'
    ? await handleChartLinkRequest(request)
    : await handleChartImageRequest(request);
  await writeNodeResponse(res, response);
}
