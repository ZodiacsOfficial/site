import { signBySlug } from '../../lib/signs';
import {
  auraTalismanSummary,
  buildAuraTalisman,
  type AuraTalismanModel,
} from '../../lib/aura/talisman';
import type {
  AuraCabinetHolding,
  AuraComposition,
  AuraSign,
} from '../../lib/aura/types';
import './AuraTalisman.css';

const VIEWBOX = 1000;

export interface AuraTalismanProps {
  composition: AuraComposition;
  holdings?: readonly AuraCabinetHolding[];
  includeChart?: boolean;
  selectedSign?: AuraSign | null;
  heading?: string;
  description?: string;
  className?: string;
}

function viewCoordinate(value: number): number {
  return value * VIEWBOX;
}

function observedDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function sealDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function TalismanArtwork({ model }: { model: AuraTalismanModel }) {
  const summary = auraTalismanSummary(model);

  return (
    <svg
      class="aura-talisman__svg"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      role="img"
      aria-label={summary}
      data-aura-talisman-mode={model.collectionMode}
      data-aura-talisman-full={model.fullTwelve ? 'true' : 'false'}
    >
      <title>Registry Aura collection talisman</title>
      <desc>{summary}</desc>

      <defs aria-hidden="true">
        <linearGradient id="aura-talisman-bronze" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#efc39d" />
          <stop offset="0.48" stop-color="#a96036" />
          <stop offset="1" stop-color="#4c291d" />
        </linearGradient>
        <linearGradient id="aura-talisman-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f2f6fb" />
          <stop offset="0.52" stop-color="#aab5c4" />
          <stop offset="1" stop-color="#4a5260" />
        </linearGradient>
        <linearGradient id="aura-talisman-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff0bd" />
          <stop offset="0.5" stop-color="#d2a54d" />
          <stop offset="1" stop-color="#68451c" />
        </linearGradient>
      </defs>

      <g class="aura-talisman__field" aria-hidden="true">
        <circle cx="500" cy="500" r="420" />
        <circle cx="500" cy="500" r="315" />
        <circle cx="500" cy="500" r="255" />
        <circle cx="500" cy="500" r="160" />
        <path d="M500 80V920M80 500H920" />
      </g>

      {model.fullTwelve && (
        <g aria-hidden="true">
          <circle class="aura-talisman__complete-halo" cx="500" cy="500" r="455" />
          <circle class="aura-talisman__complete-ring" cx="500" cy="500" r="386" />
        </g>
      )}

      <g
        class="aura-talisman__segments"
        data-aura-talisman-segment-count={model.collectionSegments.length}
        aria-hidden="true"
      >
        {model.collectionSegments.map((segment) => (
          <line
            key={`${segment.fromSign}-${segment.toSign}`}
            x1={viewCoordinate(segment.from.x)}
            y1={viewCoordinate(segment.from.y)}
            x2={viewCoordinate(segment.to.x)}
            y2={viewCoordinate(segment.to.y)}
          />
        ))}
      </g>

      <g class="aura-talisman__chart-echoes" aria-hidden="true">
        {model.chartEchoNodes.map((echo) => (
          <circle
            key={echo.id}
            class="aura-talisman__chart-echo"
            cx={viewCoordinate(echo.x)}
            cy={viewCoordinate(echo.y)}
            r={echo.estimated ? 7 : 9}
            data-aura-talisman-chart-echo={echo.sign}
          />
        ))}
      </g>

      <g class="aura-talisman__sky" aria-hidden="true">
        {model.skyMarks.map((mark) => (
          <g
            key={mark.body}
            class={`aura-talisman__sky-mark aura-talisman__sky-mark--${mark.body.toLowerCase()}`}
            transform={`translate(${viewCoordinate(mark.x)} ${viewCoordinate(mark.y)})`}
            data-aura-talisman-sky={mark.body.toLowerCase()}
          >
            <circle r="25" />
            <text y="8">{`${mark.glyph}︎`}</text>
          </g>
        ))}
      </g>

      <g class="aura-talisman__nodes" aria-hidden="true">
        {model.outerNodes.map((node) => {
          const selected = model.selectedSign === node.sign;
          return (
            <g
              key={node.sign}
              class="aura-talisman__node-position"
              transform={`translate(${viewCoordinate(node.x)} ${viewCoordinate(node.y)})`}
              data-aura-talisman-node={node.sign}
              data-aura-talisman-represented={node.represented ? 'true' : 'false'}
              data-aura-talisman-finish={node.finish ?? undefined}
              data-aura-talisman-selected={selected ? 'true' : 'false'}
            >
              <g
                class={`aura-talisman__node${node.represented ? ' is-represented' : ''}${node.finish ? ` is-${node.finish}` : ''}${selected ? ' is-selected' : ''}`}
                style={{
                  '--aura-talisman-hue': node.hue,
                  '--aura-talisman-index': String(node.index),
                }}
              >
                <circle class="aura-talisman__selection" r="49" />
                <circle class="aura-talisman__node-ring" r="39" />
                <circle class="aura-talisman__node-face" r="30" />
                <text y="10">{`${node.glyph}︎`}</text>
                {Array.from({ length: node.goldTallyArcs }, (_, index) => (
                  <circle
                    key={`${node.sign}-gold-tally-${index}`}
                    class="aura-talisman__gold-tally"
                    r={45 + index * 5}
                    pathLength="100"
                    stroke-dasharray="26 74"
                    stroke-dashoffset={index === 0 ? '0' : '50'}
                    data-aura-talisman-gold-tally={index + 1}
                  />
                ))}
                {node.goldCountLabel && node.goldCount !== '1' && (
                  <g class="aura-talisman__count" data-aura-talisman-count={node.goldCountLabel}>
                    <rect x="17" y="22" width="45" height="25" rx="12.5" />
                    <text x="39.5" y="40">{node.goldCountLabel}</text>
                  </g>
                )}
              </g>
            </g>
          );
        })}
      </g>

      <g class="aura-talisman__center" aria-hidden="true">
        <circle cx="500" cy="500" r="86" />
        <text class="aura-talisman__center-mark" x="500" y="491">AURA</text>
        <text
          class="aura-talisman__center-date"
          x="500"
          y="528"
          data-aura-talisman-edition={sealDate(model.editionDate)}
        >
          {sealDate(model.editionDate)}
        </text>
      </g>
    </svg>
  );
}

