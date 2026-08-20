import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { h } from 'preact';
import { describe, expect, it, vi } from 'vitest';
import { encodePositionsLink, POSITION_BODY_ORDER } from '../../src/lib/share-positions';

const imageResponseMock = vi.hoisted(() => {
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer);
  view.setUint32(16, 1200);
  view.setUint32(20, 630);
  return {
    element: vi.fn(),
    options: vi.fn(),
    renderFailure: null as Error | null,
    png,
  };
});

vi.mock('@vercel/og', () => ({
  ImageResponse: class extends Response {
    constructor(element: unknown, options: {
      width: number;
      height: number;
      headers?: HeadersInit;
      fonts?: Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>;
    }) {
      imageResponseMock.element(element);
      imageResponseMock.options(options);
      super(imageResponseMock.png, {
        headers: { ...options.headers, 'Content-Type': 'image/png' },
      });
    }

    override async arrayBuffer(): Promise<ArrayBuffer> {
      if (imageResponseMock.renderFailure) {
        const failure = imageResponseMock.renderFailure;
        imageResponseMock.renderFailure = null;
        throw failure;
      }
      return super.arrayBuffer();
    }
  },
}));

const {
  CHART_PREVIEW_ROUTE_KEY,
  handleChartLinkRequest: linkHandler,
  handleChartImageRequest: imageHandler,
  handleChartPreviewNodeRequest,
  PREVIEW_KICKER,
} = await import('../../api/_og/chart-preview');
const { previewModel } = await import('../../api/_og/chart-preview-model');
const { default: compatibilityHandler } = await import('../../api/compatibility');

const token = encodePositionsLink({
  bodies: POSITION_BODY_ORDER.map((body, index) => ({ body, lon: index * 29.999 })),
  angles: { asc: 359.999, mc: 270 },
  houseSystem: 'whole',
  engineVersion: '1.2.3',
})!;
const noAnglesToken = encodePositionsLink({
  bodies: POSITION_BODY_ORDER.map((body, index) => ({ body, lon: index * 29.999 })),
  angles: null,
  houseSystem: 'whole',
  engineVersion: '1.2.3',
})!;

