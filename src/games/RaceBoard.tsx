import { useEffect, useState } from 'preact/hooks';
import './race.css';

const API_PATH = '/api/games';
const MEMBERSHIP_KEY = 'zodiacs:games:v1';
const SUN_SIGN_HINT_KEY = 'zodiacs:today-sun-sign:v1';
const SIGN_PATTERN = /^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$/;
const ANSWER_PATTERN = /^[a-z0-9-]{1,32}$/;

export interface RaceSign {
  slug: string;
  name: string;
  glyph: string;
  hue: string;
}

interface QuestionChoice {
  key: string;
  label: string;
}

interface AnswerCount {
  key: string;
  count: number;
}

interface TeamAnswers {
  sign: string;
  responses: AnswerCount[];
}

interface WeeklyQuestion {
  id: string;
  prompt: string;
  choices: readonly QuestionChoice[];
  responses?: AnswerCount[];
  teams?: TeamAnswers[];
}

export interface RaceBoardProps {
  seasonId: string;
  isoYear: number;
  isoWeek: number;
  signs: RaceSign[];
  question: WeeklyQuestion;
}

interface StandingRow {
  sign: string;
  points: number;
}

interface Membership {
  sign: string;
  joinedAt: string;
  lastCheckin?: string;
  lastAnswer?: string;
}

function readMembership(): Membership | null {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Membership;
    if (!parsed || !SIGN_PATTERN.test(parsed.sign ?? '')) return null;
    if (parsed.lastAnswer && !ANSWER_PATTERN.test(parsed.lastAnswer)) delete parsed.lastAnswer;
    return parsed;
  } catch {
    return null;
  }
}

function writeMembership(value: Membership | null): void {
  try {
    if (value) localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(value));
    else localStorage.removeItem(MEMBERSHIP_KEY);
  } catch {
    // Private-mode storage failures only lose the local mirror.
  }
}

function joinedLabel(joinedAt: string): string {
  const date = new Date(joinedAt);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function Results({
  title, choices, responses,
}: {
  title: string;
  choices: readonly QuestionChoice[];
  responses: AnswerCount[];
}) {
  const byKey = new Map(responses.map((response) => [response.key, response.count]));
  const total = responses.reduce((sum, response) => sum + response.count, 0);
  return (
    <div class="race-poll__results">
      <h4>{title}</h4>
      <ul>
        {choices.map((choice) => {
          const count = byKey.get(choice.key) ?? 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={choice.key}>
              <span>{choice.label}</span>
              <span>{count.toLocaleString('en')}</span>
              <span class="race-poll__bar" aria-hidden="true">
                <span style={`inline-size:${share}%`} />
              </span>
            </li>
          );
        })}
      </ul>
      <p>{total === 0 ? 'No answers yet.' : `${total.toLocaleString('en')} ${total === 1 ? 'answer' : 'answers'}`}</p>
    </div>
  );
}

