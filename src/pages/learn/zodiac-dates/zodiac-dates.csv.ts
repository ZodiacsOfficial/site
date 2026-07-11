import type { APIRoute } from 'astro';
import {
  INGRESS_GENERATED_AT,
  INGRESS_YEARS,
  ZODIAC_DATE_ROWS,
  ingressIsoMinute,
} from '../../../lib/zodiac-dates';

export const prerender = true;

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const GET: APIRoute = () => {
  const [currentYear, nextYear] = INGRESS_YEARS;
  const header = [
    'sign',
    'slug',
    'glyph',
    'unicode',
    'tropical_longitude_range',
    'element',
    'modality',
    'polarity',
    'modern_ruler',
    'classical_ruler',
    'natural_house',
    'northern_hemisphere_season',
    'southern_hemisphere_season',
    `sun_ingress_${currentYear}_utc`,
    `sun_ingress_${nextYear}_utc`,
    'source_generated_at_utc',
  ];

  const rows = ZODIAC_DATE_ROWS.map((row) => [
    row.sign.name,
    row.sign.slug,
    row.glyph,
    row.unicode,
    row.longitudeRange,
    row.element,
    row.modality,
    row.polarity,
    row.modernRuler,
    row.classicalRuler,
    row.naturalHouse,
    row.northernSeason,
    row.southernSeason,
    ingressIsoMinute(row.ingressUtc[currentYear]),
    ingressIsoMinute(row.ingressUtc[nextYear]),
    INGRESS_GENERATED_AT,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n') + '\r\n';

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="zodiac-dates.csv"',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
