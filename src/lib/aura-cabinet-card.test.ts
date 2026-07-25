import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AURA_CABINET_FILENAME,
  auraCabinetAccessibleDescription,
  auraCabinetSnapshot,
  canShareAuraCabinetBlob,
  downloadAuraCabinetBlob,
  drawAuraCabinetCard,
  shareAuraCabinetBlob,
  type AuraCabinetCardInput,
} from "./aura-cabinet-card";
import { AURA_SIGN_ORDER } from "./aura/types";
import {
  CABINET_EXPORT_WIDTH,
  artworkSources,
  cabinetMediaMatches,
  cabinetSelectorKeeps,
  dropDeferredDeclarations,
  looksScreenReaderOnly,
  rewriteCabinetSelector,
  rewriteViewportUnits,
  sampleLooksBlank,
} from "./aura-cabinet-card-capture";

const input: AuraCabinetCardInput = {
  holdings: [
    { sign: "aries", finish: "gold", goldCount: "12" },
    { sign: "gemini", finish: "pastel" },
    { sign: "cancer", finish: "bronze" },
    { sign: "leo", finish: "silver" },
    { sign: "scorpio", finish: "gold", goldCount: "3" },
  ],
  checkedAt: "2026-07-16T04:00:00.000Z",
  chain: "solana",
};

interface CabinetHarness {
  painted: string[];
  drawn: string[];
  canvas: { width: number; height: number };
  anchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  share: ReturnType<typeof vi.fn>;
}

