import { describe, expect, it, vi } from 'vitest';
import { encodePositionsLink, POSITION_BODY_ORDER } from '../../src/lib/share-positions';

const rendererMocks = vi.hoisted(() => {
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer);
  view.setUint32(16, 1200);
  view.setUint32(20, 630);
  return {
    asPng: vi.fn(() => png),
    renderedFree: vi.fn(),
    rendererFree: vi.fn(),
    satori: vi.fn(async (
      _element: unknown,
      _options: { fonts: Array<{ weight: number; style: string }> },
    ) => '<svg/>'),
  };
});

const fetchMock = vi.fn(async () => new Response(new Uint8Array([0])));
vi.stubGlobal('fetch', fetchMock);
vi.mock('@resvg/resvg-wasm', () => ({
  initWasm: vi.fn(async () => undefined),
  Resvg: class {
    render() {
      return { asPng: rendererMocks.asPng, free: rendererMocks.renderedFree };
    }
    free() { rendererMocks.rendererFree(); }
  },
}));
vi.mock('@resvg/resvg-wasm/index_bg.wasm?module', () => ({ default: {} }));
vi.mock('satori/wasm', () => ({
  default: rendererMocks.satori,
  init: vi.fn(),
}));
vi.mock('yoga-wasm-web', () => ({ default: vi.fn(async () => ({})) }));
vi.mock('yoga-wasm-web/dist/yoga.wasm?module', () => ({ default: {} }));

const { default: handler, previewModel } = await import('../../api/og/chart');

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

describe('chart preview edge function', () => {
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

    const response = await handler(new Request(
      `https://zodiacs.org/api/og/chart?p=${encodeURIComponent(noAnglesToken)}`,
    ));
    const html = await response.text();
    expect(html).toContain('Sun and 12:00 reference Moon positions');
    expect(html).not.toContain('Sun, Moon and Rising positions');
  });

  it('returns a no-store noindex HTML wrapper that redirects to the fragment receiver', async () => {
    const response = await handler(new Request(`https://zodiacs.org/api/og/chart?p=${encodeURIComponent(token)}`));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(html).toContain('property="og:image"');
    expect(html).toContain('/birth-chart/#p=');
    expect(html).not.toMatch(/registry|astrofolio|terminal|wallet|birth date:\s*\d/i);
  });

  it('rejects non-GET, missing, duplicate, invalid, and extra parameters generically', async () => {
    const urls = [
      'https://zodiacs.org/api/og/chart',
      `https://zodiacs.org/api/og/chart?p=${token}&p=${token}`,
      'https://zodiacs.org/api/og/chart?p=bad',
      `https://zodiacs.org/api/og/chart?p=${token}&free=text`,
      `https://zodiacs.org/api/og/chart?p=${token}&image`,
      `https://zodiacs.org/api/og/chart?p=${token}&image=`,
    ];
    for (const url of urls) {
      const response = await handler(new Request(url));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Chart preview unavailable.');
    }
    expect((await handler(new Request(
      `https://zodiacs.org/api/og/chart?p=${token}`,
      { method: 'POST' },
    ))).status).toBe(405);
  });

  it('returns 503 before committing an image response and retries failed renderer initialization', async () => {
    fetchMock.mockClear();
    fetchMock.mockRejectedValueOnce(new Error('font unavailable'));
    const failed = await handler(new Request(`https://zodiacs.org/api/og/chart?p=${token}&image=1`));
    expect(failed.status).toBe(503);
    expect(failed.headers.get('content-type')).toContain('text/plain');
    expect(failed.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(await failed.text()).toBe('Chart preview unavailable.');

    const retried = await handler(new Request(`https://zodiacs.org/api/og/chart?p=${token}&image=1`));
    expect(retried.status).toBe(200);
    expect(retried.headers.get('content-type')).toBe('image/png');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('emits a 1200×630 PNG response without cache or indexing', async () => {
    rendererMocks.asPng.mockClear();
    rendererMocks.renderedFree.mockClear();
    rendererMocks.rendererFree.mockClear();
    rendererMocks.satori.mockClear();
    const response = await handler(new Request(`https://zodiacs.org/api/og/chart?p=${token}&image=1`));
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(new DataView(bytes.buffer).getUint32(16)).toBe(1200);
    expect(new DataView(bytes.buffer).getUint32(20)).toBe(630);
    expect(rendererMocks.satori.mock.calls[0]?.[1]?.fonts).toEqual([
      expect.objectContaining({ weight: 500, style: 'normal' }),
      expect.objectContaining({ weight: 500, style: 'italic' }),
    ]);
    expect(rendererMocks.asPng).toHaveBeenCalledOnce();
    expect(rendererMocks.renderedFree).toHaveBeenCalledOnce();
    expect(rendererMocks.rendererFree).toHaveBeenCalledOnce();
  });

  it('frees both WASM render objects when PNG encoding fails', async () => {
    rendererMocks.asPng.mockImplementationOnce(() => { throw new Error('PNG failed'); });
    rendererMocks.renderedFree.mockClear();
    rendererMocks.rendererFree.mockClear();
    const response = await handler(new Request(`https://zodiacs.org/api/og/chart?p=${token}&image=1`));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Chart preview unavailable.');
    expect(rendererMocks.renderedFree).toHaveBeenCalledOnce();
    expect(rendererMocks.rendererFree).toHaveBeenCalledOnce();
  });
});
