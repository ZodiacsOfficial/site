const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

function parsedUtcDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

export function utcDate(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) throw new Error('invalid current date');
  return now.toISOString().slice(0, 10);
}

export function isCurrentUtcEdition(editionDate: string, now: Date = new Date()): boolean {
  return parsedUtcDate(editionDate) !== null && editionDate === utcDate(now);
}

export function editionDateLabel(editionDate: string): string {
  const parsed = parsedUtcDate(editionDate);
  if (!parsed) return editionDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/**
 * Convert relative current-day language into an explicit archival label.
 * The dated form is also the server/no-JavaScript fallback; the browser only
 * restores the relative wording after proving that the edition is current.
 */
export function datedEditionText(value: string, editionDate: string): string {
  const label = editionDateLabel(editionDate);
  return value
    .replace(/\bToday[’']s\b/gu, `The ${label} edition’s`)
    .replace(/\btoday[’']s\b/gu, `the ${label} edition’s`)
    .replace(/\bToday,/gu, `For the ${label} edition,`)
    .replace(/\bToday\b/gu, `The ${label} edition`)
    .replace(/\bas of today\b/gu, `as of ${label}`)
    .replace(/\b(for|from|on|until|through|since|before|after|by) today\b/gu, `$1 ${label}`)
    .replace(/\btoday\b/gu, `on ${label}`);
}

export function millisecondsUntilNextUtcDay(now: Date = new Date()): number {
  if (Number.isNaN(now.getTime())) throw new Error('invalid current date');
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, next - now.getTime() + 1_000);
}

function replaceTextNode(node: Text, editionDate: string): void {
  if (node.parentElement?.closest('[data-edition-current-only]')) return;
  const current = node.nodeValue ?? '';
  const dated = datedEditionText(current, editionDate);
  if (dated !== current) node.nodeValue = dated;
}

function dateNode(node: Node, editionDate: string): void {
  if (node.nodeType === Node.TEXT_NODE) {
    replaceTextNode(node as Text, editionDate);
    return;
  }
  if (!(node instanceof Element)) return;
  if (node.matches('script, style, noscript')) return;

  for (const attribute of ['aria-label', 'title']) {
    const value = node.getAttribute(attribute);
    if (!value) continue;
    const dated = datedEditionText(value, editionDate);
    if (dated !== value) node.setAttribute(attribute, dated);
  }
  node.childNodes.forEach((child) => dateNode(child, editionDate));
}

function editionScopes(root: HTMLElement): HTMLElement[] {
  return Array.from(root.ownerDocument.querySelectorAll<HTMLElement>('[data-edition-content]'));
}

export function applyEditionFreshness(root: HTMLElement, now: Date = new Date()): 'current' | 'dated' | null {
  const editionDate = root.dataset.editionDate;
  if (!editionDate) return null;
  const state = isCurrentUtcEdition(editionDate, now) ? 'current' : 'dated';
  root.dataset.editionState = state;

  for (const scope of editionScopes(root)) if (state === 'dated') dateNode(scope, editionDate);
  return state;
}

/** Keep an already-open daily page honest across hydration and UTC midnight. */
export function installEditionFreshnessGuard(root: HTMLElement = document.documentElement): () => void {
  const editionDate = root.dataset.editionDate;
  if (!editionDate) return () => {};

  let timer = 0;
  let observer: MutationObserver | null = null;
  const update = () => applyEditionFreshness(root, new Date());
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      update();
      schedule();
    }, millisecondsUntilNextUtcDay(new Date()));
  };
  const refreshVisiblePage = () => {
    if (document.visibilityState === 'visible') update();
  };

  update();
  observer = new MutationObserver((records) => {
    if (root.dataset.editionState !== 'dated') return;
    for (const record of records) {
      if (record.type === 'characterData') dateNode(record.target, editionDate);
      record.addedNodes.forEach((node) => dateNode(node, editionDate));
    }
  });
  for (const scope of editionScopes(root)) {
    observer.observe(scope, { childList: true, characterData: true, subtree: true });
  }
  document.addEventListener('visibilitychange', refreshVisiblePage);
  window.addEventListener('pageshow', update);
  schedule();

  return () => {
    window.clearTimeout(timer);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', refreshVisiblePage);
    window.removeEventListener('pageshow', update);
  };
}
