export interface GamesQuestionChoice {
  key: string;
  label: string;
}

export interface GamesWeeklyQuestion {
  id: string;
  prompt: string;
  choices: readonly GamesQuestionChoice[];
}

const QUESTION_ROTATION = Object.freeze([
  Object.freeze({
    key: 'trust',
    prompt: 'What earns your trust fastest?',
    choices: Object.freeze([
      Object.freeze({ key: 'actions', label: 'What someone does' }),
      Object.freeze({ key: 'words', label: 'What someone says' }),
      Object.freeze({ key: 'time', label: 'Time' }),
    ]),
  }),
  Object.freeze({
    key: 'pressure',
    prompt: 'When pressure hits, what do you rely on?',
    choices: Object.freeze([
      Object.freeze({ key: 'instinct', label: 'Instinct' }),
      Object.freeze({ key: 'plan', label: 'A clear plan' }),
      Object.freeze({ key: 'people', label: 'People I trust' }),
    ]),
  }),
  Object.freeze({
    key: 'success',
    prompt: 'What feels most like success?',
    choices: Object.freeze([
      Object.freeze({ key: 'freedom', label: 'Freedom' }),
      Object.freeze({ key: 'respect', label: 'Respect' }),
      Object.freeze({ key: 'peace', label: 'Peace of mind' }),
    ]),
  }),
  Object.freeze({
    key: 'friendship',
    prompt: 'What makes a friendship last?',
    choices: Object.freeze([
      Object.freeze({ key: 'honesty', label: 'Honesty' }),
      Object.freeze({ key: 'loyalty', label: 'Loyalty' }),
      Object.freeze({ key: 'room', label: 'Room to grow' }),
    ]),
  }),
  Object.freeze({
    key: 'decision',
    prompt: 'What helps you make a hard decision?',
    choices: Object.freeze([
      Object.freeze({ key: 'facts', label: 'The facts' }),
      Object.freeze({ key: 'instinct', label: 'Instinct' }),
      Object.freeze({ key: 'talking', label: 'Talking it through' }),
    ]),
  }),
  Object.freeze({
    key: 'compliment',
    prompt: 'What kind of compliment stays with you?',
    choices: Object.freeze([
      Object.freeze({ key: 'character', label: 'One about my character' }),
      Object.freeze({ key: 'work', label: 'One about my work' }),
      Object.freeze({ key: 'style', label: 'One about my style' }),
    ]),
  }),
  Object.freeze({
    key: 'protect',
    prompt: 'What do you protect most?',
    choices: Object.freeze([
      Object.freeze({ key: 'time', label: 'My time' }),
      Object.freeze({ key: 'people', label: 'My people' }),
      Object.freeze({ key: 'peace', label: 'My peace' }),
    ]),
  }),
  Object.freeze({
    key: 'home',
    prompt: 'What makes a place feel like home?',
    choices: Object.freeze([
      Object.freeze({ key: 'familiar', label: 'Familiar people' }),
      Object.freeze({ key: 'space', label: 'My own space' }),
      Object.freeze({ key: 'possibility', label: 'A sense of possibility' }),
    ]),
  }),
  Object.freeze({
    key: 'brave',
    prompt: 'What makes you feel brave?',
    choices: Object.freeze([
      Object.freeze({ key: 'preparation', label: 'Being prepared' }),
      Object.freeze({ key: 'purpose', label: 'Having a reason' }),
      Object.freeze({ key: 'support', label: 'Someone beside me' }),
    ]),
  }),
  Object.freeze({
    key: 'leader',
    prompt: 'What do you value most in a leader?',
    choices: Object.freeze([
      Object.freeze({ key: 'clarity', label: 'Clarity' }),
      Object.freeze({ key: 'courage', label: 'Courage' }),
      Object.freeze({ key: 'care', label: 'Care' }),
    ]),
  }),
  Object.freeze({
    key: 'apology',
    prompt: 'What makes an apology feel real?',
    choices: Object.freeze([
      Object.freeze({ key: 'change', label: 'Changed behavior' }),
      Object.freeze({ key: 'honest', label: 'Honest words' }),
      Object.freeze({ key: 'time', label: 'Giving it time' }),
    ]),
  }),
  Object.freeze({
    key: 'more',
    prompt: 'What do you want more of this year?',
    choices: Object.freeze([
      Object.freeze({ key: 'adventure', label: 'Adventure' }),
      Object.freeze({ key: 'connection', label: 'Connection' }),
      Object.freeze({ key: 'calm', label: 'Calm' }),
    ]),
  }),
]);

/** One reviewed, deterministic question for every ISO week. */
export function gamesQuestionForWeek(isoYear: number, isoWeek: number): GamesWeeklyQuestion {
  if (!Number.isInteger(isoYear) || isoYear < 2020 || isoYear > 2100
    || !Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53) {
    throw new RangeError('Games question requires a valid ISO week');
  }
  const template = QUESTION_ROTATION[(isoYear * 53 + isoWeek - 1) % QUESTION_ROTATION.length]!;
  return {
    id: `${template.key}-${isoYear}-w${String(isoWeek).padStart(2, '0')}`,
    prompt: template.prompt,
    choices: template.choices,
  };
}

export function isGamesAnswer(question: GamesWeeklyQuestion, value: unknown): value is string {
  return typeof value === 'string' && question.choices.some((choice) => choice.key === value);
}
