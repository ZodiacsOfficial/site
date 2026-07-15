export const WIDGET_KINDS = ['moon', 'sky', 'chart'] as const;
export const WIDGET_THEMES = ['dark', 'light'] as const;
export const WIDGET_MODES = ['iframe', 'script'] as const;

export type WidgetKind = typeof WIDGET_KINDS[number];
export type WidgetTheme = typeof WIDGET_THEMES[number];
export type WidgetMode = typeof WIDGET_MODES[number];

export interface WidgetDimensions {
  width: number;
  height: number;
}

export const WIDGET_DIMENSIONS: Readonly<Record<WidgetKind, WidgetDimensions>> = Object.freeze({
  moon: { width: 360, height: 250 },
  sky: { width: 480, height: 250 },
  chart: { width: 400, height: 610 },
});

export function isWidgetKind(value: string): value is WidgetKind {
  return WIDGET_KINDS.includes(value as WidgetKind);
}

export function isWidgetTheme(value: string): value is WidgetTheme {
  return WIDGET_THEMES.includes(value as WidgetTheme);
}

export function isWidgetMode(value: string): value is WidgetMode {
  return WIDGET_MODES.includes(value as WidgetMode);
}

export function normalizeAccent(value: string | null | undefined): string | null {
  const candidate = value?.trim() ?? '';
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toUpperCase() : null;
}

function channelLuminance(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function colorChannels(value: string): [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function relativeLuminance(value: string): number {
  const [red, green, blue] = colorChannels(value).map(channelLuminance);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function widgetContrastRatio(foreground: string, background: string): number {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Keep the host hue while moving luminance only as far as WCAG AA requires.
 * The accent is used for 11px link text, so the normal-text 4.5:1 floor
 * applies rather than the more permissive large-text threshold.
 */
export function widgetAccentForTheme(
  value: string | null | undefined,
  theme: WidgetTheme,
): string | null {
  const accent = normalizeAccent(value);
  if (!accent) return null;
  const background = theme === 'dark' ? '#0A0C11' : '#FBFAF7';
  if (widgetContrastRatio(accent, background) >= 4.5) return accent;

  const source = colorChannels(accent);
  const target = theme === 'dark' ? 255 : 0;
  for (let step = 1; step <= 100; step += 1) {
    const amount = step / 100;
    const adjusted = source.map((channel) => Math.round(channel + (target - channel) * amount));
    const hex = `#${adjusted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    if (widgetContrastRatio(hex, background) >= 4.5) return hex;
  }
  return theme === 'dark' ? '#FFFFFF' : '#000000';
}

export function widgetEmbedUrl(
  origin: string,
  kind: WidgetKind,
  theme: WidgetTheme,
  accent?: string | null,
): string {
  const url = new URL(`/embed/${kind}/`, origin);
  url.searchParams.set('theme', theme);
  const safeAccent = normalizeAccent(accent);
  if (safeAccent) url.searchParams.set('accent', safeAccent);
  return url.toString();
}

function attribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function iframeEmbedCode(options: {
  origin: string;
  kind: WidgetKind;
  theme: WidgetTheme;
  accent?: string | null;
  title: string;
}): string {
  const dimensions = WIDGET_DIMENSIONS[options.kind];
  const src = widgetEmbedUrl(options.origin, options.kind, options.theme, options.accent);
  return `<iframe src="${attribute(src)}" title="${attribute(options.title)}" width="${dimensions.width}" height="${dimensions.height}" style="border:0;border-radius:14px;overflow:hidden;max-width:100%" loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function scriptEmbedCode(options: {
  origin: string;
  kind: WidgetKind;
  theme: WidgetTheme;
  accent?: string | null;
  title: string;
}): string {
  const src = new URL('/assets/widgets.js', options.origin).toString();
  const accent = normalizeAccent(options.accent);
  const accentAttribute = accent ? ` data-accent="${accent}"` : '';
  return `<script async src="${attribute(src)}" data-zodiacs-widget="${options.kind}" data-theme="${options.theme}"${accentAttribute} data-title="${attribute(options.title)}"></script>`;
}
