/** A lunar return instant and its recorded reference, without private inputs. */
import type { LunarReturnExportModel } from '../islands/lunar-return/export-model';
import { escapeIcalText, foldIcalLine, formatIcalUtc } from './ical';

/** Reject normalized dates and implicit timezone conversion at the export boundary. */
export function lunarReturnTimestamp(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new RangeError('Invalid UTC lunar return timestamp.');
  }
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== canonical) {
    throw new RangeError('Invalid UTC lunar return timestamp.');
  }
  return canonical;
}

export function lunarReturnCalendarFilename(model: LunarReturnExportModel): string {
  return `zodiacs-lunar-return-${lunarReturnTimestamp(model.instantUtc).replace(/[-:.]/g, '')}.ics`;
}

/** One transparent minute is a display convention, never a forecast duration. */
export function buildLunarReturnCalendar(model: LunarReturnExportModel, generatedAt: Date | string): string {
  const instant = lunarReturnTimestamp(model.instantUtc);
  const reference = lunarReturnTimestamp(model.referenceUtc);
  if (instant <= reference) throw new RangeError('The lunar return must follow its recorded reference.');
  const dtstamp = formatIcalUtc(generatedAt);
  if (!/^\d{8}T\d{6}Z$/.test(dtstamp)) throw new RangeError('Invalid UTC calendar receipt time.');
  const description = [
    'Calendar marker — the one-minute duration is for display only, not a duration of the lunar return.',
    `Next return after the recorded reference: ${reference}.`,
    `Calculated return instant: ${instant}.`,
  ].join('\n');
  // Deliberately do not serialize readings, location, wheel data, names or
  // caller-supplied properties. Relocation does not change the event identity.
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Zodiacs.org//Lunar Return 1.0//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:lunar-return-${instant.replace(/[-:.]/g, '')}@zodiacs.org`,
    `DTSTAMP:${dtstamp}`, `DTSTART:${formatIcalUtc(instant)}`,
    'DURATION:PT1M', 'TRANSP:TRANSPARENT',
    'SUMMARY:Lunar return', `DESCRIPTION:${escapeIcalText(description)}`,
    'URL:https://zodiacs.org/lunar-return/', 'END:VEVENT', 'END:VCALENDAR',
  ].map(foldIcalLine).join('\r\n') + '\r\n';
}
