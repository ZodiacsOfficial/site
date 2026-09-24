/**
 * A person's initial: the first letter or digit of the name they chose,
 * upper-cased. An automatic chart name, a nameless card, or a name that
 * opens with an emoji or a symbol has no initial, and the disc shows that
 * plainly instead of guessing a letter. The navigation's inline script
 * applies the same rule; a unit test keeps the two in step.
 */
export function initialOf(name: string | null | undefined): string | null {
  const cleaned = typeof name === 'string' ? name.replace(/[\p{Cc}\p{Cf}]/gu, '').normalize('NFC').trim() : '';
  const first = Array.from(cleaned)[0];
  if (!first || !/^[\p{L}\p{N}]$/u.test(first)) return null;
  const upper = first.toUpperCase();
  // Some letters upper-case to two (ß to SS); an initial stays one letter.
  return Array.from(upper).length === 1 ? upper : first;
}

/**
 * The initial disc as a small PNG for the browser tab, so a bookmark made
 * on your page carries it. Null where a canvas is unavailable.
 */
export function initialIcon(letter: string, hue: string, fontFamily: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = hue;
    context.beginPath();
    context.arc(32, 32, 32, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#0A0C11';
    context.font = `500 36px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, 32, 35);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