function installCanvas(options: { encode?: boolean; canShare?: boolean; art?: boolean } = {}): CabinetHarness {
  const painted: string[] = [];
  const drawn: string[] = [];
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    drawImage: vi.fn((image: { src: string }) => drawn.push(image.src)),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn((text: string) => painted.push(text)),
    lineTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 11 })),
    moveTo: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    font: "",
    lineWidth: 1,
    strokeStyle: "",
    textAlign: "left",
    textBaseline: "middle",
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) =>
      callback(options.encode === false ? null : new Blob(["png"], { type: "image/png" })),
    ),
  };
  const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };

  // Same-origin artwork resolves synchronously in the harness; when `art` is
  // false every load fails, which is the fallback path the card must survive.
  class HarnessImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = options.art === false ? 0 : 128;
    #src = "";
    set src(value: string) {
      this.#src = value;
      queueMicrotask(() => (options.art === false ? this.onerror?.() : this.onload?.()));
    }
    get src(): string {
      return this.#src;
    }
  }
  vi.stubGlobal("Image", HarnessImage);
  vi.stubGlobal("document", {
    fonts: { ready: Promise.resolve(), load: vi.fn(() => Promise.resolve()) },
    createElement: vi.fn((tag: string) => (tag === "canvas" ? canvas : anchor)),
    body: { appendChild: vi.fn() },
  });
  vi.stubGlobal("window", {
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
  });
  const share = vi.fn(() => Promise.resolve());
  vi.stubGlobal("navigator", {
    canShare: vi.fn(() => options.canShare !== false),
    share,
  });
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:cabinet-preview"),
    revokeObjectURL: vi.fn(),
  });
  return { painted, drawn, canvas, anchor, share };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Registry Aura cabinet card snapshot", () => {
  it("keeps all twelve seats and derives each seat's edition", () => {
    const snapshot = auraCabinetSnapshot(input);

    expect(snapshot.seats.map((seat) => seat.slug)).toEqual([...AURA_SIGN_ORDER]);
    expect(snapshot.representedCount).toBe(5);
    expect(snapshot.complete).toBe(false);
    // Twelve sculptures in one seat is the fifth edition, derived not stored.
    expect(snapshot.crown).toBe(true);
    expect(snapshot.seats[0]).toMatchObject({ edition: "crown", tallyLabel: "×12" });
    expect(snapshot.seats[7]).toMatchObject({ edition: "gold", tallyLabel: "×3" });
    expect(snapshot.seats[3]).toMatchObject({ edition: "bronze", tallyLabel: null });
    // The reserved niches survive into the card: absence is part of the record.
    expect(snapshot.seats[1]).toMatchObject({ represented: false, edition: null });
    expect(snapshot.checkedDate).toBe("Jul 16, 2026 UTC");
    expect(snapshot.chainLabel).toBe("Solana");
  });

  it("caps the public tally at ninety-nine and omits it for a single sculpture", () => {
    const single = auraCabinetSnapshot({
      ...input,
      holdings: [{ sign: "aries", finish: "gold", goldCount: "1" }],
    });
    const capped = auraCabinetSnapshot({
      ...input,
      holdings: [{ sign: "aries", finish: "gold", goldCount: "480" }],
    });

    expect(single.seats[0].tallyLabel).toBeNull();
    expect(capped.seats[0].tallyLabel).toBe("×99+");
  });

  it("marks the Complete Twelve only when every seat is represented", () => {
    const complete = auraCabinetSnapshot({
      ...input,
      holdings: AURA_SIGN_ORDER.map((sign) => ({ sign, finish: "pastel" as const })),
    });

    expect(complete.complete).toBe(true);
    expect(complete.representedCount).toBe(12);
    expect(complete.crown).toBe(false);
  });

  it("ignores runtime extra fields so private data cannot reach the canvas", () => {
    const poisoned = {
      ...input,
      address: "0xPRIVATE",
      balance: "8123456",
      chart: { name: "Alex", birthDate: "1989-12-20" },
      holdings: input.holdings.map((holding) => ({ ...holding, rawBalance: "8123456789" })),
    } as unknown as AuraCabinetCardInput;

    const serialized = JSON.stringify(auraCabinetSnapshot(poisoned));
    expect(serialized).not.toMatch(/address|balance|chart|birth|rawBalance|0xPRIVATE/i);
  });

  it("rejects malformed holdings, chains, and dates", () => {
    expect(() => auraCabinetSnapshot({ ...input, chain: "ethereum" as never })).toThrow(TypeError);
    expect(() => auraCabinetSnapshot({ ...input, holdings: "nope" as never })).toThrow(TypeError);
    expect(() => auraCabinetSnapshot({
      ...input,
      holdings: [{ sign: "ophiuchus", finish: "pastel" } as never],
    })).toThrow(TypeError);
    expect(() => auraCabinetSnapshot({
      ...input,
      holdings: [{ sign: "aries", finish: "platinum" } as never],
    })).toThrow(TypeError);
    // A Gold seat without a canonical count would draw an unverifiable tally.
    expect(() => auraCabinetSnapshot({
      ...input,
      holdings: [{ sign: "aries", finish: "gold" } as never],
    })).toThrow(TypeError);
    expect(() => auraCabinetSnapshot({ ...input, checkedAt: "not-a-date" })).toThrow();
  });

  it("writes a complete privacy-safe text equivalent", () => {
    const text = auraCabinetAccessibleDescription(input);

    expect(text).toContain("5 of the Twelve represented");
    expect(text).toContain("Aries crown ×12");
    expect(text).toContain("7 places remain reserved.");
    expect(text).toContain("Solana public record");
    expect(text).not.toMatch(/address|wallet|balance|price|birth/i);
  });
});

describe("Registry Aura cabinet PNG", () => {
  it("refuses to export without a live cabinet to photograph", async () => {
    installCanvas();
    // The card is a capture, not a re-drawing: with no element there is
    // nothing to be faithful to, and a silent approximation would be worse
    // than an error.
    await expect(drawAuraCabinetCard(input)).rejects.toThrow(TypeError);
  });

  it("shares and downloads under one constant cabinet filename", async () => {
    const harness = installCanvas();
    const blob = new Blob(["png"], { type: "image/png" });

    expect(AURA_CABINET_FILENAME).toBe("zodiacs-cabinet.png");
    expect(canShareAuraCabinetBlob(blob)).toBe(true);
    expect(await shareAuraCabinetBlob(blob)).toBe("shared");
    const shared = harness.share.mock.calls[0][0] as { files: File[] };
    expect(shared.files[0].name).toBe(AURA_CABINET_FILENAME);
    // The share carries the reviewed image and nothing else — no text, no URL.
    expect(Object.keys(shared)).toEqual(["files"]);

    expect(downloadAuraCabinetBlob(blob)).toBe("downloaded");
    expect(harness.anchor.download).toBe(AURA_CABINET_FILENAME);
  });

  it("keeps unsupported native sharing on the download path", async () => {
    installCanvas({ canShare: false });
    const blob = new Blob(["png"], { type: "image/png" });

    expect(canShareAuraCabinetBlob(blob)).toBe(false);
    expect(await shareAuraCabinetBlob(blob)).toBe("unavailable");
  });
});

