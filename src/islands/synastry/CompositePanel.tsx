import AspectGlyph from '../../components/AspectGlyph';
import PlanetGlyph from '../../components/PlanetGlyph';
import { aspectLabel, planetLabel } from '../../lib/i18n/astrology';
import { type Locale } from '../../lib/i18n';
import { formatLongitude } from '../../lib/signs';
import Wheel from '../../lib/wheel/Wheel';
import type { CompositeTabData } from './relationshipData';

export const COMPOSITE_NOTE = `A composite chart is the midpoint of two charts — a portrait of the relationship itself rather than either person. Composite houses need a location convention we won't fake, so this chart is shown without houses.`;

const COPY = {
  en: {
    title: 'Two charts, one midpoint',
    placements: 'Composite placements',
    aspects: 'Composite aspects',
    noAspects: 'No major composite aspects are in orb.',
    note: COMPOSITE_NOTE,
  },
  es: {
    title: 'Dos cartas, un punto medio',
    placements: 'Posiciones de la carta compuesta',
    aspects: 'Aspectos de la carta compuesta',
    noAspects: 'No hay aspectos mayores dentro del orbe.',
    note: 'Una carta compuesta es el punto medio de dos cartas: un retrato de la relación en sí, no de ninguna de las dos personas. Las casas compuestas requieren una convención de ubicación que no vamos a fingir, por eso esta carta se muestra sin casas.',
  },
  pt: {
    title: 'Dois mapas, um ponto médio',
    placements: 'Posições do mapa composto',
    aspects: 'Aspectos do mapa composto',
    noAspects: 'Nenhum aspecto maior está dentro do orbe.',
    note: 'Um mapa composto é o ponto médio de dois mapas: um retrato da própria relação, não de nenhuma das duas pessoas. As casas do mapa composto exigem uma convenção de localização, e não vamos fingir que adotamos uma; por isso, este mapa é mostrado sem casas.',
  },
  fr: {
    title: 'Deux thèmes, un point médian',
    placements: 'Positions du thème composite',
    aspects: 'Aspects du thème composite',
    noAspects: 'Aucun aspect majeur du thème composite ne se trouve dans l’orbe.',
    note: 'Un thème composite correspond aux points médians de deux thèmes : il décrit la relation elle-même, et non l’une ou l’autre personne. Les maisons du thème composite exigent une convention de lieu que nous n’allons pas inventer ; ce thème est donc présenté sans maisons.',
  },
} as const;

interface CompositePanelProps {
  locale: Locale;
  data: CompositeTabData;
}

export function CompositePanel({ locale, data }: CompositePanelProps) {
  const c = COPY[locale];
  return (
    <div class="rcomp" data-composite-panel>
      <h3 class="rcomp__title" id="relationship-composite-title">{c.title}</h3>
      {/* The shared static Wheel names itself "Birth chart wheel". The
          complete placements/aspects below are this panel's accessible
          representation, so suppress that misleading inherited label here. */}
      <div class="tring__wheelbox rcomp__wheel" aria-hidden="true" data-composite-wheel>
        <Wheel
          bodies={data.points.filter((point) => point.body !== 'South Node')}
          asc={null}
          mc={null}
          cusps={null}
          aspects={data.aspects}
        />
      </div>

      <p class="rcomp__note" data-composite-note>{c.note}</p>

      <div class="rcomp__lists">
        <section aria-labelledby="composite-placements-heading">
          <h4 class="mono--label" id="composite-placements-heading">{c.placements}</h4>
          <ul class="rcomp__placements mono" role="list">
            {data.points.map((point) => (
              <li key={point.body} data-composite-point={point.body}>
                <span><PlanetGlyph body={point.body} size={13} class="pg-inline" /> {planetLabel(locale, point.body)}</span>
                <span>{formatLongitude(point.lon, locale)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="composite-aspects-heading">
          <h4 class="mono--label" id="composite-aspects-heading">{c.aspects}</h4>
          {data.aspects.length > 0 ? (
            <ul class="rcomp__aspects mono" role="list">
              {data.aspects.map((aspect) => (
                <li key={`${aspect.a}-${aspect.type}-${aspect.b}`}>
                  <span><PlanetGlyph body={aspect.a} size={13} class="pg-inline" /> {planetLabel(locale, aspect.a)}</span>
                  <span><AspectGlyph type={aspect.type} size={13} class="pg-inline" /> {aspectLabel(locale, aspect.type)}</span>
                  <span><PlanetGlyph body={aspect.b} size={13} class="pg-inline" /> {planetLabel(locale, aspect.b)}</span>
                  <span>{aspect.orb.toFixed(1)}°</span>
                </li>
              ))}
            </ul>
          ) : <p class="field__help">{c.noAspects}</p>}
        </section>
      </div>
    </div>
  );
}
