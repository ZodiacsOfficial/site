import { useEffect, useRef } from "preact/hooks";
import type { SavedChart } from "../../lib/profile/schema";
import { trackAnalytics } from "../../lib/analytics";
import {
  AURA_SIGN_ORDER,
  type AuraCabinetHolding,
  type AuraComposition,
  type AuraSign,
} from "../../lib/aura/types";
import type { WalletChain } from "../../lib/wallet/types";
import { auraDateStamp, auraDateTime } from "../../lib/aura/copy";
import {
  EDITION_META,
  exactGoldCount,
  normalizedGoldCount,
} from "./AuraCollectionCabinet";
import { cabinetEditionForHolding } from "../../lib/aura/cabinet-finish";
import { AuraSharePreview } from "./AuraSharePreview";
import { AuraTalisman } from "./AuraTalisman";
import { ZodiacMedallion } from "./ZodiacMedallion";
import { signBySlug } from "../../lib/signs";
import "./AuraResultGallery.css";

export type AuraAddressMode = "pasted" | "connected" | "restored" | "example";
export type AuraShareState =
  | "idle"
  | "busy"
  | "shared"
  | "downloaded"
  | "unavailable"
  | "error";

export interface AuraResultProps {
  composition: AuraComposition;
  holdings: readonly AuraCabinetHolding[];
  chart: SavedChart | null;
  chain: WalletChain;
  checkedAt: string;
  addressMode: AuraAddressMode;
  selectedSign: AuraSign;
  refreshing: boolean;
  shareState: AuraShareState;
  sharePreviewUrl: string | null;
  shareSupported: boolean;
  shareAccessibleDescription: string;
  profileReady: boolean;
  availableCharts: SavedChart[];
  selectedChartId: string;
  onRefresh(): void;
  onClear(): void;
  onOpenCollection?(): void;
  onShowExample(origin?: HTMLElement | null): void | Promise<void>;
  onSelectChart(id: string): void;
  onCreateSharePreview(): void;
  onSharePreview(): void;
  onDownloadPreview(): void;
  onCloseSharePreview(): void;
}

