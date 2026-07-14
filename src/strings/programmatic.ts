export const PROGRAMMATIC_EN = Object.freeze({
  compatibilityPrefillCta: 'Open the calculator with {a} and {b} loaded',
});

export function programmaticText(
  key: keyof typeof PROGRAMMATIC_EN,
  values: Record<string, string | number> = {},
): string {
  return PROGRAMMATIC_EN[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
