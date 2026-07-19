import { signBySlug } from "./signs";
import { assertAuraShareSign, auraShareDateMs } from "./aura-share";
import {
  talismanGeometry,
  talismanGoldCountLabel,
  type AuraTalismanGeometry,
} from "./aura/talisman";
import {
  AURA_SIGN_ORDER,
  type AuraCabinetFinish,
  type AuraCabinetHolding,
  type AuraSign,
} from "./aura/types";

/**
 * The complete export surface. It deliberately has nowhere to put an address,
 * wallet balance, holding quantity, chart, name, birth detail, or authored
 * reading. The sky is a dated public fact shared by every visitor.
 */
export interface AuraShareCardInput {
  heldSigns: readonly AuraSign[];
  holdings?: readonly AuraCabinetHolding[];
  checkedAt: string;
  skyAt: string;
  currentSky: {
    sun: AuraSign;
    moon: AuraSign;
  };
}

export interface AuraShareSign {
  slug: AuraSign;
  index: number;
  name: string;
  glyph: string;
  hue: string;
  finish: AuraCabinetFinish;
  goldCountLabel: string | null;
  goldTallyArcs: 0 | 1 | 2;
}

export interface AuraShareSkyMark {
  body: "Sun" | "Moon";
  glyph: "☉" | "☾";
  sign: AuraShareSign;
  x: number;
  y: number;
}

export interface AuraShareSnapshot {
  represented: readonly AuraShareSign[];
  geometry: AuraTalismanGeometry;
  checkedDate: string;
  skyDate: string;
  sky: {
    sun: AuraShareSign;
    moon: AuraShareSign;
  };
  skyMarks: readonly [AuraShareSkyMark, AuraShareSkyMark];
  methodNote: string;
  editionNote: string;
}

export const AURA_SHARE_FILENAME = "zodiacs-collection-seal.png";
export type AuraShareActionOutcome =
  | "shared"
  | "downloaded"
  | "cancelled"
  | "unavailable";

const W = 1080;
const H = 1350;
const BG = "#060709";
const PANEL = "#0C0F15";
const INK = "#EEF1F7";
const MUTED = "#9CA5B8";
const ETCHED = "rgba(197, 205, 220, 0.22)";
const HAIR = "rgba(205, 212, 226, 0.16)";
const BRASS = "#B79A65";
const MATERIAL_COLORS: Record<Exclude<AuraCabinetFinish, "pastel">, string> = {
  bronze: "#B87449",
  silver: "#C4CEDA",
  gold: "#DEB75E",
};
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const METHOD_NOTE =
  "A dated composition of the represented Zodiac set, today’s Sun, and today’s Moon.";
const EDITION_NOTE = "Public edition · collection + dated sky";
const CARD_DATE = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function cardDate(value: string, field: string): string {
  return `${CARD_DATE.format(new Date(auraShareDateMs(value, field)))} UTC`;
}

function shareSign(
  slug: AuraSign,
  holding?: AuraCabinetHolding,
): AuraShareSign {
  const sign = signBySlug(slug);
  const finish = holding?.finish ?? "pastel";
  const goldCount = holding?.finish === "gold" ? BigInt(holding.goldCount) : 0n;
  return {
    slug,
    index: AURA_SIGN_ORDER.indexOf(slug),
    name: sign.name,
    glyph: sign.glyph,
    hue: sign.hue,
    finish,
    // A single Masterwork needs no count; the label appears from ×2 upward.
    goldCountLabel: goldCount > 1n ? talismanGoldCountLabel(goldCount) : null,
    goldTallyArcs: goldCount >= 3n ? 2 : goldCount >= 2n ? 1 : 0,
  };
}

function canonicalHeldSigns(value: unknown): AuraSign[] {
  if (!Array.isArray(value)) {
    throw new TypeError("heldSigns must be an array of canonical zodiac signs.");
  }
  const represented = new Set<AuraSign>();
  value.forEach((sign, index) => {
    assertAuraShareSign(sign, `heldSigns[${index}]`);
    represented.add(sign);
  });
  const canonical = AURA_SIGN_ORDER.filter((sign) => represented.has(sign));
  if (canonical.length === 0) {
    throw new TypeError("A collection talisman requires at least one represented sign.");
  }
  return canonical;
}

