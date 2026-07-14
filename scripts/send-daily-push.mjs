import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import webPush from 'web-push';

const SKY_PATH = new URL('../src/data/sky.json', import.meta.url);

const COPY = {
  en: {
    title: 'Today at Zodiacs.org',
    moon: { new: 'New Moon', full: 'Full Moon' },
    exact: (event, time) => `${event} exact today at ${time} UTC.`,
    station: (planet, direction, time) => `${planet} stations ${direction} today at ${time} UTC.`,
    next: (event, date, time) => `Next: ${event} is exact ${date} at ${time} UTC.`,
    nextStation: (planet, direction, date, time) => `Next: ${planet} stations ${direction} ${date} at ${time} UTC.`,
  },
  es: {
    title: 'Hoy en Zodiacs.org',
    moon: { new: 'Luna nueva', full: 'Luna llena' },
    exact: (event, time) => `${event}, exacta hoy a las ${time} UTC.`,
    station: (planet, direction, time) => `${planet} estaciona ${direction} hoy a las ${time} UTC.`,
    next: (event, date, time) => `Próximo: ${event}, exacta el ${date} a las ${time} UTC.`,
    nextStation: (planet, direction, date, time) => `Próximo: ${planet} estaciona ${direction} el ${date} a las ${time} UTC.`,
  },
  pt: {
    title: 'Hoje no Zodiacs.org',
    moon: { new: 'Lua nova', full: 'Lua cheia' },
    exact: (event, time) => `${event}, exata hoje às ${time} UTC.`,
    station: (planet, direction, time) => `${planet} estaciona ${direction} hoje às ${time} UTC.`,
    next: (event, date, time) => `Próximo: ${event}, exata em ${date} às ${time} UTC.`,
    nextStation: (planet, direction, date, time) => `Próximo: ${planet} estaciona ${direction} em ${date} às ${time} UTC.`,
  },
  fr: {
    title: 'Aujourd’hui sur Zodiacs.org',
    moon: { new: 'Nouvelle Lune', full: 'Pleine Lune' },
    exact: (event, time) => `${event}, exacte aujourd’hui à ${time} UTC.`,
    station: (planet, direction, time) => `${planet} ${direction === 'rétrograde' ? 'devient rétrograde' : 'redevient direct'} aujourd’hui à ${time} UTC.`,
    next: (event, date, time) => `À venir : ${event}, exacte le ${date} à ${time} UTC.`,
    nextStation: (planet, direction, date, time) => `À venir : ${planet} ${direction === 'rétrograde' ? 'devient rétrograde' : 'redevient direct'} le ${date} à ${time} UTC.`,
  },
  it: {
    title: 'Oggi su Zodiacs.org',
    moon: { new: 'Luna nuova', full: 'Luna piena' },
    exact: (event, time) => `${event}, esatta oggi alle ${time} UTC.`,
    station: (planet, direction, time) => `${planet} staziona in moto ${direction} oggi alle ${time} UTC.`,
    next: (event, date, time) => `Prossimo evento: ${event}, esatta il ${date} alle ${time} UTC.`,
    nextStation: (planet, direction, date, time) => `Prossimo evento: ${planet} staziona in moto ${direction} il ${date} alle ${time} UTC.`,
  },
};

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
};

