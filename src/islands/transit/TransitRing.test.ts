import { describe, expect, it } from 'vitest';
import { natalPointText } from './TransitRing';

describe('localized natal-point order', () => {
  it('places the invariant Italian adjective after the point name', () => {
    expect(natalPointText('it', 'Moon')).toBe('Luna natale');
    expect(natalPointText('it', 'Venus')).toBe('Venere natale');
    expect(natalPointText('it', 'Mars')).toBe('Marte natale');
  });

  it('keeps the existing locale order and French agreement', () => {
    expect(natalPointText('en', 'Moon')).toBe('Natal Moon');
    expect(natalPointText('es', 'Moon')).toBe('natal Luna');
    expect(natalPointText('pt', 'Moon')).toBe('Natal Lua');
    expect(natalPointText('fr', 'Venus')).toBe('Vénus natale');
    expect(natalPointText('fr', 'Mars')).toBe('Mars natal');
  });
});
