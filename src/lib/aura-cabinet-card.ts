import { signBySlug } from "./signs";
import { auraShareDateMs } from "./aura-share";
import { cabinetEditionForHolding } from "./aura/cabinet-finish";
import {
  AURA_SIGN_ORDER,
  type AuraCabinetEdition,
  type AuraCabinetHolding,
  type AuraChain,
  type AuraSign,
} from "./aura/types";
import type { AuraShareActionOutcome } from "./aura-share-card";

/**
 * The Cabinet share card: the case itself, exactly as the page displays it.
 *
 * Where the collection seal exports the dated talisman, this exports the
 * cabinet — twelve numbered niches, the editions an address earned, and the
 * niches still reserved. The empty seats are deliberately kept: they are what
 * makes the card a statement of standing rather than a trophy, and the whole
 * scarcity argument is visible in one frame without a word of market language.
 *
 * Like the seal renderer, the input type has nowhere to put an address, a
 * balance, a chart, or a name. Everything on this card is already public on
 * the page it was rendered from.
 */
export interface AuraCabinetCardInput {
  holdings: readonly AuraCabinetHolding[];
  /** ISO instant the public collection was read. */
  checkedAt: string;
  /** Which public chain was read; drawn as provenance, never an address. */
  chain: AuraChain;
}

export interface AuraCabinetSeat {
  slug: AuraSign;
  index: number;
  name: string;
  glyph: string;
  hue: string;
  represented: boolean;
  edition: AuraCabinetEdition | null;
  /** Public tally grammar: exact through ninety-nine, then a cap. */
  tallyLabel: string | null;
}

export interface AuraCabinetSnapshot {
  seats: readonly AuraCabinetSeat[];
  representedCount: number;
  complete: boolean;
  gilded: boolean;
  checkedDate: string;
  chainLabel: string;
}

export const AURA_CABINET_FILENAME = "zodiacs-cabinet.png";

const W = 1080;
const H = 1350;
const BG = "#07080B";
const INK = "#EEF1F7";
const MUTED = "#9CA5B8";
const HAIR = "rgba(205, 212, 226, 0.16)";
const BRASS = "#C6AD78";
const LEAF = "#E8C46A";
const LEAF_BRIGHT = "#FFF2C4";
const LEAF_INK = "#2A1D07";
const BRONZE_RIM = "#B08D57";
const SILVER_RIM = "#C6CCDA";
const GOLD_RIM = "#E0B080";
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

const EDITION_CAPTION: Record<AuraCabinetEdition, string> = {
  pastel: "I · PASTEL",
  bronze: "II · BRONZE",
  silver: "III · SILVER",
  gold: "IV · GOLD",
  gilded: "V · GILDED",
};

const CHAIN_LABEL: Record<AuraChain, string> = {
  solana: "Solana",
  base: "Base",
};

/**
 * Forces text presentation for a zodiac glyph.
 *
 * Without U+FE0E these code points render as colour emoji, which ignore
 * fillStyle entirely — a reserved niche came out as a brown bull rather than
 * an incised grey mark. The page uses the same selector.
 */
function incised(glyph: string): string {
  return `${glyph}\uFE0E`;
}

const CARD_DATE = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** Exact through ninety-nine sculptures, then a dignified cap. */
function tallyLabel(holding: AuraCabinetHolding): string | null {
  if (holding.finish !== "gold") return null;
  let count: bigint;
  try {
    count = BigInt(holding.goldCount);
  } catch {
    return null;
  }
  if (count < 2n) return null;
  return count > 99n ? "×99+" : `×${count.toString()}`;
}

/**
 * Validates the caller's input and reduces it to the only fields the card can
 * draw. Extra runtime properties are ignored rather than copied, so private
 * data cannot reach the canvas by being appended to the input object.
 */
