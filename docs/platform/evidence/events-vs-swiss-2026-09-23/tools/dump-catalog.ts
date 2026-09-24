import { writeFileSync } from 'node:fs';
import { eventsCatalog } from '<site>/src/lib/events/catalog';
const cat = eventsCatalog() as any;
const events = (cat.events ?? cat.all ?? Object.values(cat).find((v: any) => Array.isArray(v))) as any[];
const rows = events.map((c) => c.facts).map((e) => ({ id: e.id, family: e.family, subtype: e.subtype, at: e.at, start: e.start, end: e.end, bodies: e.bodies, longitude: e.longitude, signs: e.signs, fromSign: e.fromSign, direction: e.direction, aspectType: e.aspectType, eclipseKind: e.eclipseKind, clamped: e.clamped }));
writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
console.log(Object.keys(cat), rows.length, [...new Set(rows.map((r) => r.family))]);
