// Unified site-wide navigation — the WING copy.
//
// Part AA: one nav bar across the whole site. The main site renders it from
// src/components/SiteNav.astro; every wing surface (the hub SPA, the 12 sign
// pages, the archive, the thesis and SDK pages) renders the SAME bar from this
// module so the two registers share one navigation. The markup/CSS below mirror
// SiteNav.astro's design (BrandMark + "Zodiacs" wordmark, sentence-case
// Instrument Sans links, a pastel Signs dropdown, a Registry chip, and a
// mobile burger overlay) — in the wing's inlined-token form (no hashed bundle).
//
// Link set (owner-directed): Signs ▾ · Tools · Learn · Horoscopes · Saved charts
// on the left, a "Registry ↗" chip on the right (the sanctioned entry point to
// the wing). No Thesis/Archive/SDK in the nav — they live in the footer.
//
// Sign table mirrors src/lib/signs.ts (slug/name/glyph/dates/hue); keep in sync
// if that file changes. The Signs items link to the consumer guides (/{slug}/).

export const NAV_SIGNS = [
  { slug: 'aries', name: 'Aries', glyph: '♈', dates: 'Mar 21 – Apr 19', hue: '#DE8E79' },
  { slug: 'taurus', name: 'Taurus', glyph: '♉', dates: 'Apr 20 – May 20', hue: '#B9D4BE' },
  { slug: 'gemini', name: 'Gemini', glyph: '♊', dates: 'May 21 – Jun 20', hue: '#B29DD0' },
  { slug: 'cancer', name: 'Cancer', glyph: '♋', dates: 'Jun 21 – Jul 22', hue: '#B6D4E4' },
  { slug: 'leo', name: 'Leo', glyph: '♌', dates: 'Jul 23 – Aug 22', hue: '#E0A9B4' },
  { slug: 'virgo', name: 'Virgo', glyph: '♍', dates: 'Aug 23 – Sep 22', hue: '#B7D9B0' },
  { slug: 'libra', name: 'Libra', glyph: '♎', dates: 'Sep 23 – Oct 22', hue: '#D3A9DE' },
  { slug: 'scorpio', name: 'Scorpio', glyph: '♏', dates: 'Oct 23 – Nov 21', hue: '#B9DCE8' },
  { slug: 'sagittarius', name: 'Sagittarius', glyph: '♐', dates: 'Nov 22 – Dec 21', hue: '#E0B080' },
  { slug: 'capricorn', name: 'Capricorn', glyph: '♑', dates: 'Dec 22 – Jan 19', hue: '#C0DEA8' },
  { slug: 'aquarius', name: 'Aquarius', glyph: '♒', dates: 'Jan 20 – Feb 18', hue: '#AE8FC9' },
  { slug: 'pisces', name: 'Pisces', glyph: '♓', dates: 'Feb 19 – Mar 20', hue: '#A9D4C4' },
];

// BrandMark: twelve dots in a ring, one per sign hue (mirrors BrandMark.astro).
export function brandMarkSvg(size = 17) {
  const C = 12, R = 9, DOT = 1.9;
  const dots = NAV_SIGNS.map((s, i) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const cx = +(C + R * Math.cos(a)).toFixed(3);
    const cy = +(C + R * Math.sin(a)).toFixed(3);
    return `<circle cx="${cx}" cy="${cy}" r="${DOT}" fill="${s.hue}"/>`;
  }).join('');
  return `<svg class="wnav__brand" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">${dots}</svg>`;
}