export function auraCabinetSnapshot(input: AuraCabinetCardInput): AuraCabinetSnapshot {
  if (!input || typeof input !== "object") {
    throw new TypeError("A cabinet card input object is required.");
  }
  if (input.chain !== "solana" && input.chain !== "base") {
    throw new TypeError("chain must be a supported public chain.");
  }
  if (!Array.isArray(input.holdings)) {
    throw new TypeError("holdings must be an array of verified cabinet holdings.");
  }

  const bySign = new Map<AuraSign, AuraCabinetHolding>();
  input.holdings.forEach((entry, index) => {
    const holding = entry as Partial<AuraCabinetHolding> & { goldCount?: unknown };
    if (!holding || typeof holding !== "object") {
      throw new TypeError(`holdings[${index}] must be a cabinet holding.`);
    }
    if (!AURA_SIGN_ORDER.includes(holding.sign as AuraSign)) {
      throw new TypeError(`holdings[${index}].sign is not a canonical zodiac sign.`);
    }
    if (!["pastel", "bronze", "silver", "gold"].includes(String(holding.finish))) {
      throw new TypeError(`holdings[${index}].finish is not a supported material edition.`);
    }
    if (holding.finish === "gold") {
      if (typeof holding.goldCount !== "string" || !/^[1-9]\d*$/.test(holding.goldCount)) {
        throw new TypeError(`holdings[${index}].goldCount must be a positive integer string.`);
      }
      bySign.set(holding.sign as AuraSign, {
        sign: holding.sign as AuraSign,
        finish: "gold",
        goldCount: holding.goldCount,
      });
      return;
    }
    bySign.set(holding.sign as AuraSign, {
      sign: holding.sign as AuraSign,
      finish: holding.finish as "pastel" | "bronze" | "silver",
    });
  });

  const seats = AURA_SIGN_ORDER.map((slug, index) => {
    const record = signBySlug(slug);
    const holding = bySign.get(slug);
    return {
      slug,
      index,
      name: record.name,
      glyph: record.glyph,
      hue: record.hue,
      represented: Boolean(holding),
      edition: holding ? cabinetEditionForHolding(holding) : null,
      tallyLabel: holding ? tallyLabel(holding) : null,
    };
  });

  return {
    seats,
    representedCount: seats.filter((seat) => seat.represented).length,
    complete: seats.every((seat) => seat.represented),
    gilded: seats.some((seat) => seat.edition === "gilded"),
    checkedDate: `${CARD_DATE.format(new Date(auraShareDateMs(input.checkedAt, "checkedAt")))} UTC`,
    chainLabel: CHAIN_LABEL[input.chain],
  };
}

/** A complete text equivalent, for the preview dialog and assistive tech. */
export function auraCabinetAccessibleDescription(input: AuraCabinetCardInput): string {
  const snapshot = auraCabinetSnapshot(input);
  const represented = snapshot.seats
    .filter((seat) => seat.represented)
    .map((seat) => `${seat.name} ${EDITION_CAPTION[seat.edition!].split(" · ")[1].toLowerCase()}${seat.tallyLabel ? ` ${seat.tallyLabel}` : ""}`);
  const reserved = 12 - snapshot.representedCount;
  const lead = represented.length === 0
    ? "No Registry-listed Zodiacs are represented."
    : `${snapshot.representedCount} of the Twelve represented: ${represented.join(", ")}.`;
  const rest = reserved === 0
    ? " The Complete Twelve."
    : reserved === 1
      ? " One place remains reserved."
      : ` ${reserved} places remain reserved.`;
  return `The Cabinet of Twelve. ${lead}${rest} Read from the ${snapshot.chainLabel} public record on ${snapshot.checkedDate}.`;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(x, y, w, h, r);
    return;
  }
  context.beginPath();
  context.rect(x, y, w, h);
}

/**
 * Loads one same-origin artwork, resolving to null rather than rejecting.
 *
 * The card must render even when an image is slow or missing, so every seat
 * has a drawn fallback and no single asset can fail the export.
 */
function loadArtwork(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const settle = (value: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(value);
    };
    const timeout = window.setTimeout(() => settle(null), 2_000);
    image.onload = () => settle(image.naturalWidth > 0 ? image : null);
    image.onerror = () => settle(null);
    image.src = src;
  });
}