/**
 * Accessible, deterministic inline rendering of a public collection, dated
 * sky, and an explicitly optional private chart layer.
 */
export function AuraTalisman({
  composition,
  holdings = [],
  includeChart = false,
  selectedSign = null,
  heading = 'The collection’s dated seal.',
  description = 'A dated composition drawn from this collection and today’s Sun and Moon.',
  className,
}: AuraTalismanProps) {
  const model = buildAuraTalisman(composition, {
    includeChart,
    selectedSign,
    holdings,
  });
  const sun = signBySlug(model.skyMarks[0].sign).name;
  const moon = signBySlug(model.skyMarks[1].sign).name;
  const date = observedDate(composition.currentSky.observedAt);

  return (
    <figure
      class={`aura-talisman${className ? ` ${className}` : ''}`}
      data-aura-talisman
    >
      <header class="aura-talisman__header">
        <p class="aura-talisman__kicker">Registry Aura · {date} UTC</p>
        <h3>{heading}</h3>
        <p>{description}</p>
      </header>

      <div class="aura-talisman__frame">
        <TalismanArtwork model={model} />
      </div>

      <figcaption class="aura-talisman__label">
        <dl>
          <div>
            <dt>Collection</dt>
            <dd>{model.collectionPoints.length} of the Twelve represented</dd>
          </div>
          <div>
            <dt>Dated sky</dt>
            <dd>Sun in {sun} · Moon in {moon}</dd>
          </div>
          <div>
            <dt>Chart echo</dt>
            <dd>
              {model.chartEchoNodes.length > 0
                ? `${model.chartEchoNodes.length} inner ${model.chartEchoNodes.length === 1 ? 'mark' : 'marks'} shown`
                : 'Not shown'}
            </dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}

export default AuraTalisman;