describe('chart preview functions', () => {
  it('builds a bounded positions-only model with minute carry', () => {
    const model = previewModel(token);
    expect(model?.placements.map(({ label }) => label)).toEqual(['Sun', 'Moon', 'Rising']);
    expect(model?.placements[2]).toMatchObject({ sign: 'Aries', degree: '0 deg 00 min' });
    expect(model?.settings).toBe('Whole sign / Tropical');
    expect(JSON.stringify(model)).not.toMatch(/[^\x20-\x7e]/);
    expect(JSON.stringify(model)).not.toMatch(/\b(?:birth|date|time|place|coordinates?)\b/i);
  });

  it('labels an angle-free token as a noon reference without claiming Rising or houses', async () => {
    const model = previewModel(noAnglesToken);
    expect(model?.placements.map(({ label }) => label)).toEqual(['Sun', 'Moon']);
    expect(model?.settings).toBe('12:00 reference / No houses / Tropical');

    const response = await linkHandler(new Request(
      `https://zodiacs.org/api/og/chart?p=${encodeURIComponent(noAnglesToken)}`,
    ));
    const html = await response.text();
    expect(html).toContain('Sun and 12:00 reference Moon positions');
    expect(html).not.toContain('Sun, Moon and Rising positions');
  });

  it('returns a no-store noindex HTML wrapper that redirects to the fragment receiver', async () => {
    const response = await linkHandler(new Request(`https://zodiacs.org/api/og/chart?p=${encodeURIComponent(token)}`));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(html).toContain('property="og:image"');
    expect(html).toContain(`/api/og/chart-image?p=${encodeURIComponent(token)}`);
    expect(html).toContain('/birth-chart/#p=');
    expect(html).not.toMatch(/registry|astrofolio|terminal|wallet|birth date:\s*\d/i);
  });

  it('rejects non-GET, missing, duplicate, invalid, and extra parameters generically', async () => {
    const urls = [
      'https://zodiacs.org/api/og/chart',
      `https://zodiacs.org/api/og/chart?p=${token}&p=${token}`,
      'https://zodiacs.org/api/og/chart?p=bad',
      `https://zodiacs.org/api/og/chart?p=${token}&free=text`,
      `https://zodiacs.org/api/og/chart?p=${token}&image=1`,
    ];
    for (const url of urls) {
      const response = await linkHandler(new Request(url));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Chart preview unavailable.');
    }
    expect((await linkHandler(new Request(
      `https://zodiacs.org/api/og/chart?p=${token}`,
      { method: 'POST' },
    ))).status).toBe(405);
  });

  it('keeps the image renderer on a narrow positions-only request surface', async () => {
    for (const request of [
      new Request('https://zodiacs.org/api/og/chart-image'),
      new Request(`https://zodiacs.org/api/og/chart-image?p=${token}&p=${token}`),
      new Request(`https://zodiacs.org/api/og/chart-image?p=${token}&free=text`),
      new Request(`https://zodiacs.org/api/og/chart-image?p=${token}`, { method: 'POST' }),
    ]) {
      const response = await imageHandler(request);
      expect([400, 405]).toContain(response.status);
      expect(await response.text()).toBe('Chart preview unavailable.');
    }
  });

  it('emits a 1200×630 PNG response without cache or indexing', async () => {
    imageResponseMock.element.mockClear();
    imageResponseMock.options.mockClear();
    const response = await imageHandler(new Request(`https://zodiacs.org/api/og/chart-image?p=${token}`));
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(new DataView(bytes.buffer).getUint32(16)).toBe(1200);
    expect(new DataView(bytes.buffer).getUint32(20)).toBe(630);
    expect(imageResponseMock.options).toHaveBeenCalledOnce();
    expect(imageResponseMock.options).toHaveBeenCalledWith(expect.objectContaining({
      width: 1200,
      height: 630,
      fonts: [
        expect.objectContaining({ name: 'sans serif', weight: 400, style: 'normal' }),
        expect.objectContaining({ name: 'EB Garamond', weight: 500, style: 'italic' }),
      ],
    }));
    const serializedCard = JSON.stringify(imageResponseMock.element.mock.calls[0]?.[0]);
    expect(serializedCard).toContain('Your chart signature');
    expect(serializedCard).toContain('"fontFamily":"EB Garamond"');
    expect(serializedCard).toContain('"fontStyle":"italic"');
  });

  it('writes the buffered image through the Vercel Node response contract', async () => {
    const headers = new Map<string, string>();
    const end = vi.fn();
    const response = {
      statusCode: 0,
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
      },
      end,
    };
    await handleChartPreviewNodeRequest({
      method: 'GET',
      url: `/api/og/chart-image?p=${encodeURIComponent(token)}`,
      headers: { host: 'zodiacs.org' },
      query: { [CHART_PREVIEW_ROUTE_KEY]: 'image', p: token },
    }, response, 'image');

    expect(response.statusCode).toBe(200);
    expect(headers.get('content-type')).toBe('image/png');
    expect(headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(end).toHaveBeenCalledOnce();
    expect(Array.from((end.mock.calls[0]?.[0] as Buffer).subarray(0, 8))).toEqual(
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
  });

  it('writes the metadata wrapper through the consolidated Node route', async () => {
    const headers = new Map<string, string>();
    const end = vi.fn();
    const response = {
      statusCode: 0,
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
      },
      end,
    };
    await compatibilityHandler({
      method: 'GET',
      headers: { 'x-forwarded-host': 'zodiacs-preview.vercel.app' },
      query: { [CHART_PREVIEW_ROUTE_KEY]: 'link', p: token },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(headers.get('content-type')).toContain('text/html');
    expect(headers.get('cache-control')).toBe('no-store, max-age=0');
    const html = Buffer.from(end.mock.calls[0]?.[0] as Buffer).toString('utf8');
    expect(html).toContain(
      `https://zodiacs-preview.vercel.app/api/og/chart-image?p=${encodeURIComponent(token)}`,
    );
    expect(html).toContain('https://zodiacs-preview.vercel.app/birth-chart/#p=');
  });

  it('rejects extra or duplicate values before the consolidated route renders', async () => {
    for (const query of [
      { [CHART_PREVIEW_ROUTE_KEY]: 'link', p: token, extra: 'value' },
      { [CHART_PREVIEW_ROUTE_KEY]: ['link', 'link'], p: token },
      { [CHART_PREVIEW_ROUTE_KEY]: 'link', p: [token, token] },
    ]) {
      const end = vi.fn();
      const response = { statusCode: 0, setHeader: vi.fn(), end };
      await handleChartPreviewNodeRequest(
        { method: 'GET', headers: { host: 'zodiacs.org' }, query },
        response,
        'link',
      );
      expect(response.statusCode).toBe(400);
      expect(Buffer.from(end.mock.calls[0]?.[0] as Buffer).toString('utf8')).toBe(
        'Chart preview unavailable.',
      );
    }
  });

  it('returns a generic 503 before committing a streaming renderer failure', async () => {
    imageResponseMock.renderFailure = new Error('render failed');
    const response = await imageHandler(new Request(`https://zodiacs.org/api/og/chart-image?p=${token}`));

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(await response.text()).toBe('Chart preview unavailable.');
  });

  it('renders the bounded EB Garamond kicker subset as a real PNG', async () => {
    const font = readFileSync(new URL('../../api/og/eb-garamond-latin-500-italic.woff', import.meta.url));
    expect(font.subarray(0, 4).toString('ascii')).toBe('wOFF');
    expect(font.byteLength).toBeLessThan(8_000);
    expect(createHash('sha256').update(font).digest('hex')).toBe(
      'ed04e3bc22e73224bf11cafb26c73fbc20207179a2ed6529f12aa67b2955d0e0',
    );
    expect(PREVIEW_KICKER).toBe('Your chart signature');

    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('The renderer must not fetch assets.');
    }));
    try {
      const { ImageResponse: RealImageResponse } = await vi.importActual<typeof import('@vercel/og')>('@vercel/og');
      const response = new RealImageResponse(
        h('div', {
          style: {
            display: 'flex',
            width: '320px',
            height: '180px',
            fontFamily: 'EB Garamond',
            fontStyle: 'italic',
          },
        }, PREVIEW_KICKER),
        {
          width: 320,
          height: 180,
          fonts: [{ name: 'EB Garamond', data: font, weight: 500, style: 'italic' }],
        },
      );
      const png = Buffer.from(await response.arrayBuffer());
      expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(png.readUInt32BE(16)).toBe(320);
      expect(png.readUInt32BE(20)).toBe(180);
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});
