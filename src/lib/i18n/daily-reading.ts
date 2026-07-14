import {
  dailyReading,
  solarHouse,
  type Daily,
  type DailyBody,
  type DailyEvent,
  type DailyLine,
  type DailyReading,
} from '../daily';
import { signBySlug, signName } from '../signs';
import { aspectLabel, planetLabel } from './astrology';
import type { Locale } from './index';

const ORDINAL_ES = [
  '', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta',
  'séptima', 'octava', 'novena', 'décima', 'undécima', 'duodécima',
];

const HOUSE_THEME_ES: Record<number, string> = {
  1: 'tu imagen, tus comienzos y la impresión que causas',
  2: 'el dinero, las posesiones y lo que te da estabilidad',
  3: 'los recados, los hermanos, los mensajes y tu entorno cercano',
  4: 'el hogar, la familia y la base privada de tu vida',
  5: 'el placer, el romance, los hijos y lo que creas por gusto',
  6: 'el trabajo en curso, los hábitos de salud y la carga diaria',
  7: 'la pareja y las personas que se sientan frente a ti',
  8: 'el dinero compartido, las deudas, la intimidad y lo que se fusiona',
  9: 'los viajes, el estudio, las creencias y la mirada de largo alcance',
  10: 'la carrera, la reputación y lo que ve el público',
  11: 'las amistades, los grupos y el futuro al que apuntas',
  12: 'el descanso, el retiro y lo que ocurre bajo la superficie',
};

const PLANET_VERB_ES: Record<string, string> = {
  Moon: 'La Luna pasa hoy por',
  Sun: 'El Sol recorre',
  Mercury: 'Mercurio activa',
  Venus: 'Venus aporta calidez a',
  Mars: 'Marte impulsa',
  Jupiter: 'Júpiter expande',
  Saturn: 'Saturno pone a prueba',
  Uranus: 'Urano altera',
  Neptune: 'Neptuno difumina',
  Pluto: 'Plutón transforma lentamente',
};

const signLabel = (slug: string) => signName(signBySlug(slug), 'es');
const utcTime = (at: string) => `${at.slice(11, 16)} UTC`;

function houseLineEs(body: DailyBody, house: number): DailyLine {
  const planet = planetLabel('es', body.body);
  const rx = body.retrograde ? ' ℞' : '';
  return {
    text: `${PLANET_VERB_ES[body.body] ?? `${planet} recorre`} tu ${ORDINAL_ES[house]} casa: ${HOUSE_THEME_ES[house]}.`,
    receipt: `${planet} ${body.degree.toFixed(1)}° ${signLabel(body.sign)}${rx} · casa ${house}`,
    body: body.body,
    hue: signBySlug(body.sign).hue,
  };
}

function eventLineEs(event: DailyEvent, sunSign: string): DailyLine | null {
  if (event.kind === 'ingress' && event.planet && event.sign) {
    const house = solarHouse(event.sign, sunSign);
    const planet = planetLabel('es', event.planet);
    const focus = event.planet === 'Saturn' || event.planet === 'Pluto'
      ? 'pone el foco a largo plazo en'
      : 'pone el foco en';
    return {
      text: `${planet} entra hoy en tu ${ORDINAL_ES[house]} casa y ${focus} ${HOUSE_THEME_ES[house]}.`,
      receipt: `${planet} → 0° ${signLabel(event.sign)} · ${utcTime(event.at)}`,
      body: event.planet,
      hue: signBySlug(event.sign).hue,
    };
  }
  if (event.kind === 'lunation' && event.sign) {
    const house = solarHouse(event.sign, sunSign);
    const name = event.type === 'new' ? 'Luna nueva' : 'Luna llena';
    const meaning = event.type === 'new'
      ? 'abre un punto de partida en'
      : 'marca una culminación en';
    return {
      text: `${name} en tu ${ORDINAL_ES[house]} casa: ${meaning} ${HOUSE_THEME_ES[house]}.`,
      receipt: `${name} ${event.degree}° ${signLabel(event.sign)} · ${utcTime(event.at)}`,
      body: 'Moon',
      hue: signBySlug(event.sign).hue,
    };
  }
  if (event.kind === 'station' && event.planet && event.sign) {
    const house = solarHouse(event.sign, sunSign);
    const planet = planetLabel('es', event.planet);
    const retrograde = event.type === 'retrograde';
    const direction = retrograde ? 'estaciona retrógrado' : 'estaciona directo';
    const meaning = retrograde ? 'pone en revisión' : 'vuelve a poner en movimiento';
    return {
      text: `${planet} ${direction} en tu ${ORDINAL_ES[house]} casa: ${meaning} ${HOUSE_THEME_ES[house]}.`,
      receipt: `${planet} ${direction} ${event.degree}° ${signLabel(event.sign)} · ${utcTime(event.at)}`,
      body: event.planet,
      hue: signBySlug(event.sign).hue,
    };
  }
  if (event.kind === 'aspect' && event.a && event.b && event.type) {
    const a = planetLabel('es', event.a);
    const b = planetLabel('es', event.b);
    const aspect = aspectLabel('es', event.type);
    return {
      text: `${a} en ${aspect} con ${b} alcanza hoy su punto exacto: es un aspecto de alcance general y el recibo muestra la hora.`,
      receipt: `${a} ${aspect} ${b} · exacto ${utcTime(event.at)}`,
      body: event.a,
    };
  }
  return null;
}

/**
 * Locale-aware rendering over the same structured daily facts. English keeps
 * the canonical source output byte-for-byte; Spanish mirrors its selection
 * order while rendering native labels, house themes, and receipts.
 */
export function dailyReadingForLocale(sunSign: string, daily: Daily, locale: Locale): DailyReading {
  if (locale === 'en') return dailyReading(sunSign, daily);

  const lines: DailyLine[] = [];
  const usedHouses = new Set<number>();

  for (const event of daily.events) {
    const line = eventLineEs(event, sunSign);
    if (line) {
      lines.push(line);
      if (event.sign) usedHouses.add(solarHouse(event.sign, sunSign));
    }
    if (lines.length >= 2) break;
  }

  const byName = (name: string) => daily.bodies.find((body) => body.body === name);
  const moon = byName('Moon');
  if (moon) {
    const house = solarHouse(moon.sign, sunSign);
    if (!usedHouses.has(house)) {
      lines.push(houseLineEs(moon, house));
      usedHouses.add(house);
    }
  }

  for (const name of ['Mercury', 'Venus', 'Mars', 'Sun']) {
    if (lines.length >= 4) break;
    const body = byName(name);
    if (!body) continue;
    const house = solarHouse(body.sign, sunSign);
    if (usedHouses.has(house)) continue;
    lines.push(houseLineEs(body, house));
    usedHouses.add(house);
  }

  return { headline: lines[0]?.text ?? 'Un cielo tranquilo hoy.', lines };
}