// The full nav markup (bar + Signs dropdown + mobile overlay). The Registry chip
// is marked aria-current on every wing page (we are always in the wing here).
export function wingNavHtml({ includeSearch = true } = {}) {
  const mobileSignOffset = 4;
  const signGrid = NAV_SIGNS.map((s) => (
    `<a class="wnav-signs__item" href="/${s.slug}/" style="--sign:${s.hue}">` +
      `<picture class="wnav-disc"><source srcset="/assets/zodiac-icons/128/${s.slug}.avif" type="image/avif"/><img src="/assets/zodiac-icons/128/${s.slug}.webp" width="32" height="32" alt="" loading="lazy" decoding="async"/></picture>` +
      `<span class="wnav-signs__name">${s.name}</span>` +
      `<span class="wnav-signs__dates">${s.dates}</span>` +
    `</a>`
  )).join('');
  const mobileSigns = NAV_SIGNS.map((s, i) => (
    `<a class="wnav-menu__sign" style="--i:${mobileSignOffset + i};--sign:${s.hue}" href="/${s.slug}/" aria-label="${s.name}">` +
      `<picture class="wnav-disc wnav-disc--lg"><source srcset="/assets/zodiac-icons/128/${s.slug}.avif" type="image/avif"/><img src="/assets/zodiac-icons/128/${s.slug}.webp" width="40" height="40" alt="" loading="lazy" decoding="async"/></picture>` +
      `<span>${s.name}</span>` +
    `</a>`
  )).join('');
  const search = includeSearch
    ? `<a class="wnav__search" href="/?search=1" aria-label="Search the site">
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.75" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <kbd class="wnav__search-kbd" aria-hidden="true">/</kbd>
      </a>`
    : '';
  return `<div class="wnav-wrap">
    <nav class="wnav" aria-label="Primary" data-wnav>
      <a class="wnav__mark" href="/"><span class="wnav__name">Zodiacs<span class="wnav__sep">·</span><span class="wnav__dim">org</span></span></a>
      <div class="wnav__links">
        <a class="wnav__link" href="/tools/">Tools<svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true"><path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <button class="wnav__link wnav__signs-btn" type="button" data-wnav-signs aria-expanded="false" aria-controls="wnav-signs">Signs<svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true"><path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <a class="wnav__link" href="/learn/">Learn</a>
        <a class="wnav__link" href="/horoscopes/">Horoscopes</a>
        <a class="wnav__link" href="/profile/">Saved charts</a>
      </div>
      ${search}
      <a class="wnav__chip" href="/registry/" aria-current="page">Registry</a>
      <button class="wnav__burger" type="button" data-wnav-burger aria-expanded="false" aria-controls="wnav-menu" aria-label="Menu">
        <span class="wnav__burger-line"></span><span class="wnav__burger-line"></span><span class="wnav__burger-line"></span>
      </button>
    </nav>
    <div class="wnav-signs" id="wnav-signs" data-wnav-signs-menu hidden>
      <div class="wnav-signs__grid">${signGrid}</div>
    </div>
  </div>
  <div class="wnav-menu" id="wnav-menu" data-wnav-mobile hidden>
    <nav aria-label="Mobile">
      <div class="wnav-menu__group">
        <span class="wnav-menu__label">The site</span>
        <a class="wnav-menu__link" style="--i:0" href="/tools/">Tools</a>
        <a class="wnav-menu__link" style="--i:1" href="/learn/">Learn</a>
        <a class="wnav-menu__link" style="--i:2" href="/horoscopes/">Horoscopes</a>
        <a class="wnav-menu__link" style="--i:3" href="/profile/">Saved charts</a>
      </div>
      <div class="wnav-menu__group">
        <span class="wnav-menu__label">The twelve</span>
        <div class="wnav-menu__signs">${mobileSigns}</div>
      </div>
    </nav>
  </div>`;
}

// Vanilla toggle for the static wing pages (the hub SPA uses React state instead).
export function wingNavScript() {
  return `
  (function(){
    var wrap = document.querySelector('[data-wnav]') ? document.querySelector('[data-wnav]').parentElement : null;
    var signsBtn = document.querySelector('[data-wnav-signs]');
    var signsMenu = document.querySelector('[data-wnav-signs-menu]');
    var burger = document.querySelector('[data-wnav-burger]');
    var mobile = document.querySelector('[data-wnav-mobile]');
    function setSigns(open){
      if(!signsBtn||!signsMenu) return;
      signsBtn.setAttribute('aria-expanded', String(open));
      if(open){ signsMenu.hidden = false; requestAnimationFrame(function(){ signsMenu.classList.add('is-open'); }); }
      else { signsMenu.classList.remove('is-open'); setTimeout(function(){ signsMenu.hidden = true; }, 240); }
    }
    function setMobile(open){
      if(!burger||!mobile) return;
      burger.setAttribute('aria-expanded', String(open));
      mobile.hidden = !open;
      mobile.classList.toggle('is-open', open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
    }
    if(signsBtn) signsBtn.addEventListener('click', function(){ setSigns(signsBtn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function(e){ if(wrap && !wrap.contains(e.target)) setSigns(false); });
    if(burger) burger.addEventListener('click', function(){ setMobile(burger.getAttribute('aria-expanded') !== 'true'); });
    if(mobile) mobile.addEventListener('click', function(e){ if(e.target.closest('a')) setMobile(false); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ setSigns(false); setMobile(false); } });
  })();`;
}

