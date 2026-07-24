import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

/** Copy that follows the card being reviewed, so the dialog never mislabels it. */
const COPY = {
  seal: {
    title: "Review your talisman",
    note: "The represented signs, their material editions, and the dated sky.",
    alt: "Preview of the Registry Collection dated talisman",
    id: "aura-share-preview",
  },
  cabinet: {
    title: "Review your cabinet",
    note: "The twelve seats, the editions this collection earned, and the places still reserved.",
    alt: "Preview of the Cabinet of Twelve collection card",
    id: "aura-cabinet-preview",
  },
} as const;

interface AuraSharePreviewProps {
  /** Which card is under review; defaults to the dated talisman. */
  kind?: keyof typeof COPY;
  previewUrl: string;
  shareSupported: boolean;
  accessibleDescription: string;
  busy: boolean;
  returnFocusRef: RefObject<HTMLButtonElement>;
  onShare(): void;
  onDownload(): void;
  onClose(): void;
}

export function AuraSharePreview({
  kind = "seal",
  previewUrl,
  shareSupported,
  accessibleDescription,
  busy,
  returnFocusRef,
  onShare,
  onDownload,
  onClose,
}: AuraSharePreviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copy = COPY[kind];

  useEffect(() => {
    headingRef.current?.focus();
  }, [previewUrl]);

  const close = () => {
    onClose();
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  return (
    <section
      class="aura-share-preview"
      aria-labelledby={`${copy.id}-title`}
      aria-describedby={`${copy.id}-note`}
    >
      <header>
        <p class="aura-result__kicker">Artwork preview</p>
        <h4 id={`${copy.id}-title`} ref={headingRef} tabIndex={-1}>
          {copy.title}
        </h4>
        <p id={`${copy.id}-note`}>{copy.note}</p>
      </header>
      <figure>
        <p id={`${copy.id}-card-description`} class="sr-only">
          {accessibleDescription}
        </p>
        <img
          src={previewUrl}
          width="1080"
          height="1350"
          alt={copy.alt}
          aria-describedby={`${copy.id}-card-description`}
          draggable={false}
        />
      </figure>
      <div class="aura-share-preview__actions">
        {shareSupported && (
          <button
            class="btn btn--primary"
            type="button"
            onClick={() => {
              if (!busy) onShare();
            }}
            aria-disabled={busy}
          >
            Share image
          </button>
        )}
        <button
          class={shareSupported ? "btn btn--ghost" : "btn btn--primary"}
          type="button"
          onClick={() => {
            if (!busy) onDownload();
          }}
          aria-disabled={busy}
        >
          Download PNG
        </button>
        <button
          class="btn btn--ghost"
          type="button"
          onClick={() => {
            if (!busy) close();
          }}
          aria-disabled={busy}
        >
          Close preview
        </button>
      </div>
      {!shareSupported && (
        <p class="aura-share-preview__fallback">
          This browser does not offer file sharing. Download the reviewed PNG
          instead.
        </p>
      )}
    </section>
  );
}
