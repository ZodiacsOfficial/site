/**
 * emphasisFor — the pure "what lights up" rule. Given a scene and a
 * selection, produce the highlight/soft sets every synchronized surface
 * (wheel, table, reading, inspector) renders from. One rule, one place:
 *
 *   body    → itself + its aspects, its house, its sign, the aspects' partners
 *   sign    → its arc + the bodies in it
 *   house   → its wedge + its occupants
 *   aspect  → the chord + both bodies
 *   angle   → the axis (asc↔dsc, mc↔ic travel together)
 *
 * Empty highlight set ⇒ nothing selected ⇒ renderers dim nothing.
 */
import type { ChartSceneModel, EntityRef, SceneEmphasis } from './types';
import { entityId } from './types';

export function emphasisFor(
  scene: ChartSceneModel,
  selection: EntityRef | null,
): SceneEmphasis {
  const highlight = new Set<string>();
  const soft = new Set<string>();
  if (!selection) return { highlight, soft };

  highlight.add(entityId(selection));

  switch (selection.kind) {
    case 'body': {
      const body = scene.bodies.find((b) => b.body === selection.body);
      if (!body) break;
      soft.add(entityId({ kind: 'sign', sign: body.sign }));
      if (body.house != null) soft.add(entityId({ kind: 'house', house: body.house }));
      for (const aspectId of body.aspects) {
        soft.add(aspectId);
        const aspect = scene.aspects.find((a) =>
          entityId({ kind: 'aspect', a: a.a, b: a.b, type: a.type }) === aspectId);
        if (aspect) {
          const partner = aspect.a === selection.body ? aspect.b : aspect.a;
          soft.add(entityId({ kind: 'body', body: partner }));
        }
      }
      break;
    }
    case 'sign': {
      for (const b of scene.bodies) {
        if (b.sign === selection.sign) soft.add(entityId({ kind: 'body', body: b.body }));
      }
      break;
    }
    case 'house': {
      const house = scene.houses?.find((hs) => hs.index === selection.house);
      for (const occupant of house?.occupants ?? []) {
        soft.add(entityId({ kind: 'body', body: occupant }));
      }
      break;
    }
    case 'aspect': {
      soft.add(entityId({ kind: 'body', body: selection.a }));
      soft.add(entityId({ kind: 'body', body: selection.b }));
      break;
    }
    case 'angle': {
      const twin = { asc: 'dsc', dsc: 'asc', mc: 'ic', ic: 'mc' } as const;
      soft.add(entityId({ kind: 'angle', angle: twin[selection.angle] }));
      break;
    }
  }

  return { highlight, soft };
}

/**
 * The opacity a mark renders at under an emphasis. Full for highlighted,
 * readable for related, floor for the rest — and no dimming at all when
 * nothing is selected.
 */
export function emphasisOpacity(emphasis: SceneEmphasis, id: string): number {
  if (emphasis.highlight.size === 0) return 1;
  if (emphasis.highlight.has(id)) return 1;
  if (emphasis.soft.has(id)) return 0.7;
  return 0.35;
}
