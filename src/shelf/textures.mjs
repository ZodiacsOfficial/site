// Painting the gallery.
//
// The sculptures themselves are photographs of cast pieces, loaded as texture.
// Everything around them — the plinth each one stands on, and the hallmarked
// reverse of the cast — is drawn into a 2D canvas at load time from the
// catalogue record. Gold appears only where the artwork puts it; the plinths
// stay in the void and the sign's own pastel.

const INK = '12, 14, 20';

const SERIF = "'EB Garamond', Georgia, 'Times New Roman', serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace";
const GLYPHS = "'EB Garamond', 'Apple Symbols', 'Segoe UI Symbol', 'Noto Sans Symbols 2', serif";

/** Deterministic noise, so a given figure is grained the same way every load. */
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

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel) => Math.round(Math.max(0, Math.min(255, channel * amount)));
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`;
}

/**
 * The faces are drawn once, so a font that arrives late would be baked in
 * wrong. Wait for the cuts the gallery actually uses before painting.
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
    // falls through to Georgia and the gallery still reads.
  }
}

/**
 * Tracked type. `ctx.letterSpacing` keeps the font's kerning intact; drawing
 * character by character does not, and the pairs it breaks are visible at this
 * size. Where the property is missing the text simply sets untracked.
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
  ctx.fillText(text, align === 'center' ? x - (width / 2) + (spacing / 2) : x, y);
  ctx.letterSpacing = previous;
  ctx.textAlign = align;
  return width;
}

/**
 * The plinth face: void stone, banded in the sign's hue, lettered with the lot
 * and the name. Wrapped around a short cylinder, so it is drawn as one strip.
 */
export function paintPlinth(record) {
  const W = 1024;
  const H = 128;
  const canvas = canvasOf(W, H);
  const ctx = canvas.getContext('2d');
  const rand = seeded(`${record.slug}-plinth`);

  const stone = ctx.createLinearGradient(0, 0, 0, H);
  stone.addColorStop(0, '#171B25');
  stone.addColorStop(0.42, '#0F121A');
  stone.addColorStop(1, '#080A0F');
  ctx.fillStyle = stone;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#EEF1F7';
  for (let i = 0; i < 900; i += 1) ctx.fillRect(rand() * W, rand() * H, 1, 1);
  ctx.globalAlpha = 1;

  // A single hairline in the sign's hue, at the top edge of the stone.
  ctx.fillStyle = `${record.hue}55`;
  ctx.fillRect(0, 5, W, 1.5);
  ctx.fillStyle = 'rgba(198,204,218,0.10)';
  ctx.fillRect(0, H - 3, W, 1.5);

  // The lettering repeats four times around, so it reads from any angle.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let face = 0; face < 4; face += 1) {
    const centre = (W / 8) + (face * (W / 4));
    ctx.fillStyle = record.hue;
    ctx.font = `400 21px ${MONO}`;
    letterspaced(ctx, `LOT ${record.lot}`, centre, 52, 5);
    ctx.fillStyle = 'rgba(198,204,218,0.62)';
    ctx.font = `400 25px ${SERIF}`;
    letterspaced(ctx, record.name.toUpperCase(), centre, 84, 4);
  }

  return canvas;
}

/**
 * The reverse of the cast. A real piece is hallmarked on the back, so this is
 * where the registry puts its mark: the sign, its lot, and the house.
 *
 * Drawn mirrored. The extrusion gives both faces the same texture coordinates,
 * so the back is read from behind — anything not pre-flipped here would come
 * out backwards on the object.
 */
export function paintReverse(record, castColour) {
  const W = 768;
  const H = 768;
  const canvas = canvasOf(W, H);
  const ctx = canvas.getContext('2d');
  const rand = seeded(`${record.slug}-reverse`);

  // Struck metal, lit from the same side as the front so the two agree.
  const ground = ctx.createLinearGradient(0, 0, W * 0.7, H);
  ground.addColorStop(0, shade(castColour, 1.18));
  ground.addColorStop(0.45, shade(castColour, 0.92));
  ground.addColorStop(1, shade(castColour, 0.58));
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  // Casting grain: fine, directional, never sparkly.
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 2600; i += 1) {
    ctx.fillStyle = rand() > 0.5 ? '#FFFFFF' : '#000000';
    const x = rand() * W;
    const y = rand() * H;
    ctx.fillRect(x, y, 1 + rand() * 3, 1);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Everything below is engraved: a dark cut with a light lower lip, which is
  // what incised metal looks like under a light from above.
  const engrave = (draw) => {
    ctx.save();
    ctx.translate(0, 2.5);
    ctx.fillStyle = 'rgba(255,246,214,0.30)';
    draw();
    ctx.restore();
    ctx.fillStyle = `rgba(${INK}, 0.55)`;
    draw();
  };

  const centre = W / 2;

  engrave(() => {
    ctx.font = `400 232px ${GLYPHS}`;
    ctx.fillText(record.glyph, centre, H * 0.40);
  });

  engrave(() => {
    ctx.font = `400 30px ${MONO}`;
    letterspaced(ctx, `LOT ${record.lot} OF XII`, centre, H * 0.60, 7);
  });

  engrave(() => {
    ctx.font = `500 58px ${SERIF}`;
    letterspaced(ctx, record.name.toUpperCase(), centre, H * 0.685, 5);
  });

  ctx.strokeStyle = `rgba(${INK}, 0.34)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(centre - 118, H * 0.745);
  ctx.lineTo(centre + 118, H * 0.745);
  ctx.stroke();

  engrave(() => {
    ctx.font = `400 22px ${MONO}`;
    letterspaced(ctx, 'ZODIACS · THE REGISTRY', centre, H * 0.80, 5);
  });

  ctx.restore();
  return canvas;
}

/**
 * The sculpture itself. `tier` is 512 for the row and 1024 for a figure being
 * examined. Resolves to null if the plate cannot load — the gallery carries on
 * with the cast in its edge colour rather than showing nothing.
 */
export function loadSculpture(slug, tier) {
  return new Promise((done) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => done(image);
    image.onerror = () => done(null);
    image.src = `/assets/sculptures/${tier}/${slug}.webp`;
  });
}
