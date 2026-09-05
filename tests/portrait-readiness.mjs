/** Self-contained so Playwright can evaluate it in the image's document. */
export function waitForPortraitReadiness(image, timeoutMs = 10_000) {
  const state = () => ({
    src: image?.getAttribute('src') ?? null,
    currentSrc: image?.currentSrc ?? null,
    complete: image?.complete ?? false,
    naturalWidth: image?.naturalWidth ?? 0,
    naturalHeight: image?.naturalHeight ?? 0,
  });
  if (!image) return Promise.resolve({ ready: false, error: 'portrait element missing', ...state() });

  return new Promise((resolve) => {
    let settled = false;
    let decoding = false;
    const finish = (ready, error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.removeEventListener('load', decode);
      image.removeEventListener('error', failed);
      resolve({ ready, error, ...state() });
    };
    const failed = () => finish(false, 'portrait load error');
    const decode = () => {
      if (settled || decoding) return;
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        finish(false, 'portrait completed without natural dimensions');
        return;
      }
      decoding = true;
      Promise.resolve().then(() => image.decode()).then(
        () => finish(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
        (error) => finish(false, `portrait decode failed: ${String(error)}`),
      );
    };
    const timer = setTimeout(() => finish(false, `portrait readiness exceeded ${timeoutMs}ms`), timeoutMs);
    image.addEventListener('load', decode);
    image.addEventListener('error', failed);
    // Register first so completion between the initial read and listener setup
    // cannot be missed. The same deadline also bounds a stalled decode().
    if (image.complete) decode();
  });
}
