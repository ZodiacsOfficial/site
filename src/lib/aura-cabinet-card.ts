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
  /**
   * The live cabinet element to photograph. Passing the element rather than
   * re-drawing from data is the whole point: the card cannot drift from the
   * page, because it is the page.
   */
  element?: HTMLElement | null;
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
  crown: boolean;
  checkedDate: string;
  chainLabel: string;
}

export const AURA_CABINET_FILENAME = "zodiacs-cabinet.png";

const BG = "#07080B";
const INK = "#EEF1F7";
const MUTED = "#9CA5B8";
const HAIR = "rgba(205, 212, 226, 0.16)";
const BRASS = "#C6AD78";
const LEAF_BRIGHT = "#FFF2C4";
const SCALE = 2;
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

const EDITION_CAPTION: Record<AuraCabinetEdition, string> = {
  pastel: "I · PASTEL",
  bronze: "II · BRONZE",
  silver: "III · SILVER",
  gold: "IV · GOLD",
  crown: "V · CROWN",
};

const CHAIN_LABEL: Record<AuraChain, string> = {
  solana: "Solana",
  base: "Base",
};

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
    crown: seats.some((seat) => seat.edition === "crown"),
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

export interface AuraCabinetCardResult {
  blob: Blob;
  /** Bitmap size in device pixels — the preview's intrinsic dimensions. */
  width: number;
  height: number;
}

/**
 * Draws the shareable card: the captured cabinet, on the void, with a header
 * and a footer that carry provenance.
 *
 * Only the chrome is drawn here. The case in the middle is a bitmap of the
 * live element — laid out at the fixed portrait export width — so it can
 * never disagree with the page.
 */
export async function drawAuraCabinetCard(input: AuraCabinetCardInput): Promise<AuraCabinetCardResult> {
  const snapshot = auraCabinetSnapshot(input);
  const element = input.element;
  if (!element) throw new TypeError("A cabinet element is required to capture.");

  if (typeof document.fonts !== "undefined") {
    await document.fonts.ready;
  }

  const { captureCabinet } = await import("./aura-cabinet-card-capture");
  const capture = await captureCabinet(element, { scale: SCALE });

  const cabinetW = capture.width;
  const cabinetH = capture.height;
  // The card is the case plus a fixed margin and two rules of chrome, so its
  // proportions follow whatever the cabinet actually measured.
  const pad = Math.round(cabinetW * 0.055);
  const headerH = Math.round(cabinetW * 0.105);
  const footerH = Math.round(cabinetW * 0.115);
  const W = (cabinetW + pad * 2) * SCALE;
  const H = (cabinetH + headerH + footerH + pad * 2) * SCALE;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas_unavailable");
  context.scale(SCALE, SCALE);
  const w = W / SCALE;
  const h = H / SCALE;

  context.fillStyle = BG;
  context.fillRect(0, 0, w, h);

  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = BRASS;
  context.font = `500 ${Math.round(w * 0.017)}px ${MONO}`;
  context.fillText("COLLECTION DISPLAY", pad, pad + headerH * 0.38);
  context.textAlign = "right";
  context.fillStyle = MUTED;
  context.fillText(
    `${snapshot.chainLabel.toUpperCase()} · ${snapshot.checkedDate.toUpperCase()}`,
    w - pad,
    pad + headerH * 0.38,
  );

  context.textAlign = "left";
  context.fillStyle = INK;
  context.font = `500 ${Math.round(w * 0.046)}px ${SERIF}`;
  context.fillText("The Cabinet of Twelve", pad, pad + headerH * 0.78);
  context.textAlign = "right";
  context.fillStyle = snapshot.crown ? LEAF_BRIGHT : MUTED;
  context.font = `500 ${Math.round(w * 0.018)}px ${MONO}`;
  context.fillText(
    snapshot.complete
      ? "THE COMPLETE TWELVE"
      : `${snapshot.representedCount} OF THE TWELVE`,
    w - pad,
    pad + headerH * 0.8,
  );

  // The case itself, exactly as the page drew it. Destination device size
  // equals the capture's intrinsic bitmap — one-to-one texels, no resample.
  context.drawImage(capture.image, pad, pad + headerH, cabinetW, cabinetH);

  const footerY = pad + headerH + cabinetH;
  context.strokeStyle = HAIR;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(pad, footerY + footerH * 0.42);
  context.lineTo(w - pad, footerY + footerH * 0.42);
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = MUTED;
  context.font = `500 ${Math.round(w * 0.0155)}px ${MONO}`;
  context.fillText("EDITIONS READ FROM THE PUBLIC RECORD", pad, footerY + footerH * 0.74);
  context.textAlign = "right";
  context.fillStyle = INK;
  context.font = `500 ${Math.round(w * 0.019)}px ${MONO}`;
  context.fillText("ZODIACS · ORG", w - pad, footerY + footerH * 0.74);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("png_encode_failed");
  return { blob, width: canvas.width, height: canvas.height };
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
