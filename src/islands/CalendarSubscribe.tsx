import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  encodePositionsLink,
  type PositionsShareInput,
} from '../lib/share-positions';
import type { ReleasedLocale as Locale } from '../lib/i18n';

/** Saved summaries carry body names as strings; the existing encoder remains
 * the runtime authority and rejects incomplete or non-canonical inputs. */
export interface CalendarPositionsSource {
  bodies: readonly { body: string; lon: number }[];
  angles: PositionsShareInput['angles'];
  houseSystem: PositionsShareInput['houseSystem'];
  engineVersion: string;
}

const COPY = {
  en: {
    action: 'Add to your calendar',
    unavailable: 'Calendar link unavailable',
    note: 'This is a live feed. Subscribe once and your calendar refreshes it. The URL contains planetary positions and ASC/MC only — no name, birth date, time, place, or coordinates.',
  },
  es: {
    action: 'Añadir a tu calendario',
    unavailable: 'Enlace de calendario no disponible',
    note: 'Es un calendario actualizado. Suscríbete una vez y tu calendario lo actualizará. La URL solo contiene posiciones planetarias y ASC/MC: no incluye nombre, fecha, hora, lugar ni coordenadas de nacimiento.',
  },
  pt: {
    action: 'Adicionar ao seu calendário',
    unavailable: 'Link do calendário indisponível',
    note: 'Este é um calendário com atualização automática. Assine uma vez, e seu calendário manterá os eventos atualizados. A URL contém apenas posições planetárias e ASC/MC: não inclui nome, data, hora, local nem coordenadas de nascimento.',
  },
  fr: {
    action: 'Ajouter à ton calendrier',
    unavailable: 'Lien de calendrier indisponible',
    note: 'Ce calendrier se met à jour automatiquement. Abonne-toi une seule fois, puis ton calendrier actualisera les événements. L’URL contient uniquement les positions planétaires et l’ASC/MC : ni nom, ni date, ni heure, ni lieu, ni coordonnées de naissance.',
  },
  it: {
    action: 'Aggiungi al tuo calendario',
    unavailable: 'Link al calendario non disponibile',
    note: 'Questo calendario si aggiorna automaticamente. Iscriviti una volta e il tuo calendario manterrà aggiornati gli eventi. L’URL contiene solo le posizioni planetarie e ASC/MC: non include nome, data, ora, luogo o coordinate di nascita.',
  },
} as const;

export function calendarWebcalUrl(origin: string, token: string): string {
  const url = new URL('/api/calendar/transits', origin);
  url.searchParams.set('token', token);
  return `webcal://${url.host}${url.pathname}${url.search}`;
}

function trackSubscribe(): void {
  const analytics = (window as Window & {
    zodiacsAnalytics?: { track?: (name: string, props: Record<string, never>) => void };
  }).zodiacsAnalytics;
  analytics?.track?.('calendar_subscribe', {});
}

interface CalendarSubscribeProps {
  locale: Locale;
  positions: CalendarPositionsSource;
}

export default function CalendarSubscribe({ locale, positions }: CalendarSubscribeProps) {
  const copy = COPY[locale] ?? COPY.en;
  const token = useMemo(() => encodePositionsLink(positions as PositionsShareInput), [positions]);
  const [href, setHref] = useState('');

  useEffect(() => {
    setHref(token ? calendarWebcalUrl(window.location.origin, token) : '');
  }, [token]);

  return (
    <div class="calendar-subscribe">
      <a
        class="btn btn--glass"
        href={href || undefined}
        aria-disabled={!href}
        onClick={(event) => {
          if (!href) {
            event.preventDefault();
            return;
          }
          trackSubscribe();
        }}
        data-calendar-subscribe
      >
        <span>{href ? copy.action : copy.unavailable}</span>
        <span class="orb">↗</span>
      </a>
      <p class="calendar-subscribe__note">{copy.note}</p>
    </div>
  );
}
