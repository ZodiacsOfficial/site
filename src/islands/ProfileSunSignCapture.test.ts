import { describe, expect, it } from 'vitest';
import { profileSunSignFromSearch, profileSunSignFromStored } from './ProfileSunSignCapture';

describe('profileSunSignFromSearch', () => {
  it('accepts only a canonical sign slug', () => {
    expect(profileSunSignFromSearch('?sun=aries')?.name).toBe('Aries');
    expect(profileSunSignFromSearch('?sun=ophiuchus')).toBeNull();
    expect(profileSunSignFromSearch('')).toBeNull();
  });

  it('restores a saved confirmation after the query parameter is removed', () => {
    expect(profileSunSignFromStored('aries')?.name).toBe('Aries');
    expect(profileSunSignFromStored('ophiuchus')).toBeNull();
    expect(profileSunSignFromStored(null)).toBeNull();
  });
});