export function AuraResult({
  composition,
  holdings,
  chart,
  chain,
  checkedAt,
  addressMode,
  selectedSign,
  refreshing,
  shareState,
  sharePreviewUrl,
  shareSupported,
  shareAccessibleDescription,
  profileReady,
  availableCharts,
  selectedChartId,
  onRefresh,
  onClear,
  onOpenCollection,
  onShowExample,
  onSelectChart,
  onCreateSharePreview,
  onSharePreview,
  onDownloadPreview,
  onCloseSharePreview,
}: AuraResultProps) {
  const shareCreateButtonRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sharePreviewUrl) return;
    closingRef.current?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [sharePreviewUrl]);
  const illustrative = addressMode === "example";
  const noHoldings = composition.heldSigns.length === 0;
  const skyDate = auraDateStamp(composition.currentSky.observedAt);
  const checkedDate = auraDateStamp(checkedAt);
  const holdingBySign = new Map(holdings.map((holding) => [holding.sign, holding]));
  const ledgerRows = AURA_SIGN_ORDER.flatMap((sign) => {
    const holding = holdingBySign.get(sign);
    return holding ? [{ sign, holding }] : [];
  });
  const reservedCount = AURA_SIGN_ORDER.length - ledgerRows.length;
  const chainName = chain === "solana" ? "Solana" : "Base";

  if (noHoldings && !illustrative) {
    return (
      <section class="aura-result aura-result--gallery" aria-label="Opened collection">
        <div class="aura-result__empty-recovery">
          <h3>The case is open. Its places are reserved.</h3>
          <p>
            No Registry-listed Zodiacs were found at this address. The Twelve
            wait in canonical order.
          </p>
          <div>
            <button class="btn btn--primary" type="button" onClick={onClear}>
              Try another address
            </button>
            <button
              class="btn btn--ghost"
              type="button"
              onClick={(event) => void onShowExample(event.currentTarget)}
            >
              View the sample
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section class="aura-result aura-result--gallery" aria-label="Opened collection">
      <div class="aura-result__room aura-result__room--talisman" id="aura-talisman-room">
        <AuraTalisman
          composition={composition}
          holdings={holdings}
          includeChart={Boolean(chart)}
          selectedSign={selectedSign}
          heading={illustrative
            ? "The sample’s dated seal."
            : "The collection’s dated seal."}
        />
        {!illustrative && (
          <div class="aura-result__seal-actions">
            <button
              class="btn btn--ghost"
              type="button"
              onClick={onCreateSharePreview}
              disabled={shareState === "busy"}
            >
              {shareState === "busy" ? "Creating preview…" : "Share the dated seal"}
            </button>
          </div>
        )}
        <section class="aura-result__personalize" aria-labelledby="aura-personalize-title">
          <div>
            <p class="aura-result__kicker">Chart echo · optional</p>
            <h3 id="aura-personalize-title">Add your chart’s echo.</h3>
            <p>
              Faint inner marks from a chart saved on this device. They never
              change the public collection, and they stay out of the saved seal.
            </p>
          </div>

          {illustrative ? (
            <p class="aura-result__personalize-note">
              The sample includes a pre-made chart echo.
            </p>
          ) : !profileReady ? (
            <p class="aura-result__personalize-note" role="status">
              Checking for saved charts on this device…
            </p>
          ) : availableCharts.length > 0 ? (
            <div class="aura-result__chart-control">
              <label for="aura-result-chart">Saved chart</label>
              <select
                id="aura-result-chart"
                value={selectedChartId}
                onChange={(event) => onSelectChart(event.currentTarget.value)}
              >
                <option value="">No chart — collection and sky only</option>
                {availableCharts.map((savedChart) => (
                  <option key={savedChart.id} value={savedChart.id}>
                    {savedChart.name}
                  </option>
                ))}
              </select>
              <small>
                {chart
                  ? `${chart.name} adds the inner echo marks.`
                  : "Collection and sky only."}
              </small>
            </div>
          ) : (
            <div class="aura-result__personalize-empty">
              <p>No saved chart is available on this device yet.</p>
              <a
                class="btn btn--ghost"
                href="/birth-chart/?return=registry-aura"
                onClick={() => trackAnalytics("aura_calculator")}
              >
                Create a birth chart
              </a>
            </div>
          )}
        </section>
      </div>

      <section
        class="aura-result__room aura-result__room--provenance"
        id="aura-records-room"
        aria-labelledby="aura-ledger-title"
      >
        <header>
          <p class="aura-result__kicker">Provenance</p>
          <h3 id="aura-ledger-title">The collection’s record.</h3>
          <p>What was verified, where, and when.</p>
        </header>

        <dl class="aura-ledger__meta">
          <div>
            <dt>Public collection</dt>
            <dd>
              {illustrative
                ? "Curator’s sample — no address was looked up"
                : `${chainName} · checked ${checkedDate}`}
            </dd>
          </div>
          <div>
            <dt>Dated sky</dt>
            <dd>{skyDate} · computed on this device</dd>
          </div>
          {!illustrative && (
            <div class="aura-ledger__refresh">
              <dt>Lookup</dt>
              <dd>
                <button type="button" onClick={onRefresh} disabled={refreshing}>
                  {refreshing ? "Re-checking…" : "Re-check collection"}
                </button>
              </dd>
            </div>
          )}
        </dl>

        <ol class="aura-ledger" aria-label="Record of represented signs">
          {ledgerRows.map(({ sign, holding }) => {
            const record = signBySlug(sign);
            const meta = EDITION_META[cabinetEditionForHolding(holding)];
            const goldCount = holding.finish === "gold"
              ? normalizedGoldCount(holding.goldCount)
              : null;
            return (
              <li key={sign} data-aura-ledger-sign={sign}>
                <ZodiacMedallion sign={sign} className="aura-ledger__disc" />
                <div class="aura-ledger__identity">
                  <strong>{record.name}</strong>
                  <span>{meta.numeral} · {meta.name}</span>
                </div>
                <div class="aura-ledger__facts">
                  <span>{meta.range}</span>
                  {goldCount && goldCount > 1n && (
                    <span>
                      ×{exactGoldCount(goldCount.toString())} sculptures
                    </span>
                  )}
                </div>
                <a class="aura-ledger__record" href={`/registry/${sign}/`}>
                  Registry record <span aria-hidden="true">→</span>
                </a>
              </li>
            );
          })}
        </ol>
        {reservedCount > 0 && (
          <p class="aura-ledger__reserved">
            {reservedCount === 1
              ? "One place remains reserved."
              : `${reservedCount} places remain reserved.`}
          </p>
        )}

        <details class="aura-result__method">
          <summary>Method</summary>
          <div>
            <p>{composition.methodNote}</p>
            <p>
              {illustrative
                ? "Prepared in advance — nothing was checked against a live address."
                : `Collection checked ${auraDateTime(checkedAt)}.`}
            </p>
            {composition.uncertainties.length > 0 && (
              <ul>
                {composition.uncertainties.map((item) => (
                  <li key={`${item.code}-${item.value ?? ""}`}>{item.message}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </section>

      <section
        ref={closingRef}
        class="aura-result__closing"
        data-aura-share-disclosure={illustrative ? undefined : "true"}
        aria-labelledby="aura-closing-title"
      >
        <div>
          <p class="aura-result__kicker">Continue through Astrofolio</p>
          <h3 id="aura-closing-title">
            {illustrative ? "Open your own cabinet." : "Keep this edition."}
          </h3>
          {!illustrative && (
            <p class="aura-result__closing-note">
              The seal carries the represented signs, their editions, and
              today’s sky — never the address.
            </p>
          )}
        </div>
        <div class="aura-result__actions">
          {illustrative ? (
            <button
              class="btn btn--primary"
              type="button"
              onClick={onOpenCollection ?? onClear}
            >
              Open my collection
            </button>
          ) : (
            <>
              <button
                ref={shareCreateButtonRef}
                class="btn btn--primary"
                type="button"
                onClick={onCreateSharePreview}
                disabled={shareState === "busy"}
              >
                {shareState === "busy"
                  ? "Creating preview…"
                  : sharePreviewUrl
                    ? "Rebuild the seal"
                    : "Share the dated seal"}
              </button>
              <button class="btn btn--ghost" type="button" onClick={onClear}>
                Open another collection
              </button>
            </>
          )}
          <a class="btn btn--ghost" href="/astrofolio/">Browse Astrofolio</a>
        </div>
        {sharePreviewUrl && !illustrative && (
          <AuraSharePreview
            previewUrl={sharePreviewUrl}
            shareSupported={shareSupported}
            accessibleDescription={shareAccessibleDescription}
            busy={shareState === "busy"}
            returnFocusRef={shareCreateButtonRef}
            onShare={onSharePreview}
            onDownload={onDownloadPreview}
            onClose={onCloseSharePreview}
          />
        )}
        {!illustrative && (
          <p class="aura-result__share-status" role="status">
            {shareState === "busy" && "Preparing the preview…"}
            {shareState === "shared" && "Seal opened in your share sheet."}
            {shareState === "downloaded" && "Seal PNG downloaded."}
            {shareState === "unavailable" &&
              "Sharing is unavailable in this browser. Download the PNG instead."}
            {shareState === "error" &&
              "The seal image could not be made on this device."}
          </p>
        )}
      </section>
    </section>
  );
}
