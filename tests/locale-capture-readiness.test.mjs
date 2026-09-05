import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeFooterStyles, observeViewportRegions, viewportRegionFailures } from './locale-capture-readiness.mjs';

afterEach(() => vi.unstubAllGlobals());

function footerPage({ links = [{ href: 'https://zodiacs.org/assets/site-footer.css', sheet: {} }],
  display = 'grid', token = '#0a0c11', background = 'rgb(10, 12, 17)' } = {}) {
  const footer = {};
  const directory = {};
  vi.stubGlobal('location', { href: 'https://zodiacs.org/es/horoscopes/capricorn/', origin: 'https://zodiacs.org', pathname: '/es/horoscopes/capricorn/' });
  vi.stubGlobal('document', { readyState: 'complete', querySelectorAll: () => links,
    querySelector: (selector) => selector === '.zfooter' ? footer : directory });
  vi.stubGlobal('getComputedStyle', (node) => node === directory ? { display }
    : { getPropertyValue: () => token, backgroundColor: background });
}

describe('real footer paint readiness', () => {
  it('does not mistake document completion or an inserted link for applied CSS', () => {
    footerPage({ links: [{ href: 'https://zodiacs.org/assets/site-footer.css', sheet: null }] });
    expect(observeFooterStyles()).toMatchObject({ documentReadyState: 'complete', linkPresent: true, sheetLoaded: false, ready: false });
    expect(observeFooterStyles({ readyOnly: true })).toBe(false);
  });

  it.each([
    { display: 'block' }, { token: '' }, { background: 'rgba(0, 0, 0, 0)' },
  ])('rejects a loaded stylesheet that has not applied its layout or colors: %j', (state) => {
    footerPage(state);
    expect(observeFooterStyles({ readyOnly: true })).toBe(false);
  });

  it.each([
    { links: [] },
    { links: [{ href: 'https://elsewhere.example/assets/site-footer.css', sheet: {} }] },
    { links: [{ href: 'https://zodiacs.org/assets/site-footer.css', sheet: {}, disabled: true }] },
  ])('rejects absent, foreign-origin or disabled stylesheet evidence: %j', (state) => {
    footerPage(state);
    expect(observeFooterStyles({ readyOnly: true })).toBe(false);
  });

  it('accepts the canonical stylesheet only after its real layout and colors apply', () => {
    footerPage();
    expect(observeFooterStyles({ readyOnly: true })).toBe(true);
    expect(observeFooterStyles()).toMatchObject({ path: '/es/horoscopes/capricorn/', directoryDisplay: 'grid', backgroundToken: '#0a0c11' });
  });
});

describe('selected-reading viewport evidence', () => {
  const state = () => ({ width: 390, height: 844, navBottom: 90,
    regions: [{ selector: '.tbs__head', visible: true, top: 106, bottom: 152, left: 20, right: 370 }] });

  it('accepts an entire region visibly below navigation', () => {
    expect(viewportRegionFailures(state())).toEqual([]);
  });

  it('rejects the old crop state even though the heading intersects the viewport', () => {
    const observed = state();
    observed.regions[0].top = 40;
    expect(viewportRegionFailures(observed)).toContain('.tbs__head: heading/content behind navigation');
  });

  it('rejects a tall reading that loses its lower content or spills horizontally', () => {
    const observed = state();
    Object.assign(observed.regions[0], { selector: '.tbs__read', bottom: 910, right: 405 });
    expect(viewportRegionFailures(observed)).toEqual([
      '.tbs__read: content clipped below viewport', '.tbs__read: content clipped horizontally',
    ]);
  });

  it('observes actual navigation and missing/hidden regions rather than assuming visibility', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    const nav = { getBoundingClientRect: () => ({ bottom: 104 }) };
    const hidden = { getBoundingClientRect: () => ({ top: 120, bottom: 170, left: 20, right: 370, width: 350, height: 50 }) };
    vi.stubGlobal('document', { querySelector: (selector) => ({ '.nav-wrap': nav, '.hidden': hidden })[selector] });
    vi.stubGlobal('getComputedStyle', () => ({ display: 'block', visibility: 'hidden', opacity: '1' }));
    const observed = observeViewportRegions(['.missing', '.hidden']);
    expect(observed.navBottom).toBe(104);
    expect(viewportRegionFailures(observed)).toEqual(['.missing: missing or hidden', '.hidden: missing or hidden']);
  });
});
