import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AURA_SHARE_FILENAME,
  auraShareAccessibleDescription,
  auraShareSnapshot,
  canShareAuraCardBlob,
  downloadAuraCardBlob,
  drawAuraShareCard,
  shareAuraCardBlob,
  type AuraShareCardInput,
} from "./aura-share-card";

const input: AuraShareCardInput = {
  heldSigns: ["leo", "aries", "cancer", "aries"],
  holdings: [
    { sign: "aries", finish: "pastel" },
    { sign: "cancer", finish: "silver" },
    { sign: "leo", finish: "gold", goldCount: "3" },
  ],
  checkedAt: "2026-07-16T04:00:00.000Z",
  skyAt: "2026-07-16T04:05:00.000Z",
  currentSky: { sun: "leo", moon: "cancer" },
};

interface CanvasHarness {
  painted: Array<{ text: string; font: string }>;
  canvas: { width: number; height: number };
  context: Record<string, unknown>;
  share: ReturnType<typeof vi.fn>;
  anchor: {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  appendChild: ReturnType<typeof vi.fn>;
  revokeObjectURL: ReturnType<typeof vi.fn>;
}

function installCanvas(options: { encode?: boolean; canShare?: boolean } = {}): CanvasHarness {
  const painted: Array<{ text: string; font: string }> = [];
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn((text: string) => painted.push({ text, font: context.font })),
    lineTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 14 })),
    moveTo: vi.fn(),
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
  const anchor = {
    href: "",
    download: "",
    click: vi.fn(),
    remove: vi.fn(),
  };
  const appendChild = vi.fn();
  vi.stubGlobal("document", {
    fonts: {
      ready: Promise.resolve(),
      load: vi.fn(() => Promise.resolve()),
    },
    createElement: vi.fn((tag: string) => (tag === "canvas" ? canvas : anchor)),
    body: { appendChild },
  });
  const share = vi.fn(() => Promise.resolve());
  vi.stubGlobal("navigator", {
    canShare: vi.fn(() => options.canShare !== false),
    share,
  });
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:talisman-preview"),
    revokeObjectURL,
  });
  return {
    painted,
    canvas,
    context,
    share,
    anchor,
    appendChild,
    revokeObjectURL,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Registry Aura collection talisman snapshot", () => {
  it("canonicalizes the represented set and produces deterministic seal geometry", () => {
    const first = auraShareSnapshot(input);
    const second = auraShareSnapshot({
      ...input,
      heldSigns: ["cancer", "aries", "leo"],
    });

    expect(first).toEqual(second);
    expect({
      represented: first.represented.map((sign) => sign.slug),
      editions: first.represented.map((sign) => (
        `${sign.slug}:${sign.finish}${sign.goldCountLabel ?? ""}`
      )),
      mode: first.geometry.collectionMode,
      closed: first.geometry.closed,
      fullTwelve: first.geometry.fullTwelve,
      segments: first.geometry.collectionSegments.map((segment) =>
        `${segment.fromSign}-${segment.toSign}`,
      ),
      sky: first.skyMarks.map((mark) => ({
        body: mark.body,
        sign: mark.sign.slug,
        x: mark.x,
        y: mark.y,
      })),
    }).toMatchInlineSnapshot(`
      {
        "closed": true,
        "editions": [
          "aries:pastel",
          "cancer:silver",
          "leo:gold×3",
        ],
        "fullTwelve": false,
        "mode": "polygon",
        "represented": [
          "aries",
          "cancer",
          "leo",
        ],
        "segments": [
          "aries-cancer",
          "cancer-leo",
          "leo-aries",
        ],
        "sky": [
          {
            "body": "Sun",
            "sign": "leo",
            "x": 0.66617,
            "y": 0.66617,
          },
          {
            "body": "Moon",
            "sign": "cancer",
            "x": 0.726993,
            "y": 0.560822,
          },
        ],
      }
    `);
    expect(first.checkedDate).toBe("Jul 16, 2026 UTC");
    expect(first.skyDate).toBe("Jul 16, 2026 UTC");
  });

  it("exposes only the collection, visit dates, and public sky facts", () => {
    expect(Object.keys(input).sort()).toEqual([
      "checkedAt",
      "currentSky",
      "heldSigns",
      "holdings",
      "skyAt",
    ]);
    const serialized = JSON.stringify(auraShareSnapshot(input));
    expect(serialized).toContain("aries");
    expect(serialized).toContain("leo");
    expect(serialized).not.toMatch(/address|wallet|balance|price|birth|name of owner/i);
  });

  it("shows exact Gold counts through nine and caps larger public tallies", () => {
    const exact = auraShareSnapshot({
      ...input,
      holdings: input.holdings?.map((holding) => (
        holding.sign === "leo"
          ? { sign: "leo", finish: "gold" as const, goldCount: "2" }
          : holding
      )),
    }).represented.find((sign) => sign.slug === "leo")!;
    const capped = auraShareSnapshot({
      ...input,
      holdings: input.holdings?.map((holding) => (
        holding.sign === "leo"
          ? { sign: "leo", finish: "gold" as const, goldCount: "47" }
          : holding
      )),
    }).represented.find((sign) => sign.slug === "leo")!;

    expect(exact).toMatchObject({ goldCountLabel: "×2", goldTallyArcs: 1 });
    expect(capped).toMatchObject({ goldCountLabel: "×9+", goldTallyArcs: 2 });
  });

  it("ignores runtime extra fields so private data cannot reach the snapshot", () => {
    const poisoned = {
      ...input,
      address: "0xPRIVATE",
      chart: { name: "Alex", birthDate: "1989-12-20", rising: "pisces" },
      quantity: 999,
      prices: ["$1,000"],
      url: "https://private.invalid/chart",
      unrelatedHoldings: ["secret-token"],
    } as AuraShareCardInput & Record<string, unknown>;
    expect(auraShareSnapshot(poisoned)).toEqual(auraShareSnapshot(input));
    const serialized = JSON.stringify(auraShareSnapshot(poisoned));
    for (const forbidden of [
      "0xPRIVATE",
      "Alex",
      "1989-12-20",
      "$1,000",
      "private.invalid",
      "secret-token",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("rejects empty, malformed, noncanonical, and undated inputs", () => {
    expect(() => auraShareSnapshot({ ...input, heldSigns: [] })).toThrow(
      /at least one represented sign/i,
    );
    expect(() =>
      auraShareSnapshot({ ...input, heldSigns: "aries" as never }),
    ).toThrow(/array/i);
    expect(() =>
      auraShareSnapshot({ ...input, heldSigns: ["ophiuchus" as "aries"] }),
    ).toThrow(/canonical zodiac/i);
    expect(() => auraShareSnapshot({ ...input, checkedAt: "Jul 16, 2026" })).toThrow(
      /ISO date/i,
    );
    expect(() => auraShareSnapshot({ ...input, skyAt: "not-a-date" })).toThrow(
      /ISO date/i,
    );
    expect(() =>
      auraShareSnapshot({
        ...input,
        currentSky: { sun: "ophiuchus" as "leo", moon: "cancer" },
      }),
    ).toThrow(/canonical zodiac/i);
  });

  it("provides a complete privacy-safe text equivalent without a URL", () => {
    const description = auraShareAccessibleDescription(input);
    for (const required of [
      "Registry Aura collection talisman dated Jul 16, 2026 UTC",
      "Represented Zodiac set: Aries, pastel; Cancer, silver; Leo, gold ×3",
      "Sun in Leo; Moon in Cancer",
      "A dated composition of the represented Zodiac set, today’s Sun, and today’s Moon",
      "Public edition · collection + dated sky",
      "Registry record checked Jul 16, 2026 UTC",
      "Zodiacs · Org",
    ]) {
      expect(description).toContain(required);
    }
    expect(description).not.toMatch(/https?:|zodiacs\.org\//i);
  });
});

describe("Registry Aura talisman PNG", () => {
  it("paints a 1080×1350 collection seal, represented set, method, and wordmark", async () => {
    const harness = installCanvas();
    const blob = await drawAuraShareCard(input);
    expect(blob.type).toBe("image/png");
    expect(harness.canvas).toMatchObject({ width: 1080, height: 1350 });
    const text = harness.painted.map((entry) => entry.text).join(" ");
    for (const required of [
      "REGISTRY AURA · DATED EDITION",
      "Collection talisman",
      "DATED PUBLIC SKY",
      "JUL 16, 2026 UTC",
      "REPRESENTED ZODIACS",
      "ARIES",
      "CANCER",
      "LEO",
      "PASTEL",
      "SILVER",
      "GOLD ×3",
      "A dated composition of the represented Zodiac set, today’s Sun, and today’s Moon.",
      "PUBLIC EDITION · COLLECTION + DATED SKY",
      "REGISTRY CHECKED JUL 16, 2026 UTC",
      "ZODIACS · ORG",
    ]) {
      expect(text).toContain(required);
    }
    expect(harness.context.lineTo).toHaveBeenCalled();
    expect(harness.context.arc).toHaveBeenCalled();
    expect(text).not.toMatch(/https?:|zodiacs\.org\//i);
  });

  it("cannot paint private or financial fields appended at runtime", async () => {
    const harness = installCanvas();
    await drawAuraShareCard({
      ...input,
      address: "0xPRIVATE",
      chartName: "Alex",
      birthDate: "1989-12-20",
      coordinates: "42.87, 74.59",
      quantities: [12],
      prices: ["$1,000"],
      url: "https://private.invalid/chart",
    } as AuraShareCardInput & Record<string, unknown>);
    const text = harness.painted.map((entry) => entry.text).join("\n");
    for (const forbidden of [
      "0xPRIVATE",
      "Alex",
      "1989-12-20",
      "42.87",
      "$1,000",
      "private.invalid",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("fails clearly when PNG encoding is unavailable", async () => {
    installCanvas({ encode: false });
    await expect(drawAuraShareCard(input)).rejects.toThrow("png_encode_failed");
  });
});

describe("Registry Aura talisman share and download", () => {
  it("uses the required constant filename and shares only the reviewed PNG", async () => {
    const harness = installCanvas();
    const blob = await drawAuraShareCard(input);
    expect(AURA_SHARE_FILENAME).toBe("zodiacs-collection-talisman.png");
    expect(canShareAuraCardBlob(blob)).toBe(true);
    await expect(shareAuraCardBlob(blob)).resolves.toBe("shared");
    const payload = harness.share.mock.calls[0][0] as ShareData;
    expect(Object.keys(payload)).toEqual(["files"]);
    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0].name).toBe(AURA_SHARE_FILENAME);
    expect(payload).not.toHaveProperty("text");
    expect(payload).not.toHaveProperty("title");
    expect(payload).not.toHaveProperty("url");
  });

  it("keeps unsupported native sharing on the explicit download path", async () => {
    const harness = installCanvas({ canShare: false });
    const blob = new Blob(["png"], { type: "image/png" });
    expect(canShareAuraCardBlob(blob)).toBe(false);
    await expect(shareAuraCardBlob(blob)).resolves.toBe("unavailable");
    expect(harness.share).not.toHaveBeenCalled();
    expect(downloadAuraCardBlob(blob)).toBe("downloaded");
    expect(harness.anchor).toMatchObject({
      href: "blob:talisman-preview",
      download: AURA_SHARE_FILENAME,
    });
    expect(harness.appendChild).toHaveBeenCalledWith(harness.anchor);
    expect(harness.anchor.click).toHaveBeenCalledOnce();
    expect(harness.anchor.remove).toHaveBeenCalledOnce();
    expect(harness.revokeObjectURL).toHaveBeenCalledWith("blob:talisman-preview");
  });

  it("reports cancellation separately from native share errors", async () => {
    const cancelled = installCanvas();
    const abort = new Error("cancelled");
    Object.defineProperty(abort, "name", { value: "AbortError" });
    cancelled.share.mockRejectedValueOnce(abort);
    await expect(
      shareAuraCardBlob(new Blob(["png"], { type: "image/png" })),
    ).resolves.toBe("cancelled");

    const failed = installCanvas();
    failed.share.mockRejectedValueOnce(new Error("share failed"));
    await expect(
      shareAuraCardBlob(new Blob(["png"], { type: "image/png" })),
    ).resolves.toBe("unavailable");
  });
});
