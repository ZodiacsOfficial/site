import { trackAnalytics } from './analytics';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
let contextHelpId = 0;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

/**
 * Adds the same lightweight interaction contract to Astro and Preact markup.
 * The caller owns the HTML; this helper owns only visibility and positioning.
 */
export function bindContextHelp(root: HTMLElement): () => void {
  const trigger = root.querySelector<HTMLElement>('[data-context-help-trigger]');
  const panel = root.querySelector<HTMLElement>('[data-context-help-panel]');
  if (!trigger || !panel) return () => {};

  const panelId = panel.id || `astro-term-help-${++contextHelpId}`;
  panel.id = panelId;
  panel.setAttribute('popover', 'manual');
  trigger.setAttribute('aria-controls', panelId);

  const supportsPopover = typeof panel.showPopover === 'function';

  let pinned = false;
  let closeTimer = 0;

  const isOpen = () => supportsPopover
    ? panel.matches(':popover-open')
    : !panel.hidden;

  const position = () => {
    if (!isOpen()) return;
    const margin = 12;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const left = clamp(
      triggerRect.left,
      margin,
      window.innerWidth - panelRect.width - margin,
    );
    const fitsBelow = triggerRect.bottom + gap + panelRect.height <= window.innerHeight - margin;
    const top = fitsBelow
      ? triggerRect.bottom + gap
      : Math.max(margin, triggerRect.top - panelRect.height - gap);
    panel.style.setProperty('--context-help-left', `${Math.round(left)}px`);
    panel.style.setProperty('--context-help-top', `${Math.round(top)}px`);
  };

  const open = () => {
    window.clearTimeout(closeTimer);
    if (isOpen()) {
      position();
      return;
    }
    panel.hidden = false;
    if (supportsPopover) panel.showPopover();
    trigger.setAttribute('aria-expanded', 'true');
    position();
    trackAnalytics('context_help_opened', {
      term: root.dataset.contextHelpTerm ?? '',
      surface: root.dataset.contextHelpSurface ?? 'inline',
    });
  };

  const close = (returnFocus = false) => {
    window.clearTimeout(closeTimer);
    if (!isOpen()) return;
    pinned = false;
    if (supportsPopover) panel.hidePopover();
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    panel.style.removeProperty('--context-help-left');
    panel.style.removeProperty('--context-help-top');
    if (returnFocus) trigger.focus();
  };

  const scheduleClose = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (!pinned && !root.contains(document.activeElement)) close();
    }, 100);
  };

  const onPointerEnter = () => {
    if (window.matchMedia(FINE_POINTER).matches) open();
  };
  const onPointerLeave = () => scheduleClose();
  const onFocusIn = () => open();
  const onFocusOut = (event: FocusEvent) => {
    if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget)) {
      scheduleClose();
    }
  };
  const onClick = () => {
    if (isOpen() && pinned) {
      close();
      return;
    }
    pinned = true;
    open();
  };
  const onDocumentPointerDown = (event: PointerEvent) => {
    if (event.target instanceof Node && !root.contains(event.target)) close();
  };
  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  };

  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  trigger.addEventListener('click', onClick);
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onDocumentKeyDown, true);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);

  return () => {
    window.clearTimeout(closeTimer);
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    trigger.removeEventListener('click', onClick);
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    document.removeEventListener('keydown', onDocumentKeyDown, true);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
  };
}
