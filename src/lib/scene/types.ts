/**
 * ChartSceneModel — the renderer-neutral presentation model of a computed
 * chart, and the entity vocabulary the Chart Explorer's selection state
 * speaks. FROZEN CONTRACT (MASTER-PLAN.md §11.2): renderers (SVG wheel,
 * share card, future spatial chapter), the inspector, the placements table,
 * and the guided reading all address chart parts through EntityRef ids —
 * never through renderer internals.
 *
 * Pure data. No DOM, no ephemeris imports, JSON-serializable throughout
 * (no Date instances). Derivation lives in ./build.ts; emphasis (dim /
 * highlight sets for a given selection) in ./emphasis.ts.
 */
import type {
  Angles, AspectType, BodyName, ChartFlag, HouseSystem,
} from '../engine/types';
import type { Dignity } from '../dignities';

/** The twelve sign slugs, as used in URLs and `signs.ts`. */
export type SignSlug =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

/** Runtime twin of SignSlug — this contract file stays import-free, so the
 * twelve slugs are stated once more here for deep-link validation. */
const SIGN_SLUGS: readonly SignSlug[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const SIGN_SLUG_SET: ReadonlySet<string> = new Set(SIGN_SLUGS);

/** Anything selectable on a chart. */
export type EntityRef =
  | { kind: 'body'; body: BodyName }
  | { kind: 'sign'; sign: SignSlug }
  | { kind: 'house'; house: number }                       // 1–12
  | { kind: 'aspect'; a: BodyName; b: BodyName; type: AspectType }
  | { kind: 'angle'; angle: 'asc' | 'mc' | 'dsc' | 'ic' };

/**
 * Stable string id for an entity — the shared key between wheel marks,
 * table rows, reading items, inspector state, and `?sel=` deep links.
 * Examples: `body:Sun` · `sign:leo` · `house:7` ·
 * `aspect:Moon-square-Mars` · `angle:asc`.
 * Aspect ids always name `a` before `b` in the order the engine emitted.
 */
export function entityId(e: EntityRef): string {
  switch (e.kind) {
    case 'body': return `body:${e.body}`;
    case 'sign': return `sign:${e.sign}`;
    case 'house': return `house:${e.house}`;
    case 'aspect': return `aspect:${e.a}-${e.type}-${e.b}`;
    case 'angle': return `angle:${e.angle}`;
  }
}

/** Parse an entity id (e.g. from a `?sel=` param). Null on anything malformed. */
export function parseEntityId(id: string): EntityRef | null {
  const sep = id.indexOf(':');
  if (sep < 1) return null;
  const kind = id.slice(0, sep);
  const rest = id.slice(sep + 1);
  switch (kind) {
    case 'body':
      return rest.length > 0 && rest.length <= 24 ? { kind: 'body', body: rest as BodyName } : null;
    case 'sign':
      return SIGN_SLUG_SET.has(rest) ? { kind: 'sign', sign: rest as SignSlug } : null;
    case 'house': {
      const n = Number(rest);
      return Number.isInteger(n) && n >= 1 && n <= 12 ? { kind: 'house', house: n } : null;
    }
    case 'aspect': {
      const m = /^([A-Za-z ]+)-(conjunction|sextile|square|trine|opposition)-([A-Za-z ]+)$/.exec(rest);
      return m ? { kind: 'aspect', a: m[1] as BodyName, type: m[2] as AspectType, b: m[3] as BodyName } : null;
    }
    case 'angle':
      return rest === 'asc' || rest === 'mc' || rest === 'dsc' || rest === 'ic'
        ? { kind: 'angle', angle: rest } : null;
    default:
      return null;
  }
}

export interface SceneBody {
  body: BodyName;
  /** True ecliptic longitude — MUST equal the engine's value exactly. */
  lon: number;
  /**
   * Collision-nudged draw longitude (bodies <7° apart fan outward).
   * Markers draw here; degree ticks always draw at the true `lon`.
   */
  drawLon: number;
  sign: SignSlug;
  /** Degrees into the sign, 0 ≤ d < 30. */
  signDegree: number;
  house: number | null;
  speed: number;
  retrograde: boolean;
  dignity: Dignity | null;
  /** entityIds of the aspects touching this body, tightest orb first. */
  aspects: string[];
}

export interface SceneHouse {
  /** 1–12. */
  index: number;
  cuspLon: number;
  /** Angular span to the next cusp, degrees (0, 360]. */
  spanDeg: number;
  /** Angular midpoint of the wedge — where the house number renders. */
  midLon: number;
  /** Bodies whose house this is, in zodiac order. */
  occupants: BodyName[];
}

export interface SceneAspect {
  a: BodyName;
  b: BodyName;
  type: AspectType;
  orb: number;
  applying: boolean;
  /** Orb-tightness class: 2 = partile-tight (≤1.5°), 1 = firm (≤3.5°), 0 = wide. */
  weight: 0 | 1 | 2;
}

export interface ChartSceneModel {
  engineVersion: string;
  /**
   * Rotation anchor of the wheel. `asc` (chart convention, ASC at 9 o'clock)
   * or `aries` (0° Aries at 9 o'clock — the chapter-1 teaching rotation).
   */
  anchor: { lon: number; mode: 'asc' | 'aries' };
  bodies: SceneBody[];
  /** Null when the birth time is unknown (no-time chart). */
  houses: SceneHouse[] | null;
  angles: Angles | null;
  aspects: SceneAspect[];
  /** The 12 sign segments in zodiac order; fromLon = i * 30 (tropical). */
  signs: { slug: SignSlug; fromLon: number }[];
  flags: ChartFlag[];
  houseSystem: HouseSystem;
}

/**
 * A second, outer ring drawn around a natal wheel — the transiting sky (and,
 * later, a synastry partner). Purely additive: `Wheel` renders it only when an
 * `overlay` prop is present, so the single-chart share-card markup stays pinned
 * byte-for-byte. The natal chart remains the `ChartSceneModel`; the overlay is
 * its own lightweight model with its own mark namespace (`transit:{body}`).
 */
export interface OverlayBody {
  body: BodyName;
  /** True ecliptic longitude. */
  lon: number;
  /** Collision-nudged draw longitude for the outer ring. */
  drawLon: number;
  sign: SignSlug;
  retrograde: boolean;
}

export interface OverlayAspect {
  /** The outer-ring (transiting) body. */
  outer: BodyName;
  /** The inner-ring (natal) body it contacts. */
  inner: BodyName;
  type: AspectType;
  orb: number;
}

export interface WheelOverlay {
  /** Label for the outer ring, e.g. "the sky right now" (localized by caller). */
  label: string;
  bodies: OverlayBody[];
  aspects: OverlayAspect[];
  /** Highlighted transit contact (outer+inner+type key), or null. */
  focus: string | null;
}

/** Stable id for an overlay body mark. */
export function overlayBodyId(body: BodyName): string {
  return `transit:${body}`;
}

/** Stable id for an overlay (transit→natal) aspect. */
export function overlayAspectId(a: OverlayAspect): string {
  return `${a.outer}-${a.type}-${a.inner}`;
}

/** Layer visibility — the Explorer's map-style toggles. */
export interface LayerState {
  zodiac: boolean;
  houses: boolean;
  planets: boolean;
  aspects: boolean;
}

export interface ExplorerState {
  selection: EntityRef | null;
  layers: LayerState;
  /** Aspect types currently shown (subset of the five majors). */
  aspectTypes: AspectType[];
}

export const DEFAULT_LAYERS: LayerState = {
  zodiac: true, houses: true, planets: true, aspects: true,
};

export const ALL_ASPECT_TYPES: AspectType[] =
  ['conjunction', 'sextile', 'square', 'trine', 'opposition'];

/**
 * Emphasis — the derived visual answer to "what is selected". Renderers dim
 * everything not in either set to their soft-opacity floor.
 * Empty `highlight` ⇒ nothing selected ⇒ no dimming anywhere.
 */
export interface SceneEmphasis {
  /** Fully lit, ring-marked entities (the selection itself). */
  highlight: Set<string>;
  /** Related entities kept readable (the selection's neighbours). */
  soft: Set<string>;
}
