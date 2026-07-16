import { useEffect, useRef, useState } from "preact/hooks";
import { useProfile } from "../lib/hooks/useProfile";
import type { SavedChart } from "../lib/profile/schema";
import type { AuraComposition, AuraPersistenceRecord } from "../lib/aura/types";
import { normalizeHeldSigns } from "../lib/aura/normalize";
import {
  clearAllAuraPersistence,
  clearAuraPersistence,
  loadAuraPersistence,
  saveAuraPersistence,
} from "../lib/aura/persistence";
import { parseWalletAddress } from "../lib/wallet/address";
import type {
  ConnectedWalletSession,
  Eip6963ProviderDetail,
  StandardWallet,
} from "../lib/wallet/aura-connectors";
import type {
  AuraHoldings,
  AuraHoldingsErrorCode,
  WalletChain,
} from "../lib/wallet/types";
import { trackAnalytics } from "../lib/analytics";
import { auraHeldCountBucket } from "../lib/aura/analytics";
import { auraSinceLastLine } from "../lib/aura/copy";
import type { AuraShareFocus, AuraSharePublicInput } from "../lib/aura-share";
import {
  AuraResult,
  type AuraAddressMode,
  type AuraShareState,
} from "./aura/AuraResult";

interface RegistryAuraProps {
  availableChains: WalletChain[];
}

interface AuraResultState {
  composition: AuraComposition;
  chart: SavedChart;
  chain: WalletChain;
  checkedAt: string;
  mode: AuraAddressMode;
}

interface AuraSharePreviewState {
  blob: Blob;
  url: string;
  shareSupported: boolean;
  accessibleDescription: string;
}

type RequestState = "idle" | "busy" | "error";

function loadAuraComposer() {
  return import("../lib/aura/compose");
}

// Accessing window.sessionStorage/localStorage throws a SecurityError when
// the browser blocks site data entirely; the composer must degrade to
// no-persistence instead of dying on the property access itself.
function auraStorage(kind: "session" | "local"): Storage | null {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function loadAuraExample() {
  return import("../lib/aura/example");
}

const ERROR_COPY: Record<
  AuraHoldingsErrorCode | "network" | "malformed",
  string
> = {
  invalid_address:
    "That does not read as a complete Solana or Base public address.",
  forbidden:
    "The lookup was refused because the request did not come from this site.",
  disabled: "Registry Aura lookups are not enabled in this environment.",
  method: "The public-record lookup could not be started.",
  rate_limited:
    "The public record has been checked often from this connection. Please wait and try again.",
  unavailable:
    "The blockchain data provider did not return a complete answer. No absence has been inferred.",
  network:
    "The public record could not be reached. Check your connection and try again.",
  malformed:
    "The public record returned an incomplete answer. Please try again later.",
};

function publicShareInput(composition: AuraComposition): AuraSharePublicInput {
  return {
    heldSigns: composition.heldSigns,
    skyAt: composition.currentSky.observedAt,
    currentSky: {
      sun: composition.currentSky.sun.sign,
      moon: composition.currentSky.moon.sign,
    },
    activeEvents: composition.signs.flatMap((context) =>
      context.activeNow.flatMap((evidence) =>
        evidence.source === "event"
          ? [
              {
                kind: evidence.kind,
                sign: evidence.sign,
                exactAt: evidence.exactAt,
                body: evidence.body ?? null,
                eventType: evidence.eventType ?? null,
              },
            ]
          : [],
      ),
    ),
  };
}

function returnInterval(savedAt: string, now = Date.now()): string {
  const days = Math.max(0, now - Date.parse(savedAt)) / 86_400_000;
  if (days < 1) return "same-day";
  if (days < 4) return "1-3-days";
  if (days < 15) return "4-14-days";
  return "15-plus-days";
}

function validHoldingsPayload(value: unknown): value is AuraHoldings {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AuraHoldings>;
  if (payload.chain !== "solana" && payload.chain !== "base") return false;
  if (
    !Array.isArray(payload.heldSigns) ||
    !payload.heldSigns.every((sign) => typeof sign === "string")
  )
    return false;
  if (
    typeof payload.checkedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.checkedAt))
  )
    return false;
  const normalized = normalizeHeldSigns(payload.heldSigns);
  return (
    normalized.length === payload.heldSigns.length &&
    normalized.every((sign, index) => sign === payload.heldSigns?.[index])
  );
}

function selectedChart(charts: SavedChart[], id: string): SavedChart | null {
  return charts.find((chart) => chart.id === id) ?? null;
}

function samePersistedLookup(
  a: AuraPersistenceRecord,
  b: AuraPersistenceRecord,
): boolean {
  return (
    a.address === b.address &&
    a.chain === b.chain &&
    a.checkedAt === b.checkedAt &&
    a.chartId === b.chartId &&
    a.heldSigns.length === b.heldSigns.length &&
    a.heldSigns.every((sign, index) => sign === b.heldSigns[index])
  );
}

