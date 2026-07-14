import type { WheelGeometry } from '../../lib/wheel/Wheel';
import type { RelationshipContact, RelationshipPointName } from './relationshipData';
import { relationshipContactId } from './relationshipData';

const ASPECT_COLOR: Record<string, string> = {
  conjunction: 'rgba(238,241,247,0.5)',
  sextile: 'rgba(169,212,196,0.55)',
  trine: 'rgba(182,212,228,0.6)',
  square: 'rgba(222,142,121,0.6)',
  opposition: 'rgba(224,169,180,0.6)',
};

const isAngle = (name: RelationshipPointName) => name === 'ASC' || name === 'MC';

/** One lazy-module-local chord for contacts involving ASC/MC. */
export function renderRelationshipAngleContact(
  contact: RelationshipContact | null,
  flipped: boolean,
  innerDrawLonOf: (name: string) => number | null,
  outerDrawLonOf: (name: string) => number | null,
  geo: WheelGeometry,
) {
  if (!contact || (!isAngle(contact.a) && !isAngle(contact.b))) return null;
  const innerName = flipped ? contact.b : contact.a;
  const innerLon = flipped ? contact.bLon : contact.aLon;
  const outerName = flipped ? contact.a : contact.b;
  const outerLon = flipped ? contact.aLon : contact.bLon;
  const innerDrawLon = isAngle(innerName) ? innerLon : innerDrawLonOf(innerName) ?? innerLon;
  const outerDrawLon = isAngle(outerName) ? outerLon : outerDrawLonOf(outerName) ?? outerLon;
  const inner = geo.pt(innerDrawLon, isAngle(innerName) ? geo.rSigns : geo.rBodies);
  const outer = geo.pt(outerDrawLon, geo.rOuter - geo.size * 0.03);
  const id = relationshipContactId(contact);

  return (
    <line
      x1={outer.x}
      y1={outer.y}
      x2={inner.x}
      y2={inner.y}
      stroke={ASPECT_COLOR[contact.type] ?? 'rgba(198,204,218,0.5)'}
      stroke-width="1.8"
      pointer-events="none"
      data-relationship-angle-aspect={id}
    />
  );
}
