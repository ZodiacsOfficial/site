/** Birthplace typeahead over the offline GeoNames index. */
import { useRef, useState } from 'preact/hooks';
import { preloadIndex, searchCities } from '../lib/geo/search';
import type { City } from '../lib/geo/search';
import { t, type CatalogLocale as Locale } from '../lib/i18n';

interface Props {
  onSelect: (city: City | null) => void;
  selected: City | null;
  id?: string;
  locale?: Locale;
  validationError?: string;
  selectionHint?: string;
  required?: boolean;
}

export default function PlaceSearch({
  onSelect,
  selected,
  id = 'place',
  locale = 'en',
  validationError,
  selectionHint,
  required = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const requestToken = useRef(0);
  const pickHint = validationError || (!selected && query.trim() ? selectionHint : '');

  function onInput(value: string) {
    const token = ++requestToken.current;
    setQuery(value);
    onSelect(null);
    clearTimeout(debounce.current);
    setOpen(false);
    setError(false);
    value = value.trim();

    if (!value[1]) return;

    debounce.current = setTimeout(async () => {
      try {
        const cities = await searchCities(value);
        if (token === requestToken.current) {
          setResults(cities);
          setActive(0);
          setOpen(true);
        }
      } catch {
        if (token === requestToken.current) setError(true);
      }
    }, 120);
  }

  function choose(city: City) {
    onSelect(city);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) choose(results[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  if (selected) {
    // A real (read-only) input keeps the page's <label for> association
    // alive in the selected state and gives the value back to AT.
    const chipValue = [selected.name, [selected.admin1, selected.country].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' · ');
    return (
      <div class="place place--selected">
        <span class="place__chip">
          <input id={id} class="place__chip-value" readOnly value={chipValue} />
          <button type="button" class="place__clear" aria-label={t(locale, 'placeChange')} onClick={() => onSelect(null)}>×</button>
        </span>
      </div>
    );
  }

  return (
    <div class="place" onFocusOut={(event) => {
      if (!(event.currentTarget as HTMLDivElement).contains(event.relatedTarget as Node | null)) {
        clearTimeout(debounce.current);
        ++requestToken.current;
        setOpen(false);
      }
    }}>
      <input
        id={id}
        class="field__input"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
        aria-describedby={pickHint ? `${id}-pick-hint` : undefined}
        aria-invalid={validationError ? 'true' : undefined}
        aria-required={required || undefined}
        placeholder={t(locale, 'placePlaceholder')}
        autocomplete="off"
        value={query}
        onFocus={() => preloadIndex().catch(() => setError(true))}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
        onKeyDown={onKeyDown}
      />
      {pickHint && (
        <p
          id={`${id}-pick-hint`}
          class={validationError ? 'place__error' : 'place__hint'}
          role={validationError ? 'alert' : undefined}
        >
          {pickHint}
        </p>
      )}
      {error && <p class="place__error" role="alert">{t(locale, 'placeError')}</p>}
      {open && (
        <ul class="place__list" id={`${id}-list`} role="listbox">
          {results.length ? (
            results.map((c, i) => (
              <li key={c.name + c.lat + c.lon} role="none">
                <button
                  type="button"
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  tabIndex={-1}
                  class={i === active ? 'place__option is-active' : 'place__option'}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                >
                  <span class="place__name">{c.name}</span>
                  <span class="place__meta">{[c.admin1, c.country].filter(Boolean).join(', ')}</span>
                </button>
              </li>
            ))
          ) : (
            <li class="place__empty" role="option" aria-disabled={true}>
              {t(locale, 'placeNoResults')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
