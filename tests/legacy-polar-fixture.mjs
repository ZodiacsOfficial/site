import assert from 'node:assert/strict';
import { computeChart } from '@zodiacs/engine/internal';

export const PROFILE_KEY = 'zodiacs.profile.v1';
export const POLAR_REPAIR_VERSION = '0.1.0+polar-asc.1';

// Generate the saved record with the exact vendored pre-fix engine, never the
// browser's repaired implementation. The default is the original regression.
export function legacyPolarFixture(minutes = 9 * 60) {
  const utc = new Date(Date.UTC(2001, 11, 21, 0, minutes));
  const legacy = computeChart({
    utc, latitude: 78.2232, longitude: 15.6267,
    houseSystem: 'placidus', timeKnown: true,
  });
  assert.equal(legacy.engineVersion, '0.1.0');
  if (minutes === 9 * 60) assert.ok(Math.abs(legacy.angles.asc - 203.87198411230202) < 1e-10);
  const polar = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Restored polar chart', relationship: 'self',
    createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z',
    birth: {
      date: '2001-12-21', time: utc.toISOString().slice(11, 16), timeKnown: true,
      place: { name: 'Polar fixture', admin1: '', country: '', lat: 78.2232, lon: 15.6267, tz: 'UTC' },
    },
    summary: {
      engineVersion: legacy.engineVersion, utcISO: utc.toISOString(),
      houseSystem: legacy.houses.system,
      bodies: legacy.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
      angles: { asc: legacy.angles.asc, mc: legacy.angles.mc }, flags: [...legacy.flags],
    },
  };
  const positionsOnly = structuredClone(polar);
  positionsOnly.id = '55555555-5555-4555-8555-555555555555';
  positionsOnly.name = 'Imported positions';
  positionsOnly.relationship = 'other';
  positionsOnly.updatedAt = positionsOnly.createdAt;
  positionsOnly.birth.place = null;
  const profile = { version: 1, settings: { houseSystem: 'whole' }, charts: [polar, positionsOnly] };
  // Whitespace makes an incidental parse/stringify rewrite observable too.
  return { profile, raw: JSON.stringify(profile, null, 2), polar, positionsOnly, legacy,
    correctedAsc: (legacy.angles.asc + 180) % 360 };
}

export async function installLegacyProfile(context, fixture) {
  await context.addInitScript(({ raw, key }) => {
    // Seed once per origin, so a navigation cannot conceal a read-time write.
    if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key) {
        setItem.call(sessionStorage, 'polar-profile-writes',
          String(Number(sessionStorage.getItem('polar-profile-writes') ?? 0) + 1));
      }
      return setItem.call(this, name, value);
    };
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get: () => ({ writeText: async (value) => { window.__polarClipboard = value; } }),
    });
  }, { raw: fixture.raw, key: PROFILE_KEY });
}

export async function checkOriginalProfile(page, fixture, check, surface) {
  const stored = await page.evaluate((key) => ({
    raw: localStorage.getItem(key), writes: Number(sessionStorage.getItem('polar-profile-writes') ?? 0),
  }), PROFILE_KEY);
  check(`legacy polar ${surface}: original profile bytes are unchanged without read-time writes`,
    stored.raw === fixture.raw && stored.writes === 0, `profile writes: ${stored.writes}`);
}
