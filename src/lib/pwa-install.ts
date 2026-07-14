export const PWA_COMPUTE_COUNT_KEY = 'zodiacs.install.compute-count.v1';
export const PWA_INSTALL_DISMISSED_KEY = 'zodiacs.install.dismissed.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function recordChartComputation(storage: StorageLike): boolean {
  try {
    if (storage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1') return false;
    const current = Number.parseInt(storage.getItem(PWA_COMPUTE_COUNT_KEY) ?? '0', 10);
    const next = Math.min(Number.isFinite(current) ? current + 1 : 1, 2);
    storage.setItem(PWA_COMPUTE_COUNT_KEY, String(next));
    return next >= 2;
  } catch {
    return false;
  }
}

export function dismissPwaInstall(storage: StorageLike): void {
  try {
    storage.setItem(PWA_INSTALL_DISMISSED_KEY, '1');
  } catch {
    // A browser that blocks persistence gets no repeated in-session prompt:
    // the component also hides its own state immediately.
  }
}

export function pwaInstallDismissed(storage: StorageLike): boolean {
  try {
    return storage.getItem(PWA_INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return true;
  }
}

export function isStandalonePwa(
  navigatorLike: Navigator & { standalone?: boolean },
  matchMedia: (query: string) => MediaQueryList,
): boolean {
  return navigatorLike.standalone === true || matchMedia('(display-mode: standalone)').matches;
}
