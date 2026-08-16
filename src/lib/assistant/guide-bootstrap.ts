/**
 * Lightweight, privacy-neutral Guide shell. This entry mounts only the
 * launcher and proactive welcome; the conversation drawer is fetched after a
 * deliberate user action.
 */
import './guide-bootstrap.css';

export type AssistantLocale = 'en' | 'es' | 'pt' | 'fr' | 'it' | 'ru';

interface ShellCopy {
  open: string;
  invite: string;
  inviteAction: string;
  dismissInvite: string;
}

interface DrawerModule {
  openAssistant(locale?: string, from?: HTMLElement | null): Promise<void>;
}

const COPY: Record<AssistantLocale, ShellCopy> = {
  en: {
    open: 'Open Guide',
    invite: 'I can help with this page, astrology, your birth chart, or Astrofolio.',
    inviteAction: 'Ask Guide',
    dismissInvite: 'Dismiss Guide welcome',
  },
  es: {
    open: 'Abrir Guide',
    invite: 'Puedo ayudarte con esta página, astrología, tu carta natal o Astrofolio.',
    inviteAction: 'Preguntar a Guide',
    dismissInvite: 'Cerrar la bienvenida de Guide',
  },
  pt: {
    open: 'Abrir Guide',
    invite: 'Posso ajudar com esta página, astrologia, seu mapa natal ou Astrofolio.',
    inviteAction: 'Perguntar ao Guide',
    dismissInvite: 'Fechar boas-vindas do Guide',
  },
  fr: {
    open: 'Ouvrir Guide',
    invite: 'Je peux aider avec cette page, l’astrologie, ton thème natal ou Astrofolio.',
    inviteAction: 'Demander à Guide',
    dismissInvite: 'Fermer l’accueil de Guide',
  },
  it: {
    open: 'Apri Guide',
    invite: 'Posso aiutarti con questa pagina, astrologia, il tuo tema natale o Astrofolio.',
    inviteAction: 'Chiedi a Guide',
    dismissInvite: 'Chiudi il benvenuto di Guide',
  },
  ru: {
    open: 'Открыть Guide',
    invite: 'Я могу помочь с этой страницей, астрологией, вашей натальной картой или Astrofolio.',
    inviteAction: 'Спросить Guide',
    dismissInvite: 'Закрыть приветствие Guide',
  },
};

const STYLESHEET_HREF = '/assets/assistant-ui.css';
const DRAWER_MODULE_HREF = '/assets/assistant-drawer.js';
const GUIDE_AVATAR_SRC = '/assets/guide-avatar.webp';
const INVITE_KEY = 'zodiacs.guide.welcome-seen.v1';
const INVITE_DELAY_MS = 7_000;

let stylesheetPromise: Promise<void> | null = null;
let drawerModulePromise: Promise<DrawerModule> | null = null;
let launcher: HTMLButtonElement | null = null;
let invite: HTMLElement | null = null;
let inviteTimer = 0;
let inviteVisibilityWired = false;
let inviteSeenInMemory = false;
let locale: AssistantLocale = 'en';
let openersWired = false;
let portraitPromise: Promise<HTMLImageElement> | null = null;

function normalizeLocale(value?: string): AssistantLocale {
  const candidate = (value ?? document.documentElement.lang).trim().toLowerCase();
  for (const released of ['en', 'es', 'pt', 'fr', 'it', 'ru'] as const) {
    if (candidate === released || candidate.startsWith(`${released}-`)) return released;
  }
  return 'en';
}

function ensureStylesheet(): Promise<void> {
  if (stylesheetPromise) return stylesheetPromise;
  const existing = document.querySelector<HTMLLinkElement>(`link[href="${STYLESHEET_HREF}"]`);
  const link = existing ?? document.createElement('link');
  if (!existing) {
    link.rel = 'stylesheet';
    link.href = STYLESHEET_HREF;
    link.dataset.assistantStyles = 'shell';
    link.setAttribute('fetchpriority', 'low');
  }
  stylesheetPromise = new Promise((resolve) => {
    if (link.sheet) return resolve();
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
  if (!existing) document.head.append(link);
  return stylesheetPromise;
}

function safeSessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function safeSessionSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* memory fallback below */ }
}

function loadPortrait(): Promise<HTMLImageElement> {
  if (portraitPromise) return portraitPromise;
  portraitPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Guide portrait unavailable'));
    image.src = GUIDE_AVATAR_SRC;
  });
  return portraitPromise;
}

function paintPortrait(canvas: HTMLCanvasElement, size: number): void {
  const scale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(size * scale);
  canvas.height = Math.round(size * scale);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(scale, scale);
  context.fillStyle = '#050506';
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  const metal = context.createRadialGradient(size * 0.43, size * 0.38, 0, size / 2, size / 2, size * 0.27);
  metal.addColorStop(0, '#ffffff');
  metal.addColorStop(1, '#bfc3c9');
  context.fillStyle = metal;
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.26, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#111214';
  context.lineWidth = Math.max(1.5, size * 0.055);
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(size * 0.39, size * 0.66);
  context.lineTo(size * 0.61, size * 0.34);
  context.moveTo(size * 0.39, size * 0.66);
  context.lineTo(size * 0.53, size * 0.52);
  context.stroke();

  // Canvas is deliberately not an LCP image candidate. Once the small local
  // asset arrives, paint the exact user-supplied portrait into the same fixed
  // geometry without creating a model-visible or remotely fetched surface.
  void loadPortrait().then((image) => {
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, size, size);
    context.save();
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, 0, 0, size, size);
    context.restore();
    canvas.dataset.guidePortrait = 'ready';
  }).catch(() => {});
}

