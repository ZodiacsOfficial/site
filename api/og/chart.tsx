/** @jsxImportSource preact */
// Use the official package's Edge entry directly. Its conditional export also
// exposes a Node entry, and Vercel's file tracer otherwise ships both renderers.
import { ImageResponse } from '../../node_modules/@vercel/og/dist/index.edge.js';
import { decodePositionsLink } from '../../src/lib/share-positions.js';

export const config = { runtime: 'edge' };

const HUES: Record<string, string> = {
  aries: '#DE8E79', taurus: '#B9D4BE', gemini: '#B29DD0', cancer: '#B6D4E4',
  leo: '#E0A9B4', virgo: '#B7D9B0', libra: '#D3A9DE', scorpio: '#B9DCE8',
  sagittarius: '#E0B080', capricorn: '#C0DEA8', aquarius: '#AE8FC9', pisces: '#A9D4C4',
};

const SIGNS = [
  ['Aries', 'aries'], ['Taurus', 'taurus'], ['Gemini', 'gemini'], ['Cancer', 'cancer'],
  ['Leo', 'leo'], ['Virgo', 'virgo'], ['Libra', 'libra'], ['Scorpio', 'scorpio'],
  ['Sagittarius', 'sagittarius'], ['Capricorn', 'capricorn'], ['Aquarius', 'aquarius'], ['Pisces', 'pisces'],
] as const;

export const PREVIEW_KICKER = 'Your chart signature';

let previewFonts: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;

function loadFont(url: URL): Promise<ArrayBuffer> {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error('Chart preview font unavailable.');
    return response.arrayBuffer();
  });
}

function prepareFonts(): Promise<[ArrayBuffer, ArrayBuffer]> {
  if (previewFonts) return previewFonts;
  const pending = Promise.all([
    loadFont(new URL('../../node_modules/@vercel/og/dist/noto-sans-v27-latin-regular.ttf', import.meta.url)),
    loadFont(new URL('./eb-garamond-latin-500-italic.woff', import.meta.url)),
  ]);
  previewFonts = pending;
  void pending.catch(() => {
    if (previewFonts === pending) previewFonts = null;
  });
  return pending;
}

export interface ChartPreviewPlacement {
  label: 'Sun' | 'Moon' | 'Rising';
  sign: string;
  hue: string;
  degree: string;
}

export interface ChartPreviewModel {
  placements: ChartPreviewPlacement[];
  settings: string;
}

function roundedPlacement(label: ChartPreviewPlacement['label'], longitude: number): ChartPreviewPlacement {
  const totalMinutes = Math.round((((longitude % 360) + 360) % 360) * 60) % 21600;
  const rounded = totalMinutes / 60;
  const sign = SIGNS[Math.floor(rounded / 30)];
  const within = totalMinutes % 1800;
  return {
    label,
    sign: sign[0],
    hue: HUES[sign[1]],
    degree: `${Math.floor(within / 60)} deg ${String(within % 60).padStart(2, '0')} min`,
  };
}

