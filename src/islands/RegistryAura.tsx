import { useEffect, useRef, useState } from "preact/hooks";
import { useProfile } from "../lib/hooks/useProfile";
import type { SavedChart } from "../lib/profile/schema";
import {
  AURA_SIGN_ORDER,
  type AuraCabinetFinish,
  type AuraCabinetHolding,
  type AuraCabinetRevealMode,
  type AuraComposition,
  type AuraPersistenceRecord,
  type AuraSign,
} from "../lib/aura/types";
import { normalizeHeldSigns } from "../lib/aura/normalize";
import { AURA_EXAMPLE_HOLDINGS } from "../lib/aura/example";
import {
  AuraCollectionCabinet,
  EDITION_META,
  EDITION_ORDER,
  principalSign,
} from "./aura/AuraCollectionCabinet";
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
import { auraDateStamp, auraSinceLastLine } from "../lib/aura/copy";
import type { AuraShareActionOutcome } from "../lib/aura-share-card";
import {
  AuraResult,
  type AuraAddressMode,
  type AuraShareState,
} from "./aura/AuraResult";
import { AuraSharePreview } from "./aura/AuraSharePreview";

interface RegistryAuraProps {
  availableChains: WalletChain[];
}

interface AuraResultState {
  composition: AuraComposition;
  holdings: AuraCabinetHolding[];
  revealMode: AuraCabinetRevealMode;
  chart: SavedChart | null;
  chain: WalletChain;
  checkedAt: string;
  mode: AuraAddressMode;
}

export type AuraShareCardKind = "seal" | "cabinet";

interface AuraSharePreviewState {
  kind: AuraShareCardKind;
  blob: Blob;
  url: string;
  shareSupported: boolean;
  accessibleDescription: string;
}

type RequestState = "idle" | "busy" | "error";

interface PreparedShareCard {
  blob: Blob;
  shareSupported: boolean;
  accessibleDescription: string;
  share: (blob: Blob) => Promise<AuraShareActionOutcome>;
  download: (blob: Blob) => "downloaded";
}

/** The dated talisman: the represented set, the Sun, and the Moon. */
async function prepareSealCard(result: AuraResultState): Promise<PreparedShareCard> {
  const {
    auraShareAccessibleDescription,
    canShareAuraCardBlob,
    downloadAuraCardBlob,
    drawAuraShareCard,
    shareAuraCardBlob,
  } = await import("../lib/aura-share-card");
  const cardInput = {
    heldSigns: result.composition.heldSigns,
    holdings: result.holdings,
    checkedAt: result.checkedAt,
    skyAt: result.composition.currentSky.observedAt,
    currentSky: {
      sun: result.composition.currentSky.sun.sign,
      moon: result.composition.currentSky.moon.sign,
    },
  } as const;
  const blob = await drawAuraShareCard(cardInput);
  return {
    blob,
    shareSupported: canShareAuraCardBlob(blob),
    accessibleDescription: auraShareAccessibleDescription(cardInput),
    share: shareAuraCardBlob,
    download: downloadAuraCardBlob,
  };
}

/** The case itself: twelve seats, the editions earned, the places reserved. */
async function prepareCabinetCard(result: AuraResultState): Promise<PreparedShareCard> {
  const {
    auraCabinetAccessibleDescription,
    canShareAuraCabinetBlob,
    downloadAuraCabinetBlob,
    drawAuraCabinetCard,
    shareAuraCabinetBlob,
  } = await import("../lib/aura-cabinet-card");
  // The live case is the card: capture the display the visitor is looking at.
  // The frame is the display — the placard beneath it is a reading surface,
  // not part of the case, and repeating it would only crowd the image.
  const element = document.querySelector<HTMLElement>(".aura-collection-cabinet__frame");
  const cardInput = {
    element,
    holdings: result.holdings,
    checkedAt: result.checkedAt,
    chain: result.chain,
  } as const;
  const blob = await drawAuraCabinetCard(cardInput);
  return {
    blob,
    shareSupported: canShareAuraCabinetBlob(blob),
    accessibleDescription: auraCabinetAccessibleDescription(cardInput),
    share: shareAuraCabinetBlob,
    download: downloadAuraCabinetBlob,
  };
}

