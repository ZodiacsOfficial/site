import { describe, expect, it } from 'vitest';
import { PF_BOOK_COPY } from './ProfileManager';

describe('English profile chart count', () => {
  it('uses singular grammar for one saved chart', () => {
    expect(PF_BOOK_COPY.en.count(1)).toBe('1 chart saved.');
  });

  it('keeps the existing plural explanation for multiple saved charts', () => {
    expect(PF_BOOK_COPY.en.count(2)).toBe(
      '2 charts saved — yours and the people you read for.',
    );
  });
});

describe('Spanish profile chart count', () => {
  it('uses singular grammar for one saved chart', () => {
    expect(PF_BOOK_COPY.es.count(1)).toBe('1 carta guardada.');
  });

  it('keeps the existing plural explanation for multiple saved charts', () => {
    expect(PF_BOOK_COPY.es.count(2)).toBe(
      '2 cartas guardadas: la tuya y las de las personas para quienes haces lecturas.',
    );
  });
});
