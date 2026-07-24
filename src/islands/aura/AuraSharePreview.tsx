import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

interface AuraSharePreviewProps {
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
      aria-labelledby="aura-share-preview-title"
      aria-describedby="aura-share-preview-note"
    >
      <header>
        <p class="aura-result__kicker">Artwork preview</p>
        <h4 id="aura-share-preview-title" ref={headingRef} tabIndex={-1}>
          Review your talisman
        </h4>
        <p id="aura-share-preview-note">
          The represented signs, their material editions, and the dated sky.
        </p>
      </header>
      <figure>
        <p id="aura-share-preview-card-description" class="sr-only">
          {accessibleDescription}
        </p>
        <img
          src={previewUrl}
          width="1080"
          height="1350"
          alt="Preview of the Registry Collection dated talisman"
          aria-describedby="aura-share-preview-card-description"
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