function canonicalHoldings(
  value: unknown,
  heldSigns: readonly AuraSign[],
): AuraCabinetHolding[] {
  if (value === undefined) {
    return heldSigns.map((sign) => ({ sign, finish: "pastel" }));
  }
  if (!Array.isArray(value)) {
    throw new TypeError("holdings must be an array of classified Zodiac editions.");
  }
  const held = new Set(heldSigns);
  const seen = new Set<AuraSign>();
  const normalized: AuraCabinetHolding[] = [];
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new TypeError(`holdings[${index}] must be a classified Zodiac edition.`);
    }
    const holding = entry as Partial<AuraCabinetHolding> & { goldCount?: unknown };
    assertAuraShareSign(holding.sign, `holdings[${index}].sign`);
    if (!held.has(holding.sign) || seen.has(holding.sign)) {
      throw new TypeError("holdings must match the canonical represented Zodiac set.");
    }
    if (!["pastel", "bronze", "silver", "gold"].includes(String(holding.finish))) {
      throw new TypeError(`holdings[${index}].finish is not a supported material edition.`);
    }
    if (holding.finish === "gold") {
      if (typeof holding.goldCount !== "string" || !/^[1-9]\d*$/.test(holding.goldCount)) {
        throw new TypeError(`holdings[${index}].goldCount must be a positive integer string.`);
      }
      normalized.push({
        sign: holding.sign,
        finish: "gold",
        goldCount: holding.goldCount,
      });
    } else {
      normalized.push({
        sign: holding.sign,
        finish: holding.finish as "pastel" | "bronze" | "silver",
      });
    }
    seen.add(holding.sign);
  });
  if (normalized.length !== heldSigns.length) {
    throw new TypeError("holdings must classify every represented Zodiac sign.");
  }
  const bySign = new Map(normalized.map((holding) => [holding.sign, holding]));
  return heldSigns.map((sign) => bySign.get(sign)!);
}

function pointForSign(sign: AuraSign, radius: number): { x: number; y: number } {
  const index = AURA_SIGN_ORDER.indexOf(sign);
  const radians = (index * 30 + 15 - 90) * (Math.PI / 180);
  return {
    x: Number((0.5 + Math.cos(radians) * radius).toFixed(6)),
    y: Number((0.5 + Math.sin(radians) * radius).toFixed(6)),
  };
}

/** Reduces input to the complete privacy-safe, deterministic painted model. */
export function auraShareSnapshot(input: AuraShareCardInput): AuraShareSnapshot {
  if (!input || typeof input !== "object") {
    throw new TypeError("A talisman share input is required.");
  }
  const heldSigns = canonicalHeldSigns(input.heldSigns);
  const holdings = canonicalHoldings(input.holdings, heldSigns);
  const checkedDate = cardDate(input.checkedAt, "checkedAt");
  const skyDate = cardDate(input.skyAt, "skyAt");
  assertAuraShareSign(input.currentSky?.sun, "currentSky.sun");
  assertAuraShareSign(input.currentSky?.moon, "currentSky.moon");

  const holdingBySign = new Map(holdings.map((holding) => [holding.sign, holding]));
  const represented = heldSigns.map((sign) => shareSign(sign, holdingBySign.get(sign)));
  const sun = shareSign(input.currentSky.sun);
  const moon = shareSign(input.currentSky.moon);
  return {
    represented,
    geometry: talismanGeometry(heldSigns, holdings),
    checkedDate,
    skyDate,
    sky: { sun, moon },
    skyMarks: [
      {
        body: "Sun",
        glyph: "☉",
        sign: sun,
        ...pointForSign(sun.slug, 0.235),
      },
      {
        body: "Moon",
        glyph: "☾",
        sign: moon,
        ...pointForSign(moon.slug, 0.235),
      },
    ],
    methodNote: METHOD_NOTE,
    editionNote: EDITION_NOTE,
  };
}

/** Complete generated-text equivalent of the raster preview. */
export function auraShareAccessibleDescription(input: AuraShareCardInput): string {
  const snapshot = auraShareSnapshot(input);
  return [
    `Cabinet of Twelve collection seal dated ${snapshot.skyDate}.`,
    `Represented Zodiac set: ${snapshot.represented.map((sign) => (
      `${sign.name}, ${sign.finish}${sign.goldCountLabel ? ` ${sign.goldCountLabel}` : ""}`
    )).join("; ")}.`,
    `Dated sky marks: Sun in ${snapshot.sky.sun.name}; Moon in ${snapshot.sky.moon.name}.`,
    snapshot.methodNote,
    snapshot.editionNote,
    `Registry record checked ${snapshot.checkedDate}.`,
    "Composed on this device. Zodiacs · Org.",
  ].join(" ");
}