const CABINET_FINISHES = new Set<AuraCabinetFinish>([
  "pastel",
  "bronze",
  "silver",
  "gold",
]);

function validGoldCount(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
}

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
    "That doesn’t look like a complete wallet address. Check it and try again.",
  forbidden:
    "The lookup was refused because the request did not come from this site.",
  disabled: "Collection lookups are not enabled in this environment.",
  method: "The lookup could not be started. Please try again.",
  rate_limited:
    "This address has been checked a lot from this connection. Give it a minute and try again.",
  unavailable:
    "The blockchain provider didn’t answer completely, so nothing was marked missing. Try again in a moment — or open the sample.",
  network:
    "The lookup couldn’t reach the public record. Check your connection and try again.",
  malformed:
    "The public record sent back an incomplete answer. Please try again shortly.",
};

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
  if (!Array.isArray(payload.holdings)) return false;
  const seen = new Set<string>();
  for (const entry of payload.holdings) {
    if (!entry || typeof entry !== "object") return false;
    const holding = entry as Partial<AuraCabinetHolding>;
    if (
      typeof holding.sign !== "string" ||
      !AURA_SIGN_ORDER.includes(holding.sign as (typeof AURA_SIGN_ORDER)[number]) ||
      typeof holding.finish !== "string" ||
      !CABINET_FINISHES.has(holding.finish as AuraCabinetFinish) ||
      seen.has(holding.sign)
    ) return false;
    if (
      (holding.finish === "gold" && !validGoldCount(holding.goldCount)) ||
      (holding.finish !== "gold" && holding.goldCount !== undefined)
    ) return false;
    seen.add(holding.sign);
  }
  if (
    typeof payload.checkedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.checkedAt))
  )
    return false;
  const normalized = normalizeHeldSigns(payload.heldSigns);
  const holdingSigns = normalizeHeldSigns(
    payload.holdings.map(({ sign }) => sign),
  );
  return (
    normalized.length === payload.heldSigns.length &&
    normalized.every((sign, index) => sign === payload.heldSigns?.[index]) &&
    holdingSigns.length === payload.holdings.length &&
    holdingSigns.every((sign, index) => sign === payload.holdings?.[index]?.sign) &&
    holdingSigns.length === normalized.length &&
    holdingSigns.every((sign, index) => sign === normalized[index])
  );
}

// Wallets announce their own icons (Wallet Standard / EIP-6963 data URIs).
// Only data:image/ URIs are rendered — a page-injected provider must not be
// able to smuggle another scheme into an <img>.
function walletIconSrc(icon: unknown): string | null {
  return typeof icon === "string" && icon.startsWith("data:image/")
    ? icon
    : null;
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
    a.holdings.length === b.holdings.length &&
    a.holdings.every((holding, index) => (
      holding.sign === b.holdings[index]?.sign
      && holding.finish === b.holdings[index]?.finish
      && holding.goldCount === b.holdings[index]?.goldCount
    ))
  );
}