export default function RaceBoard({
  seasonId, isoYear, isoWeek, signs, question: initialQuestion,
}: RaceBoardProps) {
  const [standings, setStandings] = useState<StandingRow[] | null>(null);
  const [boardError, setBoardError] = useState(false);
  const [currentSeasonId, setCurrentSeasonId] = useState(seasonId);
  const [seasonClock, setSeasonClock] = useState<{ name: string; daysLeft: number } | null>(null);
  const [week, setWeek] = useState({ isoYear, isoWeek });
  const [question, setQuestion] = useState<WeeklyQuestion>(initialQuestion);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [justJoined, setJustJoined] = useState(false);
  const [note, setNote] = useState<string>('');
  const weekKey = `${currentSeasonId}:${week.isoYear}-${week.isoWeek}`;
  const checkedInThisWeek = membership?.lastCheckin === weekKey;

  const signBySlug = (slug: string) => signs.find((sign) => sign.slug === slug);

  const loadBoard = async (fresh = false, signal?: AbortSignal) => {
    const suffix = fresh ? '&fresh=1' : '';
    const response = await fetch(`${API_PATH}?action=standings${suffix}`, {
      signal,
      credentials: 'same-origin',
      cache: fresh ? 'no-store' : 'no-cache',
    });
    if (!response.ok) throw new Error(String(response.status));
    const body = await response.json() as {
      standings?: StandingRow[];
      seasonId?: string;
      seasonName?: string;
      daysLeft?: number;
      isoYear?: number;
      isoWeek?: number;
      question?: WeeklyQuestion;
    };
    if (signal?.aborted) return;
    if (Array.isArray(body.standings)) setStandings(body.standings);
    if (typeof body.seasonId === 'string') setCurrentSeasonId(body.seasonId);
    if (typeof body.seasonName === 'string' && typeof body.daysLeft === 'number') {
      setSeasonClock({ name: body.seasonName, daysLeft: body.daysLeft });
    }
    if (typeof body.isoYear === 'number' && typeof body.isoWeek === 'number') {
      setWeek({ isoYear: body.isoYear, isoWeek: body.isoWeek });
    }
    if (body.question && Array.isArray(body.question.choices)) setQuestion(body.question);
    setBoardError(false);
  };

  useEffect(() => {
    setMembership(readMembership());
    let hinted = '';
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('sign') ?? '';
      if (SIGN_PATTERN.test(fromUrl)) hinted = fromUrl;
      if (!hinted) {
        const fromSite = localStorage.getItem(SUN_SIGN_HINT_KEY) ?? '';
        if (SIGN_PATTERN.test(fromSite)) hinted = fromSite;
      }
    } catch {
      // No hint available.
    }
    if (hinted) setSelected(hinted);

    const controller = new AbortController();
    loadBoard(false, controller.signal).catch(() => {
      if (!controller.signal.aborted) setBoardError(true);
    });
    return () => controller.abort();
  }, [seasonId]);

  useEffect(() => {
    setSelectedAnswer('');
  }, [question.id]);

  const post = async (action: 'join' | 'checkin', body?: Record<string, string>) => {
    const response = await fetch(`${API_PATH}?action=${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  };

  const join = async (sign: string) => {
    if (busy || !SIGN_PATTERN.test(sign)) return;
    setBusy(true);
    setNote('');
    try {
      const result = await post('join', { sign });
      const body = result.body as { status?: string; sign?: string; joinedAt?: string };
      if (body.status === 'joined' || body.status === 'already_joined') {
        const settled: Membership = {
          sign: SIGN_PATTERN.test(body.sign ?? '') ? body.sign! : sign,
          joinedAt: body.joinedAt ?? new Date().toISOString(),
        };
        writeMembership(settled);
        setMembership(settled);
        setJustJoined(body.status === 'joined');
        if (body.status === 'already_joined' && settled.sign !== sign) {
          setNote(`This browser already represents Team ${signBySlug(settled.sign)?.name ?? settled.sign}.`);
        }
        await loadBoard(true).catch(() => setBoardError(true));
      } else if (result.status === 429) {
        setNote('Too many joins came from this internet connection today. Try again tomorrow.');
      } else {
        setNote('Couldn’t update the standings. Try again in a moment.');
      }
    } catch {
      setNote('Couldn’t update the standings. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const checkin = async () => {
    if (busy || !membership || !selectedAnswer) return;
    setBusy(true);
    setNote('');
    try {
      const result = await post('checkin', { answer: selectedAnswer });
      const body = result.body as {
        status?: string;
        isoYear?: number;
        isoWeek?: number;
        seasonId?: string;
        answer?: string;
      };
      if (body.status === 'checked_in' || body.status === 'already_counted') {
        const stampedWeek = typeof body.isoYear === 'number' && typeof body.isoWeek === 'number'
          ? { isoYear: body.isoYear, isoWeek: body.isoWeek }
          : week;
        const stampedSeason = typeof body.seasonId === 'string' ? body.seasonId : currentSeasonId;
        const answer = ANSWER_PATTERN.test(body.answer ?? '') ? body.answer! : selectedAnswer;
        const settled = {
          ...membership,
          lastCheckin: `${stampedSeason}:${stampedWeek.isoYear}-${stampedWeek.isoWeek}`,
          lastAnswer: answer,
        };
        writeMembership(settled);
        setMembership(settled);
        setWeek(stampedWeek);
        setCurrentSeasonId(stampedSeason);
        setSelectedAnswer(answer);
        await loadBoard(true).catch(() => setBoardError(true));
      } else if (body.status === 'not_joined') {
        writeMembership(null);
        setMembership(null);
        setNote('This browser is not on a team yet. Choose a team to continue.');
      } else if (result.status === 400) {
        setNote('That answer is no longer available. Refresh and choose again.');
      } else {
        setNote('Couldn’t update the standings. Try again in a moment.');
      }
    } catch {
      setNote('Couldn’t update the standings. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const board = standings ?? signs.map((sign) => ({ sign: sign.slug, points: -1 }));
  const leader = standings && standings[0]?.points > 0 ? standings[0] : null;
  const runnerUp = leader && standings && standings.length > 1 ? standings[1] : null;
  const tiedLeaders = leader && standings
    ? standings.filter((row) => row.points === leader.points)
    : [];
  const memberSign = membership ? signBySlug(membership.sign) : undefined;
  const outlinedSign = membership?.sign ?? selected;
  const chosenAnswer = question.choices.find((choice) => choice.key === membership?.lastAnswer);
  const teamResponses = membership
    ? question.teams?.find((team) => team.sign === membership.sign)?.responses
    : undefined;

  return (
    <div class="race-board">
      {seasonClock && (
        <p class="race-board__season" aria-live="polite">
          {seasonClock.name} Season · {seasonClock.daysLeft}{' '}
          {seasonClock.daysLeft === 1 ? 'day' : 'days'} left · Week {week.isoWeek}
        </p>
      )}
      <p class="race-board__lead" data-race-lead aria-live="polite">
        {boardError
          ? 'Live standings are temporarily unavailable.'
          : standings === null
            ? 'Reading the current standings…'
            : leader && tiedLeaders.length > 1
              ? tiedLeaders.length === 2
                ? `${signBySlug(tiedLeaders[0]!.sign)?.name ?? tiedLeaders[0]!.sign} and ${signBySlug(tiedLeaders[1]!.sign)?.name ?? tiedLeaders[1]!.sign} are tied for first at ${leader.points.toLocaleString('en')} ${leader.points === 1 ? 'point' : 'points'}.`
                : `${tiedLeaders.length} teams are tied for first at ${leader.points.toLocaleString('en')} ${leader.points === 1 ? 'point' : 'points'}.`
              : leader && runnerUp
                ? `${signBySlug(leader.sign)?.name ?? leader.sign} leads. ${signBySlug(runnerUp.sign)?.name ?? runnerUp.sign} is ${(leader.points - runnerUp.points).toLocaleString('en')} ${(leader.points - runnerUp.points) === 1 ? 'point' : 'points'} behind.`
              : leader
                ? `${signBySlug(leader.sign)?.name ?? leader.sign} leads.`
                : 'No team has scored yet. The first join takes the lead.'}
      </p>

      <div class="race-board__table-wrap">
        <table class="race-board__table">
          <caption class="sr-only">Current standings for all twelve Zodiac Games teams</caption>
          <thead>
            <tr><th scope="col">#</th><th scope="col">Team</th><th scope="col">Points</th></tr>
          </thead>
          <tbody>
            {board.map((row) => {
              const sign = signBySlug(row.sign);
              const isMine = membership?.sign === row.sign;
              const isOutlined = outlinedSign === row.sign;
              const rank = row.points <= 0
                ? '—'
                : board.findIndex((candidate) => candidate.points === row.points) + 1;
              return (
                <tr
                  key={row.sign}
                  aria-current={isOutlined ? 'true' : undefined}
                  data-current={isOutlined ? 'true' : undefined}
                  style={`--sign:${sign?.hue ?? 'var(--ink-dim)'}`}
                >
                  <td class="race-board__rank">{rank}</td>
                  <td class="race-board__sign">
                    <span class="race-board__disc" aria-hidden="true">{sign?.glyph}</span>
                    {sign?.name ?? row.sign}
                    {isMine && <span class="race-board__yours">your team</span>}
                  </td>
                  <td class="race-board__points">{row.points < 0 ? '—' : row.points.toLocaleString('en')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div class="race-board__module" data-race-join id="join" aria-busy={busy}>
        {!membership && (
          <>
            <h2>Represent your sign</h2>
            <p class="race-board__intro">Joining adds one point to your team.</p>
            <div class="race-board__signs">
              {signs.map((sign) => (
                <button
                  key={sign.slug}
                  type="button"
                  aria-pressed={selected === sign.slug}
                  class="race-board__chip"
                  data-selected={selected === sign.slug ? 'true' : undefined}
                  style={`--sign:${sign.hue}`}
                  onClick={() => setSelected(sign.slug)}
                >
                  <span aria-hidden="true">{sign.glyph}</span> {sign.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              class="btn race-board__cta"
              disabled={!selected || busy}
              onClick={() => join(selected)}
            >
              {busy
                ? 'Joining…'
                : selected ? `Join Team ${signBySlug(selected)?.name}` : 'Choose your team'}
            </button>
            <p class="race-board__free">Joining is free and requires no account or payment.</p>
          </>
        )}

        {membership && (
          <div class="race-poll">
            <p class="race-board__eyebrow">
              Team {memberSign?.name ?? membership.sign}
              {joinedLabel(membership.joinedAt) && ` · since ${joinedLabel(membership.joinedAt)}`}
            </p>
            <h2>{question.prompt}</h2>
            {!checkedInThisWeek ? (
              <>
                {justJoined && (
                  <p class="race-board__joined">
                    You joined Team {memberSign?.name ?? membership.sign} and added one point.
                  </p>
                )}
                <div class="race-poll__choices">
                  {question.choices.map((choice) => (
                    <button
                      key={choice.key}
                      type="button"
                      aria-pressed={selectedAnswer === choice.key}
                      data-selected={selectedAnswer === choice.key ? 'true' : undefined}
                      onClick={() => setSelectedAnswer(choice.key)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  class="btn race-board__cta"
                  disabled={!selectedAnswer || busy}
                  onClick={checkin}
                >
                  {busy ? 'Adding point…' : 'Add this week’s point'}
                </button>
              </>
            ) : (
              <>
                <p class="race-board__counted">
                  <strong>Your answer counted.</strong>{chosenAnswer ? ` You chose “${chosenAnswer.label}.”` : ''}
                </p>
                {question.responses && teamResponses ? (
                  <div class="race-poll__result-grid" aria-live="polite">
                    <Results
                      title={`Team ${memberSign?.name ?? membership.sign}`}
                      choices={question.choices}
                      responses={teamResponses}
                    />
                    <Results title="All teams" choices={question.choices} responses={question.responses} />
                  </div>
                ) : (
                  <p class="race-board__free">Results are updating.</p>
                )}
              </>
            )}
          </div>
        )}
        {note && <p class="race-board__note" role="status">{note}</p>}
      </div>
    </div>
  );
}
