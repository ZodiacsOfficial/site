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
// Link set (owner-directed): Tools ▾ · Signs ▾ · Learn · Horoscopes · Saved charts
// on the left, an "Astrofolio" chip on the right. The verification Registry remains
// a separate read-only destination linked from records and the footer.
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

// English wing mirror of src/lib/nav-tools.ts. Descriptions appear in the
// desktop dropdown and remain in each mobile link's accessible name.
export const NAV_TOOLS = [
  { href: '/birth-chart/', name: 'Birth chart', description: 'See your sun, moon, rising, planets, houses, and what they mean.' },
  { href: '/compatibility/', name: 'Compatibility', description: 'Compare two charts and see where they click, clash, and grow.' },
  { href: '/transits/', name: 'Transits', description: "See today's sky next to your chart." },
  { href: '/moon-sign/', name: 'Moon sign', description: 'How you feel, and what settles you.' },
  { href: '/rising-sign/', name: 'Rising sign', description: 'Find the sign people meet first. Birth time helps.' },
  { href: '/moon-phase/', name: 'Moon phase', description: 'Tonight’s moon, and the moon of any date you care about.' },
  { href: '/saturn-return/', name: 'Saturn return', description: 'When yours hits, exactly, and what it tends to ask.' },
  { href: '/birthday/', name: 'Birthday', description: 'Check the Zodiac sign for any birthday from 1940 to 2030, including birthdays close to a sign change.' },
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

// The full nav markup (bar + Tools/Signs dropdowns + mobile overlay). Astrofolio is the
// consumer collection destination even when the current wing page is a Registry record.
export function wingNavHtml({ includeSearch = true } = {}) {
  const signGrid = NAV_SIGNS.map((s) => (
    `<a class="wnav-signs__item" href="/${s.slug}/" style="--sign:${s.hue}">` +
      `<picture class="wnav-disc"><source srcset="/assets/zodiac-icons/128/${s.slug}.avif" type="image/avif"/><img src="/assets/zodiac-icons/128/${s.slug}.webp" width="32" height="32" alt="" loading="lazy" decoding="async"/></picture>` +
      `<span class="wnav-signs__name">${s.name}</span>` +
      `<span class="wnav-signs__dates">${s.dates}</span>` +
    `</a>`
  )).join('');
  const mobileTools = NAV_TOOLS.map((tool, i) => (
    `<a class="wnav-menu__tool" style="--i:${i}" href="${tool.href}" aria-label="${tool.name}. ${tool.description}">${tool.name}</a>`
  )).join('');
  const desktopTools = NAV_TOOLS.map((tool) => (
    `<a class="wnav-tools__item" href="${tool.href}">` +
      `<span class="wnav-tools__name">${tool.name}</span>` +
      `<span class="wnav-tools__desc">${tool.description}</span>` +
    `</a>`
  )).join('');
  const mobileSigns = NAV_SIGNS.map((s, i) => (
    `<a class="wnav-menu__sign" style="--i:${i};--sign:${s.hue}" href="/${s.slug}/" aria-label="${s.name}">` +
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
        <button class="wnav__link wnav__dropdown-btn" type="button" data-wnav-tools aria-expanded="false" aria-controls="wnav-tools" aria-haspopup="true">Tools<svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true"><path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="wnav__link wnav__dropdown-btn" type="button" data-wnav-signs aria-expanded="false" aria-controls="wnav-signs" aria-haspopup="true">Signs<svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true"><path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <a class="wnav__link" href="/learn/">Learn</a>
        <a class="wnav__link" href="/horoscopes/">Horoscopes</a>
        <a class="wnav__link" href="/profile/">Saved charts</a>
      </div>
      ${search}
      <a class="wnav__chip" href="/astrofolio/">Astrofolio</a>
      <button class="wnav__burger" type="button" data-wnav-burger aria-expanded="false" aria-controls="wnav-menu" aria-label="Open menu">
        <span class="wnav__burger-line"></span><span class="wnav__burger-line"></span><span class="wnav__burger-line"></span>
      </button>
    </nav>
    <div class="wnav-tools" id="wnav-tools" data-wnav-tools-menu hidden>
      <div class="wnav-tools__grid">${desktopTools}</div>
    </div>
    <div class="wnav-signs" id="wnav-signs" data-wnav-signs-menu hidden>
      <div class="wnav-signs__grid">${signGrid}</div>
    </div>
  </div>
  <div class="wnav-menu" id="wnav-menu" data-wnav-mobile hidden>
    <nav aria-label="Mobile">
      <div class="wnav-menu__group">
        <span class="wnav-menu__label">The site</span>
        <a class="wnav-menu__link" style="--i:0" href="/learn/">Learn</a>
        <a class="wnav-menu__link" style="--i:1" href="/horoscopes/">Horoscopes</a>
        <a class="wnav-menu__link" style="--i:2" href="/profile/">Saved charts</a>
        <a class="wnav-menu__link wnav-menu__registry" style="--i:3" href="/astrofolio/"><span>Astrofolio</span><small>The twelve Zodiac signs</small></a>
      </div>
      <div class="wnav-menu__group">
        <span class="wnav-menu__label">Tools</span>
        <div class="wnav-menu__tools">${mobileTools}</div>
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
    var toolsBtn = document.querySelector('[data-wnav-tools]');
    var toolsMenu = document.querySelector('[data-wnav-tools-menu]');
    var signsBtn = document.querySelector('[data-wnav-signs]');
    var signsMenu = document.querySelector('[data-wnav-signs-menu]');
    var burger = document.querySelector('[data-wnav-burger]');
    var mobile = document.querySelector('[data-wnav-mobile]');
    function dropdown(toggle,panel,columns){
      if(!toggle||!panel) return null;
      var items = Array.from(panel.querySelectorAll('a'));
      var active = 0;
      var hideTimer = 0;
      function setActive(index,focus){
        active = (index + items.length) % items.length;
        items.forEach(function(item,i){ item.tabIndex = i === active ? 0 : -1; });
        if(focus && items[active]) items[active].focus();
      }
      function setOpen(open,focusIndex){
        clearTimeout(hideTimer);
        toggle.setAttribute('aria-expanded', String(open));
        if(open){
          panel.hidden = false;
          if(focusIndex !== undefined) setActive(focusIndex,true);
          requestAnimationFrame(function(){ panel.classList.add('is-open'); });
        } else {
          panel.classList.remove('is-open');
          hideTimer = setTimeout(function(){ panel.hidden = true; }, 190);
        }
      }
      toggle.addEventListener('keydown',function(event){
        if(event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        setOpen(true,event.key === 'ArrowDown' ? 0 : items.length - 1);
      });
      panel.addEventListener('keydown',function(event){
        var item = event.target.closest('a');
        if(!item) return;
        var index = items.indexOf(item);
        var moves = {ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns};
        if(event.key in moves){
          event.preventDefault();
          setActive(index + moves[event.key],true);
        } else if(event.key === 'Home' || event.key === 'End'){
          event.preventDefault();
          setActive(event.key === 'Home' ? 0 : items.length - 1,true);
        } else if(event.key === 'Escape'){
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          toggle.focus();
        }
      });
      items.forEach(function(item,index){ item.addEventListener('focus',function(){ setActive(index,false); }); });
      setActive(0,false);
      return {button:toggle,menu:panel,isOpen:function(){ return toggle.getAttribute('aria-expanded') === 'true'; },setOpen:setOpen};
    }
    var toolsDropdown = dropdown(toolsBtn,toolsMenu,2);
    var signsDropdown = dropdown(signsBtn,signsMenu,3);
    if(toolsDropdown) toolsDropdown.button.addEventListener('click',function(){
      var open = !toolsDropdown.isOpen();
      if(signsDropdown) signsDropdown.setOpen(false);
      toolsDropdown.setOpen(open);
    });
    if(toolsDropdown) toolsDropdown.button.addEventListener('keydown',function(event){
      if((event.key === 'ArrowDown' || event.key === 'ArrowUp') && signsDropdown) signsDropdown.setOpen(false);
    });
    if(signsDropdown) signsDropdown.button.addEventListener('click',function(){
      var open = !signsDropdown.isOpen();
      if(toolsDropdown) toolsDropdown.setOpen(false);
      signsDropdown.setOpen(open);
    });
    if(signsDropdown) signsDropdown.button.addEventListener('keydown',function(event){
      if((event.key === 'ArrowDown' || event.key === 'ArrowUp') && toolsDropdown) toolsDropdown.setOpen(false);
    });
    function setMobile(open){
      if(!burger||!mobile) return;
      if(open){
        if(toolsDropdown) toolsDropdown.setOpen(false);
        if(signsDropdown) signsDropdown.setOpen(false);
      }
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobile.hidden = !open;
      mobile.classList.toggle('is-open', open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
    }
    if(burger) burger.addEventListener('click', function(){ setMobile(burger.getAttribute('aria-expanded') !== 'true'); });
    if(mobile) mobile.addEventListener('click', function(e){ if(e.target.closest('a')) setMobile(false); });
    document.addEventListener('click',function(event){
      if(wrap && wrap.contains(event.target)) return;
      if(toolsDropdown) toolsDropdown.setOpen(false);
      if(signsDropdown) signsDropdown.setOpen(false);
    });
    document.addEventListener('keydown',function(event){
      if(event.key !== 'Escape') return;
      var focused = document.activeElement;
      var restore = toolsDropdown && toolsDropdown.menu.contains(focused)
        ? toolsDropdown.button
        : signsDropdown && signsDropdown.menu.contains(focused) ? signsDropdown.button : null;
      if(toolsDropdown) toolsDropdown.setOpen(false);
      if(signsDropdown) signsDropdown.setOpen(false);
      setMobile(false);
      if(restore) restore.focus();
    });
  })();`;
}

// Canonical nav CSS — mirrors SiteNav.astro, inlined with literal token values
// (+ var() fallbacks) so it renders identically on any wing page. Includes the
// Instrument Sans @font-face so link type matches the main site everywhere.
export function wingNavCss() {
  return `
  @font-face { font-family: 'Instrument Sans'; src: url('/fonts/instrument-sans-latin-wght-normal.woff2') format('woff2-variations'); font-weight: 400 600; font-style: normal; font-display: swap; }
  @font-face { font-family: 'Instrument Sans Fallback'; src: local('Arial'), local('Liberation Sans'); ascent-override: 97%; descent-override: 25%; line-gap-override: 0%; }
  @font-face { font-family: 'Instrument Sans Fallback Android'; src: local('Roboto'); ascent-override: 97%; descent-override: 25%; line-gap-override: 0%; }
  @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
  @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-500-normal.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
  @font-face { font-family: 'EB Garamond Fallback'; src: local('Georgia'); size-adjust: 76.8%; ascent-override: 131.12%; descent-override: 38.8%; line-gap-override: 0%; }
  @font-face { font-family: 'EB Garamond Fallback Android'; src: local('Noto Serif'); size-adjust: 79.64%; ascent-override: 126.44%; descent-override: 37.42%; line-gap-override: 0%; }
  @font-face { font-family: 'EB Garamond Fallback Times'; src: local('Times New Roman'), local('Liberation Serif'); size-adjust: 87.49%; ascent-override: 115.1%; descent-override: 34.06%; line-gap-override: 0%; }
  .wnav-wrap { --wing-sans: 'Instrument Sans', 'Instrument Sans Fallback', 'Instrument Sans Fallback Android', system-ui, -apple-system, sans-serif; --wing-serif: 'EB Garamond', 'EB Garamond Fallback', 'EB Garamond Fallback Android', 'EB Garamond Fallback Times', 'Iowan Old Style', Georgia, serif; position: fixed; top: 14px; left: 0; right: 0; z-index: 60; display: flex; flex-direction: column; align-items: center; pointer-events: none; padding-top: env(safe-area-inset-top); }
  .wnav { pointer-events: auto; display: inline-flex; align-items: center; gap: 10px; height: 52px; padding: 0 10px 0 20px; border-radius: 999px; background: rgba(10,12,17,0.66); backdrop-filter: saturate(150%) blur(18px); -webkit-backdrop-filter: saturate(150%) blur(18px); border: 1px solid rgba(198,204,218,0.16); box-shadow: inset 0 1px 0 rgba(238,241,247,0.06), 0 12px 32px -14px rgba(0,0,0,0.7); }
  @media (min-width: 820px) { .wnav { gap: 10px; } }
  @media (min-width: 900px) { .wnav { gap: 18px; } }
  .wnav__mark { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; white-space: nowrap; }
  .wnav__brand { display: block; flex-shrink: 0; }
  .wnav__mark:hover .wnav__brand { animation: wnav-turn 14s linear infinite; }
  .wnav__name { font-family: var(--wing-serif); font-weight: 400; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; line-height: 1; color: var(--ink, #EEF1F7); white-space: nowrap; }
  .wnav__sep { color: var(--ink-mute, #8A93A6); margin: 0 4px; }
  .wnav__dim { color: var(--ink-2, #C6CCDA); font-weight: 500; }
  @media (max-width: 819.5px) { .wnav__sep, .wnav__dim { display: none; } }
  .wnav__search { display: inline-flex; align-items: center; gap: 7px; padding: 8px 11px; border: none; border-radius: 999px; background: none; color: var(--ink-2, #C6CCDA); cursor: pointer; text-decoration: none; transition: color 200ms var(--ease, cubic-bezier(0.4,0,0.2,1)), background 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__search:hover { color: var(--ink, #EEF1F7); background: rgba(198,204,218,0.07); }
  @media (max-width: 819.5px) {
    .wnav__search { display: inline-grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; padding: 0; }
  }
  .wnav__search-kbd { display: none; font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 10px; line-height: 1; padding: 3px 5px; border: 1px solid rgba(198,204,218,0.16); border-radius: 4px; color: var(--ink-mute, #8A93A6); }
  @media (min-width: 820px) { .wnav__search-kbd { display: inline-block; } }
  .wnav__links { display: none; align-items: center; gap: 2px; }
  @media (min-width: 820px) { .wnav__links { display: inline-flex; } }
  .wnav__link { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; font-family: var(--wing-sans); font-size: 14px; font-weight: 500; letter-spacing: normal; text-transform: none; white-space: nowrap; color: var(--ink-2, #C6CCDA); text-decoration: none; background: none; border: 0; cursor: pointer; transition: color 200ms var(--ease, cubic-bezier(0.4,0,0.2,1)), background 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__link:hover { color: var(--ink, #EEF1F7); background: rgba(198,204,218,0.07); }
  .wnav__link[aria-current='page'] { color: var(--ink, #EEF1F7); }
  .wnav__dropdown-btn svg { transition: transform 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__dropdown-btn[aria-expanded='true'] svg { transform: rotate(180deg); }
  .wnav__chip { display: inline-flex; align-items: center; min-height: 34px; padding: 0 2px 0 16px; border-left: 1px solid rgba(198,204,218,0.16); font-family: var(--wing-serif); font-size: 13px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2, #C6CCDA); text-decoration: none; white-space: nowrap; transition: color 260ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav__chip:hover { color: var(--ink, #EEF1F7); }
  @media (min-width: 820px) { .wnav__chip { letter-spacing: 0.14em; } }
  .wnav__burger { position: relative; display: inline-block; flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(198,204,218,0.16); background: none; cursor: pointer; transition: transform 140ms cubic-bezier(0.23,1,0.32,1); }
  .wnav__burger:active { transform: scale(0.97); }
  @media (min-width: 820px) { .wnav__burger { display: none; } }
  .wnav__burger-line { display: block; position: absolute; top: 50%; left: 50%; width: 18px; height: 1.5px; border-radius: 2px; background: var(--ink-2, #C6CCDA); transform-origin: 50% 50%; transition: transform 220ms cubic-bezier(0.77,0,0.175,1), opacity 140ms cubic-bezier(0.23,1,0.32,1); }
  .wnav__burger-line:first-child { transform: translate(-50%, calc(-50% - 5px)); }
  .wnav__burger-line:nth-child(2) { transform: translate(-50%, -50%); }
  .wnav__burger-line:last-child { transform: translate(-50%, calc(-50% + 5px)); }
  .wnav__burger[aria-expanded='true'] .wnav__burger-line:first-child { transform: translate(-50%, -50%) rotate(45deg); }
  .wnav__burger[aria-expanded='true'] .wnav__burger-line:nth-child(2) { opacity: 0; transform: translate(-50%, -50%) scaleX(0.18); }
  .wnav__burger[aria-expanded='true'] .wnav__burger-line:last-child { transform: translate(-50%, -50%) rotate(-45deg); }
  .wnav-disc { display: inline-block; width: 32px; height: 32px; line-height: 0; flex: 0 0 auto; }
  .wnav-disc img { width: 100%; height: 100%; border-radius: 50%; display: block; }
  .wnav-disc--lg { width: 40px; height: 40px; }
  .wnav-tools, .wnav-signs { pointer-events: auto; margin-top: 10px; width: min(100% - 32px, 620px); border-radius: 22px; background: rgba(10,12,17,0.82); backdrop-filter: saturate(150%) blur(22px); -webkit-backdrop-filter: saturate(150%) blur(22px); border: 1px solid var(--hair-2, rgba(198,204,218,0.16)); box-shadow: 0 24px 60px -24px rgba(0,0,0,0.8); padding: 10px; opacity: 0; transform: translateY(-6px) scale(0.99); transition: opacity 190ms var(--ease, cubic-bezier(0.4,0,0.2,1)), transform 190ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav-tools { width: min(100% - 32px, 720px); }
  .wnav-tools[hidden], .wnav-signs[hidden] { display: none; }
  .wnav-tools.is-open, .wnav-signs.is-open { opacity: 1; transform: none; }
  .wnav-tools__grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 2px; }
  .wnav-tools__item { display: grid; gap: 4px; min-width: 0; padding: 12px; border-radius: 14px; color: var(--ink, #EEF1F7); text-decoration: none; }
  .wnav-tools__item:hover, .wnav-tools__item:focus-visible { background: rgba(198,204,218,0.07); }
  .wnav-tools__name { font-family: var(--wing-sans); font-size: 14px; font-weight: 550; line-height: 1.25; }
  .wnav-tools__desc { overflow: hidden; font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 9px; line-height: 1.4; letter-spacing: 0.025em; color: var(--ink-mute, #8A93A6); text-overflow: ellipsis; white-space: nowrap; }
  .wnav-signs__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; }
  @media (min-width: 640px) { .wnav-signs__grid { grid-template-columns: repeat(3, 1fr); } }
  .wnav-signs__item { display: grid; grid-template-columns: 32px 1fr; grid-template-rows: auto auto; column-gap: 12px; align-items: center; padding: 10px 12px; border-radius: 14px; text-decoration: none; transition: background 200ms var(--ease, cubic-bezier(0.4,0,0.2,1)); }
  .wnav-signs__item:hover { background: color-mix(in oklab, var(--sign) 12%, transparent); }
  .wnav-signs__item .wnav-disc { grid-row: span 2; }
  .wnav-signs__name { font-family: var(--wing-sans); font-size: 14px; font-weight: 550; color: var(--ink, #EEF1F7); line-height: 1.25; }
  .wnav-signs__dates { font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 10px; letter-spacing: 0.06em; color: var(--ink-mute, #8A93A6); }
  .wnav-menu { --wing-sans: 'Instrument Sans', 'Instrument Sans Fallback', 'Instrument Sans Fallback Android', system-ui, -apple-system, sans-serif; --wing-serif: 'EB Garamond', 'EB Garamond Fallback', 'EB Garamond Fallback Android', 'EB Garamond Fallback Times', 'Iowan Old Style', Georgia, serif; position: fixed; inset: 0; z-index: 59; pointer-events: auto; background: rgba(6,7,9,0.88); backdrop-filter: blur(26px) saturate(140%); -webkit-backdrop-filter: blur(26px) saturate(140%); padding: calc(96px + env(safe-area-inset-top)) 24px 40px; overflow-y: auto; }
  .wnav-menu[hidden] { display: none; }
  .wnav-menu__group + .wnav-menu__group { margin-top: 34px; }
  .wnav-menu__label { display: block; margin-bottom: 14px; font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-mute, #8A93A6); }
  .wnav-menu__link { display: block; padding: 13px 0; font-family: var(--wing-serif); font-size: clamp(24px, 7vw, 32px); font-weight: 400; letter-spacing: 0.01em; line-height: 1.05; text-decoration: none; color: var(--ink, #EEF1F7); border-bottom: 1px solid var(--hair, rgba(198,204,218,0.10)); }
  .wnav-menu__link:last-child { border-bottom: 0; }
  .wnav-menu__registry { display: grid; gap: 5px; }
  .wnav-menu__registry small { color: var(--ink-mute, #8A93A6); font-family: var(--mono, 'JetBrains Mono', monospace); font-size: 9px; letter-spacing: 0.04em; line-height: 1.35; }
  .wnav-menu__tools { display: grid; grid-template-columns: minmax(0, 1fr); }
  .wnav-menu__tool { display: block; min-width: 0; padding: 11px 0; border-bottom: 1px solid var(--hair, rgba(198,204,218,0.10)); color: var(--ink, #EEF1F7); font-family: var(--wing-serif); font-size: clamp(18px, 5vw, 22px); line-height: 1.05; text-decoration: none; }
  .wnav-menu__tool:last-child { border-bottom: 0; }
  .wnav-menu__signs { display: flex; flex-direction: column; }
  .wnav-menu__sign { display: flex; flex-direction: row; align-items: center; gap: 13px; padding: 10px 0; text-decoration: none; font-family: var(--wing-serif); font-size: clamp(20px, 5.5vw, 26px); font-weight: 400; color: var(--ink, #EEF1F7); border-bottom: 1px solid var(--hair, rgba(198,204,218,0.10)); }
  .wnav-menu__sign:last-child { border-bottom: 0; }
  .wnav-menu__sign .wnav-disc { width: 30px; height: 30px; }
  @keyframes wnav-turn { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .wnav-tools, .wnav-signs, .wnav__burger, .wnav__dropdown-btn svg, .wnav__burger-line { transition: none; } .wnav__mark:hover .wnav__brand { animation: none; } }`;
}
