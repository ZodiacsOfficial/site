import { signBySlug } from "./signs";
import { loadDisc } from "./share-card";
import { groundedAuraReflection } from "./aura/readings";
import {
  AURA_SHARE_BODIES,
  AURA_SHARE_EVENT_KINDS,
  assertAuraShareSign,
  auraShareDateMs,
  isAuraShareFocus,
  type AuraShareFocus,
  type AuraShareFocusReason,
} from "./aura-share";
import {
  type AuraActivationKind,
  type AuraSign,
} from "./aura/types";

export interface AuraShareNextEvent {
  kind: AuraActivationKind;
  sign: AuraSign;
  at: string;
  body: string | null;
  eventType: string | null;
}

/**
 * The complete card input. It intentionally cannot carry an address, chart
 * identity, natal body, held count, user-authored copy, or page focal sign.
 * The current sky is a public fact, identical for every visitor at `skyAt`.
 */
export interface AuraShareCardInput {
  focus: AuraShareFocus;
  checkedAt: string;
  skyAt: string;
  currentSky: { sun: AuraSign; moon: AuraSign };
  nextEvent: AuraShareNextEvent | null;
  includeChartFact: boolean;
}

export interface AuraShareSnapshot {
  focal: {
    slug: AuraSign;
    name: string;
    hue: string;
    glyph: string;
    reason: AuraShareFocusReason;
  };
  checkedDate: string;
  skyDate: string;
  sky: { sun: string; moon: string };
  /** The public event that selected the focus, dated; exact-event focus only. */
  activeFact: string | null;
  chartFact: string | null;
  reflection: string;
  nextSky: string | null;
  /** The painted mini-ledger rows, uppercase, in order. */
  ledger: string[];
}

export const AURA_SHARE_FILENAME = "zodiacs-registry-aura.png";
export type AuraShareActionOutcome =
  "shared" | "downloaded" | "cancelled" | "unavailable";

const W = 1080;
const H = 1350;
const BG = "#060709";
const INK = "#EEF1F7";
const MUTED = "#A2A9BA";
const HAIR = "rgba(198, 204, 218, 0.17)";
const SERIF = '"EB Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const ACTIVATION_KIND = new Set<AuraActivationKind>([
  "ingress",
  "lunation",
  "station",
  "eclipse",
  "moon-ingress",
]);
const FOCUS_REASON = new Set<AuraShareFocusReason>([
  "exact-event",
  "moon",
  "sun",
  "zodiac-order",
]);
const STATION_DETAIL = new Set(["retrograde", "direct"]);
const LUNATION_DETAIL = new Set(["new", "full"]);
const ECLIPSE_DETAIL = /^(?:partial|total|annular|penumbral|hybrid) (?:solar|lunar)$/;
const CARD_DATE = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function validDate(value: string, field: string): Date {
  return new Date(auraShareDateMs(value, field));
}

function cardDate(value: string): string {
  return `${CARD_DATE.format(validDate(value, "date"))} UTC`;
}

/**
 * Builds a public calendar-event label from structured, allowlisted parts.
 * Bodies come from the committed catalogs; free strings can never reach paint.
 */
function eventLabel(
  kind: AuraActivationKind,
  sign: AuraSign,
  body: string | null,
  eventType: string | null,
): string {
  const name = signBySlug(sign).name;
  if (body != null && !AURA_SHARE_BODIES.has(body)) {
    throw new TypeError("The calendar line's body must be a known body.");
  }
  switch (kind) {
    case "ingress":
      if (!body) throw new TypeError("An ingress calendar line requires its structured body.");
      return `${body} enters ${name}`;
    case "moon-ingress":
      if (body != null && body !== "Moon") {
        throw new TypeError("A Moon ingress calendar line cannot carry another body.");
      }
      return `Moon enters ${name}`;
    case "station":
      if (!body) throw new TypeError("A station calendar line requires its structured body.");
      if (!eventType || !STATION_DETAIL.has(eventType)) {
        throw new TypeError("A station calendar line requires its direction.");
      }
      return `${body} stations ${eventType}`;
    case "lunation":
      if (!eventType || !LUNATION_DETAIL.has(eventType)) {
        throw new TypeError("A lunation calendar line requires its phase.");
      }
      return `${eventType[0].toUpperCase()}${eventType.slice(1)} Moon in ${name}`;
    case "eclipse":
      if (eventType == null) return `Eclipse in ${name}`;
      if (!ECLIPSE_DETAIL.test(eventType)) {
        throw new TypeError("An eclipse calendar line has an unknown detail.");
      }
      return `${eventType[0].toUpperCase()}${eventType.slice(1)} eclipse in ${name}`;
  }
}

