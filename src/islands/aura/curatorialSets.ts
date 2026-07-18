import type { AuraSign } from '../../lib/aura/types';

export type AuraCuratorialSetKind =
  | 'opposite-pair'
  | 'element-triptych'
  | 'modality-quartet'
  | 'complete-twelve';

export interface AuraCuratorialSet {
  id: string;
  kind: AuraCuratorialSetKind;
  label: string;
  title: string;
  members: readonly AuraSign[];
}

const CURATORIAL_SETS: readonly AuraCuratorialSet[] = [
  { id: 'axis-aries-libra', kind: 'opposite-pair', label: 'Opposite pair', title: 'Aries · Libra Axis', members: ['aries', 'libra'] },
  { id: 'axis-taurus-scorpio', kind: 'opposite-pair', label: 'Opposite pair', title: 'Taurus · Scorpio Axis', members: ['taurus', 'scorpio'] },
  { id: 'axis-gemini-sagittarius', kind: 'opposite-pair', label: 'Opposite pair', title: 'Gemini · Sagittarius Axis', members: ['gemini', 'sagittarius'] },
  { id: 'axis-cancer-capricorn', kind: 'opposite-pair', label: 'Opposite pair', title: 'Cancer · Capricorn Axis', members: ['cancer', 'capricorn'] },
  { id: 'axis-leo-aquarius', kind: 'opposite-pair', label: 'Opposite pair', title: 'Leo · Aquarius Axis', members: ['leo', 'aquarius'] },
  { id: 'axis-virgo-pisces', kind: 'opposite-pair', label: 'Opposite pair', title: 'Virgo · Pisces Axis', members: ['virgo', 'pisces'] },
  { id: 'element-fire', kind: 'element-triptych', label: 'Elemental triptych', title: 'Fire Triptych', members: ['aries', 'leo', 'sagittarius'] },
  { id: 'element-earth', kind: 'element-triptych', label: 'Elemental triptych', title: 'Earth Triptych', members: ['taurus', 'virgo', 'capricorn'] },
  { id: 'element-air', kind: 'element-triptych', label: 'Elemental triptych', title: 'Air Triptych', members: ['gemini', 'libra', 'aquarius'] },
  { id: 'element-water', kind: 'element-triptych', label: 'Elemental triptych', title: 'Water Triptych', members: ['cancer', 'scorpio', 'pisces'] },
  { id: 'modality-cardinal', kind: 'modality-quartet', label: 'Modality quartet', title: 'Cardinal Quartet', members: ['aries', 'cancer', 'libra', 'capricorn'] },
  { id: 'modality-fixed', kind: 'modality-quartet', label: 'Modality quartet', title: 'Fixed Quartet', members: ['taurus', 'leo', 'scorpio', 'aquarius'] },
  { id: 'modality-mutable', kind: 'modality-quartet', label: 'Modality quartet', title: 'Mutable Quartet', members: ['gemini', 'virgo', 'sagittarius', 'pisces'] },
  {
    id: 'complete-twelve',
    kind: 'complete-twelve',
    label: 'Complete cabinet',
    title: 'The Complete Twelve',
    members: [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ],
  },
];

/** Returns only arrangements fully represented by the current cabinet. */
export function earnedCuratorialSets(
  representedSigns: readonly AuraSign[],
): AuraCuratorialSet[] {
  const represented = new Set(representedSigns);
  return CURATORIAL_SETS.filter(({ members }) => (
    members.every((sign) => represented.has(sign))
  ));
}

