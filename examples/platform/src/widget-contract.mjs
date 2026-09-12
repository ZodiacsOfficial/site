export function skyURL(theme, accent) {
  if (theme !== 'dark' && theme !== 'light') throw new RangeError('Theme must be dark or light.');
  if (typeof accent !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(accent) || accent.trim() !== accent) {
    throw new RangeError('Accent must be an opaque six-digit color, such as #7B6DA8.');
  }
  const url = new URL('https://zodiacs.org/embed/sky/');
  url.searchParams.set('theme', theme);
  url.searchParams.set('accent', accent);
  return url.href;
}
export const SANDBOX = 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox';