export function RegistryAura({ availableChains }: RegistryAuraProps) {
  const { profile, ready: profileReady } = useProfile();
  const [selectedChartId, setSelectedChartId] = useState("");
  const [selectedSign, setSelectedSign] = useState<AuraSign | null>(null);
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
  const cabinetShareRef = useRef<HTMLButtonElement>(null);
  const exampleOriginRef = useRef<HTMLElement | null>(null);
  const sessionRef = useRef<ConnectedWalletSession | null>(null);
  const connectedAddressRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const rememberRef = useRef(false);
  const restoredRef = useRef(false);
  const focusResultRef = useRef(false);
  const shareGenerationRef = useRef(0);
  const preparedShareActionRef = useRef<
    ((blob: Blob) => Promise<AuraShareActionOutcome>) | null
  >(null);
  const preparedDownloadActionRef = useRef<
    ((blob: Blob) => "downloaded") | null
  >(null);

  const chart = selectedChart(profile.charts, selectedChartId);
  const parsedAddress = parseWalletAddress(address);
  const detectedChain = parsedAddress?.chain ?? null;

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
    setResult(null);
    setShareState("idle");
    setRequestState("idle");
    connectedAddressRef.current = nextAddress;
    if (nextAddress) {
      setAddress(nextAddress);
      setAddressMode("connected");
      setStatus(
        "The connected account changed. Open the collection again for this address.",
      );
    } else {
      sessionRef.current?.dispose();
      sessionRef.current = null;
      setAddress("");
      setAddressMode("pasted");
      setConnectedWallet(null);
      setStatus("The wallet disconnected. The opened collection was cleared.");
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
    setSelectedChartId(cachedChart?.id ?? "");
    void loadAuraComposer()
      .then(({ auraSkySigns, composeAura }) => {
        const composition = composeAura({
          heldSigns: cached.holdings.map(({ sign }) => sign),
          chart: cachedChart,
          visitedAt: new Date(),
        });
        setResult({
          holdings: [...cached.holdings],
          revealMode: "settled",
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
            ? `A recent collection was restored from this device. ${sinceLine} Re-check to read the public record again.`
            : "A recent collection was restored from this device. Re-check to read the public record again.",
        );
        trackAnalytics("aura_return", {
          interval: returnInterval(cached.savedAt),
        });
        setPersistenceReady(true);
      })
      .catch(() => {
        setError(
          "The saved collection could not be restored. Clear its data and try again.",
        );
        setPersistenceReady(true);
      });
  }, [profileReady, profile.charts]);

  useEffect(() => {
    if (!result || !focusResultRef.current) return;
    focusResultRef.current = false;
    requestAnimationFrame(() => {
      const heading = resultHeadingRef.current;
      if (!heading) return;
      // Land the reading at the top of the screen — focus alone only
      // nudges the heading into the bottom edge, which reads as "where
      // am I?" after the hero's example door.
      const reduce = typeof matchMedia === "function"
        && matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading.scrollIntoView({
        block: "start",
        behavior: reduce ? "auto" : "smooth",
      });
      heading.focus({ preventScroll: true });
    });
  }, [result]);

  useEffect(() => {
    shareGenerationRef.current += 1;
    setSharePreview(null);
    setShareState("idle");
    // A new accession opens on its principal work, not a stale selection.
    setSelectedSign(null);
  }, [result?.checkedAt]);

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

  const persistLookup = (
    payload: AuraHoldings,
    selected: SavedChart | null,
    inputAddress: string,
  ) => {
    const lookup = {
      address: inputAddress,
      chain: payload.chain,
      holdings: payload.holdings,
      checkedAt: payload.checkedAt,
      chartId: selected?.id,
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

      setStatus(
        chart
          ? "Adding the chart echo and consulting the dated sky…"
          : "Consulting the dated sky…",
      );
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
      setResult({
        composition,
        holdings: payload.holdings,
        revealMode: "animate",
        chart,
        chain: payload.chain,
        checkedAt: payload.checkedAt,
        mode,
      });
      setAddressMode(mode);
      setRequestState("idle");
      setStatus(
        payload.heldSigns.length === 0
          ? "Collection opened. No Registry-listed Zodiacs were found."
          : `${payload.heldSigns.length} official ${payload.heldSigns.length === 1 ? "Zodiac was" : "Zodiacs were"} found.`,
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
    setResult(null);
    setShareState("idle");
    setRequestState("idle");
    clearStored();
    setStatus(
      `${session.walletName} connected. One compatible public address will be used.`,
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
    setResult(null);
    setSelectedChartId("");
    setAddress("");
    setAddressMode("pasted");
    setConnectedWallet(null);
    rememberRef.current = false;
    setRemember(false);
    setRequestState("idle");
    setError("");
    setStatus(
      wasExample
        ? "Sample closed."
        : "Saved data was cleared from this device.",
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

  const openCollectionDesk = () => {
    clearAura();
    requestAnimationFrame(() => {
      const desk = document.getElementById("aura-desk");
      const reduce = typeof matchMedia === "function"
        && matchMedia("(prefers-reduced-motion: reduce)").matches;
      desk?.scrollIntoView({
        block: "start",
        behavior: reduce ? "auto" : "smooth",
      });
      addressInputRef.current?.focus({ preventScroll: true });
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
    const [{
      AURA_EXAMPLE_CHART,
      AURA_EXAMPLE_HELD_SIGNS,
      AURA_EXAMPLE_HOLDINGS,
    }, { composeAura }] =
      modules;
    const now = new Date();
    setError("");
    invalidateSharePreview();
    setResult({
      holdings: AURA_EXAMPLE_HOLDINGS,
      revealMode: "animate",
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
    setStatus("Curator’s sample opened.");
    setError("");
    setShareState("idle");
    focusResultRef.current = true;
  };

  const updateSelectedChart = (nextId: string) => {
    const nextChart = selectedChart(profile.charts, nextId);
    setSelectedChartId(nextId);
    invalidateSharePreview();
    if (!result || result.mode === "example") return;
    trackAnalytics("aura_talisman_personalize", {
      state: nextChart ? "added" : "removed",
    });

    void loadAuraComposer()
      .then(({ composeAura }) => {
        setResult((current) => {
          if (!current || current.mode === "example") return current;
          return {
            ...current,
            chart: nextChart,
            composition: composeAura({
              heldSigns: current.composition.heldSigns,
              chart: nextChart,
              visitedAt: current.composition.asOf,
            }),
          };
        });
        const parsed = parseWalletAddress(address);
        if (parsed && parsed.chain === result.chain) {
          persistLookup({
            chain: result.chain,
            heldSigns: result.composition.heldSigns,
            holdings: result.holdings,
            checkedAt: result.checkedAt,
          }, nextChart, parsed.address);
        }
        setStatus(
          nextChart
            ? "The chart echo was added. The collection stayed in place."
            : "The chart echo was removed. The collection and dated sky remain.",
        );
      })
      .catch(() => {
        setError("The chart echo could not be updated on this device.");
      });
  };

  const createSharePreview = async (kind: AuraShareCardKind = "seal") => {
    if (!result || result.composition.heldSigns.length === 0) return;
    const generation = shareGenerationRef.current + 1;
    shareGenerationRef.current = generation;
    setShareState("busy");
    try {
      const prepared = kind === "cabinet"
        ? await prepareCabinetCard(result)
        : await prepareSealCard(result);
      if (shareGenerationRef.current !== generation) return;
      const url = URL.createObjectURL(prepared.blob);
      if (shareGenerationRef.current !== generation) {
        URL.revokeObjectURL(url);
        return;
      }
      setSharePreview({
        kind,
        blob: prepared.blob,
        url,
        shareSupported: prepared.shareSupported,
        accessibleDescription: prepared.accessibleDescription,
      });
      preparedShareActionRef.current = prepared.share;
      preparedDownloadActionRef.current = prepared.download;
      setShareState("idle");
      trackAnalytics("aura_share", { outcome: "preview", card: kind });
    } catch {
      if (shareGenerationRef.current === generation) setShareState("error");
    }
  };

  const shareReviewedCardKind = () => sharePreview?.kind ?? "seal";

  const shareReviewedCard = async () => {
    if (!sharePreview) return;
    const sharePreparedBlob = preparedShareActionRef.current;
    if (!sharePreparedBlob) {
      setShareState("error");
      return;
    }
    const generation = shareGenerationRef.current;
    const blob = sharePreview.blob;
    setShareState("busy");
    try {
      // Invoke the already-loaded share helper before the first await. On iOS,
      // this preserves the final button tap's user activation for navigator.share.
      const outcomePromise = sharePreparedBlob(blob);
      const outcome = await outcomePromise;
      if (shareGenerationRef.current !== generation) return;
      if (shareGenerationRef.current === generation) {
        setShareState(outcome === "cancelled" ? "idle" : outcome);
      }
      trackAnalytics("aura_share", { outcome, card: shareReviewedCardKind() });
    } catch {
      if (shareGenerationRef.current === generation) setShareState("error");
      trackAnalytics("aura_share", { outcome: "error", card: shareReviewedCardKind() });
    }
  };

  const downloadReviewedCard = async () => {
    if (!sharePreview) return;
    const downloadPreparedBlob = preparedDownloadActionRef.current;
    if (!downloadPreparedBlob) {
      setShareState("error");
      return;
    }
    const generation = shareGenerationRef.current;
    const blob = sharePreview.blob;
    setShareState("busy");
    try {
      if (shareGenerationRef.current !== generation) return;
      const outcome = downloadPreparedBlob(blob);
      if (shareGenerationRef.current === generation) setShareState(outcome);
      trackAnalytics("aura_share", { outcome, card: shareReviewedCardKind() });
    } catch {
      if (shareGenerationRef.current === generation) setShareState("error");
      trackAnalytics("aura_share", { outcome: "error", card: shareReviewedCardKind() });
    }
  };

  const closeSharePreview = () => {
    invalidateSharePreview();
  };

  const cabinetPreview = sharePreview?.kind === "cabinet" ? sharePreview : null;
  const stagedHoldings = result?.holdings ?? AURA_EXAMPLE_HOLDINGS;
  const stagedIllustrative = !result || result.mode === "example";
  const stagedRevealMode: AuraCabinetRevealMode = result?.revealMode ?? "settled";
  const activeSign =
    selectedSign ?? principalSign(stagedHoldings) ?? AURA_SIGN_ORDER[0];
  const stageKicker = stagedIllustrative
    ? "Curator’s sample"
    : result!.mode === "restored"
      ? "Collection restored"
      : "Collection opened";
  const stageRecordedNote = stagedIllustrative
    ? "Curator’s sample — no address was looked up."
    : `Recorded ${auraDateStamp(result!.checkedAt)} · ${result!.chain === "solana" ? "Solana" : "Base"}`;
  const stagePlateDate = stagedIllustrative
    ? null
    : auraDateStamp(result!.checkedAt);

  return (
    <div id="aura-composer" class="aura-composer">
      <header class="aura-page__hero">
        <div class="aura-page__hero-lede">
          <em class="kicker">The Registry</em>
          <h1 class="display">See your Zodiac collection.</h1>
          <p class="aura-page__hero-copy">
            Every Zodiac you hold takes its place in the Cabinet of Twelve —
            and the more of a sign you hold, the finer its edition: pastel,
            bronze, silver, or gold.
          </p>
        </div>
      <section class="aura-desk" id="aura-desk" aria-label="Open your collection">
      <form
        class="aura-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void compose(false);
        }}
        aria-busy={requestState === "busy"}
      >
          <div class="aura-desk__band">
            <div class="aura-field aura-field--address">
              <label for="aura-address">Wallet address</label>
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
              placeholder="Paste your wallet address"
              aria-describedby="aura-address-note aura-status"
              onInput={(event) => {
                requestRef.current?.abort();
                requestRef.current = null;
                clearStored();
                setRequestState("idle");
                setAddress(event.currentTarget.value);
                setAddressMode("pasted");
                if (result) {
                  setResult(null);
                  setSelectedChartId("");
                }
                setError("");
              }}
            />
            </div>
            <button
              class="btn btn--primary aura-desk__open"
              type="submit"
              disabled={!parsedAddress || requestState === "busy"}
            >
              {requestState === "busy" ? "Opening…" : "Show my collection"}
            </button>
          </div>
          <div class="aura-desk__meta">
            <p id="aura-address-note" class="aura-field__note">
              {detectedChain
                ? `Ready — this reads as a ${detectedChain === "solana" ? "Solana" : "Base"} address.`
                : "Works with Solana and Base wallets — the network is recognized as you type."}
            </p>
            {persistenceReady && !result && !address && (
              <button
                id="aura-primer-example"
                ref={exampleButtonRef}
                class="aura-desk__sample"
                type="button"
                onClick={(event) => void showExample(event.currentTarget)}
              >
                Watch a sample first <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <details class="aura-wallet-connect aura-desk-details">
            <summary>Wallet, storage, and method</summary>
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
              <span class="aura-wallet-line">
                <img
                  class="aura-chain-mark"
                  src="/assets/wallets/solana-mark.svg"
                  alt=""
                  width="15"
                  height="13"
                />
                <span>
                  {connectionBusy === "solana"
                    ? "Connecting…"
                    : "Connect Solana wallet"}
                </span>
              </span>
              {solanaWallets.length === 1 && (
                <span class="aura-wallet-via">
                  via {solanaWallets[0].name}
                  {walletIconSrc(solanaWallets[0].icon) && (
                    <img
                      class="aura-wallet-icon"
                      src={walletIconSrc(solanaWallets[0].icon)!}
                      alt=""
                      width="18"
                      height="18"
                    />
                  )}
                </span>
              )}
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
              <span class="aura-wallet-line">
                <img
                  class="aura-chain-mark"
                  src="/assets/wallets/base-mark.svg"
                  alt=""
                  width="14"
                  height="14"
                />
                <span>
                  {connectionBusy === "base"
                    ? "Connecting…"
                    : "Connect Base wallet"}
                </span>
              </span>
              {evmProviders.length === 1 && (
                <span class="aura-wallet-via">
                  via {evmProviders[0].info.name}
                  {walletIconSrc(evmProviders[0].info.icon) && (
                    <img
                      class="aura-wallet-icon"
                      src={walletIconSrc(evmProviders[0].info.icon)!}
                      alt=""
                      width="18"
                      height="18"
                    />
                  )}
                </span>
              )}
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
                      {walletIconSrc(wallet.icon) && (
                        <img
                          class="aura-wallet-icon"
                          src={walletIconSrc(wallet.icon)!}
                          alt=""
                          width="20"
                          height="20"
                        />
                      )}
                      <span>{wallet.name}</span>
                    </button>
                  ))
                ) : (
                  <p role="status">
                    No compatible Solana wallet was found in this browser. You
                    can paste a public address instead.
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
                      {walletIconSrc(provider.info.icon) && (
                        <img
                          class="aura-wallet-icon"
                          src={walletIconSrc(provider.info.icon)!}
                          alt=""
                          width="20"
                          height="20"
                        />
                      )}
                      <span>{provider.info.name}</span>
                    </button>
                  ))
                ) : (
                  <p role="status">
                    No compatible Base wallet was found in this browser. You can
                    paste a public address instead.
                  </p>
                )}
              </div>
            )}
          </div>
            <p class="aura-field__note">
              Connecting a wallet simply fills the public address field —
              nothing is signed, and nothing can move.
            </p>

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
                      holdings: result.holdings,
                      checkedAt: result.checkedAt,
                      chartId: result.chart?.id,
                    });
                  }
                }
              }}
            />
            <span>
              Remember this address for 24 hours
            </span>
          </label>
          <p id="aura-storage-note" class="aura-field__note aura-storage-note">
            This tab keeps the lookup for up to 8 hours. Choose Remember for up
            to 24 hours.
          </p>
          <p class="aura-field__note aura-desk-method">
            The lookup is read-only: it sends the public address to its
            holdings provider and checks only for the Twelve. Today’s Sun and
            Moon are computed on this device.{" "}
            <a href="/privacy/">Privacy</a> ·{" "}
            <a href="/disclosure/">Disclosure</a>
          </p>
          </details>
      </form>

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
            See the sample instead
          </button>
        </div>
      )}
      </section>
      </header>

      <section class="aura-stage" aria-label="The collection cabinet">
        <AuraCollectionCabinet
          key={result?.checkedAt ?? "sample"}
          holdings={stagedHoldings}
          revealMode={stagedRevealMode}
          selectedSign={activeSign}
          onSelect={(sign) => {
            setSelectedSign(sign);
            trackAnalytics("aura_cabinet_select");
          }}
          onRevealOutcome={
            stagedRevealMode === "animate"
              ? (outcome) => trackAnalytics("aura_cabinet_reveal", { outcome })
              : undefined
          }
          illustrative={stagedIllustrative}
          kicker={stageKicker}
          recordedNote={stageRecordedNote}
          plateDate={stagePlateDate}
          headingRef={resultHeadingRef}
        />

        {result && !stagedIllustrative && (
          <div class="aura-stage__share">
            <button
              ref={cabinetShareRef}
              class="btn btn--primary"
              type="button"
              onClick={() => void createSharePreview("cabinet")}
              disabled={shareState === "busy" && cabinetPreview === null}
            >
              {shareState === "busy" && cabinetPreview === null
                ? "Creating preview…"
                : cabinetPreview
                  ? "Rebuild cabinet image"
                  : "Share this cabinet"}
            </button>
            <p class="aura-stage__share-note">
              An image of the case as it stands — the twelve seats, their
              editions, and today’s date. Never the address.
            </p>
          </div>
        )}

        {cabinetPreview && (
          <AuraSharePreview
            kind="cabinet"
            previewUrl={cabinetPreview.url}
            shareSupported={cabinetPreview.shareSupported}
            accessibleDescription={cabinetPreview.accessibleDescription}
            busy={shareState === "busy"}
            returnFocusRef={cabinetShareRef}
            onShare={() => void shareReviewedCard()}
            onDownload={() => void downloadReviewedCard()}
            onClose={closeSharePreview}
          />
        )}
      </section>

      <section class="aura-editions" aria-labelledby="aura-editions-title">
        <p class="aura-editions__kicker">How the cabinet works</p>
        <h2 id="aura-editions-title">
          Five editions, one rule: the more of a sign an address holds, the
          finer its casting.
        </h2>
        <ol class="aura-editions__ladder">
          {EDITION_ORDER.map((edition) => (
            <li
              key={edition}
              class={`aura-editions__row aura-editions__row--${edition}`}
            >
              <span class="aura-editions__numeral" aria-hidden="true">
                {EDITION_META[edition].numeral}
              </span>
              <span class="aura-editions__name">{EDITION_META[edition].name}</span>
              <span class="aura-editions__range">{EDITION_META[edition].range}</span>
              <span class="aura-editions__material">
                {EDITION_META[edition].material}
              </span>
            </li>
          ))}
        </ol>
        <div class="aura-editions__notes">
          <p>
            Each seat follows one balance — its own sign. Carry a sign past
            10,000 and its pastel medallion is set in a bronze rim sealed II;
            past 100,000, silver sealed III; at one million, the sign itself is
            cast in gold. Editions are read from the public record, never
            granted: a re-check records whatever the balance has become, finer
            or plainer.
          </p>
          <p>
            Gold counts in sculptures — one for each complete million held. The
            tenth sculpture in a single seat, 10,000,000 held, is the last
            edition — Crown Gold. That seat is framed in gold, the case is gilded around it,
            and the whole cabinet carries a cast plate sealed V. A seat badge
            shows up to ×99; beyond that it reads ×99+ and the placard keeps
            the exact count.
          </p>
          <p>
            Arrangements follow presence alone: an opposite pair, an element
            triptych, or a modality quartet completes the moment its signs are
            represented, whatever their editions. When all twelve signs stand
            in the cabinet, the case takes its engraved plate — The Complete
            Twelve, recorded with the date of the reading. Few cabinets are
            ever finished.
          </p>
          <p>
            The cabinet is a dated reading of standing, not a score: it shows
            what one public address keeps, in editions anyone can verify. The
            sky marks on the seal are computed fresh for each visit; the
            editions stand as recorded until the collection is read again.
          </p>
        </div>
      </section>

      {result && (
        <AuraResult
          key={result.checkedAt}
          composition={result.composition}
          holdings={result.holdings}
          chart={result.chart}
          chain={result.chain}
          checkedAt={result.checkedAt}
          addressMode={result.mode}
          selectedSign={activeSign}
          refreshing={requestState === "busy"}
          shareState={shareState}
          sharePreviewUrl={sharePreview?.kind === "seal" ? sharePreview.url : null}
          shareSupported={sharePreview?.shareSupported ?? false}
          shareAccessibleDescription={sharePreview?.accessibleDescription ?? ""}
          profileReady={profileReady}
          availableCharts={profile.charts}
          selectedChartId={selectedChartId}
          onRefresh={() => void compose(true)}
          onClear={clearAura}
          onOpenCollection={openCollectionDesk}
          onShowExample={showExample}
          onSelectChart={updateSelectedChart}
          onCreateSharePreview={() => void createSharePreview()}
          onSharePreview={() => void shareReviewedCard()}
          onDownloadPreview={() => void downloadReviewedCard()}
          onCloseSharePreview={closeSharePreview}
        />
      )}
    </div>
  );
}
