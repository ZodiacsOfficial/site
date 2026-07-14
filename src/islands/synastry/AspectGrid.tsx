import AspectGlyph from '../../components/AspectGlyph';
import PlanetGlyph from '../../components/PlanetGlyph';
import { synastryLine } from '../../lib/compat';
import { aspectLabel, planetLabel } from '../../lib/i18n/astrology';
import { t, type Locale } from '../../lib/i18n';
import type { RelationshipContact, RelationshipGridData, RelationshipPointName } from './relationshipData';
import { relationshipContactId } from './relationshipData';
import { synastryCorpusLine } from './synastryLines';

interface AspectGridProps {
  locale: Locale;
  aLabel: string;
  bLabel: string;
  grid: RelationshipGridData;
  selectedId: string | null;
  onSelect: (contact: RelationshipContact) => void;
}

const COPY = {
  en: {
    caption: '{a} by {b} aspect grid',
    empty: 'No major aspect',
  },
  es: {
    caption: 'Cuadrícula de aspectos de {a} y {b}',
    empty: 'Sin aspecto mayor',
  },
} as const;

const fmt = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

const isAngle = (name: RelationshipPointName): name is 'ASC' | 'MC' => name === 'ASC' || name === 'MC';
const pointLabel = (locale: Locale, name: RelationshipPointName) => isAngle(name) ? name : planetLabel(locale, name);

function ContactPoint({ locale, name }: { locale: Locale; name: RelationshipPointName }) {
  return isAngle(name) ? <>{name}</> : (
    <><PlanetGlyph body={name} size={13} class="pg-inline" /> {planetLabel(locale, name)}</>
  );
}

function accessibleContactName(
  locale: Locale,
  aLabel: string,
  bLabel: string,
  contact: RelationshipContact,
): string {
  if (locale === 'es') {
    return `${aLabel}: ${pointLabel(locale, contact.a)} ${aspectLabel(locale, contact.type)} ${bLabel}: ${pointLabel(locale, contact.b)}, orbe ${contact.orb.toFixed(1)} grados`;
  }
  return `${aLabel}'s ${pointLabel(locale, contact.a)} ${aspectLabel(locale, contact.type)} ${bLabel}'s ${pointLabel(locale, contact.b)}, orb ${contact.orb.toFixed(1)} degrees`;
}

export function AspectGrid({
  locale,
  aLabel,
  bLabel,
  grid,
  selectedId,
  onSelect,
}: AspectGridProps) {
  const c = COPY[locale];
  const selected = selectedId
    ? grid.contacts.find((contact) => relationshipContactId(contact) === selectedId) ?? null
    : null;
  const curated = selected ? synastryCorpusLine(selected.a, selected.b, selected.type) : null;
  const reading = selected
    ? curated ?? synastryLine(aLabel, selected.a, bLabel, selected.b, selected.type)
    : null;

  return (
    <div class="rgrid" data-relationship-grid>
      <div
        class="rgrid__scroll"
        role="region"
        aria-label={fmt(c.caption, { a: aLabel, b: bLabel })}
        tabIndex={0}
      >
        <table class="rgrid__table">
          <caption class="sr-only">{fmt(c.caption, { a: aLabel, b: bLabel })}</caption>
          <thead>
            <tr>
              <th class="rgrid__corner" scope="col"><span aria-hidden="true">A × B</span></th>
              {grid.columns.map((column) => (
                <th scope="col" key={column.name}>{pointLabel(locale, column.name)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, rowIndex) => (
              <tr key={row.name}>
                <th scope="row">{pointLabel(locale, row.name)}</th>
                {grid.cells[rowIndex].map((contact, columnIndex) => {
                  if (!contact) {
                    return (
                      <td key={grid.columns[columnIndex].name}>
                        <span class="rgrid__empty" aria-hidden="true">·</span>
                        <span class="sr-only">{c.empty}</span>
                      </td>
                    );
                  }
                  const id = relationshipContactId(contact);
                  const active = selectedId === id;
                  return (
                    <td key={grid.columns[columnIndex].name}>
                      <button
                        type="button"
                        class={`rgrid__contact rgrid__contact--${contact.type}${active ? ' is-focus' : ''}`}
                        aria-label={accessibleContactName(locale, aLabel, bLabel, contact)}
                        aria-pressed={active}
                        onClick={() => onSelect(contact)}
                        data-grid-contact={id}
                      >
                        <AspectGlyph type={contact.type} size={15} />
                        <span class="mono">{contact.orb.toFixed(1)}°</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && reading && (
        <div class="tring__focus rgrid__detail" role="status" data-grid-detail>
          <span class="tring__focus-receipt mono">
            {aLabel}: <ContactPoint locale={locale} name={selected.a} />
            {' '}<AspectGlyph type={selected.type} size={13} class="pg-inline" /> {aspectLabel(locale, selected.type)}
            {' '}{bLabel}: <ContactPoint locale={locale} name={selected.b} />
            {' · '}{t(locale, 'orb')} {selected.orb.toFixed(1)}°
          </span>
          {locale === 'en' && (
            <p
              class="tring__focus-read"
              data-curated-line={curated ? '' : undefined}
              data-fallback-line={curated ? undefined : ''}
            >
              {reading}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