export function previewModel(token: string): ChartPreviewModel | null {
  const chart = decodePositionsLink(token);
  if (!chart) return null;
  const sun = chart.bodies.find((body) => body.body === 'Sun');
  const moon = chart.bodies.find((body) => body.body === 'Moon');
  if (!sun || !moon) return null;
  const placements = [
    roundedPlacement('Sun', sun.lon),
    roundedPlacement('Moon', moon.lon),
  ];
  if (chart.angles) placements.push(roundedPlacement('Rising', chart.angles.asc));
  return {
    placements,
    settings: chart.angles
      ? `${chart.houseSystem === 'whole' ? 'Whole sign' : 'Placidus'} / Tropical`
      : '12:00 reference / No houses / Tropical',
  };
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

const PRIVACY_HEADERS = {
  // Keep this key lowercase: @vercel/og defines its cache default with the
  // same spelling before spreading these options into the Response headers.
  'cache-control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

function errorResponse(status: number): Response {
  return new Response('Chart preview unavailable.', {
    status,
    headers: { ...PRIVACY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function image(model: ChartPreviewModel): Promise<Response> {
  const rows = model.placements;
  const [normalFont, italicFont] = await prepareFonts();
  const rendered = new ImageResponse(
    <div style={{
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '58px 68px', background: '#060709',
      color: '#EEF1F7', fontFamily: 'sans serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          display: 'flex', fontFamily: 'EB Garamond', fontSize: 28,
          fontStyle: 'italic', color: '#8E96AB',
        }}>{PREVIEW_KICKER}</div>
        <div style={{ display: 'flex', fontSize: 24, color: '#8E96AB' }}>zodiacs.org</div>
      </div>
      <div style={{ display: 'flex', gap: '30px', width: '100%' }}>
        {rows.map((row) => (
          <div key={row.label} style={{
            flex: 1, minHeight: '360px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(198,204,218,.18)',
            borderRadius: '28px', background: 'rgba(198,204,218,.035)',
          }}>
            <div style={{ display: 'flex', fontSize: 72, color: row.hue }}>{row.sign.slice(0, 3)}</div>
            <div style={{ display: 'flex', marginTop: '20px', fontSize: 27, color: '#8E96AB' }}>{row.label} / {row.degree}</div>
            <div style={{ display: 'flex', marginTop: '8px', fontSize: 52 }}>{row.sign}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', fontSize: 24, color: '#8E96AB' }}>{model.settings} / Positions only</div>
    </div>,
    {
      width: 1200,
      height: 630,
      // ImageResponse supplies its own exact image/png content type.
      headers: PRIVACY_HEADERS,
      fonts: [
        { name: 'sans serif', data: normalFont, weight: 400, style: 'normal' },
        { name: 'EB Garamond', data: italicFont, weight: 500, style: 'italic' },
      ],
    },
  );
  // ImageResponse renders through a stream. Consume it before returning so a
  // renderer failure stays on the generic 503 path instead of committing a
  // partial 200 response to a social crawler.
  const png = await rendered.arrayBuffer();
  return new Response(png, {
    headers: { ...PRIVACY_HEADERS, 'Content-Type': 'image/png' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse(405);
  const url = new URL(request.url);
  const tokens = url.searchParams.getAll('p');
  const images = url.searchParams.getAll('image');
  const imageRequested = images.length === 1;
  const allowedKeys = [...url.searchParams.keys()].every((key) => key === 'p' || key === 'image');
  if (!allowedKeys || tokens.length !== 1 || images.length > 1 || (imageRequested && images[0] !== '1')) {
    return errorResponse(400);
  }
  const token = tokens[0];
  const model = previewModel(token);
  if (!model) return errorResponse(400);
  if (imageRequested) {
    try {
      return await image(model);
    } catch {
      return errorResponse(503);
    }
  }

  const receiver = `${url.origin}/birth-chart/#p=${encodeURIComponent(token)}`;
  const imageUrl = `${url.origin}/api/og/chart?p=${encodeURIComponent(token)}&image=1`;
  const escapedReceiver = htmlEscape(receiver);
  const escapedImage = htmlEscape(imageUrl);
  const redirectScript = `location.replace(${JSON.stringify(receiver)})`;
  const description = model.placements.some((placement) => placement.label === 'Rising')
    ? 'Sun, Moon and Rising positions — birth details not included.'
    : 'Sun and 12:00 reference Moon positions — birth details not included.';
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><meta property="og:title" content="A shared birth chart"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:image" content="${escapedImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escapedImage}"><title>A shared birth chart</title></head><body><p><a href="${escapedReceiver}">Open the shared chart</a></p><script nonce="chart-preview">${redirectScript}</script><noscript><meta http-equiv="refresh" content="0;url=${escapedReceiver}"></noscript></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      ...PRIVACY_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'nonce-chart-preview'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}
