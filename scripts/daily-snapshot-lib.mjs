/**
 * Pure daily-sky snapshot builder shared by the publishing CLI and replay
 * verifier. Nothing here reads the wall clock, writes files, or calls the
 * network: the caller supplies an explicit UTC date and repository root.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { moonPhase, positions } from '@zodiacs/engine';

const DAILY_BODIES = ['Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const TRANSIT_ARRAYS = ['ingresses', 'lunations', 'stations', 'aspects'];

function assertMonthlyShape(monthly, month, source) {
  if (!monthly || typeof monthly !== 'object' || monthly.month !== month) {
    throw new Error(`${source}: month field must be ${month}`);
  }
  for (const key of TRANSIT_ARRAYS) {
    if (!Array.isArray(monthly[key])) {
      throw new Error(`${source}: ${key} must be an array`);
    }
    let previousAt = '';
    for (const [index, event] of monthly[key].entries()) {
      const label = `${source}: ${key}[${index}]`;
      if (!event || typeof event !== 'object' || typeof event.at !== 'string') {
        throw new Error(`${label} must be an object with an ISO instant`);
      }
      const instant = new Date(event.at);
      if (Number.isNaN(instant.getTime()) || instant.toISOString() !== event.at || event.at.slice(0, 7) !== month) {
        throw new Error(`${label}.at must be a canonical ISO instant inside ${month}`);
      }
      if (event.at < previousAt) throw new Error(`${source}: ${key} must be sorted by instant`);
      previousAt = event.at;
      if (key === 'ingresses' && (!event.planet || !event.sign)) {
        throw new Error(`${label} requires planet and sign`);
      }
      if (key === 'lunations' && (!['new', 'full'].includes(event.type) || !event.sign || !Number.isFinite(event.degree))) {
        throw new Error(`${label} requires new/full type, sign, and degree`);
      }
      if (key === 'stations' && (!event.planet || !event.sign || !['retrograde', 'direct'].includes(event.type))) {
        throw new Error(`${label} requires planet, sign, and retrograde/direct type`);
      }
      if (key === 'aspects' && (!event.a || !event.b || !event.type || event.orb !== 0)) {
        throw new Error(`${label} requires a, b, type, and an explicit zero-degree orb`);
      }
    }
  }
}

export function assertDailyDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Daily date must use YYYY-MM-DD, received ${date}`);
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Daily date is not a real UTC calendar day: ${date}`);
  }
}

export async function computeDailySnapshot(date, repoRoot) {
  assertDailyDate(date);
  const noon = new Date(`${date}T12:00:00.000Z`);
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  // The public site engine is the facts source of truth. Keep only the ten
  // bodies published by the daily schema; nodes remain available to charts.
  const enginePositions = new Map(positions(noon).map((position) => [position.body, position]));
  const bodies = DAILY_BODIES.map((body) => {
    const position = enginePositions.get(body);
    if (!position) throw new Error(`@zodiacs/engine omitted required daily body ${body}`);
    return {
      body,
      lon: position.lon,
      sign: position.sign,
      degree: position.degree,
      retrograde: position.retrograde,
    };
  });

  const phase = moonPhase(noon);

  const month = date.slice(0, 7);
  const relativeSource = `src/data/transits-${month}.json`;
  const absoluteSource = resolve(repoRoot, relativeSource);
  let events = [];
  let eventsCoverage = 'complete';
  try {
    const raw = await readFile(absoluteSource, 'utf8');
    let monthly;
    try {
      monthly = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${relativeSource}: invalid JSON — ${error instanceof Error ? error.message : String(error)}`);
    }
    assertMonthlyShape(monthly, month, relativeSource);
    const inDay = (at) => {
      const when = new Date(at);
      return !Number.isNaN(when.getTime()) && when >= dayStart && when < dayEnd;
    };
    events = [
      ...monthly.ingresses.filter((event) => inDay(event.at)).map((event) => ({ kind: 'ingress', ...event })),
      ...monthly.lunations.filter((event) => inDay(event.at)).map((event) => ({ kind: 'lunation', ...event })),
      ...monthly.stations.filter((event) => inDay(event.at)).map((event) => ({ kind: 'station', ...event })),
      ...monthly.aspects.filter((event) => inDay(event.at)).map((event) => ({ kind: 'aspect', ...event })),
    ].sort((a, b) => a.at.localeCompare(b.at));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      eventsCoverage = 'unavailable';
    } else {
      throw error;
    }
  }

  return {
    schema: 'zodiacs.daily-facts.v1',
    date,
    snapshotAt: `${date}T12:00:00.000Z`,
    bodies,
    moon: {
      phase: phase.name,
      illumination: Math.round(phase.illumination * 1000) / 1000,
    },
    eventsCoverage,
    eventsSource: eventsCoverage === 'complete' ? relativeSource : null,
    events,
  };
}
