import type { Aspect } from '../../lib/engine/types';

/** Feature-local English copy; symbolic prompts tied to visible chart facts. */
export const LUNAR_HOUSE_COPY: Readonly<Record<number, string>> = {
  1: 'Notice how you meet the day. A small change in pace or self-expression may make it easier to recognize what you need.',
  2: 'Look at the habits that help you feel secure. Make room for one practical comfort you can sustain.',
  3: 'Pay attention to everyday conversations. Ask for what you need clearly, and leave space to hear the answer.',
  4: 'Turn toward home and belonging. What would make your private space feel more restful or supportive?',
  5: 'Give enjoyment a place in your routine. A creative project or a little unstructured play can help you reconnect with yourself.',
  6: 'Start with the ordinary rhythm of your day. Choose one manageable adjustment to rest, work, or care.',
  7: 'Notice what you need from close relationships. A direct conversation can make room for both people’s preferences.',
  8: 'Consider where you share responsibility or trust. Name a boundary or an agreement that would help you feel more at ease.',
  9: 'Make room for a wider perspective. Reading, learning, or an unfamiliar experience may help you rethink a familiar concern.',
  10: 'Notice how public responsibilities affect your private needs. Choose a definition of progress that leaves room for both.',
  11: 'Look at the people and plans you make time for. Which connection helps you feel supported and involved?',
  12: 'Leave some space unfilled. Rest, privacy, or a quiet practice can help you notice feelings that a busy routine obscures.',
};

const ROLES: Readonly<Record<string, string>> = {
  Sun: 'your direction', Mercury: 'communication', Venus: 'affection and pleasure', Mars: 'action',
  Jupiter: 'possibility', Saturn: 'responsibility', Uranus: 'change', Neptune: 'imagination', Pluto: 'control and trust',
};
export function lunarAspectReading(aspect: Aspect): string {
  const other = aspect.a === 'Moon' ? aspect.b : aspect.a;
  const role = ROLES[other] ?? other.toLowerCase();
  if (aspect.type === 'trine' || aspect.type === 'sextile') return `Consider how ${role} can support your emotional needs. Notice what helps, then give it a little more attention.`;
  if (aspect.type === 'conjunction') return `Your emotional needs and ${role} share a focus in this chart. Consider how to give that combination a deliberate outlet.`;
  return `Consider the balance between your emotional needs and ${role}. A useful response may make room for both, even when they pull in different directions.`;
}
export const LUNAR_RETURN_NOTE = 'Astrological interpretations are prompts for reflection, not predictions of events.';
