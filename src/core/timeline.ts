/**
 * Zentrale Zeitpunkte, einmal aus der Konfiguration berechnet.
 * Jedes Modul bezieht Release, Preload & Co. von hier.
 */
import { CONFIG } from '../config';
import { CivilDate, DAY_MS, civilAddDays, civilFromMs, findOffsetChanges, parseCivil, parseLocal } from './tz';

export const TZ = CONFIG.timezone;

export const RELEASE = parseLocal(CONFIG.release.date, TZ);
export const PRELOAD = parseLocal(CONFIG.preload, TZ);
export const EXAMS_END = parseLocal(CONFIG.examsEnd, TZ);

/** Kalendertag des Releases (der Tag, an dem um 00:00 Uhr Schluss ist) */
export const RELEASE_CIVIL: CivilDate = civilFromMs(RELEASE, TZ);
/** Letzter ganzer Wartetag (der Tag vor dem Release) */
export const LAST_WAIT_DAY: CivilDate = civilAddDays(RELEASE_CIVIL, -1);

export interface HolidaySpan {
  name: string;
  start: CivilDate;
  end: CivilDate;
}

export const HOLIDAYS: HolidaySpan[] = CONFIG.school.holidays.map((h) => ({
  name: h.name,
  start: parseCivil(h.start),
  end: parseCivil(h.end),
}));

export const FREE_DAYS: CivilDate[] = CONFIG.school.freeDays.map(parseCivil);

export function at(local: string): number {
  return parseLocal(local, TZ);
}

/**
 * Historische Startpunkte für Fortschrittsanzeigen.
 * `approx` kennzeichnet Daten, deren genaue Uhrzeit nicht belegt ist.
 */
export const ANCHORS = {
  gta5: at('2013-09-17T00:00'),
  gta6Confirmed: at('2022-02-04T00:00'),
  leak: at('2022-09-18T00:00'),
  trailerAnnounced: at('2023-11-08T00:00'),
  trailer1: at('2023-12-05T00:00'), // Veröffentlichung am Abend des 4.12. US-Zeit ≈ 00:00 MEZ
  delay1: at('2025-05-02T00:00'),
  trailer2: at('2025-05-06T00:00'),
  delay2: at('2025-11-06T00:00'),
  preorders: at('2026-06-25T00:00'),
  extendedLook: at('2026-08-27T21:00'),
  launchTrailer: at('2026-10-15T15:00'), // 9 Uhr Ostküstenzeit
  year2026: at('2026-01-01T00:00'),
};

/**
 * Zeitumstellungen rund um den Countdown – direkt aus den Zeitzonendaten
 * des Browsers berechnet statt fest eingetragen.
 */
export const DST_CHANGES = findOffsetChanges(ANCHORS.year2026, RELEASE + 180 * DAY_MS, TZ);