/** The card's complete serializable surface, reduced to one public focal sign. */
export function auraShareSnapshot(
  input: AuraShareCardInput,
): AuraShareSnapshot {
  if (typeof input.includeChartFact !== "boolean") {
    throw new TypeError("includeChartFact must be a boolean.");
  }
  validDate(input.checkedAt, "checkedAt");
  const focus = input.focus;
  if (!isAuraShareFocus(focus) || !FOCUS_REASON.has(focus.reason)) {
    throw new TypeError("focus must be a validated public Aura focus.");
  }
  const sign = signBySlug(focus.sign);
  if (focus.reason === "exact-event") {
    if (!focus.eventKind || !AURA_SHARE_EVENT_KINDS.has(focus.eventKind)) {
      throw new TypeError(
        "An exact-event focus requires a supported event kind.",
      );
    }
    validDate(focus.eventAt ?? "", "focus.eventAt");
  } else if (
    focus.eventKind !== null ||
    focus.eventAt !== null ||
    focus.eventBody !== null ||
    focus.eventDetail !== null
  ) {
    throw new TypeError("Only an exact-event focus may carry event details.");
  }
  assertAuraShareSign(input.currentSky?.sun, "currentSky.sun");
  assertAuraShareSign(input.currentSky?.moon, "currentSky.moon");
  const sunName = signBySlug(input.currentSky.sun).name;
  const moonName = signBySlug(input.currentSky.moon).name;

  const activeFact =
    focus.reason === "exact-event" && focus.eventKind
      ? `${eventLabel(focus.eventKind, focus.sign, focus.eventBody, focus.eventDetail)} · ${cardDate(focus.eventAt ?? "")}`
      : null;

  let nextSky: string | null = null;
  if (input.nextEvent) {
    if (!ACTIVATION_KIND.has(input.nextEvent.kind)) {
      throw new TypeError(
        "nextEvent.kind must be a supported activation kind.",
      );
    }
    assertAuraShareSign(input.nextEvent.sign, "nextEvent.sign");
    if (input.nextEvent.sign !== focus.sign) {
      throw new TypeError("nextEvent.sign must match the public focal sign.");
    }
    nextSky = `Next · ${eventLabel(
      input.nextEvent.kind,
      input.nextEvent.sign,
      input.nextEvent.body,
      input.nextEvent.eventType,
    )} · ${cardDate(input.nextEvent.at)}`;
  }

  const checkedDate = cardDate(input.checkedAt);
  const skyDate = cardDate(input.skyAt);
  const chartFact = input.includeChartFact
    ? `${sign.name} also appears in the selected birth chart`
    : null;
  // Layout budget: with both optional facts in the ledger (five rows) the
  // Next line would collide with the method line, so it is deterministically
  // omitted — from the description too, keeping text and raster identical.
  if (activeFact && chartFact) nextSky = null;
  const ledger = [
    "PRIVATE BIRTH CHART · READ ON A DEVICE, NEVER SHOWN",
    `${sign.name.toUpperCase()} FOUND AT A PUBLIC WALLET ADDRESS · CHECKED ${checkedDate.toUpperCase()}`,
    `SKY · SUN IN ${sunName.toUpperCase()} · MOON IN ${moonName.toUpperCase()} · ${skyDate.toUpperCase()}`,
    ...(activeFact ? [activeFact.toUpperCase()] : []),
    ...(chartFact ? [chartFact.toUpperCase()] : []),
  ];

  return {
    focal: {
      slug: focus.sign,
      name: sign.name,
      hue: sign.hue,
      glyph: sign.glyph,
      reason: focus.reason,
    },
    checkedDate,
    skyDate,
    sky: { sun: sunName, moon: moonName },
    activeFact,
    chartFact,
    reflection: groundedAuraReflection(focus.sign),
    nextSky,
    ledger,
  };
}

/** Complete generated-text equivalent of the raster preview for assistive technology. */
export function auraShareAccessibleDescription(
  input: AuraShareCardInput,
): string {
  const snapshot = auraShareSnapshot(input);
  return [
    `Registry Aura card dated ${snapshot.skyDate}.`,
    "Private birth chart, public wallet address, and dated sky are read side by side.",
    `${snapshot.focal.name}.`,
    `Found at a public wallet address, checked ${snapshot.checkedDate}.`,
    `Sky: Sun in ${snapshot.sky.sun}, Moon in ${snapshot.sky.moon}.`,
    snapshot.activeFact ? `${snapshot.activeFact}.` : null,
    snapshot.chartFact ? `${snapshot.chartFact}.` : null,
    `Symbolic reading: ${snapshot.reflection}`,
    "A symbolic reading — not a wallet score or investment signal.",
    snapshot.nextSky ? `${snapshot.nextSky}.` : null,
    "Composed on this device. zodiacs.org/registry/aura.",
  ]
    .filter((line): line is string => Boolean(line))
    .join(" ");
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
  // Fill every allowed line to maxWidth — including the last one — and only
  // then decide whether anything was actually left over to ellipsize.
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
  if (index < words.length && lines.length) {
    lines[lines.length - 1] = `${lines.at(-1)?.replace(/[.,;:]?$/, "")}…`;
  }
  return lines;
}

