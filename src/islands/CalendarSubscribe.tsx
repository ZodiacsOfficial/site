import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  encodeSharedPositionsLink,
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
    note: 'This is a live feed. Subscribe once and your calendar refreshes it. The link carries your chart code, which has no name, date, time or place fields. Its exact positions still give your birth date and time. The Ascendant and Midheaven are kept to the whole degree, so the code gives your birthplace only as a region about 500 km across, and contacts to those two points are approximate. Our server, its cache and your calendar service receive the code at each refresh.',
    download: 'Download these dates (.ics)',
    downloadNote: 'The file is a snapshot of the exact dates shown here, built in your browser; the subscription above keeps itself current.',
  },
  es: {
    action: 'Añadir a tu calendario',
    unavailable: 'Enlace de calendario no disponible',
    note: 'Es un calendario actualizado. Suscríbete una vez y tu calendario lo actualizará. El enlace lleva el código de tu carta, que no tiene campos de nombre, fecha, hora ni lugar. Sus posiciones exactas siguen dando tu fecha y hora de nacimiento. El Ascendente y el Medio Cielo van al grado entero, así que el código solo da tu lugar de nacimiento como una región de unos 500 km de ancho, y los contactos con esos dos puntos son aproximados. Nuestro servidor, su caché y tu servicio de calendario reciben el código en cada actualización.',
    download: 'Descargar estas fechas (.ics)',
    downloadNote: 'El archivo es una instantánea de las fechas exactas que ves aquí, creada en tu navegador; la suscripción de arriba se mantiene al día por sí sola.',
  },
  pt: {
    action: 'Adicionar ao seu calendário',
    unavailable: 'Link do calendário indisponível',
    note: 'Este é um calendário com atualização automática. Assine uma vez, e seu calendário manterá os eventos atualizados. O link leva o código do seu mapa, que não tem campos de nome, data, hora ou local. Suas posições exatas ainda indicam sua data e hora de nascimento. O Ascendente e o Meio do Céu ficam em graus inteiros, então o código indica seu local de nascimento só como uma região de cerca de 500 km de largura, e os contatos com esses dois pontos são aproximados. Nosso servidor, o cache dele e o seu serviço de calendário recebem o código a cada atualização.',
    download: 'Baixar estas datas (.ics)',
    downloadNote: 'O arquivo é um retrato das datas exatas mostradas aqui, criado no seu navegador; a assinatura acima se mantém atualizada sozinha.',
  },
  fr: {
    action: 'Ajouter à ton calendrier',
    unavailable: 'Lien de calendrier indisponible',
    note: 'Ce calendrier se met à jour automatiquement. Abonne-toi une seule fois, puis ton calendrier actualisera les événements. Le lien contient le code de ton thème, sans champ de nom, de date, d’heure ou de lieu. Ses positions exactes donnent quand même ta date et ton heure de naissance. L’Ascendant et le Milieu du Ciel sont gardés au degré entier : le code ne situe donc ton lieu de naissance que dans une région d’environ 500 km de large, et les contacts avec ces deux points sont approximatifs. Notre serveur, son cache et ton service de calendrier reçoivent le code à chaque actualisation.',
    download: 'Télécharger ces dates (.ics)',
    downloadNote: 'Le fichier est un instantané des dates exactes affichées ici, créé dans ton navigateur ; l’abonnement ci-dessus reste à jour tout seul.',
  },
  it: {
    action: 'Aggiungi al tuo calendario',
    unavailable: 'Link al calendario non disponibile',
    note: 'Questo calendario si aggiorna automaticamente. Iscriviti una volta e il tuo calendario manterrà aggiornati gli eventi. Il link contiene il codice del tuo tema, senza campi per nome, data, ora o luogo. Le sue posizioni esatte indicano comunque data e ora della tua nascita. Ascendente e Medio Cielo sono tenuti al grado intero, quindi il codice indica il luogo di nascita solo come una regione larga circa 500 km, e i contatti con questi due punti sono approssimativi. Il nostro server, la sua cache e il tuo servizio di calendario ricevono il codice a ogni aggiornamento.',
    download: 'Scarica queste date (.ics)',
    downloadNote: 'Il file è un’istantanea delle date esatte mostrate qui, creata nel tuo browser; l’iscrizione qui sopra si tiene aggiornata da sola.',
  },
  ru: {
    action: 'Добавить в календарь',
    unavailable: 'Ссылка на календарь недоступна',
    note: 'Это обновляемая лента. Подпишитесь один раз, и календарь будет получать свежие события. В ссылке есть код вашей карты — без полей имени, даты, времени и места. Точные положения в нём всё равно выдают дату и время вашего рождения. Асцендент и MC в коде сохранены до целого градуса, поэтому место рождения по нему определяется лишь как область шириной около 500 км, а контакты с этими двумя точками приблизительны. Наш сервер, его кэш и ваш календарный сервис получают код при каждом обновлении.',
    download: 'Скачать эти даты (.ics)',
    downloadNote: 'Файл — снимок точных дат, показанных здесь, созданный в вашем браузере; подписка выше обновляется сама.',
  },
} as const;

/** The feed's code: every position to 0.001°, ASC and MC to the whole degree. */
export function calendarToken(positions: CalendarPositionsSource): string | null {
  return encodeSharedPositionsLink(positions as PositionsShareInput);
}

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
  const token = useMemo(() => calendarToken(positions), [positions]);
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
