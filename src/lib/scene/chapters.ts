/**
 * Guided-tour chapter logic — pure derivation from the ChartSceneModel.
 * No DOM, no i18n, no engine imports. Statically imported ONLY by the lazy
 * tour module (src/islands/explorer/tour/), so none of this lands in any
 * page's initial JS closure.
 *
 * The tour never mutates chart or selection state: chapters produce a
 * SceneEmphasis (the same shape free-mode selection uses) and, for the two
 * animated teaching moves (anchor rotation, house morph), interpolated
 * render-only frames the calculator spreads into the Wheel's props.
 */
import type { AspectType } from '../engine/types';
import type {
  ChartSceneModel, EntityRef, SceneEmphasis, SceneHouse,
} from './types';
import { entityId } from './types';
import { emphasisFor } from './emphasis';

export type ChapterId =
  | 'sky' | 'zodiac' | 'horizon' | 'big-three' | 'planets'
  | 'houses' | 'aspects' | 'whole' | 'no-houses'
  | 'first-big-three' | 'first-sun' | 'first-aspect' | 'first-next';

export interface ChapterDef {
  id: ChapterId;
  /** Keys into the tour module's TOUR_COPY dictionary. */
  titleKey: string;
  bodyKeys: string[];
  /** Sub-steps advanced by prev/next inside the chapter (big three only). */
  subs: { id: string; entity: EntityRef }[];
  /** Layer prerequisites applied on chapter entry. */
  needs: { houses?: boolean; allAspects?: boolean };
  /** The per-chapter feature block TourCard renders. */
  feature:
    | 'receipt' | 'anchor-rotate' | 'house-morph' | 'aspect-focus' | 'save-share'
    | 'first-big-three' | 'first-sun' | 'first-aspect' | 'first-next'
    | null;
}

export interface TourStop { chapter: number; sub: number }

/** Render-only wheel override handed up to ChartCalculator. */
export interface TourVisual {
  scene: ChartSceneModel;
  /** Cusp-line override during the house morph/preview. */
  cusps?: number[];
  /** Chapter lighting — used only while nothing is selected. */
  emphasis: SceneEmphasis;
}

const norm = (lon: number) => ((lon % 360) + 360) % 360;

function chapter(
  id: ChapterId,
  subs: ChapterDef['subs'] = [],
  needs: ChapterDef['needs'] = {},
  feature: ChapterDef['feature'] = null,
  bodyCount = 2,
): ChapterDef {
  return {
    id,
    titleKey: `${id}Title`,
    bodyKeys: Array.from({ length: bodyCount }, (_, i) => `${id}Body${i + 1}`),
    subs,
    needs,
    feature,
  };
}

/**
 * Chapter list from the scene's shape (MASTER-PLAN §11.5 incl. the no-time
 * variant). Full chart: 8 chapters. No-time: horizon + houses replaced by
 * one honest no-houses chapter. Degenerate cases never yield dead chapters:
 * the aspects chapter is dropped when the chart has none, the anchor
 * rotation is hidden without angles, and the house morph is hidden under
 * the polar fallback.
 */
export function deriveChapters(scene: ChartSceneModel): ChapterDef[] {
  const noTime = scene.flags.includes('no-time') || scene.houses == null;
  const hasAngles = scene.angles != null;
  const polar = scene.flags.includes('polar-fallback');

  const bigThreeSubs: ChapterDef['subs'] = [
    { id: 'sun', entity: { kind: 'body', body: 'Sun' } },
    { id: 'moon', entity: { kind: 'body', body: 'Moon' } },
    ...(hasAngles ? [{ id: 'asc', entity: { kind: 'angle', angle: 'asc' } as EntityRef }] : []),
  ];

  const chapters: ChapterDef[] = [
    chapter('sky', [], {}, 'receipt'),
    chapter('zodiac', [], {}, hasAngles ? 'anchor-rotate' : null),
  ];

  if (noTime) {
    chapters.push(chapter('no-houses'));
  } else {
    chapters.push(chapter('horizon'));
  }

  chapters.push(
    chapter('big-three', bigThreeSubs, {}, null, 1),
    chapter('planets'),
  );

  if (!noTime) {
    chapters.push(chapter('houses', [], { houses: true }, polar ? null : 'house-morph'));
  }

  if (scene.aspects.length > 0) {
    chapters.push(chapter('aspects', [], { allAspects: true }, 'aspect-focus', 1));
  }

  chapters.push(chapter('whole', [], {}, 'save-share'));
  return chapters;
}

