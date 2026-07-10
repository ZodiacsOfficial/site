import type { ComponentChildren } from 'preact';
import type { City } from '../lib/geo/search';
import type { Locale } from '../lib/i18n';
import { t } from '../lib/i18n';
import PlaceSearch from './PlaceSearch';

interface BirthFieldsProps {
  locale: Locale;
  dateId: string;
  timeId: string;
  placeId: string;
  date: string;
  time: string;
  timeKnown: boolean;
  city: City | null;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onTimeKnownChange: (timeKnown: boolean) => void;
  onCityChange: (city: City | null) => void;
  onWarm?: () => unknown;
  showUnknownTime?: boolean;
  requireKnownTime?: boolean;
  timeHelp?: ComponentChildren;
  placeHelp?: ComponentChildren;
}

/** Shared, controlled birth date/time/place fields used by calculator islands. */
export function BirthFields({
  locale,
  dateId,
  timeId,
  placeId,
  date,
  time,
  timeKnown,
  city,
  onDateChange,
  onTimeChange,
  onTimeKnownChange,
  onCityChange,
  onWarm,
  showUnknownTime = true,
  requireKnownTime = false,
  timeHelp,
  placeHelp,
}: BirthFieldsProps) {
  return (
    <>
      <div class="field">
        <label class="field__label" for={dateId}>{t(locale, 'birthDate')}</label>
        <input
          id={dateId} class="field__input" type="date" required
          min="1800-01-01" max="2199-12-31" value={date}
          onInput={(e) => onDateChange((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="field">
        <div class="field__labelrow">
          <label class="field__label" for={timeId}>{t(locale, 'birthTime')}</label>
          {showUnknownTime && (
            <label class="field__toggle">
              <input
                type="checkbox" checked={!timeKnown}
                onChange={(e) => onTimeKnownChange(!(e.target as HTMLInputElement).checked)}
              />
              {t(locale, 'noBirthTime')}
            </label>
          )}
        </div>
        <input
          id={timeId} class="field__input" type="time"
          disabled={!timeKnown} required={requireKnownTime && timeKnown} value={time}
          onFocus={() => { onWarm?.(); }}
          onInput={(e) => onTimeChange((e.target as HTMLInputElement).value)}
        />
        {timeHelp !== undefined && <p class="field__help">{timeHelp}</p>}
      </div>

      <div class="field">
        <label class="field__label" for={placeId}>{t(locale, 'birthplace')}</label>
        <PlaceSearch id={placeId} selected={city} onSelect={onCityChange} locale={locale} />
        {placeHelp !== undefined && <p class="field__help">{placeHelp}</p>}
      </div>
    </>
  );
}
