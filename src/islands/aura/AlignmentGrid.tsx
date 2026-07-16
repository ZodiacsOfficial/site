import Wheel from '../../lib/wheel/Wheel';
import { SIGNS, signIndexForLongitude } from '../../lib/signs';
import type { SavedChart } from '../../lib/profile/schema';
import type { AuraComposition, AuraSign } from '../../lib/aura/types';
import { auraDateStamp, auraWheelDescription } from '../../lib/aura/copy';

// The Alignment: three labeled source rows against twelve sign columns.
// Marks never leave their row — the chart row never gains record color, the
// record row draws held signs only, and the sky row is the same for everyone.
// Rendered as a real table (explicit roles survive the responsive display
// switch); also server-renderable for the first-screen example.

const EVIDENCE_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'] as const;

export interface AlignmentGridProps {
  composition: AuraComposition;
  chart: SavedChart;
  checkedAt: string;
  illustrative?: boolean;
  /** The optional full-wheel disclosure; the static hero example omits it. */
  wheel?: boolean;
}

/** Aura's own evidence set: five personal bodies plus angles, honoring timeKnown. */
function chartMarksBySign(chart: SavedChart): string[][] {
  const marks: string[][] = SIGNS.map(() => []);
  for (const body of EVIDENCE_BODIES) {
    if (!chart.birth.timeKnown && body === 'Moon') continue;
    const point = chart.summary.bodies.find((candidate) => candidate.body === body);
    if (!point || !Number.isFinite(point.lon)) continue;
    marks[signIndexForLongitude(point.lon)].push(body);
  }
  if (chart.birth.timeKnown && chart.summary.angles) {
    if (Number.isFinite(chart.summary.angles.asc)) {
      marks[signIndexForLongitude(chart.summary.angles.asc)].push('Ascendant');
    }
    if (Number.isFinite(chart.summary.angles.mc)) {
      marks[signIndexForLongitude(chart.summary.angles.mc)].push('Midheaven');
    }
  }
  return marks;
}

