import { describe, expect, it } from 'vitest';
import { render } from 'preact-render-to-string';
import Initial from '../../components/Initial';
import { initialOf } from './initial';

describe('initials', () => {
  it('takes the first letter or digit of a chosen name, upper-cased', () => {
    expect(initialOf('maya')).toBe('M');
    expect(initialOf('  Élodie')).toBe('É');
    expect(initialOf('Élodie')).toBe('É');
    expect(initialOf('ßeta')).toBe('ß');
    expect(initialOf('王芳')).toBe('王');
    expect(initialOf('7 of Cups')).toBe('7');
    expect(initialOf('‏Maya')).toBe('M');
  });

  it('has no initial for no name, or a name that opens with a symbol', () => {
    expect(initialOf(null)).toBeNull();
    expect(initialOf('')).toBeNull();
    expect(initialOf('   ')).toBeNull();
    expect(initialOf('🌙 Luna')).toBeNull();
    expect(initialOf('· Maya')).toBeNull();
  });

  it('draws the letter on the Sun sign colour, decoratively by default', () => {
    const html = render(<Initial name="Theo" hue="#D3A9DE" size={40} />);
    expect(html).toContain('>T</span>');
    expect(html).toContain('--size:40px;--sign:#D3A9DE');
    expect(html).toContain('aria-hidden="true"');
  });

  it('keeps an unnamed person as a ring in neutral ink when the Sun is unsettled', () => {
    const html = render(<Initial name={null} hue={null} size={40} label="Unnamed card" />);
    expect(html).toContain('initial--unnamed');
    expect(html).toContain('--sign:var(--ink-1)');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Unnamed card"');
  });
});
