import { decodePositionsLink } from '../../src/lib/share-positions.js';

const HUES: Record<string, string> = {
  aries: '#DE8E79', taurus: '#B9D4BE', gemini: '#B29DD0', cancer: '#B6D4E4',
  leo: '#E0A9B4', virgo: '#B7D9B0', libra: '#D3A9DE', scorpio: '#B9DCE8',
  sagittarius: '#E0B080', capricorn: '#C0DEA8', aquarius: '#AE8FC9', pisces: '#A9D4C4',
};

const SIGNS = [
  ['Aries', 'aries'], ['Taurus', 'taurus'], ['Gemini', 'gemini'], ['Cancer', 'cancer'],
  ['Leo', 'leo'], ['Virgo', 'virgo'], ['Libra', 'libra'], ['Scorpio', 'scorpio'],
  ['Sagittarius', 'sagittarius'], ['Capricorn', 'capricorn'], ['Aquarius', 'aquarius'], ['Pisces', 'pisces'],
] as const;

export interface ChartPreviewPlacement {
  label: 'Sun' | 'Moon' | 'Rising';
  sign: string;
  hue: string;
  degree: string;
}

export interface ChartPreviewModel {
  placements: ChartPreviewPlacement[];
  settings: string;
}

function roundedPlacement(label: ChartPreviewPlacement['label'], longitude: number): ChartPreviewPlacement {
  const totalMinutes = Math.round((((longitude % 360) + 360) % 360) * 60) % 21600;
  const rounded = totalMinutes / 60;
  const sign = SIGNS[Math.floor(rounded / 30)];
  const within = totalMinutes % 1800;
  return {
    label,
    sign: sign[0],
    hue: HUES[sign[1]],
    degree: `${Math.floor(within / 60)} deg ${String(within % 60).padStart(2, '0')} min`,
  };
}

export function previewModel(value: string): ChartPreviewModel | null {
  const chart = decodePositionsLink(value);
  if (!chart) return null;
  const sun = chart.bodies.find((body) => body.body === 'Sun');
  const moon = chart.bodies.find((body) => body.body === 'Moon');
  if (!sun || !moon) return null;
  const placements = [
    roundedPlacement('Sun', sun.lon),
    roundedPlacement('Moon', moon.lon),
  ];
  if (chart.angles) placements.push(roundedPlacement('Rising', chart.angles.asc));
  return {
    placements,
    settings: chart.angles
      ? `${chart.houseSystem === 'whole' ? 'Whole sign' : 'Placidus'} / Tropical`
      : '12:00 reference / No houses / Tropical',
  };
}