export function RegistryAura({ availableChains }: RegistryAuraProps) {
  const { profile, ready: profileReady } = useProfile();
  const [selectedChartId, setSelectedChartId] = useState("");
  const [address, setAddress] = useState("");
  const [addressMode, setAddressMode] = useState<AuraAddressMode>("pasted");
  const [remember, setRemember] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuraResultState | null>(null);
  const [shareState, setShareState] = useState<AuraShareState>("idle");
  const [sharePreview, setSharePreview] =
    useState<AuraSharePreviewState | null>(null);
  const [shareChartFact, setShareChartFact] = useState(false);
  const [shareFocusState, setShareFocusState] = useState<{
    result: AuraResultState;
    focus: AuraShareFocus | null;
  } | null>(null);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [solanaWallets, setSolanaWallets] = useState<readonly StandardWallet[]>(
    [],
  );
  const [evmProviders, setEvmProviders] = useState<
    readonly Eip6963ProviderDetail[]
  >([]);
  const [showSolanaWallets, setShowSolanaWallets] = useState(false);
  const [showEvmWallets, setShowEvmWallets] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState<WalletChain | null>(
    null,
  );
  const [connectedWallet, setConnectedWallet] = useState<{
    chain: WalletChain;
    name: string;
  } | null>(null);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const solanaConnectRef = useRef<HTMLButtonElement>(null);
  const baseConnectRef = useRef<HTMLButtonElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const exampleButtonRef = useRef<HTMLButtonElement>(null);
  const exampleOriginRef = useRef<HTMLElement | null>(null);
  const sessionRef = useRef<ConnectedWalletSession | null>(null);
  const connectedAddressRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const rememberRef = useRef(false);
  const restoredRef = useRef(false);
  const focusResultRef = useRef(false);
  const shareGenerationRef = useRef(0);

  const chart = selectedChart(profile.charts, selectedChartId);
  const parsedAddress = parseWalletAddress(address);
  const detectedChain = parsedAddress?.chain ?? null;
  const shareInput = result ? publicShareInput(result.composition) : null;
  const shareFocus =
    shareFocusState?.result === result ? shareFocusState.focus : null;
  const shareChartFactEligible = Boolean(
    shareFocus &&
    result?.composition.signs.some(
      (context) =>
        context.sign === shareFocus.sign && context.natalEcho.length > 0,
    ),
  );

  const invalidateSharePreview = () => {
    shareGenerationRef.current += 1;
    setSharePreview(null);
    setShareState("idle");
  };

  const clearStored = () => {
    const session = auraStorage("session");
    const local = auraStorage("local");
    if (session && local) clearAllAuraPersistence(session, local);
    else {
      if (session) clearAuraPersistence(session, "session");
      if (local) clearAuraPersistence(local, "local");
    }
  };

  const invalidateConnectedResult = (nextAddress: string | null) => {
    // Wallets re-announce the same account on unlock, chain switches, and tab
    // focus; only an actual address change may invalidate the reading.
    if (nextAddress !== null && nextAddress === connectedAddressRef.current) {
      return;
    }
    requestRef.current?.abort();
    requestRef.current = null;
    clearStored();
    invalidateSharePreview();
    setShareChartFact(false);
    setResult(null);
    setShareState("idle");
    setRequestState("idle");
    connectedAddressRef.current = nextAddress;
    if (nextAddress) {
      setAddress(nextAddress);
      setAddressMode("connected");
      setStatus(
        "The connected account changed. Compose a fresh Aura for this address.",
      );
    } else {
      sessionRef.current?.dispose();
      sessionRef.current = null;
      setAddress("");
      setAddressMode("pasted");
      setConnectedWallet(null);
      setStatus("The wallet disconnected. The composed Aura was cleared.");
    }
    requestAnimationFrame(() => addressInputRef.current?.focus());
  };

  useEffect(() => {
    trackAnalytics("aura_view");
    // Prime the first-screen example so it remains usable if connectivity drops after page load.
    void Promise.all([loadAuraComposer(), loadAuraExample()]).catch(
      () => undefined,
    );
    let current = true;
    let stopSolana = () => {};
    let stopEvm = () => {};
    void import("../lib/wallet/aura-connectors")
      .then(({ watchEip6963Providers, watchSolanaWallets }) => {
        if (!current) return;
        stopSolana = watchSolanaWallets(setSolanaWallets);
        stopEvm = watchEip6963Providers(setEvmProviders);
      })
      .catch(() => {
        if (current)
          setError(
            "Installed wallet discovery is unavailable. Paste a public address instead.",
          );
      });
    return () => {
      current = false;
      stopSolana();
      stopEvm();
      requestRef.current?.abort();
      sessionRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!profileReady) return;
    if (
      !selectedChartId ||
      !profile.charts.some((candidate) => candidate.id === selectedChartId)
    ) {
      setSelectedChartId(profile.charts[0]?.id ?? "");
    }
  }, [profileReady, profile.charts, selectedChartId]);

  useEffect(() => {
    if (!profileReady || restoredRef.current) return;
    restoredRef.current = true;
    const sessionStore = auraStorage("session");
    const localStore = auraStorage("local");
    const session = sessionStore
      ? loadAuraPersistence(sessionStore, "session")
      : null;
    const local = localStore ? loadAuraPersistence(localStore, "local") : null;
    const cached =
      session && local
        ? Date.parse(local.savedAt) > Date.parse(session.savedAt)
          ? local
          : session
        : (session ?? local);
    if (!cached) {
      setPersistenceReady(true);
      return;
    }

    setAddress(cached.address);
    setAddressMode("restored");
    // A differing local record may belong to another tab's remembered
    // address; restoring this tab must never delete data the user opted
    // to keep for 24 hours.
    if (local && samePersistedLookup(local, cached)) {
      rememberRef.current = true;
      setRemember(true);
    }
    const cachedChart = cached.chartId
      ? (profile.charts.find((candidate) => candidate.id === cached.chartId) ??
        null)
      : null;
    if (!cachedChart) {
      setStatus(
        "A recent address was restored. Choose a saved chart and compose again.",
      );
      setPersistenceReady(true);
      return;
    }

    setSelectedChartId(cachedChart.id);
    setShareChartFact(false);
    void loadAuraComposer()
      .then(({ auraSkySigns, composeAura }) => {
        const composition = composeAura({
          heldSigns: cached.heldSigns,
          chart: cachedChart,
          visitedAt: new Date(),
        });
        setResult({
          chart: cachedChart,
          chain: cached.chain,
          checkedAt: cached.checkedAt,
          mode: "restored",
          composition,
        });
        const sinceLine = auraSinceLastLine(
          auraSkySigns(new Date(cached.savedAt)),
          {
            sun: composition.currentSky.sun.sign,
            moon: composition.currentSky.moon.sign,
          },
          cached.savedAt,
        );
        setStatus(
          sinceLine
            ? `A recent reading was restored from this device. ${sinceLine} Re-check to read the public record again.`
            : "A recent reading was restored from this device. Re-check to read the public record again.",
        );
        trackAnalytics("aura_return", {
          interval: returnInterval(cached.savedAt),
        });
        setPersistenceReady(true);
      })
      .catch(() => {
        setError(
          "The saved Aura could not be restored. Clear its data and compose again.",
        );
        setPersistenceReady(true);
      });
  }, [profileReady, profile.charts]);

  useEffect(() => {
    if (!result || !focusResultRef.current) return;
    focusResultRef.current = false;
    requestAnimationFrame(() => resultHeadingRef.current?.focus());
  }, [result]);

  useEffect(() => {
    setShareChartFact(false);
  }, [result?.checkedAt, result?.chart.id]);

  useEffect(() => {
    shareGenerationRef.current += 1;
    setSharePreview(null);
    setShareState("idle");
  }, [result, shareChartFact, shareFocus?.sign, shareFocus?.reason]);

  useEffect(() => {
    const previewUrl = sharePreview?.url;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [sharePreview?.url]);

  useEffect(
    () => () => {
      shareGenerationRef.current += 1;
    },
    [],
  );

  const shareFocusRequestRef = useRef(0);
  const loadShareFocus = (focusResult: AuraResultState) => {
    const token = ++shareFocusRequestRef.current;
    void import("../lib/aura-share")
      .then(({ selectAuraShareFocus }) => {
        if (shareFocusRequestRef.current !== token) return;
        setShareFocusState({
          result: focusResult,
          focus: selectAuraShareFocus(publicShareInput(focusResult.composition)),
        });
        setShareState("idle");
      })
      .catch(() => {
        // A failed chunk load must stay recoverable: the share button turns
        // into a retry instead of wedging on a disabled "Preparing card…".
        if (shareFocusRequestRef.current !== token) return;
        setShareFocusState({ result: focusResult, focus: null });
        setShareState("error");
      });
  };

  useEffect(() => {
    if (!result) {
      shareFocusRequestRef.current += 1;
      setShareFocusState(null);
      return;
    }
    loadShareFocus(result);
  }, [result]);

  const persistLookup = (
    payload: AuraHoldings,
    selected: SavedChart,
    inputAddress: string,
  ) => {
    const lookup = {
      address: inputAddress,
      chain: payload.chain,
      heldSigns: normalizeHeldSigns(payload.heldSigns),
      checkedAt: payload.checkedAt,
      chartId: selected.id,
    } as const;
    const sessionStore = auraStorage("session");
    const localStore = auraStorage("local");
    if (sessionStore) saveAuraPersistence(sessionStore, "session", lookup);
    if (!localStore) return;
    if (rememberRef.current) saveAuraPersistence(localStore, "local", lookup);
    else clearAuraPersistence(localStore, "local");
  };

  const fail = (message: string, outcome: string, refresh: boolean) => {
    setRequestState("error");
    setError(message);
    setStatus("");
    trackAnalytics(refresh ? "aura_refresh" : "aura_compose", { outcome });
    requestAnimationFrame(() => addressInputRef.current?.focus());
  };

  const compose = async (refresh = false) => {
    if (!chart) {
      fail("Save a chart before composing an Aura.", "no-chart", refresh);
      return;
    }
    const parsed = parseWalletAddress(address);
    if (!parsed) {
      fail(ERROR_COPY.invalid_address, "invalid", refresh);
      return;
    }
    if (!availableChains.includes(parsed.chain)) {
      fail(
        `${parsed.chain === "solana" ? "Solana" : "Base"} lookup is not available in this environment.`,
        "disabled-chain",
        refresh,
      );
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setRequestState("busy");
    setError("");
    setStatus("Reading the public record…");
    if (refresh) trackAnalytics("aura_refresh", { outcome: "started" });

    try {
      const response = await fetch("/api/aura-holdings", {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: parsed.address }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted || requestRef.current !== controller)
        return;
      if (!response.ok) {
        const code =
          payload && typeof payload === "object" && "error" in payload
            ? (payload as { error?: AuraHoldingsErrorCode }).error
            : "malformed";
        // The analytics outcome uses the same allowlist as the copy lookup so
        // a misbehaving proxy cannot pollute the event space with raw strings.
        const known = code && code in ERROR_COPY ? code : "malformed";
        fail(ERROR_COPY[known], known, refresh);
        return;
      }
      if (!validHoldingsPayload(payload) || payload.chain !== parsed.chain) {
        fail(ERROR_COPY.malformed, "malformed", refresh);
        return;
      }

      setStatus("Setting the chart and consulting the dated sky…");
      const { composeAura } = await loadAuraComposer();
      if (controller.signal.aborted || requestRef.current !== controller)
        return;
      const composition = composeAura({
        heldSigns: payload.heldSigns,
        chart,
        visitedAt: new Date(),
      });
      if (controller.signal.aborted || requestRef.current !== controller)
        return;
      const mode: AuraAddressMode =
        connectedWallet && connectedAddressRef.current === parsed.address
          ? "connected"
          : "pasted";
      persistLookup(payload, chart, parsed.address);
      invalidateSharePreview();
      setShareChartFact(false);
      setResult({
        composition,
        chart,
        chain: payload.chain,
        checkedAt: payload.checkedAt,
        mode,
      });
      setAddressMode(mode);
      setRequestState("idle");
      setStatus(
        payload.heldSigns.length === 0
          ? "Lookup complete. No Registry-listed Zodiac was found; no purchase is required."
          : `Reading composed from ${payload.heldSigns.length} held ${payload.heldSigns.length === 1 ? "sign" : "signs"}.`,
      );
      setShareState("idle");
      focusResultRef.current = true;
      trackAnalytics(
        refresh ? "aura_refresh" : "aura_compose",
        refresh
          ? { outcome: "success" }
          : {
              outcome: "success",
              held_bucket: auraHeldCountBucket(payload.heldSigns.length),
            },
      );
    } catch (caught) {
      if ((caught as DOMException)?.name === "AbortError") return;
      fail(ERROR_COPY.network, "network", refresh);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const attachSession = (session: ConnectedWalletSession) => {
    requestRef.current?.abort();
    requestRef.current = null;
    sessionRef.current?.dispose();
    sessionRef.current = session;
    connectedAddressRef.current = session.address;
    setAddress(session.address);
    setAddressMode("connected");
    setConnectedWallet({ chain: session.chain, name: session.walletName });
    invalidateSharePreview();
    setShareChartFact(false);
    setResult(null);
    setShareState("idle");
    setRequestState("idle");
    clearStored();
    setStatus(
      `${session.walletName} connected. Aura will use one compatible public address for this composition.`,
    );
    setError("");
  };

  const connectSolana = async (wallet: StandardWallet) => {
    setConnectionBusy("solana");
    setError("");
    try {
      const { connectSolanaWallet } =
        await import("../lib/wallet/aura-connectors");
      attachSession(
        await connectSolanaWallet(wallet, invalidateConnectedResult),
      );
      setShowSolanaWallets(false);
      requestAnimationFrame(() => solanaConnectRef.current?.focus());
    } catch {
      setError(
        "The Solana wallet connection was not completed. Paste remains available.",
      );
    } finally {
      setConnectionBusy(null);
    }
  };

  const connectBase = async (provider: Eip6963ProviderDetail) => {
    setConnectionBusy("base");
    setError("");
    try {
      const { connectEip6963Provider } =
        await import("../lib/wallet/aura-connectors");
      attachSession(
        await connectEip6963Provider(provider, invalidateConnectedResult),
      );
      setShowEvmWallets(false);
      requestAnimationFrame(() => baseConnectRef.current?.focus());
    } catch {
      setError(
        "The Base wallet connection was not completed. Paste remains available.",
      );
    } finally {
      setConnectionBusy(null);
    }
  };

  const chooseSolana = () => {
    if (solanaWallets.length === 1) void connectSolana(solanaWallets[0]);
    else setShowSolanaWallets((visible) => !visible);
  };

  const chooseBase = () => {
    if (evmProviders.length === 1) void connectBase(evmProviders[0]);
    else setShowEvmWallets((visible) => !visible);
  };

  const disconnect = async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.dispose();
    await session?.disconnect();
    invalidateConnectedResult(null);
  };

  const clearAura = () => {
    requestRef.current?.abort();
    sessionRef.current?.dispose();
    sessionRef.current = null;
    connectedAddressRef.current = null;
    clearStored();
    invalidateSharePreview();
    const wasExample = result?.mode === "example";
    setShareChartFact(false);
    setResult(null);
    setAddress("");
    setAddressMode("pasted");
    setConnectedWallet(null);
    rememberRef.current = false;
    setRemember(false);
    setRequestState("idle");
    setError("");
    setStatus(
      wasExample
        ? "Example closed."
        : "Aura data was cleared from this device.",
    );
    setShareState("idle");
    requestAnimationFrame(() => {
      const exampleTarget = exampleOriginRef.current?.isConnected
        ? exampleOriginRef.current
        : exampleButtonRef.current;
      (wasExample ? exampleTarget : addressInputRef.current)?.focus();
      if (wasExample) exampleOriginRef.current = null;
    });
  };

  const showExample = async (origin?: HTMLElement | null) => {
    if (origin) exampleOriginRef.current = origin;
    requestRef.current?.abort();
    requestRef.current = null;
    setRequestState("idle");
    let modules;
    try {
      modules = await Promise.all([loadAuraExample(), loadAuraComposer()]);
    } catch {
      setStatus("");
      setError(
        "The example could not be loaded. Check your connection and try again.",
      );
      return;
    }
    const [{ AURA_EXAMPLE_CHART, AURA_EXAMPLE_HELD_SIGNS }, { composeAura }] =
      modules;
    const now = new Date();
    setError("");
    invalidateSharePreview();
    setShareChartFact(false);
    setResult({
      chart: AURA_EXAMPLE_CHART,
      chain: "solana",
      checkedAt: now.toISOString(),
      mode: "example",
      composition: composeAura({
        heldSigns: AURA_EXAMPLE_HELD_SIGNS,
        chart: AURA_EXAMPLE_CHART,
        visitedAt: now,
        illustrative: true,
      }),
    });
    setStatus("Example reading composed without reading an address.");
    setError("");
    setShareState("idle");
    focusResultRef.current = true;
  };

  useEffect(() => {
    const trigger = document.getElementById("aura-primer-example");
    if (!(trigger instanceof HTMLAnchorElement)) return;
    const openExample = (event: Event) => {
      event.preventDefault();
      void showExample(trigger);
    };
    trigger.addEventListener("click", openExample);
    return () => trigger.removeEventListener("click", openExample);
  }, []);

  const createSharePreview = async () => {
    if (!result || !shareInput || !shareFocus) return;
    const generation = shareGenerationRef.current + 1;
    shareGenerationRef.current = generation;
    setShareState("busy");
    try {
      const {
        auraShareAccessibleDescription,
        canShareAuraCardBlob,
        drawAuraShareCard,
      } = await import("../lib/aura-share-card");
      const next =
        result.composition.signs.find(
          (context) => context.sign === shareFocus.sign,
        )?.nextActivation ?? null;
      const cardInput = {
        focus: shareFocus,
        checkedAt: result.checkedAt,
        skyAt: shareInput.skyAt,
        currentSky: shareInput.currentSky,
        nextEvent: next
          ? {
              kind: next.kind,
              sign: next.sign,
              at: next.at,
              body: next.body,
              eventType: next.eventType,
            }
          : null,
        includeChartFact: shareChartFact && shareChartFactEligible,
      } as const;
      const accessibleDescription = auraShareAccessibleDescription(cardInput);
      const blob = await drawAuraShareCard(cardInput);
      const url = URL.createObjectURL(blob);
      if (shareGenerationRef.current !== generation) {
        URL.revokeObjectURL(url);
        return;
      }
      setSharePreview({
        blob,
        url,
        shareSupported: canShareAuraCardBlob(blob),
        accessibleDescription,
      });
      setShareState("idle");
    } catch {
      if (shareGenerationRef.current === generation) setShareState("error");
    }
  };

  const shareReviewedCard = async () => {
    if (!sharePreview) return;
    const generation = shareGenerationRef.current;
    const blob = sharePreview.blob;
    setShareState("busy");
    try {
      const { shareAuraCardBlob } = await import("../lib/aura-share-card");
      if (shareGenerationRef.current !== generation) return;
      const outcome = await shareAuraCardBlob(blob);
      if (shareGenerationRef.current === generation) {
        setShareState(outcome === "cancelled" ? "idle" : outcome);
      }
      trackAnalytics("aura_share", { outcome });
    } catch {
      if (shareGenerationRef.current === generation) setShareState("error");
      trackAnalytics("aura_share", { outcome: "error" });
    }
  };

  const downloadReviewedCard = async () => {
    if (!sharePreview) return;
    const generation = shareGenerationRef.current;
    const blob = sharePreview.blob;
    setShareState("busy");
    try {
      const { downloadAuraCardBlob } = await import("../lib/aura-share-card");
      if (shareGenerationRef.current !== generation) return;
      const outcome = downloadAuraCardBlob(blob);
      if (shareGenerationRef.current === generation) setShareState(outcome);
      trackAnalytics("aura_share", { outcome });
    } catch {
      if (shareGenerationRef.current === generation) setShareState("error");
      trackAnalytics("aura_share", { outcome: "error" });
    }
  };

  const closeSharePreview = () => {
    invalidateSharePreview();
  };

  const respond = (value: "meaningful" | "not-yet") => {
    trackAnalytics("aura_response", { value });
  };

  return (
    <div id="aura-composer" class="aura-entry">
      <div class="aura-entry__intro">
        <div>
          <h2>Three records, one reading</h2>
          <p>
            The chart is read on this device and never leaves it. The lookup
            sends one public address, nothing else.
          </p>
        </div>
        {persistenceReady && !result && !address && (
          <button
            ref={exampleButtonRef}
            class="btn btn--ghost aura-example-button"
            type="button"
            onClick={(event) => void showExample(event.currentTarget)}
          >
            See the example
          </button>
        )}
      </div>

      <aside class="aura-entry__boundary" aria-labelledby="aura-boundary-title">
        <strong id="aura-boundary-title">Before you compose</strong>
        <ul class="aura-entry__boundary-lines">
          <li>
            Read-only. Symbolic. Never an investment signal, and no purchase is
            required.
          </li>
          <li>
            A public address and its history are public, and may become linked
            to a person. Only the address is sent.
          </li>
          <li>
            “Official” means listed in this Registry — not approval, identity,
            safety, or value.
          </li>
        </ul>
        <details class="aura-fineprint">
          <summary>The fine print, in full</summary>
          <div>
            <p>
              Registry Aura is a read-only symbolic display—not a price
              prediction or a recommendation to buy, sell, or hold a Zodiac. No
              purchase is required. Digital assets are speculative, may become
              illiquid, and may lose all market value.
            </p>
            <p>
              A public address and its on-chain history are public and may
              become linked to a person. Aura does not include birth or chart
              data in the address or provider request. Wallet software may
              expose the public accounts you authorize; Aura uses and sends one
              compatible address through Zodiacs.org to the configured
              blockchain data provider, which may also process routine request
              metadata.
            </p>
            <p>
              “Official Zodiac” means its mint or contract matches a Zodiac
              listed by this Registry. It does not mean government approval,
              verified identity or control, financial safety, liquidity, or
              value.
            </p>
            <p>
              Aura reduces the public wallet record to present/not-present for
              Registry-listed signs. It does not show quantities, prices,
              holding history, or unrelated assets.
            </p>
          </div>
        </details>
      </aside>

      <form
        class="aura-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void compose(false);
        }}
        aria-busy={requestState === "busy"}
      >
        <section class="aura-step" aria-labelledby="aura-chart-step">
          <div class="aura-step__heading">
            <span>1</span>
            <h3 id="aura-chart-step">Your chart</h3>
          </div>
          {!profileReady ? (
            <p class="aura-step__note">
              Checking this browser for saved charts…
            </p>
          ) : profile.charts.length ? (
            <div class="aura-field">
              <label for="aura-chart">Choose a chart</label>
              <select
                id="aura-chart"
                value={selectedChartId}
                onChange={(event) => {
                  requestRef.current?.abort();
                  requestRef.current = null;
                  clearStored();
                  setRequestState("idle");
                  setShareChartFact(false);
                  setResult(null);
                  setSelectedChartId(event.currentTarget.value);
                }}
              >
                {profile.charts.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.birth.date}
                  </option>
                ))}
              </select>
              <p class="aura-field__note">
                Only the saved summary is read. Birth fields never enter the
                address request.
              </p>
            </div>
          ) : (
            <div class="aura-chart-missing">
              <p>No saved chart is available on this device.</p>
              <p class="aura-field__note">
                Charts are saved by the calculator and stay in this browser.
                Nothing about them is sent to Registry Aura’s lookup.
              </p>
              <a
                class="btn btn--primary"
                href="/birth-chart/?return=registry-aura"
                onClick={() =>
                  trackAnalytics("aura_calculator", { direction: "outbound" })
                }
              >
                Calculate and save a chart
              </a>
              <p class="aura-field__note">
                You will be brought back here afterward.
              </p>
            </div>
          )}
        </section>

        <section class="aura-step" aria-labelledby="aura-address-step">
          <div class="aura-step__heading">
            <span>2</span>
            <h3 id="aura-address-step">The address</h3>
          </div>
          <p class="aura-step__note aura-step__note--before-wallet">
            Connect an installed wallet or paste a public address — both are
            the same read-only lookup. Solana and Base are separate networks;
            use the address on the network where the Zodiac appears. Aura
            checks one network at a time.{" "}
            <a href="#wallet-basics">New to wallets? Read the two-minute guide.</a>
          </p>
          {connectedWallet && (
            <p class="aura-connected">
              <span>
                {connectedWallet.name} · connected address ·{" "}
                {connectedWallet.chain === "solana" ? "Solana" : "Base"}
              </span>
              <button type="button" onClick={() => void disconnect()}>
                Disconnect
              </button>
            </p>
          )}
          <div
            class="aura-address-methods"
            role="group"
            aria-label="Wallet connection methods"
          >
            <button
              ref={solanaConnectRef}
              class="btn btn--ghost"
              type="button"
              disabled={
                !availableChains.includes("solana") || connectionBusy !== null
              }
              onClick={chooseSolana}
              aria-expanded={
                solanaWallets.length === 1 ? undefined : showSolanaWallets
              }
              aria-controls={
                solanaWallets.length === 1 ? undefined : "aura-solana-wallets"
              }
            >
              {connectionBusy === "solana"
                ? "Connecting…"
                : "Connect Solana wallet"}
            </button>
            <button
              ref={baseConnectRef}
              class="btn btn--ghost"
              type="button"
              disabled={
                !availableChains.includes("base") || connectionBusy !== null
              }
              onClick={chooseBase}
              aria-expanded={
                evmProviders.length === 1 ? undefined : showEvmWallets
              }
              aria-controls={
                evmProviders.length === 1 ? undefined : "aura-base-wallets"
              }
            >
              {connectionBusy === "base"
                ? "Connecting…"
                : "Connect Base wallet"}
            </button>

            {availableChains.length === 1 && (
              <p class="aura-field__note" role="status">
                Only {availableChains[0] === "solana" ? "Solana" : "Base"}{" "}
                lookups are configured in this environment. The other network
                button is unavailable; use an address on the configured network.
              </p>
            )}

            {showSolanaWallets && (
              <div
                id="aura-solana-wallets"
                class="aura-wallet-list"
                role="group"
                aria-label="Available Solana wallets"
              >
                {solanaWallets.length ? (
                  solanaWallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      class="btn btn--ghost"
                      type="button"
                      onClick={() => void connectSolana(wallet)}
                    >
                      {wallet.name}
                    </button>
                  ))
                ) : (
                  <p role="status">
                    No compatible Solana wallet was found in this browser. You
                    can paste a public address or review the wallet guide above.
                  </p>
                )}
              </div>
            )}
            {showEvmWallets && (
              <div
                id="aura-base-wallets"
                class="aura-wallet-list"
                role="group"
                aria-label="Available Base wallets"
              >
                {evmProviders.length ? (
                  evmProviders.map((provider) => (
                    <button
                      key={provider.info.uuid}
                      class="btn btn--ghost"
                      type="button"
                      onClick={() => void connectBase(provider)}
                    >
                      {provider.info.name}
                    </button>
                  ))
                ) : (
                  <p role="status">
                    No compatible Base wallet was found in this browser. You can
                    paste a public address or review the wallet guide above.
                  </p>
                )}
              </div>
            )}
          </div>

          <div class="aura-method-divider">or paste</div>
          <div class="aura-field">
            <label for="aura-address">Public Solana or Base address</label>
            <input
              ref={addressInputRef}
              id="aura-address"
              name="address"
              type="text"
              value={address}
              readOnly={addressMode === "connected"}
              autoComplete="off"
              autoCapitalize="none"
              spellcheck={false}
              placeholder="Paste one public address"
              aria-describedby="aura-address-note aura-status"
              onInput={(event) => {
                requestRef.current?.abort();
                requestRef.current = null;
                clearStored();
                setRequestState("idle");
                setAddress(event.currentTarget.value);
                setAddressMode("pasted");
                if (result) {
                  setShareChartFact(false);
                  setResult(null);
                }
                setError("");
              }}
            />
            <p id="aura-address-note" class="aura-field__note">
              {detectedChain
                ? `Reads as a ${detectedChain === "solana" ? "Solana" : "Base"} address.`
                : "Address format is detected locally."}
            </p>
          </div>

          <label class="aura-remember">
            <input
              type="checkbox"
              aria-describedby="aura-storage-note"
              checked={remember}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                rememberRef.current = checked;
                setRemember(checked);
                const localStore = auraStorage("local");
                if (!localStore) return;
                if (!checked) {
                  clearAuraPersistence(localStore, "local");
                } else if (result && result.mode !== "example") {
                  const parsed = parseWalletAddress(address);
                  if (parsed && parsed.chain === result.chain) {
                    saveAuraPersistence(localStore, "local", {
                      address: parsed.address,
                      chain: result.chain,
                      heldSigns: result.composition.heldSigns,
                      checkedAt: result.checkedAt,
                      chartId: result.chart.id,
                    });
                  }
                }
              }}
            />
            <span>
              Remember this address on this device{" "}
              <small>
                (off by default; eligible for restoration for 24 hours)
              </small>
            </span>
          </label>
          <details class="aura-fineprint aura-storage-details">
            <summary>How this is stored</summary>
            <p id="aura-storage-note" class="aura-field__note aura-storage-note">
              By default, Aura stores the public address, network, held-sign
              result, check time, selected chart ID, and save/expiry times in this
              tab's session storage and restores them for 8 hours. Remembering
              saves those same fields in local browser storage and restores them
              for 24 hours. Expired records are deleted when Aura next reads them;
              until then, clear site data if you do not want the browser to retain
              the expired bytes.
            </p>
          </details>

          <p class="aura-sky-stamp">
            <strong>The sky — already here.</strong> Computed on this device
            for the moment you read.
          </p>

          <div class="aura-compose__submit">
            <button
              class="btn btn--primary"
              type="submit"
              disabled={!chart || requestState === "busy"}
            >
              {requestState === "busy" ? "Reading…" : "Read them side by side"}
            </button>
          </div>
        </section>
      </form>

      <p class="aura-entry__privacy">
        Read-only means no message signature, token approval, transaction, or
        network switch is requested. Connecting may ask you to authorize access
        to public accounts; Aura selects, uses, and forwards one compatible
        public address. The configured blockchain data provider may also process
        routine request metadata. Aura does not include chart or birth data in
        that request. Read the <a href="/disclosure/">Disclosure</a>,{" "}
        <a href="/privacy/">Privacy Policy</a>, and <a href="/terms/">Terms</a>.
      </p>
      <p
        id="aura-status"
        class="aura-status"
        role={error ? "alert" : "status"}
        aria-live="polite"
        data-error={error ? "true" : "false"}
      >
        {error || status}
      </p>
      {requestState === "error" && !result && (
        <div class="aura-error-escape">
          <button
            class="btn btn--ghost"
            type="button"
            onClick={(event) => void showExample(event.currentTarget)}
          >
            See the example instead
          </button>
        </div>
      )}

      {result && (
        <AuraResult
          key={`${result.checkedAt}:${result.chart.id}`}
          composition={result.composition}
          chart={result.chart}
          chain={result.chain}
          checkedAt={result.checkedAt}
          addressMode={result.mode}
          headingRef={resultHeadingRef}
          refreshing={requestState === "busy"}
          shareState={shareState}
          shareReady={shareFocus !== null}
          sharePreviewUrl={sharePreview?.url ?? null}
          shareSupported={sharePreview?.shareSupported ?? false}
          shareAccessibleDescription={sharePreview?.accessibleDescription ?? ""}
          shareFocusSign={shareFocus?.sign ?? null}
          shareChartFact={shareChartFact}
          shareChartFactEligible={shareChartFactEligible}
          onRefresh={() => void compose(true)}
          onClear={clearAura}
          onShowExample={showExample}
          onCreateSharePreview={() => void createSharePreview()}
          onRetryShareSetup={() => {
            if (result) loadShareFocus(result);
          }}
          onSharePreview={() => void shareReviewedCard()}
          onDownloadPreview={() => void downloadReviewedCard()}
          onCloseSharePreview={closeSharePreview}
          onShareChartFactChange={(checked) => {
            invalidateSharePreview();
            setShareChartFact(checked);
          }}
          onResponse={respond}
        />
      )}
    </div>
  );
}
