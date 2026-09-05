// These observers run in the real page. A downloaded link alone does not prove
// that the canonical stylesheet has applied to the footer being photographed.
export function observeFooterStyles({ readyOnly = false } = {}) {
  const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((node) => {
    const url = new URL(node.href, location.href);
    return url.origin === location.origin && url.pathname === '/assets/site-footer.css';
  });
  const footer = document.querySelector('.zfooter');
  const directory = document.querySelector('.zfooter__directory');
  const style = footer ? getComputedStyle(footer) : null;
  const state = {
    path: location.pathname,
    documentReadyState: document.readyState,
    linkPresent: Boolean(link),
    sheetLoaded: Boolean(link?.sheet),
    disabled: Boolean(link?.disabled),
    directoryDisplay: directory ? getComputedStyle(directory).display : null,
    backgroundToken: style?.getPropertyValue('--zf-bg').trim() ?? null,
    background: style?.backgroundColor ?? null,
  };
  state.ready = state.sheetLoaded && !state.disabled && state.directoryDisplay === 'grid'
    && state.backgroundToken === '#0a0c11' && state.background === 'rgb(10, 12, 17)';
  return readyOnly ? state.ready : state;
}

export function observeViewportRegions(selectors) {
  const nav = document.querySelector('.nav-wrap');
  const navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
  return {
    width: innerWidth, height: innerHeight, navBottom,
    regions: selectors.map((selector) => {
      const node = document.querySelector(selector);
      if (!node) return { selector, missing: true };
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { selector, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
          && style.display !== 'none' && Number(style.opacity) > 0 };
    }),
  };
}

export function viewportRegionFailures(state) {
  return state.regions.flatMap((region) => {
    if (region.missing || !region.visible) return [`${region.selector}: missing or hidden`];
    return [
      region.top >= state.navBottom + 8 || `${region.selector}: heading/content behind navigation`,
      region.bottom <= state.height - 8 || `${region.selector}: content clipped below viewport`,
      region.left >= 0 && region.right <= state.width || `${region.selector}: content clipped horizontally`,
    ].filter((entry) => entry !== true);
  });
}
