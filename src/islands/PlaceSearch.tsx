/** Birthplace typeahead over the offline GeoNames index. */
import { useEffect, useRef, useState } from 'preact/hooks';
import { preloadIndex, searchCities } from '../lib/geo/search';
import type { City } from '../lib/geo/search';

interface Props {
  onSelect: (city: City | null) => void;
  selected: City | null;
  id?: string;
}

export default function PlaceSearch({ onSelect, selected, id = 'place' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);
  const debounce = useRef<number>();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  function onInput(value: string) {
    setQuery(value);
    onSelect(null);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      try {
        setError(false);
        const cities = await searchCities(value);
        setResults(cities);
        setActive(0);
        setOpen(cities.length > 0);
      } catch {
        setError(true);
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
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
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
          <input id={id} class="place__chip-value" type="text" readOnly value={chipValue} />
          <button type="button" class="place__clear" aria-label="Change birthplace" onClick={() => onSelect(null)}>×</button>
        </span>
      </div>
    );
  }

  return (
    <div class="place" ref={rootRef}>
      <input
        id={id}
        class="field__input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
        placeholder="Start typing a city…"
        autocomplete="off"
        value={query}
        onFocus={() => { preloadIndex().catch(() => setError(true)); }}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
        onKeyDown={onKeyDown}
      />
      {error && <p class="place__error" role="alert">Couldn’t load the place index — check your connection and try again.</p>}
      {open && (
        <ul class="place__list" id={`${id}-list`} role="listbox">
          {results.map((c, i) => (
            <li key={`${c.name}${c.lat}${c.lon}`} role="none">
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
          ))}
        </ul>
      )}
    </div>
  );
}