export function AlignmentGrid({
  composition,
  chart,
  checkedAt,
  illustrative = false,
  wheel = true,
}: AlignmentGridProps) {
  const held = new Set<AuraSign>(composition.heldSigns);
  const chartMarks = chartMarksBySign(chart);
  const skyDate = auraDateStamp(composition.currentSky.observedAt);
  const recordDate = auraDateStamp(checkedAt);
  const focalSign = composition.focal?.sign ?? null;
  const eventSigns = new Set(
    composition.signs
      .filter((context) => context.activeNow.some((item) => item.source === 'event'))
      .map((context) => context.sign),
  );
  const focalName = focalSign
    ? SIGNS.find((sign) => sign.slug === focalSign)?.name
    : null;
  const columnClass = (slug: string) =>
    slug === focalSign ? 'aura-algn__cell is-f' : 'aura-algn__cell';

  const wheelBodies = wheel
    ? chart.summary.bodies
      .filter((body) => (
        ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(body.body)
        && Number.isFinite(body.lon)
        && (chart.birth.timeKnown || body.body !== 'Moon')
      ))
      .map((body) => chart.birth.timeKnown ? body : {
        ...body,
        // Unknown-time evidence is sign-level only: seat noon estimates at the
        // sign midpoint so the wheel cannot imply an exact degree.
        lon: signIndexForLongitude(body.lon) * 30 + 15,
      })
    : [];
  const wheelAngles = chart.birth.timeKnown ? chart.summary.angles : null;

  return (
    <figure class="aura-algn">
      <table role="table">
        <caption>
          Chart, record, and sky, sign by sign. Marks never leave their row; an
          empty cell means nothing is drawn for that sign.
        </caption>
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" class="aura-algn__corner" scope="col">
              <span class="sr-only">Source</span>
            </th>
            {SIGNS.map((sign) => (
              <th
                key={sign.slug}
                role="columnheader"
                scope="col"
                abbr={sign.name}
                class={sign.slug === focalSign ? 'aura-algn__col is-f' : 'aura-algn__col'}
              >
                {/* U+FE0E forces text presentation; platform emoji fonts
                    otherwise hijack several zodiac glyphs. */}
                <span aria-hidden="true">{`${sign.glyph}︎`}</span>
                <span class="sr-only">{sign.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          <tr role="row" class="aura-algn__row" data-aura-algn-row="chart">
            <th role="rowheader" scope="row" class="aura-algn__lbl">
              <i>Birth chart</i>
              <small>
                {chart.birth.timeKnown
                  ? 'private, read on this device'
                  : 'private, read on this device · noon estimate'}
              </small>
            </th>
            {SIGNS.map((sign, index) => (
              <td key={sign.slug} role="cell" class={columnClass(sign.slug)}>
                {chartMarks[index].length > 1 ? (
                  <span
                    class="aura-algn__chip"
                    data-aura-chart-mark={sign.slug}
                    title={chartMarks[index].join(', ')}
                  >
                    <span aria-hidden="true">{chartMarks[index].length}</span>
                    <span class="sr-only">{chartMarks[index].join(', ')}</span>
                  </span>
                ) : chartMarks[index].length === 1 ? (
                  <span
                    class="aura-algn__dot"
                    data-aura-chart-mark={sign.slug}
                    title={chartMarks[index][0]}
                  >
                    <span class="sr-only">{chartMarks[index][0]}</span>
                  </span>
                ) : null}
              </td>
            ))}
          </tr>
          <tr role="row" class="aura-algn__row" data-aura-algn-row="record">
            <th role="rowheader" scope="row" class="aura-algn__lbl">
              <i>At this address</i>
              <small>
                {illustrative
                  ? 'illustrative record · no address checked'
                  : `public record · checked ${recordDate}`}
              </small>
            </th>
            {held.size === 0 ? (
              <td role="cell" class="aura-algn__cell aura-algn__empty" colSpan={12}>
                No Registry-listed Zodiac at this address · nothing is drawn
              </td>
            ) : (
              SIGNS.map((sign) => (
                <td
                  key={sign.slug}
                  role="cell"
                  class={columnClass(sign.slug)}
                  data-aura-record-sign={held.has(sign.slug as AuraSign) ? sign.slug : undefined}
                >
                  {held.has(sign.slug as AuraSign) && (
                    <img
                      class="aura-algn__disc"
                      src={`/assets/zodiac-icons/48/${sign.slug}.webp`}
                      width="26"
                      height="26"
                      alt={`${sign.name}: found at this address`}
                    />
                  )}
                </td>
              ))
            )}
          </tr>
          <tr role="row" class="aura-algn__row" data-aura-algn-row="sky">
            <th role="rowheader" scope="row" class="aura-algn__lbl">
              <i>Sky</i>
              <small>{skyDate}</small>
            </th>
            {SIGNS.map((sign) => {
              const marks: Array<{ glyph: string; label: string }> = [];
              if (composition.currentSky.sun.sign === sign.slug) {
                marks.push({ glyph: '☉︎', label: 'Sun season' });
              }
              if (composition.currentSky.moon.sign === sign.slug) {
                marks.push({ glyph: '☾︎', label: 'Current Moon' });
              }
              if (eventSigns.has(sign.slug as AuraSign)) {
                marks.push({ glyph: '✳︎', label: 'Dated event within its window' });
              }
              return (
                <td key={sign.slug} role="cell" class={columnClass(sign.slug)}>
                  {marks.map((mark) => (
                    <span
                      key={mark.label}
                      class="aura-algn__sky"
                      data-aura-sky-mark={sign.slug}
                      title={mark.label}
                    >
                      <span aria-hidden="true">{mark.glyph}</span>
                      <span class="sr-only">{mark.label}</span>
                    </span>
                  ))}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      {focalName && (
        <p class="aura-algn__focal">
          This visit’s focus: <b>{focalName}</b> — the framed column.
        </p>
      )}
      {wheel && (
        <details class="aura-algn__wheel">
          <summary>Open the full natal wheel</summary>
          <Wheel
            bodies={wheelBodies}
            asc={wheelAngles?.asc ?? null}
            mc={wheelAngles?.mc ?? null}
            cusps={null}
            aspects={[]}
            size={420}
            animate={false}
            ariaLabel={auraWheelDescription(chart)}
          />
        </details>
      )}
    </figure>
  );
}
