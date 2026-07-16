import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AURA_SHARE_FILENAME,
  auraShareAccessibleDescription,
  auraShareSnapshot,
  canShareAuraCardBlob,
  drawAuraShareCard,
  shareAuraCardBlob,
  type AuraShareCardInput,
} from "./aura-share-card";
import { selectAuraShareFocus } from "./aura-share";
import { groundedAuraReflection } from "./aura/readings";
import { AURA_SIGN_ORDER } from "./aura/types";

const publicInput = {
  heldSigns: ["aries", "cancer", "leo"],
  skyAt: "2026-07-16T04:05:00.000Z",
  currentSky: { sun: "leo", moon: "cancer" },
  activeEvents: [
    {
      kind: "eclipse",
      sign: "aries",
      exactAt: "2026-07-16T06:05:00.000Z",
      body: "Sun",
      eventType: "total solar",
    },
  ],
} as const;

const input: AuraShareCardInput = {
  focus: selectAuraShareFocus(publicInput)!,
  checkedAt: "2026-07-16T04:00:00.000Z",
  skyAt: publicInput.skyAt,
  currentSky: { sun: "leo", moon: "cancer" },
  nextEvent: {
    kind: "station",
    sign: "aries",
    at: "2026-07-22T11:30:00.000Z",
    body: "Mercury",
    eventType: "retrograde",
  },
  includeChartFact: false,
};

function installCanvas(charWidth = 18): {
  painted: Array<{ text: string; font: string }>;
  bitmapClose: ReturnType<typeof vi.fn>;
  share: ReturnType<typeof vi.fn>;
} {
  const painted: Array<{ text: string; font: string }> = [];
  const context = {
    beginPath: vi.fn(),
    arc: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn((text: string) =>
      painted.push({ text, font: context.font }),
    ),
    lineTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * charWidth })),
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
    toBlob: vi.fn((callback: (blob: Blob) => void) =>
      callback(new Blob(["png"], { type: "image/png" })),
    ),
  };
  vi.stubGlobal("document", {
    fonts: { ready: Promise.resolve(), load: vi.fn(() => Promise.resolve()) },
    createElement: vi.fn((tag: string) => (tag === "canvas" ? canvas : {})),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(["disc"], { type: "image/webp" })),
      }),
    ),
  );
  const bitmapClose = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(() => Promise.resolve({ close: bitmapClose })),
  );
  const share = vi.fn(() => Promise.resolve());
  vi.stubGlobal("navigator", { canShare: vi.fn(() => true), share });
  return { painted, bitmapClose, share };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Registry Aura public-only social focus", () => {
  it("uses exact event, Moon, Sun, then zodiac order without natal input", () => {
    expect(selectAuraShareFocus(publicInput)).toMatchObject({
      sign: "aries",
      reason: "exact-event",
      eventBody: "Sun",
      eventDetail: "total solar",
    });
    expect(
      selectAuraShareFocus({ ...publicInput, activeEvents: [] }),
    ).toMatchObject({ sign: "cancer", reason: "moon", eventBody: null });
    expect(
      selectAuraShareFocus({
        ...publicInput,
        heldSigns: ["aries", "leo"],
        activeEvents: [],
      }),
    ).toMatchObject({ sign: "leo", reason: "sun" });
    expect(
      selectAuraShareFocus({
        ...publicInput,
        heldSigns: ["taurus", "pisces"],
        activeEvents: [],
      }),
    ).toMatchObject({ sign: "taurus", reason: "zodiac-order" });
  });

  it("breaks event ties by proximity and then zodiac order", () => {
    const result = selectAuraShareFocus({
      ...publicInput,
      heldSigns: ["aries", "cancer"],
      activeEvents: [
        {
          kind: "station",
          sign: "cancer",
          exactAt: "2026-07-16T03:05:00.000Z",
          body: "Mercury",
          eventType: "direct",
        },
        {
          kind: "eclipse",
          sign: "aries",
          exactAt: "2026-07-16T05:05:00.000Z",
          body: "Sun",
          eventType: "total solar",
        },
      ],
    });
    expect(result).toMatchObject({ sign: "aries", reason: "exact-event" });
  });

  it("accepts exact events on either inclusive 24-hour boundary", () => {
    for (const exactAt of [
      "2026-07-15T04:05:00.000Z",
      "2026-07-17T04:05:00.000Z",
    ]) {
      expect(
        selectAuraShareFocus({
          ...publicInput,
          activeEvents: [
            {
              kind: "eclipse",
              sign: "aries",
              exactAt,
              body: "Sun",
              eventType: "total solar",
            },
          ],
        }),
      ).toMatchObject({ sign: "aries", reason: "exact-event" });
    }
  });

  it("ignores exact events outside the 24-hour activity window", () => {
    expect(
      selectAuraShareFocus({
        ...publicInput,
        activeEvents: [
          {
            kind: "eclipse",
            sign: "aries",
            exactAt: "2026-07-15T04:04:59.999Z",
          },
          { kind: "station", sign: "leo", exactAt: "2026-07-17T04:05:00.001Z" },
        ],
      }),
    ).toMatchObject({ sign: "cancer", reason: "moon" });
  });

  it("returns no focal sign for an empty public record", () => {
    expect(
      selectAuraShareFocus({ ...publicInput, heldSigns: [], activeEvents: [] }),
    ).toBeNull();
    expect(() => auraShareSnapshot({ ...input, focus: null as never })).toThrow(
      /validated public Aura focus/i,
    );
  });
});

