// Painting the volumes.
//
// Every spine and cover is drawn into a 2D canvas at load time from the
// catalogue record — there is no bitmap of a book anywhere in the repository.
// The sign's disc is the one photographic element, and it is fetched only for
// a volume the reader actually opens.

const INK = '12, 14, 20';
const BOARD = '#0B0D13';
const PAPER = '#D8D4C8';

/** Deterministic noise, so a given volume is grained the same way every load. */
function seeded(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasOf(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function mixToBlack(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

const SERIF = "'EB Garamond', Georgia, 'Times New Roman', serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace";
const GLYPHS = `'EB Garamond', 'Apple Symbols', 'Segoe UI Symbol', 'Noto Sans Symbols 2', serif`;

/**
 * The faces are drawn once, so a font that arrives late would be baked in
 * wrong. Wait for the four cuts the shelf actually uses before painting.
 */
export async function ensureFonts() {
  if (!document.fonts?.load) return;
  const wanted = [
    `500 46px ${SERIF}`,
    `400 30px ${SERIF}`,
    `italic 400 30px ${SERIF}`,
    `400 20px ${MONO}`,
  ];
  try {
    await Promise.all(wanted.map((font) => document.fonts.load(font, 'Sagittarius')));
    await document.fonts.ready;
  } catch {
    // A font that refuses to load is not a reason to show nothing; the stack
    // falls through to Georgia and the shelf still reads.
  }
}

/**
 * Tracked type. `ctx.letterSpacing` keeps the font's kerning intact; drawing
 * character by character does not, and the pairs it breaks are visible at
 * spine size. Where the property is missing the text simply sets untracked.
 */
function letterspaced(ctx, text, x, y, spacing) {
  const align = ctx.textAlign;
  if (!('letterSpacing' in ctx)) {
    ctx.fillText(text, x, y);
    return ctx.measureText(text).width;
  }
  const previous = ctx.letterSpacing;
  ctx.letterSpacing = `${spacing}px`;
  const width = ctx.measureText(text).width;
  // The trailing gap is included in the measurement; take half of it back so
  // centred text sits where it looks centred.
  ctx.textAlign = 'left';
  ctx.fillText(text, align === 'center' ? x - width / 2 + spacing / 2 : x, y);
  ctx.letterSpacing = previous;
  ctx.textAlign = align;
  return width;
}

/**
 * The spine: dyed bookcloth in the sign's hue, blocked with the glyph, the
 * name running top-to-bottom, and the lot numeral at the foot.
 */
export function paintSpine(volume) {
  const W = 160;
  const H = 760;
  const canvas = canvasOf(W, H);
  const ctx = canvas.getContext('2d');
  const rand = seeded(volume.slug);

  ctx.fillStyle = volume.hue;
  ctx.fillRect(0, 0, W, H);

  // Barrel shading: the spine is flat geometry, so its roundness is painted.
  const round = ctx.createLinearGradient(0, 0, W, 0);
  round.addColorStop(0, 'rgba(0,0,0,0.42)');
  round.addColorStop(0.16, 'rgba(0,0,0,0.10)');
  round.addColorStop(0.42, 'rgba(255,255,255,0.10)');
  round.addColorStop(0.7, 'rgba(0,0,0,0.06)');
  round.addColorStop(1, 'rgba(0,0,0,0.46)');
  ctx.fillStyle = round;
  ctx.fillRect(0, 0, W, H);

  // Cloth grain.
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = `rgb(${INK})`;
  for (let i = 0; i < 150; i += 1) {
    const x = rand() * W;
    const y = rand() * H;
    ctx.fillRect(x, y, 1, 6 + rand() * 26);
  }
  ctx.globalAlpha = 1;

  // Head and tail bands, and the shelf-edge shadow at the foot.
  ctx.fillStyle = mixToBlack(volume.hue, 0.55);
  ctx.fillRect(0, 0, W, 26);
  ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, 26, W, 1.5);
  ctx.fillRect(0, H - 27.5, W, 1.5);

  // Blind-tooled rules.
  ctx.strokeStyle = `rgba(${INK}, 0.34)`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(14.5, 54.5, W - 29, H - 109);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = `rgba(${INK}, 0.66)`;
  ctx.font = `400 64px ${GLYPHS}`;
  ctx.fillText(volume.glyph, W / 2, 122);

  ctx.fillStyle = `rgba(${INK}, 0.30)`;
  ctx.fillRect(W / 2 - 18, 170, 36, 1.5);

  // The name runs down the spine, as it does on a shelf.
  ctx.save();
  ctx.translate(W / 2, H / 2 + 12);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = `rgba(${INK}, 0.9)`;
  ctx.font = `500 58px ${SERIF}`;
  letterspaced(ctx, volume.name, 0, 0, 1.2);
  ctx.restore();

  ctx.fillStyle = `rgba(${INK}, 0.62)`;
  ctx.font = `400 27px ${MONO}`;
  letterspaced(ctx, volume.lot, W / 2, H - 58, 2.5);

  return canvas;
}

/** The fore-edge: a stack of leaves, so the volume has paper in it. */
export function paintEdge(volume) {
  const W = 128;
  const H = 608;
  const canvas = canvasOf(W, H);
  const ctx = canvas.getContext('2d');
  const rand = seeded(`${volume.slug}-edge`);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(90, 84, 70, 0.55)';
  ctx.lineWidth = 1;
  for (let x = 2; x < W; x += 2 + rand() * 2) {
    ctx.globalAlpha = 0.25 + rand() * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const shade = ctx.createLinearGradient(0, 0, W, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.5)');
  shade.addColorStop(0.5, 'rgba(0,0,0,0.05)');
  shade.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  return canvas;
}

/**
 * The cover, painted only for a volume the reader opens. `disc` is the sign's
 * plate if it has arrived; the cover is composed with or without it.
 */
export function paintCover(volume, disc) {
  const W = 700;
  const H = 1037;
  const canvas = canvasOf(W, H);
  const ctx = canvas.getContext('2d');
  const rand = seeded(`${volume.slug}-cover`);

  ctx.fillStyle = BOARD;
  ctx.fillRect(0, 0, W, H);

  const wash = ctx.createRadialGradient(W / 2, H * 0.36, 40, W / 2, H * 0.36, W * 0.9);
  wash.addColorStop(0, `${volume.hue}1F`);
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#EEF1F7';
  for (let i = 0; i < 900; i += 1) ctx.fillRect(rand() * W, rand() * H, 1, 1);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = `${volume.hue}66`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(34.5, 34.5, W - 69, H - 69);
  ctx.strokeStyle = `${volume.hue}22`;
  ctx.strokeRect(44.5, 44.5, W - 89, H - 89);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = `${volume.hue}CC`;
  ctx.font = `400 21px ${MONO}`;
  letterspaced(ctx, `LOT ${volume.lot} OF XII`, W / 2, 104, 5);

  if (disc) {
    const size = 292;
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 366, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(disc, W / 2 - size / 2, 366 - size / 2, size, size);
    ctx.restore();
    ctx.strokeStyle = `${volume.hue}55`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W / 2, 366, size / 2 + 10, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = `${volume.hue}D9`;
    ctx.font = `400 200px ${GLYPHS}`;
    ctx.fillText(volume.glyph, W / 2, 366);
  }

  ctx.fillStyle = '#EEF1F7';
  ctx.font = `500 76px ${SERIF}`;
  ctx.fillText(volume.name, W / 2, 604);

  ctx.fillStyle = '#C6CCDA';
  ctx.font = `italic 400 33px ${SERIF}`;
  ctx.fillText(volume.figure, W / 2, 664);

  ctx.strokeStyle = 'rgba(198,204,218,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 90, 716.5);
  ctx.lineTo(W / 2 + 90, 716.5);
  ctx.stroke();

  ctx.fillStyle = '#8A93A6';
  ctx.font = `400 22px ${MONO}`;
  ctx.fillText(`${volume.modality} ${volume.element.toLowerCase()}`, W / 2, 762);
  ctx.fillText(volume.datesShort, W / 2, 800);

  ctx.fillStyle = 'rgba(138,147,166,0.75)';
  ctx.font = `400 17px ${MONO}`;
  letterspaced(ctx, 'ZODIACS · THE REGISTRY', W / 2, H - 96, 4);

  return canvas;
}

/** The sign's disc, at plate resolution. Resolves to null if it cannot load. */
export function loadDisc(slug) {
  return new Promise((done) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = `/assets/zodiac-icons/400/${slug}.webp`;
  });
}
