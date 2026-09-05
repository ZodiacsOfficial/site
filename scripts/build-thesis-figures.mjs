/**
 * Stamp the thesis attention figure (F2) into public/thesis/index.html from the
 * committed snapshot at public/thesis/thesis-attention.json plus the ephemeris
 * registers (src/data/ingresses.json, src/data/eclipses.json).
 *
 * The SVG between the markers
 *   <!-- thesis-attention-figure:begin -->
 *   <!-- thesis-attention-figure:end -->
 * is generated output; edit this script or refresh the snapshot, never the SVG.
 *
 *   node scripts/build-thesis-figures.mjs            # restamp from committed data
 *   node scripts/build-thesis-figures.mjs --refresh  # refetch a year of pageviews
 *     from the Wikimedia API into the snapshot first (manual, reviewed action),
 *     then restamp
 *
 * Deliberately NOT in the drift job: the stamp re-derives byte-identically from
 * the committed snapshot, and refreshing the snapshot is a reviewed action like
 * the disclosure registers, never part of a build.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = resolve(root, 'public/thesis/index.html');
const snapPath = resolve(root, 'public/thesis/thesis-attention.json');

const SIGN_TITLES = [
  'Aries_(astrology)', 'Taurus_(astrology)', 'Gemini_(astrology)', 'Cancer_(astrology)',
  'Leo_(astrology)', 'Virgo_(astrology)', 'Libra_(astrology)', 'Scorpio_(astrology)',
  'Sagittarius_(astrology)', 'Capricorn_(astrology)', 'Aquarius_(astrology)', 'Pisces_(astrology)',
];

async function refresh() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const fmt = (d) => d.toISOString().slice(0, 10).replaceAll('-', '') + '00';
  const daily = {};
  for (const title of SIGN_TITLES) {
    const enc = encodeURIComponent(title).replace(/\(/g, '%28').replace(/\)/g, '%29');
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${enc}/daily/${fmt(start)}/${fmt(end)}`;
    let res = null;
    for (let attempt = 0; attempt < 5 && !res?.ok; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 2000 * attempt));
      res = await fetch(url, { headers: { 'User-Agent': 'zodiacs.org thesis figure (build-thesis-figures.mjs)' } });
    }
    if (!res?.ok) throw new Error(`pageviews fetch failed for ${title}: ${res?.status}`);
    const json = await res.json();
    for (const item of json.items) {
      const day = item.timestamp.slice(0, 8);
      daily[day] = (daily[day] || 0) + item.views;
    }
  }
  const days = Object.keys(daily).sort();
  const prev = JSON.parse(await readFile(snapPath, 'utf8'));
  const snap = {
    ...prev,
    fetchedAt: new Date().toISOString().slice(0, 10),
    coverage: '12/12 sign articles',
    from: days[0],
    to: days.at(-1),
    series: days.map((d) => ({ d, v: daily[d] })),
  };
  await writeFile(snapPath, JSON.stringify(snap));
  console.log(`refreshed snapshot: ${days.length} days ${snap.from} → ${snap.to}`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (x, y, t, cls = '', anchor = 'start') =>
  `<text x="${x.toFixed(1)}" y="${y}" text-anchor="${anchor}"${cls ? ` class="${cls}"` : ''}>${esc(t)}</text>`;

export async function attentionFigureSvg() {
  const snap = JSON.parse(await readFile(snapPath, 'utf8'));
  const ing = JSON.parse(await readFile(resolve(root, 'src/data/ingresses.json'), 'utf8'));
  const ecl = JSON.parse(await readFile(resolve(root, 'src/data/eclipses.json'), 'utf8'));
  const pts = snap.series;
  const iso = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  const t0 = Date.parse(iso(snap.from)), t1 = Date.parse(iso(snap.to));
  const vmax = Math.max(...pts.map((p) => p.v));
  const VMAX = Math.ceil(vmax / 10000) * 10000;
  const ts = pts.map((p) => Date.parse(iso(p.d)));
  const fromIso = iso(snap.from), toIso = iso(snap.to);
  // Each ingress tick wears the hue of the sign the sun is entering — the
  // twelve pastel disc hues, the site's only chroma.
  const SIGN_HUES = {
    aries: '#DE8E79', taurus: '#B9D4BE', gemini: '#B29DD0', cancer: '#B6D4E4',
    leo: '#E0A9B4', virgo: '#B7D9B0', libra: '#D3A9DE', scorpio: '#B9DCE8',
    sagittarius: '#E0B080', capricorn: '#C0DEA8', aquarius: '#AE8FC9', pisces: '#A9D4C4',
  };
  let mi = 0;
  pts.forEach((p, i) => { if (p.v > pts[mi].v) mi = i; });
  const md = new Date(ts[mi]);
  const peakLabel = `Peak: ${md.getUTCDate()} ${md.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} · ${(pts[mi].v / 1000).toFixed(1)}k`;
  const label = `Daily en.wikipedia reads across all twelve zodiac sign articles, ${fromIso} to ${toIso}. Pageviews measure curiosity, not demand for the coins. Sun ingress and eclipse dates available in the committed registers are marked.`;
  const description = `Both layouts plot every daily total from the same committed Wikimedia snapshot, fetched ${snap.fetchedAt}. The line is the sum of twelve articles, not twelve separate sign series. Calendar marks are limited to the dates covered by the site's registers.`;

  // A separate small-screen drawing keeps axes readable instead of shrinking
  // the 920-unit desktop labels to a few pixels. No resampling or smoothing:
  // every committed daily observation appears in both paths.
  function render(small) {
    const width = small ? 320 : 920, height = small ? 238 : 268;
    const px0 = small ? 42 : 52, px1 = small ? 306 : 900;
    const py0 = small ? 44 : 30, py1 = small ? 166 : 210;
    const dX = (t) => px0 + ((t - t0) / (t1 - t0)) * (px1 - px0);
    const vY = (v) => py1 - (v / VMAX) * (py1 - py0);
    let path = '', area = `M ${dX(ts[0]).toFixed(1)} ${py1}`;
    pts.forEach((p, i) => {
      const c = `${dX(ts[i]).toFixed(1)} ${vY(p.v).toFixed(1)}`;
      path += (i ? ' L ' : 'M ') + c;
      area += ' L ' + c;
    });
    area += ` L ${dX(ts.at(-1)).toFixed(1)} ${py1} Z`;
    let s = `<desc>${esc(description)}</desc>`;
    if (small) {
      s += text(px0, 13, 'Daily reads', 'zfig-lab');
      s += text(px0, 30, peakLabel);
    }
    for (let v = 10000; v <= VMAX; v += 10000) {
      s += `<line x1="${px0}" y1="${vY(v)}" x2="${px1}" y2="${vY(v)}" stroke="rgba(198,204,218,0.12)"/>`;
      s += text(px0 - 8, vY(v) + 4, `${v / 1000}k`, '', 'end');
    }
    s += `<line x1="${px0}" y1="${py1}" x2="${px1}" y2="${py1}" stroke="rgba(198,204,218,0.28)"/>`;
    s += text(px0 - 8, py1 + 4, '0', '', 'end');
    const first = new Date(t0);
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + m + (first.getUTCDate() > 1 ? 1 : 0), 1));
      if (d.getTime() < t0 || d.getTime() > t1 || (small && m % 3 !== 0 && m !== 11)) continue;
      const year = d.getUTCMonth() === 0 || m === 0 || (small && m === 6);
      const tickLabel = d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }) + (year ? ` '${String(d.getUTCFullYear()).slice(2)}` : '');
      const anchor = small ? (m === 0 ? 'start' : m === 11 ? 'end' : 'middle') : 'start';
      const x = dX(d.getTime());
      s += `<line x1="${x}" y1="${py1}" x2="${x}" y2="${py1 + 4}" stroke="rgba(198,204,218,0.28)"/>`;
      s += text(x + (small ? 0 : 3), py1 + 16, tickLabel, '', anchor);
    }
    s += `<path d="${area}" fill="rgba(198,204,218,0.05)"/>`;
    s += `<path d="${path}" fill="none" stroke="#C6CCDA" stroke-width="${small ? 1.3 : 1.6}"/>`;
    for (const w of ing.windows.filter((w) => w.planet === 'Sun' && w.from > fromIso && w.from < toIso)) {
      const x = dX(Date.parse(w.from));
      const hue = SIGN_HUES[w.sign] || '#8E96AB';
      s += `<line x1="${x}" y1="${py1 + 21}" x2="${x}" y2="${py1 + 31}" stroke="${hue}" stroke-width="2.5"><title>${esc(`Sun enters ${w.sign} · ${w.from}`)}</title></line>`;
    }
    for (const e of ecl.eclipses.filter((e) => e.peak > fromIso && e.peak < toIso)) {
      const x = dX(Date.parse(e.peak));
      s += `<path d="M ${x} ${py1 + 21} l 4.5 5 l -4.5 5 l -4.5 -5 Z" fill="#EEF1F7"><title>${esc(`Eclipse · ${e.peak}`)}</title></path>`;
    }
    if (small) {
      s += `<line x1="${px0 + 2}" y1="205" x2="${px0 + 2}" y2="215" stroke="#C6CCDA" stroke-width="2.5"/>`;
      s += text(px0 + 14, 215, 'Sun enters a sign');
      s += `<path d="M ${px0 + 2} 223 l 4.5 5 l -4.5 5 l -4.5 -5 Z" fill="#EEF1F7"/>`;
      s += text(px0 + 14, 233, 'Eclipse');
    } else {
      s += text(px0, py1 + 46, '▏ sun enters a new sign, tick in that sign’s hue (ephemeris register) · ◆ eclipse');
    }
    const mx = dX(ts[mi]), my = vY(pts[mi].v);
    s += `<circle cx="${mx}" cy="${my}" r="${small ? 2.5 : 3}" fill="#EEF1F7"><title>${esc(`${iso(pts[mi].d)} · ${pts[mi].v} reads`)}</title></circle>`;
    if (!small) {
      const anchor = mx > px1 - 180 ? 'end' : 'start';
      s += text(mx + (anchor === 'end' ? -6 : 6), my - 6, peakLabel, 'zfig-lab', anchor);
    }
    return `<svg class="attention-chart--${small ? 'small' : 'wide'}" data-attention-chart viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">${s}</svg>`;
  }
  return `${render(false)}\n${render(true)}`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--refresh')) await refresh();
  const svg = await attentionFigureSvg();
  const page = await readFile(pagePath, 'utf8');
  const begin = '<!-- thesis-attention-figure:begin -->';
  const end = '<!-- thesis-attention-figure:end -->';
  const a = page.indexOf(begin), b = page.indexOf(end);
  if (a === -1 || b === -1) throw new Error('thesis-attention-figure markers not found in public/thesis/index.html');
  const next = page.slice(0, a + begin.length) + '\n' + svg + '\n            ' + page.slice(b);
  if (next !== page) {
    await writeFile(pagePath, next);
    console.log('stamped attention figure');
  } else {
    console.log('attention figure unchanged');
  }
}
