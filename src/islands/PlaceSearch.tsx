/** Birthplace typeahead over the offline GeoNames index. */
import { useEffect, useRef, useState } from 'preact/hooks';
import { preloadIndex, searchCities } from '../lib/geo/search';
import type { City } from '../lib/geo/search';
import { normalizeLocale, t, type Locale } from '../lib/i18n';

interface Props {
  onSelect: (city: City | null) => void;
  selected: City | null;
  id?: string;
  locale?: Locale;
}

export default function PlaceSearch({ onSelect, selected, id = 'place', locale: rawLocale = 'en' }: Props) {
  const locale = normalizeLocale(rawLocale);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState(false);
  const debounce = useRef<number>();
  const requestToken = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        window.clearTimeout(debounce.current);
        requestToken.current += 1;
        setOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => {
      document.removeEventListener('click', close);
      window.clearTimeout(debounce.current);
      requestToken.current += 1;
    };
  }, []);

  function onInput(value: string) {
    const token = ++requestToken.current;
    const trimmed = value.trim();
    setQuery(value);
    onSelect(null);
    window.clearTimeout(debounce.current);
    setResults([]);
    setActive(0);
    setOpen(false);
    setError(false);

    if (trimmed.length < 2) return;

    debounce.current = window.setTimeout(async () => {
      try {
        const cities = await searchCities(trimmed);
        if (token !== requestToken.current) return;
        setResults(cities);
        setActive(0);
        setOpen(true);
      } catch {
        if (token !== requestToken.current) return;
        setResults([]);
        setOpen(false);
        setError(true);
      }
    }, 120);
  }

  function choose(city: City) {
    requestToken.current += 1;
    window.clearTimeout(debounce.current);
    onSelect(city);
    setQuery('');
    setResults([]);
    setOpen(false);
    setError(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown' && results.length > 0) { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp' && results.length > 0) { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
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
          <button type="button" class="place__clear" aria-label={t(locale, 'placeChange')} onClick={() => onSelect(null)}>×</button>
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
        placeholder={t(locale, 'placePlaceholder')}
        autocomplete="off"
        value={query}
        onFocus={() => { preloadIndex().catch(() => setError(true)); }}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
        onKeyDown={onKeyDown}
      />
      {error && <p class="place__error" role="alert">{t(locale, 'placeError')}</p>}
      {open && (
        <ul class="place__list" id={`${id}-list`} role="listbox">
          {results.length > 0 ? (
            results.map((c, i) => (
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
            ))
          ) : (
            <li class="place__empty" role="option" aria-disabled="true">
              {t(locale, 'placeNoResults')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
