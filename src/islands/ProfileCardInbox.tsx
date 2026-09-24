/**
 * A chart card arriving at /profile/#card=…. The fragment is read once,
 * removed from the address bar (so a reload, a bookmark or a screenshot of
 * the URL does not keep it), and shown as a card the reader can keep with
 * their people. Nothing is stored unless they add it, and nothing is sent
 * anywhere either way.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import ChartMark from '../components/ChartMark';
import { useProfile } from '../lib/hooks/useProfile';
import { explicitSelfChart } from '../lib/profile/read-store';
import {
  OPEN_CARD_EVENT,
  cardMatchesChart,
  cardTokenFromHash,
  decodeCardLink,
  type ChartCard,
} from '../lib/profile/card-link';
import { MAX_CIRCLE, addCard, type AddCardResult } from '../lib/profile/circle';
import { markFromCircle } from '../lib/profile/your-people';
import { settledSignIndex, signIndexForMark } from '../lib/chart-mark/common';
import { SIGNS } from '../lib/signs';
import { useProfileSurface } from '../lib/profile/surface-gate';

type Arrival =
  | { state: 'none' }
  | { state: 'invalid' }
  | { state: 'ready'; card: ChartCard; result: AddCardResult | null; dismissed: boolean };

/** Read a card from the current hash, then take it out of the address bar. */
export function takeCardFromLocation(location: Pick<Location, 'hash' | 'pathname' | 'search'>, history: Pick<History, 'replaceState'>): Arrival {
  if (!/^#card=/u.test(location.hash)) return { state: 'none' };
  const token = cardTokenFromHash(location.hash);
  const card = token ? decodeCardLink(token) : null;
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  } catch {
    // The card still opens; only the address bar keeps the fragment.
  }
  return card ? { state: 'ready', card, result: null, dismissed: false } : { state: 'invalid' };
}

function cardPlacements(card: ChartCard): { label: string; slug: string; name: string; hue: string }[] {
  const find = (body: string) => card.chart.bodies.find((row) => row.body === body)?.lon;
  const rows: { label: string; index: number | null }[] = [
    { label: 'Sun', index: settledSignIndex('Sun', find('Sun') ?? Number.NaN, card.timeKnown) },
    { label: 'Moon', index: settledSignIndex('Moon', find('Moon') ?? Number.NaN, card.timeKnown) },
    { label: 'Rising', index: card.timeKnown && card.chart.angles ? signIndexForMark(card.chart.angles.asc) : null },
  ];
  return rows.flatMap(({ label, index }) => {
    if (index === null) return [];
    const sign = SIGNS[index];
    return [{ label, slug: sign.slug, name: sign.name, hue: sign.hue }];
  });
}

export default function ProfileCardInbox({ accountBound = false }: { accountBound?: boolean }) {
  const { profile, ready } = useProfile();
  const surface = useProfileSurface(accountBound);
  const [arrival, setArrival] = useState<Arrival>({ state: 'none' });
  const self = useMemo(() => explicitSelfChart(profile.charts), [profile.charts]);

  useEffect(() => {
    setArrival(takeCardFromLocation(window.location, window.history));
  }, []);

  if (!surface || arrival.state === 'none' || (arrival.state === 'ready' && arrival.dismissed)) return null;

  if (arrival.state === 'invalid') {
    return (
      <section class="pf-inbox shell" aria-labelledby="pf-inbox-title">
        <div class="core pf-inbox__core">
          <h2 id="pf-inbox-title">This card link isn’t complete.</h2>
          <p>It may have been cut off when it was copied. Ask them to send it again.</p>
          <div class="pf-inbox__actions">
            <button class="btn btn--ghost" type="button" onClick={() => setArrival({ state: 'none' })}>Close</button>
          </div>
        </div>
      </section>
    );
  }

  const { card, result } = arrival;
  const who = card.label || 'Someone';
  const own = ready && self !== null && cardMatchesChart(card, self);
  const sunIndex = settledSignIndex('Sun', card.chart.bodies.find((row) => row.body === 'Sun')?.lon ?? Number.NaN, card.timeKnown);
  const hue = sunIndex === null ? 'var(--accent)' : SIGNS[sunIndex].hue;
  const added = result === 'added' || result === 'updated';

  function keep() {
    if (arrival.state !== 'ready') return;
    setArrival({ ...arrival, result: addCard(arrival.card) });
  }

  return (
    <section class="pf-inbox shell tinted" style={`--sign:${hue}`} aria-labelledby="pf-inbox-title" data-card-inbox>
      <div class="core tinted pf-inbox__core">
        <div class="pf-inbox__who">
          <ChartMark source={markFromCircle(card)} size={88} label={`${who}’s chart mark`} />
          <div>
            <h2 id="pf-inbox-title">
              {own ? 'This is your own card.' : `${who} sent you their chart card`}
            </h2>
            <div class="pf-chart__three">
              {cardPlacements(card).map((placement) => (
                <span class="pf-chip" style={`--sign:${placement.hue}`} key={placement.label}>
                  <picture class="pf-chip__icon">
                    <source srcset={`/assets/zodiac-icons/48/${placement.slug}.avif`} type="image/avif" />
                    <img src={`/assets/zodiac-icons/48/${placement.slug}.webp`} width="16" height="16" alt="" loading="lazy" decoding="async" />
                  </picture>
                  <span class="pf-chip__label">{placement.label}</span> {placement.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {own ? (
          <p>This is what people see when you send it. It opens on their own page, not yours.</p>
        ) : added ? (
          <p role="status">
            {result === 'updated' ? `${who} was already with your people — the card is up to date.` : `${who} is with your people now.`}
            {' '}
            {self
              ? 'Send yours back so they can keep you too.'
              : 'Next, add your own birth chart and you can compare the two.'}
          </p>
        ) : result === 'full' ? (
          <p class="field__error" role="alert">Your people list is full ({MAX_CIRCLE}). Remove someone to make room.</p>
        ) : result === 'error' ? (
          <p class="field__error" role="alert">This browser wouldn’t keep it. Private browsing or a full disk can do that.</p>
        ) : (
          <p>
            Keep it with your people to see when their Sun returns each year and to compare your charts.
            It stays in this browser. {card.timeKnown ? '' : 'Their card has no birth time, so it shows no rising sign.'}
          </p>
        )}

        <div class="pf-inbox__actions">
          {own ? (
            <button class="btn btn--ghost" type="button" onClick={() => setArrival({ ...arrival, dismissed: true })}>Close</button>
          ) : added ? (
            <>
              {/* Without a chart of their own, the page's one birth-chart
                  invitation follows directly below; no second button here. */}
              {self && (
                <button
                  class="btn btn--glass"
                  type="button"
                  onClick={() => {
                    setArrival({ ...arrival, dismissed: true });
                    window.dispatchEvent(new Event(OPEN_CARD_EVENT));
                  }}
                >
                  <span>Send your card</span><span class="orb" aria-hidden="true">→</span>
                </button>
              )}
              <a class="pf-inbox__quiet" href="#your-people">See your people</a>
            </>
          ) : (
            <>
              <button class="btn btn--glass" type="button" onClick={keep} data-card-keep>
                <span>Add to your people</span><span class="orb" aria-hidden="true">+</span>
              </button>
              <button class="btn btn--ghost" type="button" onClick={() => setArrival({ ...arrival, dismissed: true })}>Not now</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
