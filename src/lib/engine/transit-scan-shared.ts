import type { AspectType, BodyName } from './types';

export type TransitBody = Exclude<BodyName, 'North Node' | 'South Node'>;
export type NatalPoint = TransitBody | 'ASC' | 'MC';

/** Engine-free transit-search ordering shared by the scanner and lazy UI. */
export const TRANSIT_BODY_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly TransitBody[];

export const DEFAULT_TRANSIT_BODIES = [
  'Sun', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly TransitBody[];

export const SLOW_TRANSIT_BODIES = [
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const satisfies readonly TransitBody[];

export const MAJOR_ASPECT_ORDER = [
  'conjunction', 'sextile', 'square', 'trine', 'opposition',
] as const satisfies readonly AspectType[];

export const NATAL_POINT_ORDER = [
  ...TRANSIT_BODY_ORDER, 'ASC', 'MC',
] as const satisfies readonly NatalPoint[];
