import { useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";
import { signBySlug } from "../../lib/signs";
import type { SavedChart } from "../../lib/profile/schema";
import type {
  AuraActiveEvidence,
  AuraComposition,
  AuraNextActivation,
  AuraSign,
  AuraSignContext,
} from "../../lib/aura/types";
import type { WalletChain } from "../../lib/wallet/types";
import {
  auraCalendarLine,
  auraDateStamp,
  auraDateTime,
  auraFocalReason,
  auraRecordSubject,
  auraRelativeDayNote,
} from "../../lib/aura/copy";
import { AlignmentGrid } from "./AlignmentGrid";
import { AuraSharePreview } from "./AuraSharePreview";

export type AuraAddressMode = "pasted" | "connected" | "restored" | "example";
export type AuraShareState =
  "idle" | "busy" | "shared" | "downloaded" | "unavailable" | "error";

export interface AuraResultProps {
  composition: AuraComposition;
  chart: SavedChart;
  chain: WalletChain;
  checkedAt: string;
  addressMode: AuraAddressMode;
  headingRef: RefObject<HTMLHeadingElement>;
  refreshing: boolean;
  shareState: AuraShareState;
  shareReady: boolean;
  sharePreviewUrl: string | null;
  shareSupported: boolean;
  shareAccessibleDescription: string;
  shareFocusSign: AuraSign | null;
  shareChartFactEligible: boolean;
  shareChartFact: boolean;
  onRefresh(): void;
  onClear(): void;
  onShowExample(origin?: HTMLElement | null): void | Promise<void>;
  onCreateSharePreview(): void;
  onRetryShareSetup(): void;
  onSharePreview(): void;
  onDownloadPreview(): void;
  onCloseSharePreview(): void;
  onShareChartFactChange(checked: boolean): void;
  onResponse(value: "meaningful" | "not-yet"): void;
}

function nextActivation(
  composition: AuraComposition,
): AuraNextActivation | null {
  return (
    composition.signs
      .flatMap((context) =>
        context.nextActivation ? [context.nextActivation] : [],
      )
      .sort((a, b) => a.beginsAt.localeCompare(b.beginsAt))[0] ?? null
  );
}

function skyEvidenceText(evidence: AuraActiveEvidence): string {
  if (evidence.source === "sky") {
    return `${evidence.body} in ${signBySlug(evidence.sign).name} · sky of ${auraDateStamp(evidence.observedAt)}`;
  }
  return `${evidence.label} · exact ${auraDateTime(evidence.exactAt)} · inside the ±24-hour sky-event window`;
}

interface EvidencePlateProps {
  context: AuraSignContext;
  checkedAt: string;
  skyAt: string;
  mode: AuraAddressMode;
}

function EvidencePlate({
  context,
  checkedAt,
  skyAt,
  mode,
}: EvidencePlateProps) {
  const sign = signBySlug(context.sign);
  const skyDate = auraDateStamp(skyAt);
  return (
    <details class="aura-plate" style={{ "--aura-sign": sign.hue }}>
      <summary>
        <img
          src={`/assets/zodiac-icons/48/${sign.slug}.webp`}
          width="44"
          height="44"
          alt=""
        />
        <span class="aura-plate__title">
          <strong>{sign.name}</strong>
          <small>Open evidence</small>
        </span>
        <span
          class="aura-plate__signals"
          role="group"
          aria-label={`${sign.name} facts`}
        >
          <span>
            {mode === "example"
              ? "Included in the example record"
              : "Found at this address"}
          </span>
          {context.natalEcho.length > 0 && (
            <span>In the selected birth chart</span>
          )}
          {context.activeNow.length > 0 && <span>In the sky of {skyDate}</span>}
        </span>
      </summary>
      <div class="aura-plate__body">
        <section class="aura-register">
          <h4>Record</h4>
          <p>
            {auraRecordSubject(mode)} {sign.name}.
            {mode === "example"
              ? " No real address was looked up."
              : ` Checked ${auraDateTime(checkedAt)}.`}
          </p>
        </section>
        {context.natalEcho.length > 0 && (
          <section class="aura-register">
            <h4>Chart</h4>
            <ul>
              {context.natalEcho.map((evidence) => (
                <li key={evidence.id}>{evidence.label}</li>
              ))}
            </ul>
          </section>
        )}
        {context.activeNow.length > 0 && (
          <section class="aura-register">
            <h4>Sky</h4>
            <ul>
              {context.activeNow.map((evidence) => (
                <li key={evidence.id}>{skyEvidenceText(evidence)}</li>
              ))}
            </ul>
          </section>
        )}
        <section class="aura-register aura-register--reading">
          <h4>Reading</h4>
          <p>{context.reading.text}</p>
        </section>
        {context.uncertainties.length > 0 && (
          <section class="aura-register aura-register--uncertainty">
            <h4>Limits</h4>
            <ul>
              {context.uncertainties.map((item) => (
                <li key={`${item.code}-${item.value ?? ""}`}>{item.message}</li>
              ))}
            </ul>
          </section>
        )}
        <a class="aura-plate__record-link" href={`/registry/${sign.slug}/`}>
          View the Registry record →
        </a>
      </div>
    </details>
  );
}

export function AuraResult({
  composition,
  chart,
  chain,
  checkedAt,
  addressMode,
  headingRef,
  refreshing,
  shareState,
  shareReady,
  sharePreviewUrl,
  shareSupported,
  shareAccessibleDescription,
  shareFocusSign,
  shareChartFactEligible,
  shareChartFact,
  onRefresh,
  onClear,
  onShowExample,
  onCreateSharePreview,
  onRetryShareSetup,
  onSharePreview,
  onDownloadPreview,
  onCloseSharePreview,
  onShareChartFactChange,
  onResponse,
}: AuraResultProps) {
  const [response, setResponse] = useState<"meaningful" | "not-yet" | null>(
    null,
  );
  const shareCreateButtonRef = useRef<HTMLButtonElement>(null);
  const focalContext = composition.focal
    ? (composition.signs.find(
        (context) => context.sign === composition.focal?.sign,
      ) ?? null)
    : null;
  const focalSign = focalContext ? signBySlug(focalContext.sign) : null;
  const next = nextActivation(composition);
  const noHoldings = composition.heldSigns.length === 0;
  const illustrative = addressMode === "example";
  const skyAt = composition.currentSky.observedAt;
  const skyDate = auraDateStamp(skyAt);
  const checkedDate = auraDateStamp(checkedAt);
  const checkedNote = illustrative ? null : auraRelativeDayNote(checkedAt, skyAt);

  const answer = (value: "meaningful" | "not-yet") => {
    if (response) return;
    setResponse(value);
    onResponse(value);
  };

  return (
    <section class="aura-result" aria-labelledby="aura-result-title">
      <div class="aura-result__sources">
        <header>
          <p class="aura-result__kicker">Chart · Record · Sky</p>
          <h2 id="aura-result-title" ref={headingRef} tabIndex={-1}>
            {illustrative
              ? "The example, read side by side"
              : "Three sources, read side by side"}
          </h2>
        </header>
        <div class="aura-source-docket">
          <section
            class="aura-source aura-source--chart"
            data-aura-source="chart"
          >
            <span class="aura-source__stamp">
              {illustrative ? "Sample" : "Local"}
            </span>
            <h3>{illustrative ? "Example chart" : "Selected birth chart"}</h3>
            <p>
              {illustrative
                ? "A sample chart, made in advance"
                : "Read on this device; never sent"}
            </p>
            <small>
              {illustrative
                ? "None of your saved charts were touched"
                : chart.birth.timeKnown
                  ? "Recorded birth time"
                  : "Unknown time · sign-level estimates only"}
            </small>
          </section>
          <section
            class="aura-source aura-source--record"
            data-aura-source="record"
          >
            <span class="aura-source__stamp">
              {illustrative
                ? "Sample record"
                : `Checked ${checkedDate}${checkedNote ? ` · ${checkedNote}` : ""}`}
            </span>
            <h3>Public wallet address</h3>
            <p>
              {composition.heldSigns.length}{" "}
              {illustrative ? "sample" : "official"}{" "}
              {composition.heldSigns.length === 1 ? "Zodiac" : "Zodiacs"}
              {illustrative ? " shown" : " found"}
            </p>
            <small>
              {illustrative
                ? "No real address was looked up"
                : `${chain === "solana" ? "Solana" : "Base"} public record${checkedNote ? " · Re-check to update" : ""}`}
            </small>
          </section>
          <section class="aura-source aura-source--sky" data-aura-source="sky">
            <span class="aura-source__stamp">{skyDate}</span>
            <h3>The sky</h3>
            <p>
              Sun in {signBySlug(composition.currentSky.sun.sign).name} · Moon
              in {signBySlug(composition.currentSky.moon.sign).name}
            </p>
            <small>Computed for this visit</small>
          </section>
        </div>
        <p class="aura-source-docket__join">
          These sources are read side by side. The wallet record never changes
          the birth chart; it only determines which held signs receive a
          reading.
        </p>
      </div>

      <div class="aura-result__composition">
        <AlignmentGrid
          chart={chart}
          composition={composition}
          checkedAt={checkedAt}
          illustrative={illustrative}
        />
      </div>

      <section
        class="aura-result__fact"
        data-aura-fact="true"
        aria-labelledby="aura-fact-title"
      >
        <p class="aura-result__kicker">Where they meet</p>
        <h3 id="aura-fact-title">{composition.auraSentence}</h3>
        {focalSign && (
          <p>
            For this reading, that {focalSign.name}{" "}
            {illustrative
              ? "included in this example"
              : "found at this address"}{" "}
            becomes a talisman for this visit — a symbolic focus, not a score
            or an ownership claim.
          </p>
        )}
        {noHoldings && !illustrative && (
          <div class="aura-result__empty-recovery">
            <h4>The lookup found no Registry-listed Zodiac</h4>
            <p>
              This does not mean the address is empty; Aura checks only the
              Zodiac mints and contracts listed by this Registry. You do not
              need to buy one. Check that this is the intended public address
              and network, re-check the record, try another address, or use the
              example to see how Aura works.
            </p>
            <div>
              <button class="btn btn--ghost" type="button" onClick={onClear}>
                Try another address
              </button>
              <button
                class="btn btn--ghost"
                type="button"
                onClick={(event) => void onShowExample(event.currentTarget)}
              >
                See the example
              </button>
            </div>
          </div>
        )}
      </section>

      <section
        class="aura-result__reading"
        data-aura-reading="true"
        aria-labelledby="aura-reading-title"
      >
        <header>
          <p class="aura-result__kicker">Symbolic reading</p>
          <div class="aura-result__reading-head">
            {focalSign && (
              <img
                class="aura-result__disc"
                src={`/assets/zodiac-icons/128/${focalSign.slug}.webp`}
                width="96"
                height="96"
                alt=""
              />
            )}
            <h3 id="aura-reading-title">
              {focalSign ? focalSign.name : "The chart stands on its own"}
            </h3>
          </div>
        </header>
        <p class="aura-result__reflection">
          {focalContext?.reading.lead ??
            "No official Zodiac was found at this address. The chart remains its own record without a carried sign; no absence is assigned meaning."}
        </p>
        {focalContext && (
          <p class="aura-result__reading-detail">
            {focalContext.reading.detail}
          </p>
        )}
        <div class="aura-result__timing">
          <section>
            <h4>Why this sign</h4>
            <p>{auraFocalReason(focalContext, skyAt, illustrative)}</p>
          </section>
          <section>
            <h4>Next on the calendar</h4>
            <p>{auraCalendarLine(next)}</p>
          </section>
        </div>
      </section>

      <section
        class="aura-evidence"
        data-aura-evidence="true"
        aria-labelledby="aura-evidence-title"
      >
        <header>
          <p class="kicker">Chart · Record · Sky · Reading</p>
          <h3 id="aura-evidence-title">The evidence, sign by sign</h3>
          <p>
            Each source keeps its own label. Open a sign when you want the
            receipts.
          </p>
        </header>
        {composition.signs.map((context) => (
          <EvidencePlate
            key={context.sign}
            context={context}
            checkedAt={checkedAt}
            skyAt={skyAt}
            mode={addressMode}
          />
        ))}
        {noHoldings && (
          <details class="aura-plate">
            <summary>
              <span class="aura-plate__title">
                <strong>Public record</strong>
                <small>Open evidence</small>
              </span>
              <span class="aura-plate__signals">
                <span>Record</span>
              </span>
            </summary>
            <div class="aura-plate__body">
              <section class="aura-register">
                <h4>Record</h4>
                <p>
                  No official Zodiac was found at this address at{" "}
                  {auraDateTime(checkedAt)}.
                </p>
              </section>
              <section class="aura-register aura-register--reading">
                <h4>Reading</h4>
                <p>
                  The chart stands on its own; no absence is assigned meaning.
                </p>
              </section>
            </div>
          </details>
        )}
      </section>

      {!noHoldings && !illustrative && (
        <section
          class="aura-result__share"
          data-aura-share-disclosure="true"
          aria-labelledby="aura-share-title"
        >
          <div>
            <h3 id="aura-share-title">Make a social card</h3>
            {shareFocusSign && (
              <p>
                The card features {signBySlug(shareFocusSign).name}, chosen
                from the public record and dated sky — never from the chart.
              </p>
            )}
            <p>
              The card shows one held sign, dated public-record and sky facts,
              and a symbolic reflection. It never shows birth details or the
              address.
            </p>
            <p class="aura-result__share-warning">
              Once shared, other people and apps may save or repost the image.
              Clearing Aura cannot remove those copies. If you add the optional
              chart fact below, that disclosure becomes public too.
            </p>
          </div>
          {shareChartFactEligible && (
            <label class="aura-share-chart-fact">
              <input
                type="checkbox"
                checked={shareChartFact}
                onChange={(event) =>
                  onShareChartFactChange(event.currentTarget.checked)
                }
              />
              <span>
                <strong>Add “In the selected birth chart”</strong>
                <small>
                  This publicly reveals that this sign appears somewhere in the
                  selected birth chart. Sharing several chart matches can reveal
                  more of the chart.
                </small>
              </span>
            </label>
          )}
          <button
            ref={shareCreateButtonRef}
            class="btn btn--primary"
            type="button"
            onClick={
              !shareReady && shareState === "error"
                ? onRetryShareSetup
                : onCreateSharePreview
            }
            disabled={
              shareState === "busy" ||
              (!shareReady && shareState !== "error")
            }
          >
            {!shareReady
              ? shareState === "error"
                ? "Retry card setup"
                : "Preparing card…"
              : shareState === "busy"
                ? "Creating preview…"
                : sharePreviewUrl
                  ? "Recreate card preview"
                  : "Create card preview"}
          </button>
          {sharePreviewUrl && (
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
          <p class="aura-result__share-status" role="status">
            {shareState === "busy" &&
              (sharePreviewUrl
                ? "Working with the reviewed card…"
                : "Creating the card preview…")}
            {shareState === "shared" && "Aura card opened in your share sheet."}
            {shareState === "downloaded" && "Aura card downloaded."}
            {shareState === "unavailable" &&
              "Sharing is not available in this browser. You can download the reviewed PNG instead."}
            {shareState === "error" &&
              "The card could not be made on this device."}
          </p>
        </section>
      )}

      <div class="aura-result__actions">
        {addressMode !== "example" && (
          <button
            class="btn btn--ghost"
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Re-checking…" : "Re-check the address"}
          </button>
        )}
        <button class="btn btn--ghost" type="button" onClick={onClear}>
          {addressMode === "example" ? "Close example" : "Clear this reading"}
        </button>
        {addressMode !== "example" && (
          <p class="aura-result__actions-note">
            Clearing forgets the address and result on this device.
          </p>
        )}
      </div>

      {composition.uncertainties.length > 0 && (
        <aside class="aura-result__limits" aria-labelledby="aura-limits-title">
          <h3 id="aura-limits-title">What this reading leaves open</h3>
          <ul>
            {composition.uncertainties.map((item) => (
              <li key={`${item.code}-${item.value ?? ""}`}>{item.message}</li>
            ))}
          </ul>
        </aside>
      )}

      <aside class="aura-result__method" aria-labelledby="aura-method-title">
        <h3 id="aura-method-title">How to read Registry Aura</h3>
        <p>{composition.methodNote}</p>
      </aside>

      {!illustrative && (
        <div
          class="aura-result__response"
          role="group"
          aria-labelledby="aura-response-question"
        >
          <p id="aura-response-question">
            Did this reflection feel meaningful?
          </p>
          <div>
            <button
              type="button"
              class="btn btn--ghost"
              aria-disabled={response !== null}
              aria-pressed={response === "meaningful"}
              onClick={() => answer("meaningful")}
            >
              Meaningful
            </button>
            <button
              type="button"
              class="btn btn--ghost"
              aria-disabled={response !== null}
              aria-pressed={response === "not-yet"}
              onClick={() => answer("not-yet")}
            >
              Not yet
            </button>
          </div>
          {response && (
            <p role="status">
              Response recorded as “
              {response === "meaningful" ? "Meaningful" : "Not yet"}.” Thank
              you. Your response contains no sign, chart, or address data.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