const PLANETS = {
  en: {},
  es: { Neptune: 'Neptuno', Mercury: 'Mercurio', Venus: 'Venus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno', Uranus: 'Urano', Pluto: 'Plutón' },
  pt: { Neptune: 'Netuno', Mercury: 'Mercúrio', Venus: 'Vênus', Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno', Uranus: 'Urano', Pluto: 'Plutão' },
  fr: { Neptune: 'Neptune', Mercury: 'Mercure', Venus: 'Vénus', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturne', Uranus: 'Uranus', Pluto: 'Pluton' },
  it: { Neptune: 'Nettuno', Mercury: 'Mercurio', Venus: 'Venere', Mars: 'Marte', Jupiter: 'Giove', Saturn: 'Saturno', Uranus: 'Urano', Pluto: 'Plutone' },
};

const normalizeLanguage = (language) => language === 'es' || language === 'pt' || language === 'fr' || language === 'it' ? language : 'en';
const planetName = (planet, language) => PLANETS[language][planet] ?? planet;

function utcDay(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function utcTime(value) {
  return new Date(value).toISOString().slice(11, 16);
}

function shortDate(value, lang) {
  const date = new Date(value);
  return `${date.getUTCDate()} ${MONTHS[lang][date.getUTCMonth()]}`;
}

export function skyEvents(sky) {
  const events = [];
  for (const moon of sky.moons ?? []) {
    events.push({ kind: 'moon', at: moon.at, type: moon.type });
  }
  for (const period of sky.retrogrades ?? []) {
    events.push({ kind: 'station', at: period.from, planet: period.planet, direction: 'retrograde' });
    if (period.to) events.push({ kind: 'station', at: period.to, planet: period.planet, direction: 'direct' });
  }
  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** One generic, source-backed line. Personal chart work remains on /today/. */
export function buildSkyLine(sky, date = new Date(), language = 'en') {
  const lang = normalizeLanguage(language);
  const copy = COPY[lang];
  const today = utcDay(date);
  const events = skyEvents(sky);
  const event = events.find((candidate) => utcDay(candidate.at) === today)
    ?? events.find((candidate) => Date.parse(candidate.at) > Date.parse(`${today}T23:59:59.999Z`));

  if (!event) return {
    en: 'Your daily note is ready at /today/.',
    es: 'Tu nota diaria está lista en /today/.',
    pt: 'Sua nota diária está pronta em /today/.',
    fr: 'Ta note quotidienne est prête sur /today/.',
    it: 'La tua nota quotidiana è pronta su /today/.',
  }[lang];

  const isToday = utcDay(event.at) === today;
  if (event.kind === 'moon') {
    const label = copy.moon[event.type];
    return isToday
      ? copy.exact(label, utcTime(event.at))
      : copy.next(label, shortDate(event.at, lang), utcTime(event.at));
  }
  const direction = lang === 'en'
    ? event.direction
    : (event.direction === 'direct'
      ? (lang === 'es' ? 'directo' : lang === 'pt' ? 'direto' : lang === 'it' ? 'diretto' : 'direct')
      : (lang === 'fr' ? 'rétrograde' : lang === 'it' ? 'retrogrado' : 'retrógrado'));
  const planet = planetName(event.planet, lang);
  return isToday
    ? copy.station(planet, direction, utcTime(event.at))
    : copy.nextStation(planet, direction, shortDate(event.at, lang), utcTime(event.at));
}

function serviceHeaders(serviceKey, prefer) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

export async function readSubscriptions(fetchImpl, url, serviceKey, limit) {
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,lang&order=created_at.asc&limit=${limit}`;
  const response = await fetchImpl(endpoint, { headers: serviceHeaders(serviceKey, 'return=representation') });
  if (!response.ok) throw new Error(`Could not read push subscriptions (${response.status}).`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Push subscription response was not an array.');
  return rows;
}

export async function pruneSubscription(fetchImpl, url, serviceKey, endpoint) {
  const target = `${url.replace(/\/+$/, '')}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`;
  const response = await fetchImpl(target, {
    method: 'DELETE',
    headers: serviceHeaders(serviceKey, 'return=minimal'),
  });
  if (!response.ok) throw new Error(`Could not prune expired subscription (${response.status}).`);
}

export async function sendDailyPush({
  subscriptions,
  sky,
  date,
  dryRun = false,
  sendNotification,
  fetchImpl,
  supabaseUrl,
  serviceKey,
  log = console.log,
}) {
  let sent = 0;
  let pruned = 0;
  let failed = 0;

  for (const row of subscriptions) {
    const lang = normalizeLanguage(row.lang);
    const payload = JSON.stringify({
      title: COPY[lang].title,
      body: buildSkyLine(sky, date, lang),
      url: '/today/',
    });

    if (dryRun) {
      log(`daily-push: dry-run ${lang} ${payload}`);
      continue;
    }

    try {
      await sendNotification({
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }, payload, { TTL: 86_400, urgency: 'normal' });
      sent += 1;
    } catch (error) {
      const status = Number(error?.statusCode ?? error?.status);
      if (status === 404 || status === 410) {
        await pruneSubscription(fetchImpl, supabaseUrl, serviceKey, row.endpoint);
        pruned += 1;
      } else {
        failed += 1;
        log(`daily-push: failed ${status || 'unknown'}`);
      }
    }
  }
  return { sent, pruned, failed, dryRun, count: subscriptions.length };
}

export function parseOptions(argv) {
  const options = { dryRun: false, fixture: false, limit: 500, date: new Date() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--fixture') options.fixture = true;
    else if (arg === '--limit') options.limit = Number(argv[++index]);
    else if (arg === '--date') options.date = new Date(`${argv[++index]}T12:00:00.000Z`);
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 10_000) {
    throw new Error('--limit must be an integer from 1 to 10000.');
  }
  if (Number.isNaN(options.date.getTime())) throw new Error('--date must be YYYY-MM-DD.');
  return options;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const sky = JSON.parse(await readFile(SKY_PATH, 'utf8'));
  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let subscriptions;
  if (options.fixture) {
    subscriptions = [{
      endpoint: 'https://push.example.test/subscription',
      p256dh: 'fixture-public-key',
      auth: 'fixture-auth-key',
      lang: 'en',
    }];
  } else {
    if (!url || !serviceKey) throw new Error('PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    subscriptions = await readSubscriptions(fetch, url, serviceKey, options.limit);
  }

  if (!options.dryRun) {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!subject || !publicKey || !privateKey) {
      throw new Error('VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY are required to send.');
    }
    webPush.setVapidDetails(subject, publicKey, privateKey);
  }

  const report = await sendDailyPush({
    subscriptions,
    sky,
    date: options.date,
    dryRun: options.dryRun,
    sendNotification: webPush.sendNotification.bind(webPush),
    fetchImpl: fetch,
    supabaseUrl: url,
    serviceKey,
  });
  console.log(`daily-push: done, count=${report.count}, sent=${report.sent}, pruned=${report.pruned}, failed=${report.failed}, dryRun=${report.dryRun}`);
  if (report.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
