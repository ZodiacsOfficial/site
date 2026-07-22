/**
 * Import-free projection of the canonical sign table for offline OG builds.
 * A focused test pins every field to src/lib/signs.ts, whose runtime imports
 * intentionally cannot be loaded by the plain-Node data generator.
 */
export const OG_SIGNS = Object.freeze([
  { slug: 'aries', name: 'Aries', dates: 'Mar 21 – Apr 19', element: 'fire', modality: 'cardinal', hue: '#DE8E79', essence: 'First out of the gate — direct, fast, unafraid to start.' },
  { slug: 'taurus', name: 'Taurus', dates: 'Apr 20 – May 20', element: 'earth', modality: 'fixed', hue: '#B9D4BE', essence: 'Steady hands, good taste, and a long memory for comfort.' },
  { slug: 'gemini', name: 'Gemini', dates: 'May 21 – Jun 20', element: 'air', modality: 'mutable', hue: '#B29DD0', essence: 'Quick, curious, wired for conversation.' },
  { slug: 'cancer', name: 'Cancer', dates: 'Jun 21 – Jul 22', element: 'water', modality: 'cardinal', hue: '#B6D4E4', essence: 'Feels first, remembers everything, protects what it loves.' },
  { slug: 'leo', name: 'Leo', dates: 'Jul 23 – Aug 22', element: 'fire', modality: 'fixed', hue: '#E0A9B4', essence: 'Warm-hearted, expressive, born for the spotlight.' },
  { slug: 'virgo', name: 'Virgo', dates: 'Aug 23 – Sep 22', element: 'earth', modality: 'mutable', hue: '#B7D9B0', essence: 'Precise, useful, quietly running the whole operation.' },
  { slug: 'libra', name: 'Libra', dates: 'Sep 23 – Oct 22', element: 'air', modality: 'cardinal', hue: '#D3A9DE', essence: 'Balance-seeking, charming, allergic to unfairness.' },
  { slug: 'scorpio', name: 'Scorpio', dates: 'Oct 23 – Nov 21', element: 'water', modality: 'fixed', hue: '#B9DCE8', essence: 'Intense, private, all-or-nothing.' },
  { slug: 'sagittarius', name: 'Sagittarius', dates: 'Nov 22 – Dec 21', element: 'fire', modality: 'mutable', hue: '#E0B080', essence: 'Restless, honest, aimed at the horizon.' },
  { slug: 'capricorn', name: 'Capricorn', dates: 'Dec 22 – Jan 19', element: 'earth', modality: 'cardinal', hue: '#C0DEA8', essence: 'Patient, ambitious, building something that lasts.' },
  { slug: 'aquarius', name: 'Aquarius', dates: 'Jan 20 – Feb 18', element: 'air', modality: 'fixed', hue: '#AE8FC9', essence: 'Independent, inventive, loyal to the future.' },
  { slug: 'pisces', name: 'Pisces', dates: 'Feb 19 – Mar 20', element: 'water', modality: 'mutable', hue: '#A9D4C4', essence: 'Porous, imaginative, tuned to what goes unspoken.' },
].map((entry) => Object.freeze(entry)));

export const OG_ELEMENT_LABEL = Object.freeze({
  fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water',
});

export const OG_MODALITY_LABEL = Object.freeze({
  cardinal: 'Cardinal', fixed: 'Fixed', mutable: 'Mutable',
});
