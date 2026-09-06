import type { AspectType, BodyName } from '../../lib/engine/types';
import { compositeSelection, RELATIONSHIP_BODY_ORDER, type CompositeTabData } from './relationshipData';

/** Authored for a midpoint relationship chart, never either person's natal chart. */
export const COMPOSITE_BODY_ROLES: Record<BodyName, string> = {
  Sun: 'The composite Sun is a way to consider the relationship’s shared purpose. Notice what you choose to do together and whether that purpose still leaves room for each person to have a life of their own.',
  Moon: 'The composite Moon concerns the emotional atmosphere you build together: familiar routines, responses to vulnerability, and the ways you offer comfort. A useful shared rhythm makes space for different needs rather than assuming both people feel the same thing.',
  Mercury: 'Composite Mercury concerns how the relationship makes meaning through conversation. Pay attention to the questions you can ask, the assumptions you check, and whether an unfinished thought can be heard without becoming an argument.',
  Venus: 'Composite Venus concerns what you enjoy and value together. Shared affection can take many forms; the useful question is whether each person recognizes and welcomes the ways it is expressed.',
  Mars: 'Composite Mars concerns how the relationship acts, pursues a goal, and handles friction. Notice whether you can disagree clearly and still choose a next step that respects both people’s limits.',
  Jupiter: 'Composite Jupiter concerns the possibilities the relationship encourages you to explore. Shared confidence is useful when it supports curiosity and leaves room to revise an expectation that has grown larger than either person wants.',
  Saturn: 'Composite Saturn concerns the commitments and limits that give the relationship a workable shape. Notice which responsibilities are chosen together, which are assumed, and whether the arrangement can be discussed as circumstances change.',
  Uranus: 'Composite Uranus concerns the room a relationship makes for independence and change. Consider how you stay connected while allowing different interests, unexpected discoveries, and a rhythm that may not match other people’s expectations.',
  Neptune: 'Composite Neptune concerns shared imagination, hopes, and the meanings you may project onto the relationship. Enjoy what inspires you while checking whether an unspoken expectation has been mistaken for something you both agreed to.',
  Pluto: 'Composite Pluto concerns the relationship’s experience of influence, privacy, and change. A useful reflection is how decisions are made and whether either person can question an arrangement without being pressured to accept it.',
  'North Node': 'The composite North Node can be used as a symbolic question about direction. Consider a quality you would like to practice together; the midpoint does not establish a destined meeting or a required future.',
  'South Node': 'The composite South Node can be used as a symbolic question about familiar patterns. Notice a habit you repeat together and whether it still serves you, without treating familiarity as proof of a past life or an obligation to stay.',
};

