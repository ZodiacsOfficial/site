import { h } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it, vi } from "vitest";
import { composeAura } from "../../lib/aura/compose";
import {
  AURA_EXAMPLE_CHART,
  AURA_EXAMPLE_HELD_SIGNS,
  AURA_EXAMPLE_HOLDINGS,
} from "../../lib/aura/example";
import type { AuraCabinetHolding, AuraSign } from "../../lib/aura/types";
import { AuraResult } from "./AuraResult";

const observedAt = "2026-07-18T12:00:00.000Z";

function renderResult(
  heldSigns: readonly string[] = AURA_EXAMPLE_HELD_SIGNS,
  mode: "pasted" | "example" = "pasted",
) {
  const chart = mode === "example" ? AURA_EXAMPLE_CHART : null;
  const composition = composeAura({
    heldSigns,
    chart,
    visitedAt: new Date(observedAt),
    illustrative: mode === "example",
  });
  const holdings: AuraCabinetHolding[] = mode === "example"
    ? AURA_EXAMPLE_HOLDINGS
    : composition.heldSigns.map((sign) => ({ sign, finish: "pastel" }));

  return render(h(AuraResult, {
    composition,
    holdings,
    chart,
    chain: "solana",
    checkedAt: observedAt,
    addressMode: mode,
    selectedSign: (composition.heldSigns[0] ?? "aries") as AuraSign,
    refreshing: false,
    shareState: "idle",
    sharePreviewUrl: null,
    shareSupported: false,
    shareAccessibleDescription: "",
    profileReady: true,
    availableCharts: [AURA_EXAMPLE_CHART],
    selectedChartId: "",
    onRefresh: vi.fn(),
    onClear: vi.fn(),
    onOpenCollection: vi.fn(),
    onShowExample: vi.fn(),
    onSelectChart: vi.fn(),
    onCreateSharePreview: vi.fn(),
    onSharePreview: vi.fn(),
    onDownloadPreview: vi.fn(),
    onCloseSharePreview: vi.fn(),
  }));
}

describe("AuraResult rooms", () => {
  it("orders the Seal, the accession ledger, and the closing as one journey", () => {
    const markup = renderResult();
    const seal = markup.indexOf("dated seal.");
    const ledger = markup.indexOf("The collection’s record.");
    const closing = markup.indexOf("Keep this edition.");

    expect(seal).toBeGreaterThan(-1);
    expect(ledger).toBeGreaterThan(seal);
    expect(closing).toBeGreaterThan(ledger);
    // The cabinet lives on the stage above; the rooms never repeat it.
    expect(markup).not.toContain("data-aura-cabinet-sign=");
    expect(markup).not.toContain("Registry Aura rooms");
    expect(markup).toContain("data-aura-talisman");
    expect(markup).toContain("Add your chart’s echo.");
    expect(markup.match(/data-aura-ledger-sign=/g)).toHaveLength(4);
    expect(markup).toContain("Under 10,000 held");
    expect(markup).toContain("Registry record");
    expect(markup).toContain("8 places remain reserved.");
    expect(markup).toContain("Share this collection");
    expect(markup).toContain("Open another collection");
    expect(markup).toContain("Browse the Registry");
    expect(markup).toContain("never the address");
    expect(markup).toContain(`Collection checked`);
    expect(markup).not.toContain("The clearest connections");
    expect(markup).not.toContain("A thought to take with you");
    expect(markup).not.toContain("Share this pattern");
  });

  it("keeps an empty public collection on recovery actions without rooms", () => {
    const markup = renderResult([]);

    expect(markup).toContain("The case is open. Its places are reserved.");
    expect(markup).toContain("No Registry-listed Zodiacs were found at this address.");
    expect(markup).toContain("Try another address");
    expect(markup).toContain("View the sample");
    expect(markup).not.toContain("data-aura-talisman");
    expect(markup).not.toContain("Share this collection");
    expect(markup).not.toContain("The collection’s record.");
  });

  it("labels the finished sample clearly and never offers to export it as the visitor's object", () => {
    const markup = renderResult(AURA_EXAMPLE_HELD_SIGNS, "example");

    expect(markup).toContain("The sample’s dated seal.");
    expect(markup).toContain("The sample includes a pre-made chart echo.");
    expect(markup).toContain("data-aura-talisman-chart-echo=");
    expect(markup).toContain("Curator’s sample — no address was looked up");
    expect(markup).toContain("Prepared in advance");
    expect(markup).not.toContain("Collection checked");
    expect(markup).not.toMatch(/illustrative/i);
    expect(markup).toContain("Open my collection");
    expect(markup).toContain("Browse the Registry");
    expect(markup).not.toContain("Share this collection");
  });
});
