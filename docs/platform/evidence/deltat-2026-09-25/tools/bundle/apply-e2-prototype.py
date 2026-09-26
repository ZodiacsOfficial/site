"""Applies a prototype of E2 (the engine commit that runs every computation on the
model) to an engine source tree in the working directory, for measuring the
bundle only: clock() on every ephemeris entry, the caller's pin, Chart.deltaT,
the exports and the ./deltat subpath. src/deltat.ts must already be in place.
It is not the landing code; receipts (E3) are not touched."""
import re, sys
def sub(s, a, b, count=1):
    assert a in s, a[:60]
    return s.replace(a, b, count)
p='src/ephemeris.ts'; s=open(p).read()
s=sub(s,"""  Rotation_EQJ_ECT,
  SiderealTime,""","""  Rotation_EQJ_ECT,
  SetDeltaTFunction,
  SiderealTime,""")
s=sub(s,"""import { ENGINE_VERSION } from "./types.js";
""","""import { ENGINE_VERSION } from "./types.js";
import { deltaT, deltaTAt } from "./deltat.js";

/**
 * astronomy-engine keeps one ΔT function for the whole module, and every time
 * it builds reads it. Each entry point installs this engine's model (or, for
 * one computeChart call, the caller's pinned value) before computing. After
 * any engine call astronomy-engine carries the engine's ΔT.
 */
function clock(pin?: number): void {
  SetDeltaTFunction(pin === undefined ? deltaT : () => pin);
}
""")
s=sub(s,"""export function bodyLongitude(body: BodyName, date: Date): number {
  return longitudeAt(body, date);
}""","""export function bodyLongitude(body: BodyName, date: Date): number {
  clock();
  return longitudeAt(body, date);
}""")
s=sub(s,"""export function longitudeSpeed(body: BodyName, date: Date): number {
  const stepDays =""","""export function longitudeSpeed(body: BodyName, date: Date): number {
  clock();
  return speedAt(body, date);
}

function speedAt(body: BodyName, date: Date): number {
  const stepDays =""")
s=sub(s,"""export function computeBodies(date: Date): BodyPosition[] {
  const bodies: BodyPosition[] = [];""","""export function computeBodies(date: Date): BodyPosition[] {
  clock();
  return bodiesAt(date);
}

function bodiesAt(date: Date): BodyPosition[] {
  const bodies: BodyPosition[] = [];""")
s=sub(s,"longitudeSpeed(planet.name, date)","speedAt(planet.name, date)")
s=sub(s,'longitudeSpeed("Moon", date)','speedAt("Moon", date)')
s=sub(s,'const nodeSpeed = longitudeSpeed("North Node", date);','const nodeSpeed = speedAt("North Node", date);')
s=sub(s,"""export function computeChart(input: ChartInput): Chart {
  const flags = [...(input.flags ?? [])];
  const bodies = computeBodies(input.utc);""","""export function computeChart(input: ChartInput): Chart {
  const pin = input.deltaT;
  clock(pin);
  try {
    return chartAt(input, pin);
  } finally {
    if (pin !== undefined) clock();
  }
}

function chartAt(input: ChartInput, pin: number | undefined): Chart {
  const flags = [...(input.flags ?? [])];
  const bodies = bodiesAt(input.utc);""")
s=sub(s,"""    flags,
    engineVersion: ENGINE_VERSION
  };""","""    flags,
    engineVersion: ENGINE_VERSION,
    deltaT:
      pin === undefined
        ? deltaTAt((input.utc.getTime() - 946_728_000_000) / 86_400_000)
        : { seconds: pin, sigma: null, model: "pinned", table: null, tableDigest: null, segment: "pinned" }
  };""")
open(p,'w').write(s)
p='src/types.ts'; s=open(p).read()
s=sub(s,"""export interface ChartInput {
  utc: Date;""","""import type { DeltaT } from "./deltat.js";
export type { DeltaT } from "./deltat.js";

export interface ChartInput {
  utc: Date;
  /** Pin ΔT (TT − UT1, seconds) for this chart instead of the engine's model. */
  deltaT?: number;""")
s=sub(s,"""  flags: ChartFlag[];
  engineVersion: string;
}""","""  flags: ChartFlag[];
  engineVersion: string;
  /** The ΔT this chart was computed with. */
  deltaT: DeltaT;
}""")
open(p,'w').write(s)
p='src/index.ts'; s=open(p).read()
s=sub(s,"""export { ENGINE_VERSION, EPHEMERIS } from "./types.js";""","""export { ENGINE_VERSION, EPHEMERIS } from "./types.js";
export { DELTA_T_MODEL, DELTA_T_TABLE, deltaT, deltaTAt } from "./deltat.js";
export type { DeltaTSegment, DeltaTTable } from "./deltat.js";""")
open(p,'w').write(s)
p='src/internal.ts'; s=open(p).read()
s+="""
export { DELTA_T_MODEL, DELTA_T_TABLE, deltaT, deltaTAt } from "./deltat.js";
"""
open(p,'w').write(s)
p='package.json'; s=open(p).read()
s=re.sub(r'(src/internal-math\.ts)( --format esm)', r'\1 src/deltat.ts\2', s)
s=sub(s,'''    "./receipt": {''','''    "./deltat": {
      "types": "./dist/deltat.d.ts",
      "import": "./dist/deltat.js"
    },
    "./receipt": {''')
open(p,'w').write(s)
print('applied')
