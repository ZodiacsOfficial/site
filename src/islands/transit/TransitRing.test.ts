import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

describe('exact-date state wiring', () => {
  const source = readFileSync(new URL('./TransitRing.tsx', import.meta.url), 'utf8');

  it('owns scan results by chart, window and explicit retry', () => {
    expect(source).toContain('[nowMs, natal.minimal, natal.asc, natal.mc, scanAttempt]');
    expect(source).toContain('scanResult?.input === scanInput');
    expect(source).toContain('return startSlowTransitScan(');
    expect(source).toContain('}, [scanInput]);');
    expect(source).toContain('setScanAttempt((attempt) => attempt + 1)');
    expect(source).toContain('ref={scrubRef}');
    expect(source).toContain('scrubRef.current?.focus();\n              setScanAttempt');
  });

  it('shows no-contact copy only for successful data and announces failures separately', () => {
    expect(source).toContain("const events = scanState.status === 'ready' ? scanState.events : null;");
    expect(source).toContain("{scanState.status === 'loading' &&");
    expect(source).toContain("{scanState.status === 'error' &&");
    expect(source).toContain('<p role="alert">{scanError}</p>');
    expect(source).toContain('events !== null && events.length === 0');
    expect(source).not.toContain('setEvents([])');
  });
});