const PERSONAL_BODIES = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']);

/**
 * The single aspect used by the beginner reading. It follows the natal
 * reading's ranking rule (tight aspects first, with a luminary contact given
 * extra weight) but excludes slow-planet-only contacts that are harder to
 * make personal on a first pass.
 */
export function strongestPersonalAspect(scene: ChartSceneModel) {
  const score = (aspect: ChartSceneModel['aspects'][number]) => (
    aspect.orb
    - (aspect.a === 'Sun' || aspect.a === 'Moon' || aspect.b === 'Sun' || aspect.b === 'Moon' ? 1.5 : 0)
  );
  return scene.aspects
    .filter((aspect) => PERSONAL_BODIES.has(aspect.a) || PERSONAL_BODIES.has(aspect.b))
    .sort((a, b) => score(a) - score(b))[0] ?? null;
}

/**
 * Four stops for the opt-in first reading. Unlike the full chapter tour this
 * path is intentionally short and always has the same shape, including an
 * honest empty-aspect branch and a no-time Sun-placement branch.
 */
export function deriveFirstReading(scene: ChartSceneModel): ChapterDef[] {
  const aspect = strongestPersonalAspect(scene);
  return [
    chapter('first-big-three', [], {}, 'first-big-three', 1),
    chapter(
      'first-sun',
      [{ id: 'sun', entity: { kind: 'body', body: 'Sun' } }],
      {},
      'first-sun',
      1,
    ),
    chapter(
      'first-aspect',
      aspect
        ? [{ id: 'aspect', entity: { kind: 'aspect', a: aspect.a, b: aspect.b, type: aspect.type } }]
        : [],
      { allAspects: true },
      'first-aspect',
      1,
    ),
    chapter('first-next', [], {}, 'first-next', 1),
  ];
}

/** Flattened prev/next order across chapters and their sub-steps. */
export function flattenStops(chapters: ChapterDef[]): TourStop[] {
  const stops: TourStop[] = [];
  chapters.forEach((c, chapterIndex) => {
    const count = Math.max(1, c.subs.length);
    for (let sub = 0; sub < count; sub += 1) stops.push({ chapter: chapterIndex, sub });
  });
  return stops;
}

/** Stable analytics id for a stop, ≤32 chars: 'zodiac', 'big-three/moon'. */
export function stepId(chapters: ChapterDef[], stop: TourStop): string {
  const c = chapters[stop.chapter];
  if (!c) return 'unknown';
  const sub = c.subs[stop.sub];
  return (sub ? `${c.id}/${sub.id}` : c.id).slice(0, 32);
}

/**
 * The multi-entity chapter lighting rule → the same SceneEmphasis shape
 * free-mode selection uses (renderers keep their 1.0 / 0.7 / 0.35 rule).
 * An empty highlight set means nothing dims — the sky/whole chapters.
 */
