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
    expect(snapshot.gilded).toBe(true);
    expect(snapshot.seats[0]).toMatchObject({ edition: "gilded", tallyLabel: "×12" });
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
    expect(complete.gilded).toBe(false);
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
    expect(text).toContain("Aries gilded ×12");
    expect(text).toContain("7 places remain reserved.");
    expect(text).toContain("Solana public record");
    expect(text).not.toMatch(/address|wallet|balance|price|birth/i);
  });
});

describe("Registry Aura cabinet PNG", () => {
  it("paints a 1080×1350 case with every seat, both plates, and the wordmark", async () => {
    const harness = installCanvas();
    const blob = await drawAuraCabinetCard({
      ...input,
      holdings: AURA_SIGN_ORDER.map((sign) => (
        sign === "aries"
          ? { sign, finish: "gold" as const, goldCount: "12" }
          : { sign, finish: "pastel" as const }
      )),
    });

    expect(blob.type).toBe("image/png");
    expect(harness.canvas).toMatchObject({ width: 1080, height: 1350 });
    const text = harness.painted.join(" ");
    for (const required of [
      "COLLECTION DISPLAY",
      "The Cabinet of Twelve",
      "12 OF THE TWELVE",
      "Nº 01",
      "Nº 12",
      "Aries",
      "Pisces",
      "V · GILDED",
      "I · PASTEL",
      "THE GILDED CASE",
      "THE COMPLETE TWELVE",
      "EDITIONS READ FROM THE PUBLIC RECORD",
      "ZODIACS · ORG",
    ]) {
      expect(text).toContain(required);
    }
    // The page's own artwork, not a redrawn approximation.
    expect(harness.drawn).toContain("/assets/cabinet-materials/gold/aries.webp");
    expect(harness.drawn).toContain("/assets/zodiac-icons/128/pisces.webp");
    // Nothing on the card can name an address or a balance.
    expect(text).not.toMatch(/0x|address|balance|held\b.*\d{4,}/i);
  });

  it("still exports when the artwork cannot load", async () => {
    const harness = installCanvas({ art: false });
    const blob = await drawAuraCabinetCard(input);

    expect(blob.type).toBe("image/png");
    expect(harness.drawn).toHaveLength(0);
    // The glyph fallback keeps every represented seat legible.
    expect(harness.painted.join(" ")).toContain("Aries");
  });

  it("fails clearly when PNG encoding is unavailable", async () => {
    installCanvas({ encode: false });
    await expect(drawAuraCabinetCard(input)).rejects.toThrow("png_encode_failed");
  });

  it("shares and downloads under one constant cabinet filename", async () => {
    const harness = installCanvas();
    const blob = await drawAuraCabinetCard(input);

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
    const blob = await drawAuraCabinetCard(input);

    expect(canShareAuraCabinetBlob(blob)).toBe(false);
    expect(await shareAuraCabinetBlob(blob)).toBe("unavailable");
  });
});
