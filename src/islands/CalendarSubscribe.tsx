import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  encodePositionsLink,
  type PositionsShareInput,
} from '../lib/share-positions';
import type { TransitContact } from '../lib/engine/transit-scan';
import type { CatalogLocale as Locale } from '../lib/i18n';

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
    download: 'Download these dates (.ics)',
    downloadNote: 'The file is a snapshot of the exact dates shown here, built in your browser; the subscription above keeps itself current.',
  },
  es: {
    action: 'Añadir a tu calendario',
    unavailable: 'Enlace de calendario no disponible',
    note: 'Es un calendario actualizado. Suscríbete una vez y tu calendario lo actualizará. La URL solo contiene posiciones planetarias y ASC/MC: no incluye nombre, fecha, hora, lugar ni coordenadas de nacimiento.',
    download: 'Descargar estas fechas (.ics)',
    downloadNote: 'El archivo es una instantánea de las fechas exactas que ves aquí, creada en tu navegador; la suscripción de arriba se mantiene al día por sí sola.',
  },
  pt: {
    action: 'Adicionar ao seu calendário',
    unavailable: 'Link do calendário indisponível',
    note: 'Este é um calendário com atualização automática. Assine uma vez, e seu calendário manterá os eventos atualizados. A URL contém apenas posições planetárias e ASC/MC: não inclui nome, data, hora, local nem coordenadas de nascimento.',
    download: 'Baixar estas datas (.ics)',
    downloadNote: 'O arquivo é um retrato das datas exatas mostradas aqui, criado no seu navegador; a assinatura acima se mantém atualizada sozinha.',
  },
  fr: {
    action: 'Ajouter à ton calendrier',
    unavailable: 'Lien de calendrier indisponible',
    note: 'Ce calendrier se met à jour automatiquement. Abonne-toi une seule fois, puis ton calendrier actualisera les événements. L’URL contient uniquement les positions planétaires et l’ASC/MC : ni nom, ni date, ni heure, ni lieu, ni coordonnées de naissance.',
    download: 'Télécharger ces dates (.ics)',
    downloadNote: 'Le fichier est un instantané des dates exactes affichées ici, créé dans ton navigateur ; l’abonnement ci-dessus reste à jour tout seul.',
  },
  it: {
    action: 'Aggiungi al tuo calendario',
    unavailable: 'Link al calendario non disponibile',
    note: 'Questo calendario si aggiorna automaticamente. Iscriviti una volta e il tuo calendario manterrà aggiornati gli eventi. L’URL contiene solo le posizioni planetarie e ASC/MC: non include nome, data, ora, luogo o coordinate di nascita.',
    download: 'Scarica queste date (.ics)',
    downloadNote: 'Il file è un’istantanea delle date esatte mostrate qui, creata nel tuo browser; l’iscrizione qui sopra si tiene aggiornata da sola.',
  },
  ru: {
    action: 'Добавить в календарь',
    unavailable: 'Ссылка на календарь недоступна',
    note: 'Это обновляемая лента. Подпишитесь один раз, и календарь будет получать свежие события. В URL есть только положения планет и ASC/MC — без имени, даты, времени, места и координат рождения.',
    download: 'Скачать эти даты (.ics)',
    downloadNote: 'Файл — снимок точных дат, показанных здесь, созданный в вашем браузере; подписка выше обновляется сама.',
  },
} as const;

export function calendarWebcalUrl(origin: string, token: string): string {
  const url = new URL('/api/calendar/transits', origin);
  url.searchParams.set('token', token);
  return `webcal://${url.host}${url.pathname}${url.search}`;
}

function track(name: 'calendar_subscribe' | 'calendar_download'): void {
  const analytics = (window as Window & {
    zodiacsAnalytics?: { track?: (name: string, props: Record<string, never>) => void };
  }).zodiacsAnalytics;
  analytics?.track?.(name, {});
}

interface CalendarSubscribeProps {
  locale: Locale;
  positions: CalendarPositionsSource;
  /**
   * Exact contacts already computed on the page. When present, a download
   * button offers them as one .ics file built in the browser. The serializer
   * loads on the click so the route's first paint carries none of it.
   */
  contacts?: readonly TransitContact[];
}

export default function CalendarSubscribe({ locale, positions, contacts }: CalendarSubscribeProps) {
  const copy = COPY[locale];
  const token = useMemo(() => encodePositionsLink(positions as PositionsShareInput), [positions]);
  const [href, setHref] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHref(token ? calendarWebcalUrl(window.location.origin, token) : '');
  }, [token]);

  async function download(): Promise<void> {
    if (!contacts?.length || busy) return;
    setBusy(true);
    try {
      const [{ serializeTransitContacts }, { downloadCalendarFile }] = await Promise.all([
        import('../lib/ical'),
        import('../lib/ical-download'),
      ]);
      const calendar = serializeTransitContacts(contacts, {
        generatedAt: new Date(),
        calendarName: 'Zodiacs.org transit contacts',
      });
      downloadCalendarFile(calendar, 'zodiacs-transit-contacts.ics');
      track('calendar_download');
    } finally {
      setBusy(false);
    }
  }

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
          track('calendar_subscribe');
        }}
        data-calendar-subscribe
      >
        <span>{href ? copy.action : copy.unavailable}</span>
        <span class="orb">↗</span>
      </a>
      <p class="calendar-subscribe__note">{copy.note}</p>
      {contacts && contacts.length > 0 && (
        <>
          <button
            type="button"
            class="btn btn--ghost calendar-subscribe__download"
            onClick={() => { void download(); }}
            disabled={busy}
            data-calendar-download
          >
            <span>{copy.download}</span>
            <span class="orb">↓</span>
          </button>
          <p class="calendar-subscribe__note">{copy.downloadNote}</p>
        </>
      )}
    </div>
  );
}