function createPortrait(className: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = `zguide-shell-portrait ${className}`;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  paintPortrait(canvas, size);
  return canvas;
}

function currentCopy(): ShellCopy {
  return COPY[locale];
}

function stopInviteScheduling(): void {
  if (inviteTimer) window.clearTimeout(inviteTimer);
  inviteTimer = 0;
  if (inviteVisibilityWired) {
    document.removeEventListener('visibilitychange', onInviteVisibilityChange);
    inviteVisibilityWired = false;
  }
}

function dismissInvite(): void {
  stopInviteScheduling();
  invite?.remove();
  invite = null;
  launcher?.removeAttribute('hidden');
  inviteSeenInMemory = true;
  safeSessionSet(INVITE_KEY, '1');
}

async function loadDrawer(): Promise<DrawerModule> {
  drawerModulePromise ??= import(DRAWER_MODULE_HREF) as Promise<DrawerModule>;
  try {
    return await drawerModulePromise;
  } catch (error) {
    drawerModulePromise = null;
    throw error;
  }
}

/** Backward-compatible public facade for legacy Guide openers. */
export async function openAssistant(
  requestedLocale?: string,
  from?: HTMLElement | null,
): Promise<void> {
  await bootstrapGuide(requestedLocale);
  const restoreTarget = from?.isConnected && !from.closest('.zguide-invite') ? from : launcher;
  dismissInvite();
  const drawer = await loadDrawer();
  await drawer.openAssistant(requestedLocale ?? locale, restoreTarget);
}

function buildLauncher(): void {
  const existing = document.querySelector<HTMLButtonElement>('[data-guide-launcher]');
  if (existing) {
    launcher = existing;
    return;
  }
  launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'zguide-launcher';
  launcher.dataset.guideLauncher = '';
  launcher.setAttribute('aria-label', currentCopy().open);
  const label = document.createElement('span');
  label.textContent = 'Guide';
  launcher.append(createPortrait('zguide-launcher__avatar', 32), label);
  launcher.addEventListener('click', () => void openAssistant(undefined, launcher));
  document.body.append(launcher);
}

function wireOpeners(): void {
  if (openersWired) return;
  openersWired = true;
  document.querySelectorAll<HTMLElement>('[data-assistant-open]').forEach((button) => {
    button.dataset.guideWired = 'shell';
  });
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-assistant-open]')
      : null;
    if (!target || target === launcher) return;
    void openAssistant(target.dataset.assistantLocale, target);
  });
}

function showInvite(): void {
  if (
    invite || inviteSeenInMemory || safeSessionGet(INVITE_KEY) === '1'
    || document.visibilityState !== 'visible'
    || !launcher || launcher.getAttribute('aria-expanded') === 'true'
  ) return;
  stopInviteScheduling();
  inviteSeenInMemory = true;
  safeSessionSet(INVITE_KEY, '1');
  const copy = currentCopy();
  invite = document.createElement('aside');
  invite.className = 'zguide-invite';
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'zguide-invite__dismiss';
  dismiss.setAttribute('aria-label', copy.dismissInvite);
  dismiss.textContent = '×';
  const identity = document.createElement('div');
  identity.className = 'zguide-invite__identity';
  const label = document.createElement('strong');
  label.textContent = 'Guide';
  identity.append(createPortrait('zguide-invite__avatar', 38), label);
  const message = document.createElement('p');
  message.textContent = copy.invite;
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'zguide-invite__action';
  action.textContent = copy.inviteAction;
  dismiss.addEventListener('click', dismissInvite);
  action.addEventListener('click', () => void openAssistant(undefined, launcher));
  invite.append(dismiss, identity, message, action);
  launcher.setAttribute('hidden', '');
  document.body.append(invite);
}

function scheduleInvite(): void {
  if (
    invite || inviteTimer || inviteSeenInMemory || safeSessionGet(INVITE_KEY) === '1'
    || document.visibilityState !== 'visible'
  ) return;
  inviteTimer = window.setTimeout(() => {
    inviteTimer = 0;
    if (document.visibilityState === 'visible') showInvite();
  }, INVITE_DELAY_MS);
}

function onInviteVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    scheduleInvite();
    return;
  }
  if (inviteTimer) window.clearTimeout(inviteTimer);
  inviteTimer = 0;
}

function wireInviteVisibility(): void {
  if (inviteVisibilityWired) return;
  inviteVisibilityWired = true;
  document.addEventListener('visibilitychange', onInviteVisibilityChange);
}

/** Mount the default-visible launcher and one quiet, non-modal welcome. */
export async function bootstrapGuide(requestedLocale?: string): Promise<void> {
  locale = normalizeLocale(requestedLocale);
  await ensureStylesheet();
  buildLauncher();
  launcher?.setAttribute('aria-label', currentCopy().open);
  wireOpeners();
  if (!inviteSeenInMemory && safeSessionGet(INVITE_KEY) !== '1') {
    wireInviteVisibility();
    scheduleInvite();
  }
}