describe("cabinet capture flattening", () => {
  it("decides media conditions at the fixed export width", () => {
    // The export width sits inside the phone cascade: the three-column case.
    expect(cabinetMediaMatches("(max-width: 639px)", CABINET_EXPORT_WIDTH)).toBe(true);
    expect(cabinetMediaMatches("(max-width: 639px)", 700)).toBe(false);
    expect(cabinetMediaMatches("(max-width: 719px)", CABINET_EXPORT_WIDTH)).toBe(true);
    expect(cabinetMediaMatches("(min-width: 640px)", CABINET_EXPORT_WIDTH)).toBe(false);
    expect(cabinetMediaMatches("screen and (max-width: 899px)", CABINET_EXPORT_WIDTH)).toBe(true);
    expect(cabinetMediaMatches("(max-width: 400px), (max-width: 639px)", CABINET_EXPORT_WIDTH)).toBe(true);
    expect(cabinetMediaMatches("not screen and (min-width: 640px)", CABINET_EXPORT_WIDTH)).toBe(true);
    // A still export has no pointer, no motion preference, no orientation.
    expect(cabinetMediaMatches("(hover: hover) and (pointer: fine)", CABINET_EXPORT_WIDTH)).toBe(false);
    expect(cabinetMediaMatches("(prefers-reduced-motion: reduce)", CABINET_EXPORT_WIDTH)).toBe(false);
    expect(cabinetMediaMatches("(forced-colors: active)", CABINET_EXPORT_WIDTH)).toBe(false);
    expect(cabinetMediaMatches("(orientation: landscape)", CABINET_EXPORT_WIDTH)).toBe(false);
    expect(cabinetMediaMatches("", CABINET_EXPORT_WIDTH)).toBe(true);
  });

  it("keeps the base resets the cabinet's layout depends on", () => {
    // These three casualties were the clipped, unbordered card: box-sizing,
    // the document font size, and the button reset behind every niche.
    expect(cabinetSelectorKeeps("*, *::before, *::after")).toBe(true);
    expect(cabinetSelectorKeeps("html, body")).toBe(true);
    expect(cabinetSelectorKeeps("button")).toBe(true);
    expect(cabinetSelectorKeeps("img, svg, video")).toBe(true);
    expect(cabinetSelectorKeeps(":root")).toBe(true);
    expect(cabinetSelectorKeeps(".aura-collection-cabinet__grid")).toBe(true);
    expect(cabinetSelectorKeeps(".zodiac-medallion::after")).toBe(true);
    expect(cabinetSelectorKeeps(".btn--primary")).toBe(false);
    expect(cabinetSelectorKeeps(".aura-page__hero .kicker")).toBe(false);
  });

  it("re-targets document selectors at what exists inside the capture", () => {
    expect(rewriteCabinetSelector("html, body")).toBe(
      ":root, [data-aura-cabinet-capture-root]",
    );
    expect(rewriteCabinetSelector("html.js .aura-collection-cabinet__frame")).toBe(
      ":root .aura-collection-cabinet__frame",
    );
    expect(rewriteCabinetSelector(".aura-collection-cabinet__name")).toBe(
      ".aura-collection-cabinet__name",
    );
  });

  it("resolves viewport widths to pixels and drops viewport heights", () => {
    expect(rewriteViewportUnits("padding: clamp(9px, 1.5vw, 16px)", CABINET_EXPORT_WIDTH)).toBe(
      "padding: clamp(9px, 7.29px, 16px)",
    );
    expect(
      rewriteViewportUnits("min-height: 100dvh; color: rgb(0, 0, 0)", CABINET_EXPORT_WIDTH),
    ).toBe("color: rgb(0, 0, 0)");
  });

  it("exports a PNG exactly 1080 device pixels wide", () => {
    // Card padding is round(width × 0.055) per side at a 2× raster.
    const pad = Math.round(CABINET_EXPORT_WIDTH * 0.055);
    expect((CABINET_EXPORT_WIDTH + pad * 2) * 2).toBe(1080);
  });

  it("embeds the file the browser itself resolved, sharpening only the disc", () => {
    // The engine has already decoded currentSrc once, so that format is the
    // safest thing to hand a one-shot rasteriser; the markup src is the net.
    expect(
      artworkSources(
        "https://zodiacs.org/assets/cabinet-materials/gold/aries.avif",
        "/assets/cabinet-materials/gold/aries.webp",
      ),
    ).toEqual([
      "https://zodiacs.org/assets/cabinet-materials/gold/aries.avif",
      "/assets/cabinet-materials/gold/aries.webp",
    ]);
    // The pastel disc ships a larger master, and the export is a dense bitmap.
    expect(
      artworkSources(
        "https://zodiacs.org/assets/zodiac-icons/128/leo.avif",
        "/assets/zodiac-icons/128/leo.webp",
      )[0],
    ).toBe("https://zodiacs.org/assets/zodiac-icons/400/leo.avif");
    // A missing currentSrc still yields a usable candidate list.
    expect(artworkSources("", "/assets/cabinet-materials/gold/leo.webp")).toEqual([
      "/assets/cabinet-materials/gold/leo.webp",
    ]);
    expect(artworkSources("data:image/webp;base64,AA", "data:image/webp;base64,AA")).toEqual([]);
  });

  it("drops declarations that defer painting to a frame that never comes", () => {
    // will-change hands the artwork's layer to the compositor — the reason a
    // case can export with every border and letter but empty niches.
    expect(
      dropDeferredDeclarations("opacity: 1; will-change: opacity, transform; z-index: 3"),
    ).toBe("opacity: 1; z-index: 3");
    expect(dropDeferredDeclarations("content-visibility: auto; color: red")).toBe("color: red");
    expect(dropDeferredDeclarations("transform: scale(1)")).toBe("transform: scale(1)");
  });

  it("spots text that exists for screen readers only", () => {
    // The cabinet announces itself through a clipped live region; that
    // sentence must never be lettered across the picture.
    expect(looksScreenReaderOnly({ clip: "rect(0, 0, 0, 0)" })).toBe(true);
    expect(looksScreenReaderOnly({ clipPath: "inset(50%)" })).toBe(true);
    expect(
      looksScreenReaderOnly({ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }),
    ).toBe(true);
    // Real content is left alone.
    expect(looksScreenReaderOnly({ position: "absolute", width: "151px", height: "189px" })).toBe(false);
    expect(looksScreenReaderOnly({})).toBe(false);
  });

  it("recognises a raster that decoded but drew nothing", () => {
    const flat = (r: number, g: number, b: number, a: number, count: number) =>
      new Uint8ClampedArray(count * 4).map((_, index) => [r, g, b, a][index % 4]);

    // A capture that never painted: fully transparent, or flat void.
    expect(sampleLooksBlank(flat(0, 0, 0, 0, 64))).toBe(true);
    expect(sampleLooksBlank(flat(7, 8, 11, 255, 64))).toBe(true);
    // Sub-tolerance noise is still blank; a gold filet against the ground is not.
    const almostFlat = flat(7, 8, 11, 255, 8);
    almostFlat[20] = 12;
    expect(sampleLooksBlank(almostFlat)).toBe(true);
    const withFilet = flat(7, 8, 11, 255, 8);
    withFilet[16] = 232;
    withFilet[17] = 196;
    withFilet[18] = 106;
    expect(sampleLooksBlank(withFilet)).toBe(false);
    // Nothing to read is not evidence of a good render.
    expect(sampleLooksBlank(new Uint8ClampedArray(0))).toBe(true);
  });
});