// Canonical nav CSS — mirrors SiteNav.astro, inlined with literal token values
// (+ var() fallbacks) so it renders identically on any wing page. Includes the
// Instrument Sans @font-face so link type matches the main site everywhere.
export function wingNavCss() {
  return `
  @font-face { font-family: 'Instrument Sans'; src: url('/fonts/instrument-sans-latin-wght-normal.woff2') format('woff2-variations'); font-weight: 400 600; font-style: normal; font-display: swap; }
  .wnav-wrap { position: fixed; top: 14px; left: 0; right: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; pointer-events: none; padding-top: env(safe-area-inset-top); }
  .wnav { pointer-events: auto; display: inline-flex; align-items: center; gap: 10px; height: 52px; padding: 0 10px 0 20px; border-radius: 999px; background: rgba(10,12,17,0.66); backdrop-filter: saturate(150%) blur(18px); -webkit-backdrop-filter: saturate(150%) blur(18px); border: 1px solid rgba(198,204,218,0.16); box-shadow: inset 0 1px 0 rgba(238,241,247,0.06), 0 12px 32px -14px rgba(0,0,0,0.7); }
  @media (min-width: 820px) { .wnav { gap: 18px; } }
  .wnav__mark { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; white-space: nowrap; }
  .wnav__brand { display: block; flex-shrink: 0; }
  .wnav__mark:hover .wnav__brand { animation: wnav-turn 14s linear infinite; }
  .wnav__name { font-family: var(--serif, 'EB Garamond', Georgia, serif); font-weight: 400; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; line-height: 1; color: var(--ink, #EEF1F7); white-space: nowrap; }
  .wnav__sep { color: var(--ink-mute, #8A93A6); margin: 0 4px; }
  .wnav__dim { color: var(--ink-2, #C6CCDA); font-weight: 500; }
  @media (max-width: 819.5px) { .wnav__sep, .wnav__dim { display: none; } }
  .wnav__search { display: inline-flex; align-items: center; gap: 7px; padding: 8px 11px; border: none; border-radius: 999px; background: none; color: var(--ink-2, #C6CCDA); cursor: pointer; text-decoration: none; transition: color 200ms var(--ease, cubic-bezier(0.4,0,0.2,1)), background 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__search:hover { color: var(--ink, #EEF1F7); background: rgba(198,204,218,0.07); }
  @media (max-width: 819.5px) { .wnav__search { display: inline-grid; place-items: center; width: 34px; height: 34px; padding: 0; } }
  .wnav__search-kbd { display: none; font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 10px; line-height: 1; padding: 3px 5px; border: 1px solid rgba(198,204,218,0.16); border-radius: 4px; color: var(--ink-mute, #8A93A6); }
  @media (min-width: 820px) { .wnav__search-kbd { display: inline-block; } }
  .wnav__links { display: none; align-items: center; gap: 2px; }
  @media (min-width: 820px) { .wnav__links { display: inline-flex; } }
  .wnav__link { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; font-family: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: normal; text-transform: none; white-space: nowrap; color: var(--ink-2, #C6CCDA); text-decoration: none; background: none; border: 0; cursor: pointer; transition: color 200ms var(--ease, cubic-bezier(0.4,0,0.2,1)), background 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__link:hover { color: var(--ink, #EEF1F7); background: rgba(198,204,218,0.07); }
  .wnav__link[aria-current='page'] { color: var(--ink, #EEF1F7); }
  .wnav__signs-btn svg { transition: transform 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__signs-btn[aria-expanded='true'] svg { transform: rotate(180deg); }
  .wnav__chip { display: inline-flex; align-items: center; height: 34px; padding: 0 2px 0 16px; border-left: 1px solid rgba(198,204,218,0.16); font-family: var(--serif, 'EB Garamond', Georgia, serif); font-size: 13px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2, #C6CCDA); text-decoration: none; white-space: nowrap; transition: color 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__chip:hover { color: var(--ink, #EEF1F7); }
  @media (min-width: 820px) { .wnav__chip { letter-spacing: 0.14em; } }
  
  
  .wnav__burger { display: inline-grid; place-items: center; gap: 4px; width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(198,204,218,0.16); background: none; cursor: pointer; }
  @media (min-width: 820px) { .wnav__burger { display: none; } }
  .wnav__burger-line { display: block; width: 15px; height: 1.5px; border-radius: 2px; background: var(--ink-2, #C6CCDA); transition: transform 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)), opacity 200ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__burger[aria-expanded='true'] .wnav__burger-line:first-child { transform: translateY(5.5px) rotate(45deg); }
  .wnav__burger[aria-expanded='true'] .wnav__burger-line:nth-child(2) { opacity: 0; transform: scaleX(0.4); }
  .wnav__burger[aria-expanded='true'] .wnav__burger-line:last-child { transform: translateY(-5.5px) rotate(-45deg); }
  .wnav-disc { display: inline-block; width: 32px; height: 32px; line-height: 0; flex: 0 0 auto; }
  .wnav-disc img { width: 100%; height: 100%; border-radius: 50%; display: block; }
  .wnav-disc--lg { width: 40px; height: 40px; }
  .wnav-signs { pointer-events: auto; margin-top: 10px; width: min(100% - 32px, 620px); border-radius: 20px; background: rgba(10,12,17,0.82); backdrop-filter: saturate(150%) blur(22px); -webkit-backdrop-filter: saturate(150%) blur(22px); border: 1px solid var(--hair-2, rgba(198,204,218,0.16)); box-shadow: 0 24px 60px -24px rgba(0,0,0,0.8); padding: 10px; opacity: 0; transform: translateY(-6px) scale(0.99); transition: opacity 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)), transform 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav-signs[hidden] { display: none; }
  .wnav-signs.is-open { opacity: 1; transform: none; }
  .wnav-signs__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; }
  @media (min-width: 640px) { .wnav-signs__grid { grid-template-columns: repeat(3, 1fr); } }
  .wnav-signs__item { display: grid; grid-template-columns: 32px 1fr; grid-template-rows: auto auto; column-gap: 12px; align-items: center; padding: 10px 12px; border-radius: 14px; text-decoration: none; transition: background 200ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav-signs__item:hover { background: color-mix(in oklab, var(--sign) 12%, transparent); }
  .wnav-signs__item .wnav-disc { grid-row: span 2; }
  .wnav-signs__name { font-family: 'Instrument Sans', system-ui, sans-serif; font-size: 14px; font-weight: 550; color: var(--ink, #EEF1F7); line-height: 1.25; }
  .wnav-signs__dates { font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 10px; letter-spacing: 0.06em; color: var(--ink-mute, #8A93A6); }
  .wnav-menu { position: fixed; inset: 0; z-index: 59; pointer-events: auto; background: rgba(6,7,9,0.90); backdrop-filter: blur(26px) saturate(140%); -webkit-backdrop-filter: blur(26px) saturate(140%); padding: calc(92px + env(safe-area-inset-top)) clamp(24px,7vw,40px) 40px; overflow-y: auto; }
  .wnav-menu[hidden] { display: none; }
  .wnav-menu > nav { max-width: 520px; margin: 0 auto; }
  .wnav-menu__group + .wnav-menu__group { margin-top: 34px; }
  .wnav-menu__label { display: block; margin-bottom: 14px; font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-mute, #8A93A6); }
  .wnav-menu__link { display: block; padding: 13px 0; font-family: var(--serif, 'EB Garamond', Georgia, serif); font-size: clamp(24px, 7vw, 32px); font-weight: 400; letter-spacing: 0.01em; line-height: 1.05; text-decoration: none; color: var(--ink, #EEF1F7); border-bottom: 1px solid var(--hair, rgba(198,204,218,0.10)); }
  .wnav-menu__link:last-child { border-bottom: 0; }
  .wnav-menu__signs { display: flex; flex-direction: column; }
  .wnav-menu__sign { display: flex; flex-direction: row; align-items: center; gap: 13px; padding: 10px 0; text-decoration: none; font-family: var(--serif, 'EB Garamond', Georgia, serif); font-size: clamp(20px, 5.5vw, 26px); font-weight: 400; color: var(--ink, #EEF1F7); border-bottom: 1px solid var(--hair, rgba(198,204,218,0.10)); }
  .wnav-menu__sign:last-child { border-bottom: 0; }
  .wnav-menu__sign .wnav-disc { width: 30px; height: 30px; }
  .wnav-menu.is-open .wnav-menu__link, .wnav-menu.is-open .wnav-menu__sign, .wnav-menu.is-open .wnav-menu__label { animation: wnav-in 640ms var(--ease, cubic-bezier(0.4,0,0.2,1)) both; animation-delay: calc(40ms * var(--i, 0)); }
  @keyframes wnav-in { from { opacity: 0; transform: translateY(14px); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
  @keyframes wnav-turn { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .wnav-menu.is-open .wnav-menu__link, .wnav-menu.is-open .wnav-menu__sign, .wnav-menu.is-open .wnav-menu__label { animation: none; } .wnav-signs { transition: none; } .wnav__mark:hover .wnav__brand { animation: none; } }`;
}