export function emphasisForChapter(
  scene: ChartSceneModel,
  chapterDef: ChapterDef,
  sub = 0,
  opts: { aspectFocus?: AspectType | null } = {},
): SceneEmphasis {
  const highlight = new Set<string>();
  const soft = new Set<string>();

  switch (chapterDef.id) {
    case 'sky':
    case 'whole':
    case 'no-houses':
    case 'first-next':
      break;

    case 'first-big-three': {
      for (const bodyName of ['Sun', 'Moon'] as const) {
        const body = scene.bodies.find((candidate) => candidate.body === bodyName);
        if (!body) continue;
        highlight.add(entityId({ kind: 'body', body: bodyName }));
        soft.add(entityId({ kind: 'sign', sign: body.sign }));
      }
      if (scene.angles) {
        highlight.add(entityId({ kind: 'angle', angle: 'asc' }));
        const rising = scene.signs[Math.floor(norm(scene.angles.asc) / 30)];
        if (rising) soft.add(entityId({ kind: 'sign', sign: rising.slug }));
      }
      break;
    }

    case 'first-sun': {
      return emphasisFor(scene, { kind: 'body', body: 'Sun' });
    }

    case 'first-aspect': {
      const target = chapterDef.subs[0]?.entity;
      if (target?.kind === 'aspect') return emphasisFor(scene, target);
      break;
    }

    case 'zodiac': {
      for (const s of scene.signs) highlight.add(entityId({ kind: 'sign', sign: s.slug }));
      highlight.add(entityId({ kind: 'body', body: 'Sun' }));
      break;
    }

    case 'horizon': {
      for (const angle of ['asc', 'dsc', 'mc', 'ic'] as const) {
        highlight.add(entityId({ kind: 'angle', angle }));
      }
      if (scene.angles) {
        const rising = scene.signs[Math.floor(norm(scene.angles.asc) / 30)];
        if (rising) soft.add(entityId({ kind: 'sign', sign: rising.slug }));
      }
      if (scene.houses) {
        soft.add(entityId({ kind: 'house', house: 1 }));
        soft.add(entityId({ kind: 'house', house: 10 }));
      }
      break;
    }

    case 'big-three': {
      const target = chapterDef.subs[sub]?.entity;
      if (target) return emphasisFor(scene, target);
      break;
    }

    case 'planets': {
      for (const b of scene.bodies) highlight.add(entityId({ kind: 'body', body: b.body }));
      for (const s of scene.signs) soft.add(entityId({ kind: 'sign', sign: s.slug }));
      break;
    }

    case 'houses': {
      for (const hs of scene.houses ?? []) highlight.add(entityId({ kind: 'house', house: hs.index }));
      for (const b of scene.bodies) soft.add(entityId({ kind: 'body', body: b.body }));
      break;
    }

    case 'aspects': {
      const focus = opts.aspectFocus ?? null;
      for (const a of scene.aspects) {
        if (focus && a.type !== focus) continue;
        highlight.add(entityId({ kind: 'aspect', a: a.a, b: a.b, type: a.type }));
        soft.add(entityId({ kind: 'body', body: a.a }));
        soft.add(entityId({ kind: 'body', body: a.b }));
      }
      break;
    }
  }

  return { highlight, soft };
}

/** Shortest-arc angle interpolation: lerpAngle(359, 1, 0.5) === 0. */
export function lerpAngle(from: number, to: number, k: number): number {
  const a = norm(from);
  let delta = norm(to) - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return norm(a + delta * k);
}

/** 12 cusps interpolated pairwise along shortest arcs. */
export function interpolateCusps(from: number[], to: number[], k: number): number[] {
  return from.map((lon, i) => lerpAngle(lon, to[i] ?? lon, k));
}

/**
 * SceneHouse frames from a cusp array — span/midpoint math identical to
 * buildSceneModel's (occupants left empty; tween frames are render-only).
 */
export function previewHouses(cusps: number[]): SceneHouse[] {
  return cusps.map((cuspLon, i) => {
    const next = cusps[(i + 1) % cusps.length];
    const spanDeg = norm(next - cuspLon) || 360;
    return {
      index: i + 1,
      cuspLon,
      spanDeg,
      midLon: norm(cuspLon + spanDeg / 2),
      occupants: [],
    };
  });
}
