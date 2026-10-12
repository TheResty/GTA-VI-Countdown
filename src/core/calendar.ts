/**
 * Kalender-Logik: Welche Art Tag ist ein Datum? Wie viele Schultage,
 * Wochenenden, Freitage … liegen noch vor dem Release?
 */
import { CONFIG } from '../config';
import {
  CivilDate,
  civilAddDays,
  civilCompare,
  civilDiff,
  civilEquals,
  civilFromMs,
  civilKey,
  civilRange,
  civilWeekday,
  parseCivil,
  zonedParts,
} from './tz';
import { FREE_DAYS, HOLIDAYS, LAST_WAIT_DAY, PRELOAD, RELEASE, RELEASE_CIVIL, TZ, EXAMS_END } from './timeline';

export type DayType = 'holiday' | 'school' | 'weekend' | 'free' | 'preload' | 'release' | 'exams';

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  holiday: 'Ferien',
  school: 'Schultag',
  weekend: 'Wochenende',
  free: 'Schulfrei',
  preload: 'Preload',
  release: 'Release',
  exams: 'Klausuren',
};

const PRELOAD_CIVIL = civilFromMs(PRELOAD, TZ);
const EXAMS_END_CIVIL = civilFromMs(EXAMS_END, TZ);

export function holidayOf(c: CivilDate): string | null {
  for (const h of HOLIDAYS) {
    if (civilCompare(c, h.start) >= 0 && civilCompare(c, h.end) <= 0) return h.name;
  }
  return null;
}

export function isWeekend(c: CivilDate): boolean {
  const wd = civilWeekday(c);
  return wd === 0 || wd === 6;
}

export function isSchoolDay(c: CivilDate): boolean {
  const wd = civilWeekday(c);
  if (!CONFIG.school.weekdays.includes(wd)) return false;
  if (holidayOf(c)) return false;
  if (FREE_DAYS.some((f) => civilEquals(f, c))) return false;
  return true;
}

/** Grundtyp eines Tages (ohne GTA-Sondertage) */
export function baseDayType(c: CivilDate): DayType {
  if (holidayOf(c)) return 'holiday';
  if (isWeekend(c)) return 'weekend';
  if (isSchoolDay(c)) return 'school';
  return 'free';
}

/** Typ eines Tages inkl. Sondertagen (Release, Preload, Klausurende) */
export function dayType(c: CivilDate): DayType {
  if (civilEquals(c, RELEASE_CIVIL)) return 'release';
  if (civilEquals(c, PRELOAD_CIVIL)) return 'preload';
  if (civilCompare(c, RELEASE_CIVIL) > 0 && civilCompare(c, EXAMS_END_CIVIL) <= 0 && isSchoolDay(c)) return 'exams';
  return baseDayType(c);
}

export interface CalendarCounts {
  /** Kalendertage inkl. heute bis zum letzten Wartetag */
  days: number;
  schoolDays: number;
  holidayDays: number;
  weekendDays: number;
  weekends: number;
  mondays: number;
  fridays: number;
  saturdays: number;
  sundays: number;
  weekdayCounts: number[]; // Index 0 = Sonntag
  /** Wie oft noch schlafen bis zum Release */
  nights: number;
  /** Schultage, an denen der Unterricht noch nicht vorbei ist */
  schoolDaysRemaining: number;
  schoolWeeks: number;
  isSchoolDayToday: boolean;
  isHolidayToday: boolean;
  todayType: DayType;
}

function hm(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

let cacheKey = '';
let cache: CalendarCounts | null = null;

/** Zählt die verbleibenden Tage nach Typ. Ergebnis wird pro Minute gecacht. */
export function calendarCounts(now: number): CalendarCounts {
  const p = zonedParts(now, TZ);
  const key = `${p.y}-${p.m}-${p.d}-${p.hour}-${p.minute}`;
  if (cache && key === cacheKey) return cache;

  const today: CivilDate = { y: p.y, m: p.m, d: p.d };
  const minuteOfDay = p.hour * 60 + p.minute;
  const schoolEnd = hm(CONFIG.school.dayEnd);
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  let schoolDays = 0;
  let schoolDaysRemaining = 0;
  let holidayDays = 0;
  let weekendDays = 0;
  let weekends = 0;
  let days = 0;

  if (now < RELEASE && civilCompare(today, LAST_WAIT_DAY) <= 0) {
    for (const c of civilRange(today, LAST_WAIT_DAY)) {
      days++;
      const wd = civilWeekday(c);
      weekdayCounts[wd]++;
      if (holidayOf(c)) holidayDays++;
      if (isWeekend(c)) weekendDays++;
      if (wd === 0) weekends++;
      if (isSchoolDay(c)) {
        schoolDays++;
        const isToday = civilEquals(c, today);
        if (!isToday || minuteOfDay < schoolEnd) schoolDaysRemaining++;
      }
    }
    // Ein Samstag ohne folgenden Sonntag vor dem Release zählt als halbes Wochenende → nicht mitzählen
  }

  // Nächte: Nächte zwischen heute und dem letzten Wartetag. Die Release-Nacht zählt nicht.
  let nights = Math.max(0, civilDiff(today, LAST_WAIT_DAY));
  if (now < RELEASE && p.hour < 5) nights += 1; // mitten in der Nacht: die laufende Nacht zählt noch

  const todayType = dayType(today);
  cache = {
    days,
    schoolDays,
    holidayDays,
    weekendDays,
    weekends,
    mondays: weekdayCounts[1],
    fridays: weekdayCounts[5],
    saturdays: weekdayCounts[6],
    sundays: weekdayCounts[0],
    weekdayCounts,
    nights: now < RELEASE ? nights : 0,
    schoolDaysRemaining,
    schoolWeeks: schoolDays / 5,
    isSchoolDayToday: isSchoolDay(today),
    isHolidayToday: Boolean(holidayOf(today)),
    todayType,
  };
  cacheKey = key;
  return cache;
}

/** Zählt Tage eines bestimmten Typs zwischen zwei Kalendertagen (inklusive). */
export function countDaysBetween(from: CivilDate, to: CivilDate, pred: (c: CivilDate) => boolean): number {
  let n = 0;
  if (civilCompare(from, to) > 0) return 0;
  for (const c of civilRange(from, to)) if (pred(c)) n++;
  return n;
}

export function civilLabel(c: CivilDate): string {
  return civilKey(c);
}

export function parseDateInput(value: string | null): CivilDate | null {
  if (!value) return null;
  try {
    return parseCivil(value);
  } catch {
    return null;
  }
}

export { civilAddDays, RELEASE };