/** Each field is a complete pair theme. Aspect prompts stay separate below. */
export const COMPOSITE_PAIR_THEMES: Record<string, string> = {
  'Sun|Moon': 'This pair brings shared purpose into conversation with the relationship’s emotional rhythm. What you want to build together and what makes daily life feel welcoming may need attention at different times.',
  'Sun|Mercury': 'This pair concerns how you describe the relationship and discuss its direction. A shared account can help, provided it can change when one person has a different experience to add.',
  'Sun|Venus': 'This pair connects the relationship’s purpose with what you enjoy together. Consider whether affection supports your shared direction or whether keeping things pleasant makes that direction difficult to discuss.',
  'Sun|Mars': 'This pair concerns how shared purpose becomes action. Notice who initiates a plan, how the other person can influence it, and whether doing more together actually serves what matters to you.',
  'Sun|Jupiter': 'This pair concerns the hopes gathered around the relationship. Shared confidence can open possibilities, while an expectation that the relationship must keep expanding may deserve a more ordinary, workable definition of success.',
  'Sun|Saturn': 'This pair connects the relationship’s identity with its commitments. Consider which promises support the life you want together and which have become rules that neither person remembers choosing.',
  'Sun|Uranus': 'This pair concerns the relationship’s ability to have a shared direction without requiring sameness. Independence may be part of what you value together, including the freedom to revise how the relationship works.',
  'Sun|Neptune': 'This pair concerns the story and hopes surrounding the relationship. An inspiring shared picture is useful when it can be compared with what both people actually experience in ordinary life.',
  'Sun|Pluto': 'This pair brings shared purpose into questions about influence. Notice who gets to define what the relationship means and whether a different view can change the conversation.',
  'Moon|Mercury': 'This pair concerns the conversation between feeling and explanation. Consider whether emotional experiences can be named without having to justify them, and whether listening leaves room for a response that is still taking shape.',
  'Moon|Venus': 'This pair connects the relationship’s emotional rhythm with the ways affection is expressed. What feels pleasant and what feels comforting may overlap, but neither person has to assume they are identical.',
  'Moon|Mars': 'This pair concerns what happens when a feeling calls for action. Notice whether you pause long enough to understand a need before trying to fix it, defend it, or turn it into a shared task.',
  'Moon|Jupiter': 'This pair concerns emotional encouragement within the relationship. Optimism may help you recover perspective, while an uncomfortable feeling may still need to be heard before either person looks for a brighter interpretation.',
  'Moon|Saturn': 'This pair concerns the relationship between emotional needs and dependable routines. Consider whether your agreements offer support and whether there is room to ask for care outside the usual arrangement.',
  'Moon|Uranus': 'This pair connects emotional familiarity with the need for space and variety. Notice how you communicate a change of rhythm so that independence does not have to be understood as a withdrawal of care.',
  'Moon|Neptune': 'This pair concerns sensitivity to the relationship’s emotional atmosphere. A strong impression is still an impression; asking what the other person feels leaves more room than assuming you already know.',
  'Moon|Pluto': 'This pair concerns vulnerability and influence within the relationship. Notice whether difficult feelings can be expressed without becoming a reason to monitor, test, or direct the other person.',
  'Mercury|Venus': 'This pair concerns the relationship’s language of appreciation and preference. Consider how you make a request kindly while keeping it clear enough that the other person can respond honestly.',
  'Mercury|Mars': 'This pair concerns the pace and force of your conversations. Direct speech can help a shared decision, while time to finish a thought may matter just as much as reaching an answer.',
  'Mercury|Jupiter': 'This pair connects everyday conversation with larger ideas. Notice whether enthusiasm helps you explore a question or moves the discussion past details that still need to be understood.',
  'Mercury|Saturn': 'This pair concerns how conversations become agreements. Specific words can make a promise easier to keep, provided a careful discussion does not turn into a test that only one person is allowed to pass.',
  'Mercury|Uranus': 'This pair concerns the relationship’s openness to unexpected ideas. Consider whether a new perspective can be heard on its merits and whether either person has time to catch up when the conversation changes direction.',
  'Mercury|Neptune': 'This pair connects clear language with imagination and implication. Shared shorthand can be enjoyable, but a practical agreement deserves words that do not require either person to guess what was meant.',
  'Mercury|Pluto': 'This pair concerns the depth and influence of your conversations. A searching question can reveal something useful when both people remain free to answer in their own time or keep a matter private.',
  'Venus|Mars': 'This pair concerns the relationship between attraction, enjoyment, and initiative. Notice how a preference becomes an invitation and whether the other person has a clear, comfortable way to accept or decline it.',
  'Venus|Jupiter': 'This pair concerns shared enjoyment and generosity. Consider which experiences feel enriching to both people and whether the wish to make something special has grown beyond the effort either person wants to give.',
  'Venus|Saturn': 'This pair connects affection with commitment and reliability. Notice the ordinary actions that help care feel dependable, while leaving room to express warmth in ways that are not another responsibility.',
  'Venus|Uranus': 'This pair concerns the balance between shared pleasure and individual preferences. Enjoying something together does not require every interest to be shared, and a new preference can be an invitation rather than a rejection.',
  'Venus|Neptune': 'This pair concerns affection and the ideals attached to it. Consider whether you are appreciating the relationship as it is or asking it to sustain a picture neither person can fully inhabit.',
  'Venus|Pluto': 'This pair concerns the influence that accompanies strong preferences and attachment. Notice whether affection makes honest choice easier or whether a wish to feel close has become pressure to agree.',
  'Mars|Jupiter': 'This pair connects shared effort with ambition. Enthusiasm can help you begin, while a plan becomes more useful when both people can set its pace and decide what is enough.',
  'Mars|Saturn': 'This pair concerns the relationship between action and limits. Consider whether a pause helps you choose a workable next step or whether frustration builds because the reasons for a limit remain unspoken.',
  'Mars|Uranus': 'This pair concerns initiative and the freedom to change course. A quick experiment may suit the relationship when either person can question the pace and when a shared plan remains a choice.',
  'Mars|Neptune': 'This pair connects effort with inspiration. Notice whether a shared aim is clear enough to act on or whether each person is working toward a different version of the same appealing idea.',
  'Mars|Pluto': 'This pair concerns force, persistence, and influence in shared action. Consider whether you can work toward something strongly while still respecting a pause, a disagreement, or another person’s refusal.',
  'Jupiter|Saturn': 'This pair brings possibility into conversation with practical limits. A relationship may need both an encouraging horizon and an arrangement that can be sustained without either person carrying an unspoken burden.',
  'Jupiter|Uranus': 'This pair concerns the possibilities opened by change. Consider whether a new direction offers something both people want to explore, rather than assuming that a larger or less familiar experience is automatically better.',
  'Jupiter|Neptune': 'This pair concerns shared ideals and the hope invested in them. An expansive vision can inspire a relationship when it remains possible to ask what the vision means in everyday terms.',
  'Jupiter|Pluto': 'This pair concerns ambition and the influence used to pursue it. Notice who benefits from a shared goal and whether both people can question the means as well as the desired result.',
  'Saturn|Uranus': 'This pair connects continuity with the need to revise an arrangement. Consider which part of the relationship’s structure still supports you and which part could change without losing what is useful.',
  'Saturn|Neptune': 'This pair concerns the meeting of an ideal with an actual commitment. A shared hope may become easier to care for when you name what each person can offer and what remains uncertain.',
  'Saturn|Pluto': 'This pair concerns how responsibility and influence are distributed. Notice whether a durable agreement can still be questioned, and whether keeping something stable has become a reason to avoid revisiting it.',
  'Uranus|Neptune': 'This slow-moving pair concerns shared imagination about change and is common across many relationships formed from similar birth periods. Use it as background context, not as the relationship’s defining trait.',
  'Uranus|Pluto': 'This slow-moving pair concerns change and the structures that hold influence. It is common across similar birth periods; what distinguishes a relationship is how its people choose to handle change together.',
  'Neptune|Pluto': 'This slow-moving pair concerns ideals and the influence needed to give them form. Many relationships share this background pattern, so it cannot establish a unique bond, a shared destiny, or a required direction.',
};

