import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const PROFILE_KEY = 'zodiacs.profile.v1';
const frozen = JSON.parse(readFileSync(new URL('./fixtures/legacy-polar-browser.json', import.meta.url), 'utf8'));

// These immutable summaries come from the archived pre-fix package. Installing
// a newer engine must never regenerate or relabel the historical inputs.
// The full quarter-hour day supports Today's discriminating ASC search.
export function legacyPolarFixture(minutes = 9 * 60) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 1440 || minutes % 15 !== 0) {
    throw new RangeError('Legacy polar fixture requires a quarter-hour minute from 0 through 1425');
  }
  const record = frozen.cases.find((row) => row.minutes === minutes);
  assert.ok(record, `Missing frozen legacy polar fixture at minute ${minutes}`);
  const legacy = structuredClone(record.summary);
  const utc = new Date(legacy.utcISO);
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
    summary: structuredClone(legacy),
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
    // Only the setting branch needs reversal. Some samples already rise.
    correctedAsc: (legacy.angles.asc - legacy.angles.mc + 360) % 360 < 180
      ? legacy.angles.asc : (legacy.angles.asc + 180) % 360 };
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