function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let index = 0;
  while (index < words.length && lines.length < maxLines) {
    const next = line ? `${line} ${words[index]}` : words[index];
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = "";
    } else {
      line = next;
      index += 1;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (index < words.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines.at(-1)?.replace(/[.,;:]?$/, "")}…`;
  }
  return lines;
}

function sealPoint(
  point: { x: number; y: number },
  size: number,
  left: number,
  top: number,
): { x: number; y: number } {
  return { x: left + point.x * size, y: top + point.y * size };
}

function line(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
}

function circle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
}

function materialColor(sign: Pick<AuraShareSign, "finish" | "hue">): string {
  return sign.finish === "pastel" ? sign.hue : MATERIAL_COLORS[sign.finish];
}

function drawSeal(
  context: CanvasRenderingContext2D,
  snapshot: AuraShareSnapshot,
): void {
  const size = 690;
  const left = (W - size) / 2;
  const top = 215;
  const center = sealPoint({ x: 0.5, y: 0.5 }, size, left, top);

  context.strokeStyle = HAIR;
  context.lineWidth = 1;
  [300, 186, 96].forEach((radius) => {
    circle(context, center.x, center.y, radius);
    context.stroke();
  });
  if (snapshot.geometry.fullTwelve) {
    context.strokeStyle = BRASS;
    context.lineWidth = 3;
    circle(context, center.x, center.y, 316);
    context.stroke();
  }

  context.strokeStyle = "rgba(222, 226, 237, 0.42)";
  context.lineWidth = 3;
  snapshot.geometry.collectionSegments.forEach((segment) => {
    line(
      context,
      sealPoint(segment.from, size, left, top),
      sealPoint(segment.to, size, left, top),
    );
  });

  snapshot.geometry.outerNodes.forEach((node) => {
    const point = sealPoint(node, size, left, top);
    circle(context, point.x, point.y, node.represented ? 25 : 16);
    if (node.represented) {
      context.fillStyle = node.finish && node.finish !== "pastel"
        ? MATERIAL_COLORS[node.finish]
        : node.hue;
      context.fill();
      context.fillStyle = BG;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `500 25px ${SERIF}`;
      context.fillText(`${node.glyph}︎`, point.x, point.y + 1);
      if (node.goldTallyArcs > 0) {
        context.strokeStyle = "#F3D995";
        context.lineWidth = 2.5;
        for (let index = 0; index < node.goldTallyArcs; index += 1) {
          context.beginPath();
          context.arc(
            point.x,
            point.y,
            31 + index * 5,
            -Math.PI / 2 + index * Math.PI,
            Math.PI / 5 + index * Math.PI,
          );
          context.stroke();
        }
      }
      if (node.goldCountLabel && node.goldCount !== "1") {
        context.fillStyle = INK;
        context.font = `650 12px ${MONO}`;
        context.fillText(node.goldCountLabel, point.x + 31, point.y + 25);
      }
    } else {
      context.strokeStyle = ETCHED;
      context.lineWidth = 1;
      context.stroke();
    }
  });

  snapshot.skyMarks.forEach((mark) => {
    const point = sealPoint(mark, size, left, top);
    context.fillStyle = PANEL;
    circle(context, point.x, point.y, 27);
    context.fill();
    context.strokeStyle = mark.sign.hue;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = INK;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `500 25px ${SERIF}`;
    context.fillText(mark.glyph, point.x, point.y + 1);
  });

  context.fillStyle = MUTED;
  context.textAlign = "center";
  context.font = `500 18px ${MONO}`;
  context.fillText("DATED PUBLIC SKY", center.x, center.y - 12);
  context.fillStyle = INK;
  context.font = `500 22px ${MONO}`;
  context.fillText(snapshot.skyDate.toUpperCase(), center.x, center.y + 22);
}

function drawRepresentedSet(
  context: CanvasRenderingContext2D,
  snapshot: AuraShareSnapshot,
): void {
  const columns = Math.min(6, snapshot.represented.length);
  const gap = columns > 1 ? Math.min(152, 890 / (columns - 1)) : 0;
  const rows = Math.ceil(snapshot.represented.length / 6);
  const startY = rows === 1 ? 978 : 925;
  snapshot.represented.forEach((sign, index) => {
    const row = Math.floor(index / 6);
    const rowItems = Math.min(6, snapshot.represented.length - row * 6);
    const rowWidth = (rowItems - 1) * gap;
    const x = W / 2 - rowWidth / 2 + (index % 6) * gap;
    const y = startY + row * 90;
    context.fillStyle = materialColor(sign);
    circle(context, x, y, 22);
    context.fill();
    context.fillStyle = BG;
    context.textAlign = "center";
    context.font = `500 22px ${SERIF}`;
    context.fillText(`${sign.glyph}︎`, x, y + 1);
    context.fillStyle = INK;
    context.font = `500 18px ${MONO}`;
    context.fillText(sign.name.toUpperCase(), x, y + 44);
    context.fillStyle = MUTED;
    context.font = `500 13px ${MONO}`;
    context.fillText(
      `${sign.finish.toUpperCase()}${sign.goldCountLabel ? ` ${sign.goldCountLabel}` : ""}`,
      x,
      y + 65,
    );
  });
}

export async function drawAuraShareCard(input: AuraShareCardInput): Promise<Blob> {
  const snapshot = auraShareSnapshot(input);
  if (typeof document.fonts !== "undefined") {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`500 62px ${SERIF}`),
      document.fonts.load(`500 24px ${MONO}`),
      document.fonts.load(`400 29px ${SERIF}`),
    ]).catch(() => {});
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");

  context.fillStyle = BG;
  context.fillRect(0, 0, W, H);
  if (typeof context.roundRect === "function") {
    context.strokeStyle = HAIR;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(28.5, 28.5, W - 57, H - 57, 26);
    context.stroke();
  }

  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = MUTED;
  context.font = `500 20px ${MONO}`;
  context.fillText("THE CABINET OF TWELVE · DATED EDITION", 66, 76);
  context.textAlign = "right";
  context.fillText(snapshot.skyDate.toUpperCase(), W - 66, 76);

  context.textAlign = "center";
  context.fillStyle = INK;
  context.font = `500 62px ${SERIF}`;
  context.fillText("Collection seal", W / 2, 145);
  context.fillStyle = MUTED;
  context.font = `500 20px ${MONO}`;
  context.fillText("THE REPRESENTED TWELVE · THE SUN · THE MOON", W / 2, 195);

  drawSeal(context, snapshot);

  context.fillStyle = MUTED;
  context.font = `500 18px ${MONO}`;
  context.textAlign = "center";
  context.fillText("REPRESENTED ZODIACS", W / 2, 892);
  drawRepresentedSet(context, snapshot);

  context.strokeStyle = HAIR;
  context.lineWidth = 1;
  line(context, { x: 66, y: 1105 }, { x: W - 66, y: 1105 });
  context.fillStyle = INK;
  context.font = `400 29px ${SERIF}`;
  wrapLines(context, snapshot.methodNote, 890, 2).forEach((text, index) => {
    context.fillText(text, W / 2, 1152 + index * 38);
  });
  context.fillStyle = MUTED;
  context.font = `500 17px ${MONO}`;
  context.fillText(snapshot.editionNote.toUpperCase(), W / 2, 1242);

  context.textAlign = "left";
  context.fillText(`REGISTRY CHECKED ${snapshot.checkedDate.toUpperCase()}`, 66, 1290);
  context.textAlign = "right";
  context.fillStyle = INK;
  context.font = `500 21px ${MONO}`;
  context.fillText("ZODIACS · ORG", W - 66, 1290);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("png_encode_failed");
  return blob;
}

export function canShareAuraCardBlob(blob: Blob): boolean {
  try {
    const file = new File([blob], AURA_SHARE_FILENAME, { type: "image/png" });
    return (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

/** Shares the reviewed PNG without adding a caption, title, text, or URL. */
export async function shareAuraCardBlob(
  blob: Blob,
): Promise<AuraShareActionOutcome> {
  if (!canShareAuraCardBlob(blob)) return "unavailable";
  const file = new File([blob], AURA_SHARE_FILENAME, { type: "image/png" });
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (error) {
    return (error as DOMException)?.name === "AbortError"
      ? "cancelled"
      : "unavailable";
  }
}

/** Downloads the exact PNG shown in the on-device preview. */
export function downloadAuraCardBlob(blob: Blob): "downloaded" {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = AURA_SHARE_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