export async function drawAuraShareCard(
  input: AuraShareCardInput,
): Promise<Blob> {
  const snapshot = auraShareSnapshot(input);
  const bitmap = await loadDisc(snapshot.focal.slug);
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`500 116px ${SERIF}`),
    document.fonts.load(`italic 400 48px ${SERIF}`),
    document.fonts.load(`500 22px ${MONO}`),
    document.fonts.load(`400 24px ${MONO}`),
  ]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap?.close?.();
    throw new Error("canvas_unavailable");
  }

  try {
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
    context.fillStyle = INK;
    context.font = `500 34px ${SERIF}`;
    context.fillText("REGISTRY AURA", 66, 88);
    context.textAlign = "right";
    context.fillStyle = MUTED;
    context.font = `500 24px ${MONO}`;
    context.fillText(snapshot.skyDate.toUpperCase(), W - 66, 88);

    // The artwork is the mass of the card; meaning first, mechanism last.
    const disc = 400;
    const discX = (W - disc) / 2;
    const discY = 150;
    if (bitmap) {
      context.drawImage(bitmap, discX, discY, disc, disc);
    } else {
      context.fillStyle = snapshot.focal.hue;
      context.beginPath();
      context.arc(W / 2, discY + disc / 2, disc / 2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = BG;
      context.font = `500 225px ${SERIF}`;
      context.textAlign = "center";
      // U+FE0E keeps the glyph in text presentation; platform emoji fonts
      // otherwise hijack the zodiac code points and ignore fillStyle.
      context.fillText(`${snapshot.focal.glyph}︎`, W / 2, discY + disc / 2 + 8);
    }
    context.strokeStyle = HAIR;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(W / 2, discY + disc / 2, disc / 2 + 24, 0, Math.PI * 2);
    context.stroke();

    context.textAlign = "center";
    context.fillStyle = INK;
    context.font = `500 116px ${SERIF}`;
    context.fillText(snapshot.focal.name, W / 2, 642);

    context.font = `italic 400 48px ${SERIF}`;
    wrapLines(context, snapshot.reflection, 940, 3).forEach((line, index) => {
      context.fillText(line, W / 2, 728 + index * 64);
    });

    const ledgerTop = 924;
    const rowHeight = 52;
    context.strokeStyle = HAIR;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(66, ledgerTop);
    context.lineTo(W - 66, ledgerTop);
    context.stroke();
    context.textAlign = "left";
    snapshot.ledger.forEach((row, index) => {
      context.fillStyle = index === 1 ? snapshot.focal.hue : MUTED;
      context.font = `500 22px ${MONO}`;
      context.fillText(row, 90, ledgerTop + rowHeight * index + 32);
    });
    const ledgerBottom = ledgerTop + rowHeight * snapshot.ledger.length + 10;
    context.beginPath();
    context.moveTo(66, ledgerBottom);
    context.lineTo(W - 66, ledgerBottom);
    context.stroke();

    if (snapshot.nextSky) {
      context.textAlign = "center";
      context.fillStyle = INK;
      context.font = `400 24px ${MONO}`;
      context.fillText(
        snapshot.nextSky.toUpperCase(),
        W / 2,
        ledgerBottom + 44,
      );
    }

    context.textAlign = "center";
    context.fillStyle = INK;
    context.font = `italic 400 27px ${SERIF}`;
    context.fillText(
      "A symbolic reading — not a wallet score or investment signal.",
      W / 2,
      1240,
    );

    context.textAlign = "left";
    context.fillStyle = MUTED;
    context.font = `400 20px ${MONO}`;
    context.fillText("COMPOSED ON THIS DEVICE", 66, 1286);
    context.textAlign = "right";
    context.fillStyle = INK;
    context.font = `500 24px ${MONO}`;
    context.fillText("ZODIACS.ORG/REGISTRY/AURA", W - 66, 1286);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("png_encode_failed");
    return blob;
  } finally {
    bitmap?.close?.();
  }
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

/** Shares the already-reviewed PNG without adding a caption, title, or URL. */
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