export const COMPOSITE_ASPECT_PROMPTS: Record<AspectType, string> = {
  conjunction: 'These themes occupy nearby positions. Where do they work together, and where would a clearer distinction between them help?',
  sextile: 'This angle is traditionally read as an opportunity for cooperation. What small shared choice could make that cooperation more deliberate?',
  square: 'This angle is traditionally read as a point of friction. Which competing needs could you name without asking either person to dismiss one?',
  trine: 'This angle is traditionally read as an easier connection. What do you appreciate about that ease, and what might it let you overlook?',
  opposition: 'These themes occupy opposite sides of the chart. How could both remain part of the conversation without assigning one to each person?',
};

export function compositePairKey(a: BodyName, b: BodyName): string {
  return RELATIONSHIP_BODY_ORDER.indexOf(a) < RELATIONSHIP_BODY_ORDER.indexOf(b) ? `${a}|${b}` : `${b}|${a}`;
}

export interface CompositeReading { role?: string; theme?: string; prompt?: string }
export function compositeReading(data: CompositeTabData, id: string | null): CompositeReading | null {
  const selected = compositeSelection(data, id);
  // Reference Moon facts remain visible, but cannot support a substantive
  // interpretation or action. Do not invent a bound or endpoint candidates.
  if (!selected || selected.provisional) return null;
  if (selected.kind === 'body') return { role: COMPOSITE_BODY_ROLES[selected.point.body] };
  return {
    theme: COMPOSITE_PAIR_THEMES[compositePairKey(selected.aspect.a, selected.aspect.b)],
    prompt: COMPOSITE_ASPECT_PROMPTS[selected.aspect.type],
  };
}
