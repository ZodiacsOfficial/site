/**
 * A person on the site: the initial of the name they chose, set in EB
 * Garamond on their Sun sign's colour, a sibling of the sign icons. With no
 * chosen name the colour stays as a ring rather than a guessed letter, and
 * a Sun sign the chart cannot settle takes neutral ink.
 */
import { initialOf } from '../lib/profile/initial';

interface Props {
  name: string | null;
  /** The settled Sun sign's hue; null for neutral ink. */
  hue: string | null;
  /** Size in px. Omit it to take --size from the surrounding CSS. */
  size?: number;
  /** Accessible name. Without one the initial is decorative. */
  label?: string;
  class?: string;
}

export default function Initial({ name, hue, size, label, class: className }: Props) {
  const letter = initialOf(name);
  // Set here rather than inherited, so a surrounding card's tint never recolours a person.
  const style = [size ? `--size:${size}px` : '', `--sign:${hue ?? 'var(--ink-1)'}`].filter(Boolean).join(';');
  const classes = ['initial', letter ? '' : 'initial--unnamed', className ?? ''].filter(Boolean).join(' ');
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': 'true' as const };
  return <span class={classes} style={style} {...a11y}>{letter}</span>;
}