describe("Registry Aura share-card privacy surface", () => {
  it("reduces the result to one focal sign, structured sky facts, and generated copy", () => {
    expect(auraShareSnapshot(input)).toEqual({
      focal: {
        slug: "aries",
        name: "Aries",
        hue: "#DE8E79",
        glyph: "♈",
        reason: "exact-event",
      },
      checkedDate: "Jul 16, 2026 UTC",
      skyDate: "Jul 16, 2026 UTC",
      sky: { sun: "Leo", moon: "Cancer" },
      activeFact: "Total solar eclipse in Aries · Jul 16, 2026 UTC",
      chartFact: null,
      reflection: groundedAuraReflection("aries"),
      nextSky: "Next · Mercury stations retrograde · Jul 22, 2026 UTC",
      ledger: [
        "PRIVATE BIRTH CHART · READ ON A DEVICE, NEVER SHOWN",
        "ARIES FOUND AT A PUBLIC WALLET ADDRESS · CHECKED JUL 16, 2026 UTC",
        "SKY · SUN IN LEO · MOON IN CANCER · JUL 16, 2026 UTC",
        "TOTAL SOLAR ECLIPSE IN ARIES · JUL 16, 2026 UTC",
      ],
    });
  });

  it("dates an exact-event fact from the event rather than the visit date", () => {
    const focus = selectAuraShareFocus({
      ...publicInput,
      skyAt: "2026-07-16T23:30:00.000Z",
      activeEvents: [
        {
          kind: "eclipse",
          sign: "aries",
          exactAt: "2026-07-17T00:30:00.000Z",
          body: "Sun",
          eventType: "total solar",
        },
      ],
    });
    expect(auraShareSnapshot({ ...input, focus: focus! }).activeFact).toBe(
      "Total solar eclipse in Aries · Jul 17, 2026 UTC",
    );
  });

  it("names the public calendar event with its body instead of a sign-only redaction", () => {
    const snapshot = auraShareSnapshot(input);
    expect(snapshot.nextSky).toContain("Mercury stations retrograde");
    expect(snapshot.nextSky).not.toMatch(/Station in Aries/i);

    const moonNext = auraShareSnapshot({
      ...input,
      nextEvent: {
        kind: "moon-ingress",
        sign: "aries",
        at: "2026-07-21T13:34:00.000Z",
        body: "Moon",
        eventType: null,
      },
    });
    expect(moonNext.nextSky).toBe(
      "Next · Moon enters Aries · Jul 21, 2026 UTC",
    );
  });

  it("requires structured bodies for station and ingress calendar lines", () => {
    expect(() =>
      auraShareSnapshot({
        ...input,
        nextEvent: {
          kind: "station",
          sign: "aries",
          at: "2026-07-22T11:30:00.000Z",
          body: null,
          eventType: "direct",
        },
      }),
    ).toThrow(/station.+body|body.+station/i);
    expect(() =>
      auraShareSnapshot({
        ...input,
        nextEvent: {
          kind: "station",
          sign: "aries",
          at: "2026-07-22T11:30:00.000Z",
          body: "Voyager" as never,
          eventType: "direct",
        },
      }),
    ).toThrow(/body/i);
  });

  it("keeps natal data from changing the sign or default reflection", () => {
    const poisoned = {
      ...input,
      focalSign: "pisces",
      natalSigns: ["pisces"],
      chartName: "Alex private chart",
      reading: "0xsecret arbitrary reflection",
    } as AuraShareCardInput & Record<string, unknown>;
    expect(auraShareSnapshot(poisoned)).toEqual(auraShareSnapshot(input));
  });

  it("rejects a caller-modified clone of the public selector token", () => {
    const tampered = { ...input.focus, sign: "pisces" };
    expect(() =>
      auraShareSnapshot({
        ...input,
        focus: tampered as unknown as AuraShareCardInput["focus"],
      }),
    ).toThrow(/validated public Aura focus/i);
  });

  it("adds only the opt-in chart fact without changing focus or reflection", () => {
    const privateCard = auraShareSnapshot(input);
    const disclosedCard = auraShareSnapshot({
      ...input,
      includeChartFact: true,
    });
    expect(disclosedCard.focal).toEqual(privateCard.focal);
    expect(disclosedCard.reflection).toBe(privateCard.reflection);
    expect(disclosedCard.chartFact).toBe(
      "Aries also appears in the selected birth chart",
    );
    expect(disclosedCard.ledger).toEqual([
      ...privateCard.ledger,
      "ARIES ALSO APPEARS IN THE SELECTED BIRTH CHART",
    ]);
  });

  it("provides a complete, generated text equivalent of either card disclosure state", () => {
    const privateDescription = auraShareAccessibleDescription(input);
    for (const required of [
      "Registry Aura card dated Jul 16, 2026 UTC",
      "Private birth chart, public wallet address, and dated sky are read side by side",
      "Aries",
      "Found at a public wallet address, checked Jul 16, 2026 UTC",
      "Sky: Sun in Leo, Moon in Cancer",
      "Total solar eclipse in Aries · Jul 16, 2026 UTC",
      groundedAuraReflection("aries"),
      "not a wallet score or investment signal",
      "Next · Mercury stations retrograde · Jul 22, 2026 UTC",
      "Composed on this device. zodiacs.org/registry/aura",
    ]) {
      expect(privateDescription).toContain(required);
    }
    expect(privateDescription).not.toContain("selected birth chart.");

    const disclosedDescription = auraShareAccessibleDescription({
      ...input,
      includeChartFact: true,
    });
    expect(disclosedDescription).toContain(
      "Aries also appears in the selected birth chart.",
    );
    // With both optional facts the ledger reaches five rows, so the Next line
    // is deterministically omitted from the raster and its description alike.
    expect(disclosedDescription).not.toContain("Next ·");
    expect(
      disclosedDescription.replace(
        " Aries also appears in the selected birth chart.",
        "",
      ),
    ).toBe(
      privateDescription.replace(
        " Next · Mercury stations retrograde · Jul 22, 2026 UTC.",
        "",
      ),
    );

    for (const forbidden of ["0xsecret", "Alex", "15°", "T04:00"]) {
      expect(disclosedDescription).not.toContain(forbidden);
    }
  });

  it("drops the Next line rather than overlapping it when the ledger is full", () => {
    const fiveRow = auraShareSnapshot({ ...input, includeChartFact: true });
    expect(fiveRow.ledger).toHaveLength(5);
    expect(fiveRow.nextSky).toBeNull();

    const moonFocus = selectAuraShareFocus({
      ...publicInput,
      activeEvents: [],
    })!;
    const fourRow = auraShareSnapshot({
      ...input,
      focus: moonFocus,
      nextEvent: {
        kind: "moon-ingress",
        sign: moonFocus.sign,
        at: "2026-07-21T13:34:00.000Z",
        body: "Moon",
        eventType: null,
      },
      includeChartFact: true,
    });
    expect(fourRow.ledger).toHaveLength(4);
    expect(fourRow.nextSky).toBe(
      "Next · Moon enters Cancer · Jul 21, 2026 UTC",
    );
  });

  it("contains no identifier, held list/count, natal body, degree, geometry, or exact time", () => {
    const poisoned = {
      ...input,
      address: "0xsecret",
      chartName: "Alex",
      heldCount: 3,
      heldList: "Aries, Cancer, Leo",
      natalBody: "Venus",
      degree: 15,
      geometry: "<svg>private</svg>",
    } as AuraShareCardInput & Record<string, unknown>;
    const serialized = JSON.stringify(auraShareSnapshot(poisoned));
    for (const forbidden of [
      "0xsecret",
      "Alex",
      "Venus",
      "15°",
      "<svg>",
      "T04:00",
      "Cancer, Leo",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("cannot paint a second held sign through the next-sky line", () => {
    expect(() =>
      auraShareSnapshot({
        ...input,
        nextEvent: {
          kind: "station",
          sign: "scorpio",
          at: "2026-07-22T11:30:00.000Z",
          body: "Mercury",
          eventType: "direct",
        },
      }),
    ).toThrow(/must match the public focal sign/i);
  });

  it("uses dated facts without today or now language for every possible focus", () => {
    for (const sign of AURA_SIGN_ORDER) {
      const snapshot = auraShareSnapshot({
        ...input,
        nextEvent: null,
        currentSky: { sun: sign, moon: sign },
        focus: selectAuraShareFocus({
          ...publicInput,
          heldSigns: [sign],
          currentSky: { sun: sign, moon: sign },
          activeEvents: [],
        })!,
      });
      expect(JSON.stringify(snapshot)).not.toMatch(/\b(?:today|now)\b/i);
    }
  });

  it("paints generated strings only, meaning first and mechanism last", async () => {
    const { painted, bitmapClose } = installCanvas();
    await drawAuraShareCard({
      ...input,
      address: "0xsecret",
      chartName: "Alex",
      reading: "arbitrary copy",
    } as AuraShareCardInput & Record<string, unknown>);
    const text = painted.map((entry) => entry.text).join("\n");
    for (const required of [
      "REGISTRY AURA",
      "Aries",
      "PRIVATE BIRTH CHART · READ ON A DEVICE, NEVER SHOWN",
      "ARIES FOUND AT A PUBLIC WALLET ADDRESS · CHECKED JUL 16, 2026 UTC",
      "SKY · SUN IN LEO · MOON IN CANCER · JUL 16, 2026 UTC",
      "A symbolic reading — not a wallet score or investment signal.",
      "COMPOSED ON THIS DEVICE",
      "ZODIACS.ORG/REGISTRY/AURA",
    ]) {
      expect(text).toContain(required);
    }
    const name = painted.find((candidate) => candidate.text === "Aries");
    expect(name?.font).toMatch(/\b(?:1[0-9]\d|[2-9]\d\d)px\b/);
    const reflectionEntry = painted.find((candidate) =>
      groundedAuraReflection("aries").startsWith(candidate.text.slice(0, 24)),
    );
    expect(reflectionEntry?.font).toMatch(/\b(?:4[6-9]|[5-9]\d|\d{3,})px\b/);
    for (const forbidden of [
      "0xsecret",
      "Alex",
      "arbitrary copy",
      "T04:",
      "15°",
    ]) {
      expect(text).not.toContain(forbidden);
    }
    expect(bitmapClose).toHaveBeenCalledTimes(1);
  });

  it("fills every wrapped reflection line instead of stranding a lone word", async () => {
    // Narrow metrics force the reflection onto exactly three full lines; the
    // whole sentence must survive, with no ellipsis and no one-word line.
    const wrapping = installCanvas(30);
    await drawAuraShareCard(input);
    const reflectionLines = wrapping.painted
      .filter((entry) => entry.font.includes("48px"))
      .map((entry) => entry.text);
    expect(reflectionLines.length).toBeGreaterThan(1);
    expect(reflectionLines.join(" ")).toBe(groundedAuraReflection("aries"));

    // Metrics too narrow for the budget: truncation may occur, but the last
    // painted line must still be filled to width, never a single word.
    const overflowing = installCanvas(45);
    await drawAuraShareCard(input);
    const overflowLines = overflowing.painted
      .filter((entry) => entry.font.includes("48px"))
      .map((entry) => entry.text);
    expect(overflowLines).toHaveLength(3);
    expect(overflowLines.at(-1)).toMatch(/…$/);
    expect(overflowLines.at(-1)?.trim().split(/\s+/).length).toBeGreaterThan(1);
  });

  it("paints identical default text when callers append different natal data", async () => {
    const first = installCanvas();
    await drawAuraShareCard(input);
    const defaultText = first.painted.map((entry) => entry.text);

    const second = installCanvas();
    await drawAuraShareCard({
      ...input,
      natalSigns: ["pisces"],
      chartName: "private chart identity",
      natalBodies: ["Sun", "Moon"],
    } as AuraShareCardInput & Record<string, unknown>);
    expect(second.painted.map((entry) => entry.text)).toEqual(defaultText);
  });

  it("shares a constant-name PNG without caption, title, URL, or query string", async () => {
    const { share } = installCanvas();
    const blob = await drawAuraShareCard(input);
    await expect(shareAuraCardBlob(blob)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0][0] as ShareData;
    expect(Object.keys(payload)).toEqual(["files"]);
    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0].name).toBe(AURA_SHARE_FILENAME);
    expect(payload).not.toHaveProperty("text");
    expect(payload).not.toHaveProperty("title");
    expect(payload).not.toHaveProperty("url");
  });

  it("keeps an unsupported share action separate from the always-available download path", async () => {
    const { share } = installCanvas();
    vi.stubGlobal("navigator", { canShare: vi.fn(() => false), share });
    const blob = new Blob(["png"], { type: "image/png" });
    expect(canShareAuraCardBlob(blob)).toBe(false);
    await expect(shareAuraCardBlob(blob)).resolves.toBe("unavailable");
    expect(share).not.toHaveBeenCalled();
  });

  it("reports a refused share sheet without mutating or downloading the preview", async () => {
    const { share } = installCanvas();
    share.mockRejectedValueOnce(new Error("share unavailable"));
    await expect(
      shareAuraCardBlob(new Blob(["png"], { type: "image/png" })),
    ).resolves.toBe("unavailable");
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid runtime enum and date inputs", () => {
    expect(() =>
      selectAuraShareFocus({
        ...publicInput,
        heldSigns: ["ophiuchus" as "aries"],
      }),
    ).toThrow(/canonical zodiac/i);
    expect(() =>
      auraShareSnapshot({ ...input, checkedAt: "not-a-date" }),
    ).toThrow(/ISO date/i);
    expect(() =>
      auraShareSnapshot({ ...input, checkedAt: "Jul 16, 2026" }),
    ).toThrow(/ISO date/i);
    expect(() =>
      auraShareSnapshot({
        ...input,
        currentSky: { sun: "ophiuchus" as "aries", moon: "cancer" },
      }),
    ).toThrow(/canonical zodiac/i);
    expect(() =>
      selectAuraShareFocus({ ...publicInput, skyAt: "July 16, 2026" }),
    ).toThrow(/ISO date/i);
    expect(() =>
      selectAuraShareFocus({
        ...publicInput,
        activeEvents: [
          {
            kind: "conjunction" as "eclipse",
            sign: "aries",
            exactAt: publicInput.skyAt,
          },
        ],
      }),
    ).toThrow(/event kind/i);
    expect(() =>
      selectAuraShareFocus({
        ...publicInput,
        activeEvents: [
          {
            kind: "eclipse",
            sign: "aries",
            exactAt: publicInput.skyAt,
            body: "Comet" as never,
          },
        ],
      }),
    ).toThrow(/body/i);
    expect(() =>
      auraShareSnapshot({
        ...input,
        focus: {
          ...input.focus,
          reason: "moon",
          eventKind: "eclipse",
        } as AuraShareCardInput["focus"],
      }),
    ).toThrow(/validated public Aura focus/i);
  });
});
