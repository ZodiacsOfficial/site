/*
 * Astrofolio redesign prototypes: shared helpers.
 * Every figure comes from shared/data.js (Registry + committed DexScreener
 * snapshot); nothing is invented. Prototype support only.
 */
import { DATA } from './data.js';

export { DATA };
export const SIGNS = DATA.signs;
export const bySlug = Object.fromEntries(SIGNS.map((sign) => [sign.slug, sign]));
export const A = new URL('../../../../public/assets/', import.meta.url).href;
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const SHOT = new URLSearchParams(location.search).has('shot');

export const art = {
  figure: (slug, size = 1024) => `${A}sculptures/${size}/${slug}.webp`,
  disc: (slug, size = 128) => `${A}zodiac-icons/${size}/${slug}.webp`,
  stars: (slug) => `${A}constellations/${slug}.svg`,
  metal: (metal, slug) => `${A}cabinet-materials/${metal}/${slug}.webp`,
  fomoApp: `${A}venues/fomo-official.svg`,
  fomoEyes: `${A}fomo/fomo-eyes.png`,
  merch: (file) => `${A}astrofolio/merch/${file}`,
  ring: `${A}astrofolio/v2/zodiac-ring-192.png`,
};

export const FOMO = {
  site: 'https://fomo.family/',
  appStore: 'https://apps.apple.com/us/app/fomo-never-miss-out/id6741115427',
  play: 'https://play.google.com/store/apps/details?id=family.fomo.app',
  page: 'https://zodiacs.org/fomo/',
};

export const esc = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/* ── Formatting ────────────────────────────────────────────────────────── */
export function fmtPrice(value) {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.000001) return `$${value.toFixed(8)}`;
  return `$${value.toFixed(10)}`;
}
export function fmtCompact(value) {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
/** A 24h move in words, with the arrow as the non-colour cue. */
export function fmtChange(value, { words = true } = {}) {
  if (value == null || !Number.isFinite(value)) return { text: words ? 'no 24h reading' : '—', cls: '' };
  const magnitude = Math.abs(value).toFixed(2);
  if (value > 0) return { text: words ? `▲ up ${magnitude}% today` : `▲ ${magnitude}%`, cls: 'is-up' };
  if (value < 0) return { text: words ? `▼ down ${magnitude}% today` : `▼ ${magnitude}%`, cls: 'is-down' };
  return { text: words ? 'unchanged today' : '0.00%', cls: '' };
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTHS.map((month) => month.slice(0, 3));
export function fmtDay(iso, { long = false } = {}) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return `${d.getUTCDate()} ${(long ? MONTHS : MON)[d.getUTCMonth()]}`;
}
export function fmtUtcTime(iso) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}
export const snapshotLabel = () => `Snapshot ${fmtDay(DATA.snapshot.readAt)}, ${fmtUtcTime(DATA.snapshot.readAt)} · ${DATA.snapshot.provider}`;

/* ── Sky ───────────────────────────────────────────────────────────────── */
/** Apparent solar longitude, low-precision (≈0.01°) — enough to place a marker on a dial. */
export function sunLongitude(date = new Date()) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const rad = Math.PI / 180;
  const g = (357.529 + 0.98560028 * d) * rad;
  const q = 280.459 + 0.98564736 * d;
  const lambda = q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return ((lambda % 360) + 360) % 360;
}
export function signDegrees(longitude) {
  const sign = SIGNS[Math.floor(longitude / 30) % 12];
  const within = longitude - sign.longitude;
  const deg = Math.floor(within);
  const min = Math.floor((within - deg) * 60);
  return { sign, text: `${deg}°${String(min).padStart(2, '0')}′ ${sign.name}` };
}
/** The Sun's current sign window, from the site's own ingress table. */
export function season(date = new Date()) {
  const iso = date.toISOString();
  const windows = DATA.sunWindows;
  let index = windows.findIndex((w) => w.from <= iso && iso < w.to);
  if (index < 0) index = windows.length - 1;
  const w = windows[index];
  const next = windows[index + 1] ?? null;
  const from = new Date(w.from);
  const to = new Date(w.to);
  const days = Math.round((to - from) / 86400000);
  const day = Math.min(days, Math.floor((date - from) / 86400000) + 1);
  return { sign: bySlug[w.sign], from: w.from, to: w.to, day, days, progress: (date - from) / (to - from), next: next && { sign: bySlug[next.sign], from: next.from } };
}
export function initialSign() {
  const asked = new URLSearchParams(location.search).get('sign');
  return bySlug[asked] ?? season().sign;
}

/* ── Sparkline ─────────────────────────────────────────────────────────── */
/**
 * Single-series price line over the committed 14 daily reads. Missing days
 * are skipped, never invented. Hover/focus shows date + price.
 */
