import { BRAND_ICON_PATHS } from "./brand-icons.mjs";

export const SHARE_CARD_BRAND_INK = "#8E96AB";

export interface ShareCardBrandLayout {
  wordmarkX: number;
  centerY: number;
  iconSize: number;
  fontSize: number;
  gap?: number;
  serif?: string;
}

export type LoadedShareBrandIcon = CanvasImageSource & { close?: () => void };

async function imageElementFromBlob(blob: Blob): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") return null;
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("brand_icon_load_failed"));
      image.src = url;
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Loads the canonical twelve-sign profile image used by exported charts. */
export async function loadShareBrandIcon(): Promise<LoadedShareBrandIcon | null> {
  try {
    const response = await fetch(BRAND_ICON_PATHS.icon512);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(blob);
      } catch {
        // WebKit can expose createImageBitmap without decoding every PNG.
      }
    }
    return await imageElementFromBlob(blob);
  } catch {
    return null;
  }
}

/** Paints the approved profile-image + lowercase wordmark export lockup. */
export function drawShareBrandLockup(
  context: CanvasRenderingContext2D,
  icon: LoadedShareBrandIcon | null,
  layout: ShareCardBrandLayout,
): void {
  const wordmark = "zodiacs.org";
  const gap = layout.gap ?? 0;
  const serif = layout.serif ?? '"EB Garamond", Georgia, serif';

  context.textBaseline = "middle";
  context.textAlign = "right";
  context.fillStyle = SHARE_CARD_BRAND_INK;
  context.font = `500 ${layout.fontSize}px ${serif}`;

  if (icon) {
    const iconX = layout.wordmarkX
      - context.measureText(wordmark).width
      - gap
      - layout.iconSize;
    const iconY = layout.centerY - layout.iconSize / 2;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(icon, iconX, iconY, layout.iconSize, layout.iconSize);
  }

  context.fillText(wordmark, layout.wordmarkX, layout.centerY);
}