function drawSeat(
  context: CanvasRenderingContext2D,
  seat: AuraCabinetSeat,
  art: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const edition = seat.edition;
  const gold = edition === "gold" || edition === "gilded";
  const gilded = edition === "gilded";
  const radius = 12;

  // The niche floor.
  roundRect(context, x, y, w, h, radius);
  context.fillStyle = gilded ? "#100D09" : gold ? "#0C0A07" : seat.represented ? "#0D1016" : "#0A0C11";
  context.fill();
  context.lineWidth = gilded ? 3 : 1;
  context.strokeStyle = gilded
    ? LEAF
    : gold
      ? "rgba(224,176,128,0.42)"
      : seat.represented
        ? HAIR
        : "rgba(205,212,226,0.07)";
  context.stroke();

  // The gilded seat carries a second, brighter filet: the cast bar.
  if (gilded) {
    roundRect(context, x + 4, y + 4, w - 8, h - 8, radius - 3);
    context.lineWidth = 1;
    context.strokeStyle = LEAF_BRIGHT;
    context.stroke();
  }

  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = gilded ? "rgba(255,242,196,0.8)" : "rgba(142,150,171,0.66)";
  context.font = `500 13px ${MONO}`;
  context.fillText(`Nº ${String(seat.index + 1).padStart(2, "0")}`, x + 14, y + 22);

  const cx = x + w / 2;
  const artTop = y + 34;
  const artSize = Math.min(w * 0.56, h * 0.44);
  const artCy = artTop + artSize / 2;

  if (!seat.represented) {
    context.textAlign = "center";
    context.fillStyle = "rgba(210,219,235,0.13)";
    context.font = `400 ${Math.round(artSize * 0.62)}px ${SERIF}`;
    context.fillText(incised(seat.glyph), cx, artCy);
  } else if (art) {
    context.drawImage(art, cx - artSize / 2, artCy - artSize / 2, artSize, artSize);
  } else {
    // Fallback: the sign's pastel disc with its glyph, as the seal card draws it.
    context.beginPath();
    context.arc(cx, artCy, artSize * 0.42, 0, Math.PI * 2);
    context.fillStyle = gold ? GOLD_RIM : seat.hue;
    context.fill();
    context.fillStyle = BG;
    context.textAlign = "center";
    context.font = `500 ${Math.round(artSize * 0.4)}px ${SERIF}`;
    context.fillText(incised(seat.glyph), cx, artCy + 1);
  }

  // The struck rim and sealed numeral of the middle editions.
  if (edition === "bronze" || edition === "silver") {
    context.beginPath();
    context.arc(cx, artCy, artSize * 0.46, 0, Math.PI * 2);
    context.lineWidth = 4;
    context.strokeStyle = edition === "bronze" ? BRONZE_RIM : SILVER_RIM;
    context.stroke();

    const sealR = artSize * 0.15;
    const sealX = cx + artSize * 0.36;
    const sealY = artCy + artSize * 0.34;
    context.beginPath();
    context.arc(sealX, sealY, sealR, 0, Math.PI * 2);
    context.fillStyle = edition === "bronze" ? "#0A0C11" : SILVER_RIM;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = edition === "bronze" ? BRONZE_RIM : "#EEF1F7";
    context.stroke();
    context.fillStyle = edition === "bronze" ? BRONZE_RIM : "#0A0C11";
    context.font = `500 ${Math.round(sealR * 1.15)}px ${SERIF}`;
    context.textAlign = "center";
    context.fillText(edition === "bronze" ? "II" : "III", sealX, sealY + 1);
  }

  // The tally, on the badge alone.
  if (seat.tallyLabel) {
    context.font = `500 13px ${MONO}`;
    const label = seat.tallyLabel;
    const padX = 9;
    const badgeW = context.measureText(label).width + padX * 2;
    const badgeH = 22;
    const badgeX = x + w - badgeW - 12;
    const badgeY = y + 11;
    roundRect(context, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    context.fillStyle = gilded ? LEAF : "rgba(17,14,10,0.88)";
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = gilded ? LEAF_BRIGHT : "rgba(234,216,170,0.42)";
    context.stroke();
    context.fillStyle = gilded ? LEAF_INK : "#EAD8AA";
    context.textAlign = "center";
    context.fillText(label, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
  }

  context.textAlign = "center";
  context.fillStyle = seat.represented ? (gilded ? "#FBF4E2" : INK) : "rgba(241,238,231,0.4)";
  context.font = `500 23px ${SERIF}`;
  context.fillText(seat.name, cx, y + h - 44);

  if (edition) {
    context.fillStyle = gilded
      ? LEAF_BRIGHT
      : gold
        ? GOLD_RIM
        : edition === "bronze"
          ? "rgba(208,143,100,0.9)"
          : edition === "silver"
            ? "rgba(203,216,231,0.9)"
            : "rgba(206,194,227,0.9)";
    context.font = `500 12px ${MONO}`;
    context.fillText(EDITION_CAPTION[edition], cx, y + h - 20);
  }
}

function drawPlate(
  context: CanvasRenderingContext2D,
  text: string,
  sub: string,
  cy: number,
  gilt: boolean,
): void {
  context.font = `500 17px ${MONO}`;
  const gap = 18;
  const textW = context.measureText(text).width;
  context.font = `500 14px ${MONO}`;
  const subW = context.measureText(sub).width;
  const w = textW + subW + gap + 56;
  const h = 44;
  const x = (W - w) / 2;
  const y = cy - h / 2;

  roundRect(context, x, y, w, h, 3);
  context.fillStyle = gilt ? LEAF : "#0B0D12";
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = gilt ? LEAF_BRIGHT : "rgba(234,216,170,0.38)";
  context.stroke();

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = gilt ? LEAF_INK : "#EAD8AA";
  context.font = `500 17px ${MONO}`;
  context.fillText(text, x + 28, cy);
  context.fillStyle = gilt ? "rgba(42,29,7,0.66)" : BRASS;
  context.font = `500 14px ${MONO}`;
  context.fillText(sub, x + 28 + textW + gap, cy + 1);
}

export async function drawAuraCabinetCard(input: AuraCabinetCardInput): Promise<Blob> {
  const snapshot = auraCabinetSnapshot(input);
  if (typeof document.fonts !== "undefined") {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`500 54px ${SERIF}`),
      document.fonts.load(`500 23px ${SERIF}`),
      document.fonts.load(`500 20px ${MONO}`),
    ]).catch(() => {});
  }

  // The same artwork the page displays, loaded once per represented seat.
  const artwork = await Promise.all(
    snapshot.seats.map((seat) => {
      if (!seat.represented) return Promise.resolve(null);
      const gold = seat.edition === "gold" || seat.edition === "gilded";
      return loadArtwork(
        gold
          ? `/assets/cabinet-materials/gold/${seat.slug}.webp`
          : `/assets/zodiac-icons/128/${seat.slug}.webp`,
      );
    }),
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");

  context.fillStyle = BG;
  context.fillRect(0, 0, W, H);

  // The case: a filet around the whole card, gilt when a seat has earned it.
  context.lineWidth = snapshot.gilded ? 2 : 1;
  context.strokeStyle = snapshot.gilded ? "rgba(232,196,106,0.58)" : HAIR;
  roundRect(context, 28.5, 28.5, W - 57, H - 57, 26);
  context.stroke();

  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = BRASS;
  context.font = `500 18px ${MONO}`;
  context.fillText("COLLECTION DISPLAY", 66, 82);
  context.textAlign = "right";
  context.fillStyle = MUTED;
  context.fillText(
    `${snapshot.chainLabel.toUpperCase()} · ${snapshot.checkedDate.toUpperCase()}`,
    W - 66,
    82,
  );

  context.textAlign = "left";
  context.fillStyle = INK;
  context.font = `500 54px ${SERIF}`;
  context.fillText("The Cabinet of Twelve", 66, 143);
  context.textAlign = "right";
  context.fillStyle = snapshot.complete ? LEAF_BRIGHT : MUTED;
  context.font = `500 20px ${MONO}`;
  context.fillText(`${snapshot.representedCount} OF THE TWELVE`, W - 66, 147);

  // The grid: four columns of three, the page's own arrangement at card size.
  const cols = 4;
  const rows = 3;
  const gap = 14;
  const gridW = W - 132;
  const seatW = (gridW - gap * (cols - 1)) / cols;
  const seatH = seatW * 1.16;
  const gridTop = 196;
  snapshot.seats.forEach((seat, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    drawSeat(
      context,
      seat,
      artwork[index],
      66 + col * (seatW + gap),
      gridTop + row * (seatH + gap),
      seatW,
      seatH,
    );
  });

  const gridBottom = gridTop + rows * seatH + (rows - 1) * gap;
  let plateY = gridBottom + 52;
  if (snapshot.gilded) {
    drawPlate(context, "THE GILDED CASE", "SEALED V", plateY, true);
    plateY += 62;
  }
  if (snapshot.complete) {
    drawPlate(context, "THE COMPLETE TWELVE", `RECORDED ${snapshot.checkedDate.toUpperCase()}`, plateY, false);
    plateY += 62;
  }

  context.textAlign = "center";
  context.fillStyle = MUTED;
  context.font = `400 26px ${SERIF}`;
  const reserved = 12 - snapshot.representedCount;
  context.fillText(
    reserved === 0
      ? "The Complete Twelve, recorded from the public record."
      : reserved === 1
        ? "One place remains reserved."
        : `${reserved} places remain reserved.`,
    W / 2,
    H - 146,
  );

  context.strokeStyle = HAIR;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(66, H - 100);
  context.lineTo(W - 66, H - 100);
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = MUTED;
  context.font = `500 16px ${MONO}`;
  context.fillText("EDITIONS READ FROM THE PUBLIC RECORD", 66, H - 66);
  context.textAlign = "right";
  context.fillStyle = INK;
  context.font = `500 20px ${MONO}`;
  context.fillText("ZODIACS · ORG", W - 66, H - 66);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("png_encode_failed");
  return blob;
}

export function canShareAuraCabinetBlob(blob: Blob): boolean {
  try {
    const file = new File([blob], AURA_CABINET_FILENAME, { type: "image/png" });
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
export async function shareAuraCabinetBlob(blob: Blob): Promise<AuraShareActionOutcome> {
  if (!canShareAuraCabinetBlob(blob)) return "unavailable";
  const file = new File([blob], AURA_CABINET_FILENAME, { type: "image/png" });
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (error) {
    return (error as DOMException)?.name === "AbortError" ? "cancelled" : "unavailable";
  }
}

/** Downloads the exact PNG shown in the on-device preview. */
export function downloadAuraCabinetBlob(blob: Blob): "downloaded" {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = AURA_CABINET_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