export function sparkline(host, sign, { height = 64, area = true, label = true } = {}) {
  const values = sign.series;
  const dates = DATA.snapshot.dates;
  const points = values.map((v, i) => [i, v]).filter(([, v]) => typeof v === 'number' && v > 0);
  const W = 240;
  const H = height;
  const P = 4;
  const steps = Math.max(1, values.length - 1);
  const min = Math.min(...points.map(([, v]) => v));
  const max = Math.max(...points.map(([, v]) => v));
  const flat = max === min;
  const x = (i) => P + (i / steps) * (W - 2 * P);
  const y = (v) => (flat ? H / 2 : H - P - ((v - min) / (max - min)) * (H - 2 * P));
  const line = points.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = points.length > 1 ? `${line} L${x(last[0]).toFixed(1)} ${H} L${x(first[0]).toFixed(1)} ${H} Z` : '';
  const summary = `${sign.name} price, ${points.length} daily reads: ${fmtPrice(first?.[1])} on ${fmtDay(dates[first?.[0] ?? 0])} to ${fmtPrice(last?.[1])} on ${fmtDay(dates[last?.[0] ?? 0])}.`;
  host.classList.add('spark');
  host.style.setProperty('--sign', sign.hue);
  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(summary)}">
      <line class="spark__base" x1="0" x2="${W}" y1="${H - 0.5}" y2="${H - 0.5}"></line>
      ${area && areaPath ? `<path class="spark__area" d="${areaPath}"></path>` : ''}
      <path class="spark__line" d="${line}"></path>
      <line class="spark__cross" x1="0" x2="0" y1="0" y2="${H}"></line>
      <rect class="spark__hit" x="0" y="-12" width="${W}" height="${H + 24}"></rect>
    </svg>
    <span class="spark__dotwrap" aria-hidden="true"></span>
    ${label ? '<span class="spark__tip" aria-hidden="true"></span>' : ''}`;
  const dot = document.createElement('span');
  dot.className = 'spark__hdot';
  dot.setAttribute('aria-hidden', 'true');
  Object.assign(dot.style, { position: 'absolute', width: '9px', height: '9px', borderRadius: '50%', border: `2px solid ${sign.hue}`, background: 'var(--void-0)', transform: 'translate(-50%,-50%)', pointerEvents: 'none', transition: 'left 90ms linear, top 90ms linear' });
  host.appendChild(dot);
  const cross = host.querySelector('.spark__cross');
  const tip = host.querySelector('.spark__tip');
  const place = (index) => {
    const point = points.reduce((best, p) => (Math.abs(p[0] - index) < Math.abs(best[0] - index) ? p : best), points[0]);
    const px = (x(point[0]) / W) * 100;
    const py = (y(point[1]) / H) * 100;
    dot.style.left = `${px}%`;
    dot.style.top = `${py}%`;
    cross.setAttribute('x1', x(point[0]));
    cross.setAttribute('x2', x(point[0]));
    if (tip) {
      tip.textContent = `${fmtDay(dates[point[0]])} · ${fmtPrice(point[1])}`;
      tip.style.left = `${px}%`;
      tip.style.transform = px > 62 ? 'translateX(-100%)' : px < 38 ? 'translateX(0)' : 'translateX(-50%)';
    }
  };
  place(last?.[0] ?? 0);
  const hit = host.querySelector('.spark__hit');
  hit.addEventListener('pointermove', (event) => {
    const box = hit.getBoundingClientRect();
    place(((event.clientX - box.left) / box.width) * steps);
  });
  hit.addEventListener('pointerleave', () => place(last[0]));
  return host;
}

/* ── Shared chunks of markup ───────────────────────────────────────────── */
export function fomoButton(sign, { compact = false } = {}) {
  return `<a class="btn-fomo${compact ? ' btn-fomo--compact' : ''}" href="${esc(sign.fomo)}" rel="external nofollow noopener" aria-label="Open Fomo to buy ${esc(sign.name)}" data-fomo-buy="${sign.slug}">
    <img class="btn-fomo__app" src="${art.fomoApp}" width="38" height="38" alt="">
    <span class="btn-fomo__copy"><small>${esc(sign.name)} <img src="${art.disc(sign.slug, 48)}" width="13" height="13" alt=""></small><strong>Buy with Fomo</strong></span>
    <span class="btn-fomo__arrow" aria-hidden="true">↗</span>
  </a>`;
}
export const fomoWord = (word = 'fomo') => `${word}<img class="fomo-mark" src="${art.fomoEyes}" width="512" height="326" alt="" aria-hidden="true">`;
export function storeBadges() {
  return `<div class="stores">
    <a class="store-apple" href="${FOMO.appStore}" rel="external nofollow noopener"><img src="${A}badges/app-store-en.svg" width="144" height="48" alt="Download on the App Store"></a>
    <a class="store-google" href="${FOMO.play}" rel="external nofollow noopener"><img src="${A}badges/google-play-en.png" width="185" height="71" alt="Get it on Google Play"></a>
  </div>`;
}
export function mountFaq(host, { title = 'Questions', intro = '' } = {}) {
  host.innerHTML = `<div class="faq wrap">
    <div><h2 class="section-title">${esc(title)}</h2>${intro ? `<p class="lede" style="margin-top:18px">${intro}</p>` : ''}</div>
    <dl>${DATA.faqs.map(([q, a]) => `<div><dt>${esc(q)}</dt><dd>${esc(a)}</dd></div>`).join('')}</dl>
  </div>`;
}
export function mountEnding(host) {
  host.innerHTML = `<aside class="notice wrap" role="note" aria-labelledby="notice-title">
      <strong id="notice-title">Market &amp; venue notice</strong>
      <div>${DATA.notice.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    </aside>${DATA.footer
      .replaceAll('src="/assets/', `src="${A}`)
      .replaceAll('href="/', 'href="https://zodiacs.org/')}`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */
export function reveal(root = document) {
  const items = [...root.querySelectorAll('.reveal')];
  if (reducedMotion || SHOT || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  items.forEach((el) => io.observe(el));
}
/** Muted loop that plays only on screen; reduced motion keeps the poster. */
export function lazyVideo(video) {
  if (reducedMotion) return;
  video.muted = true;
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }, { threshold: 0.05 });
  io.observe(video);
}
export function protoChrome(label) {
  if (SHOT) document.documentElement.classList.add('is-shot');
  const bar = document.createElement('div');
  bar.className = 'proto';
  bar.innerHTML = `<span>Prototype · <b>${esc(label)}</b></span><a href="./index.html">All options</a>`;
  document.body.appendChild(bar);
}
export function siteNav() {
  return `<header class="snav" aria-label="Site">
    <a class="snav__brand" href="https://zodiacs.org/">Zodiacs<span> · org</span></a>
    <nav class="snav__links" aria-label="Primary"><a href="https://zodiacs.org/tools/">Tools</a><a href="https://zodiacs.org/learn/">Signs</a><a href="https://zodiacs.org/today/">Today</a><a href="https://zodiacs.org/learn/">Learn</a><a href="https://zodiacs.org/horoscopes/">Horoscopes</a><a href="https://zodiacs.org/profile/">Saved charts</a></nav>
    <span class="snav__rule" aria-hidden="true"></span>
    <a class="snav__wing" href="#top" aria-current="page">Astrofolio</a>
    <button class="snav__menu" type="button" aria-label="Menu"><span></span></button>
  </header>`;
}
/** Decode every figure up front so a selection never waits on the network. */
export function preloadFigures(size = 1024) {
  for (const sign of SIGNS) { const img = new Image(); img.decoding = 'async'; img.src = art.figure(sign.slug, size); }
}
/** Address check against the 24 published Registry addresses. */
export function checkAddress(raw) {
  const value = raw.trim();
  if (!value) return { state: 'empty' };
  for (const sign of SIGNS) {
    if (value === sign.solana) return { state: 'match', sign, chain: 'Solana', role: 'origin' };
    if (value.toLowerCase() === sign.base.toLowerCase()) return { state: 'match', sign, chain: 'Base', role: 'counterpart' };
  }
  const looksLikeAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value) || /^0x[0-9a-fA-F]{40}$/.test(value);
  return { state: looksLikeAddress ? 'nomatch' : 'invalid' };
}
export const shortAddr = (address) => `${address.slice(0, 6)}…${address.slice(-5)}`;

/**
 * The site's constellation map for a sign (HYG v4.0, CC BY-SA 4.0), with its
 * card background and field glow removed so only the stars and guide lines
 * sit on the page. Returns inline SVG markup.
 */
const starCache = new Map();
export function loadStars(slug) {
  if (!starCache.has(slug)) {
    starCache.set(slug, fetch(art.stars(slug)).then((r) => r.text()).then((text) => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.documentElement;
      svg.querySelectorAll('rect, radialGradient, title, desc, metadata, text').forEach((node) => node.remove());
      svg.removeAttribute('role');
      svg.removeAttribute('aria-labelledby');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('class', 'stars');
      return svg.outerHTML;
    }).catch(() => ''));
  }
  return starCache.get(slug);
}
/* What each design shows, for alt text (the word "sculpture" stays out of consumer copy). */
export const FIGURE_ALT = {
  aries: 'a leaping ram', taurus: 'a charging bull', gemini: 'the twins, one holding a lyre',
  cancer: 'a crab with its claws raised', leo: 'a roaring lion', virgo: 'the maiden holding a sheaf of wheat',
  libra: 'the scales on an ornate stand', scorpio: 'a scorpion with its tail raised', sagittarius: 'the centaur archer drawing his bow',
  capricorn: 'the sea-goat', aquarius: 'the water-bearer pouring from an urn', pisces: 'two fish circling each other',
};
export const figureAlt = (sign) => `The Astrofolio ${sign.name} design in gold: ${FIGURE_ALT[sign.slug]}.`;
export const STAR_CREDIT ='Star positions: HYG Database v4.0, CC BY-SA 4.0; guide lines drawn by Zodiacs.org.';
