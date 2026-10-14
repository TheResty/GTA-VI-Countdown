/**
 * Restzeit-Texte für den Hero: tägliche Briefings in den letzten 36 Tagen,
 * stundengenaue Texte am letzten Tag, minutengenaue in der letzten Dreiviertelstunde
 * und Texte für die Zeit nach dem Release.
 */
import { BEFORE_WINDOW, BriefingContext, DAILY, FINAL_DAY } from '../data/briefings';
import { calendarCounts } from './calendar';
import { humanDuration, num } from './format';
import { settings } from './settings';
import { getStart, progressFrom } from './startpoint';
import { ANCHORS, EXAMS_END, PRELOAD, RELEASE, RELEASE_CIVIL, TZ } from './timeline';
import { CivilDate, DAY_MS, HOUR_MS, MINUTE_MS, civilAddDays, civilDiff, civilFromMs, zonedParts, zonedToUtc } from './tz';

export const BRIEFING_DAYS = 36;

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WD_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export interface BriefingView {
  key: string;
  tag: string;
  title: string;
  text: string;
  /** Kalendertage bis zum Release-Tag (nur vor dem Release) */
  d: number | null;
}

/* ------------------------------------------------------------------ */
/* Letzte Minuten & nach dem Release                                   */
/* ------------------------------------------------------------------ */
interface FineInterval {
  id: string;
  min: number;
  max: number;
  title: string;
  text: (now: number) => string;
}

export const FINE_INTERVALS: FineInterval[] = [
  { id: 'one-lesson', min: 20 * MINUTE_MS, max: 45 * MINUTE_MS, title: 'Weniger als eine Schulstunde', text: () => 'Eine Schulstunde. Ohne Lehrkraft, ohne Pause, ohne Gnade. Getränk bereit? Snacks bereit? Gut.' },
  { id: 'pizza', min: 5 * MINUTE_MS, max: 20 * MINUTE_MS, title: 'Eine Pizza-Lieferung', text: () => 'So lange braucht eine Pizza, wenn der Lieferdienst gut drauf ist. Bestell lieber nicht mehr – du würdest die Tür nicht hören.' },
  { id: 'one-song', min: MINUTE_MS, max: 5 * MINUTE_MS, title: 'Ein Song lang', text: () => 'Ein Song. Ungefähr einmal „Africa“ von Toto. Geh jetzt nicht mehr weg.' },
  { id: 'seconds', min: 10_000, max: MINUTE_MS, title: 'Unter einer Minute', text: () => `Dein Puls liegt vermutlich nicht mehr bei ${settings().restingHeartRate}. Völlig normal.` },
  { id: 'ten', min: 0, max: 10_000, title: 'JETZT GLEICH', text: () => 'Zehn. Neun. Du weißt, wie das geht.' },
  { id: 'released', min: -HOUR_MS, max: 0, title: 'Es ist da.', text: () => 'GTA VI ist erschienen. Warum liest du noch diesen Text?' },
  {
    id: 'day-one',
    min: -DAY_MS,
    max: -HOUR_MS,
    title: 'Day One',
    text: (now) => `Release-Tag. Schlaf ist optional, Klausuren leider nicht – die letzte ist in ${humanDuration(Math.max(0, EXAMS_END - now), 2)} geschrieben.`,
  },
  {
    id: 'exam-split',
    min: -(EXAMS_END - RELEASE),
    max: -DAY_MS,
    title: 'Der Klausur-Spagat',
    text: (now) => `GTA VI läuft. Die Klausuren auch – noch ${humanDuration(Math.max(0, EXAMS_END - now), 2)}. Rockstar hat deinen Stundenplan offensichtlich nicht gelesen.`,
  },
  {
    id: 'free-roam',
    min: -Infinity,
    max: -(EXAMS_END - RELEASE),
    title: 'Free Roam',
    text: () => `Klausuren vorbei, GTA VI installiert. Du hast seit Trailer 1 ganze ${num(Math.floor((RELEASE - ANCHORS.trailer1) / DAY_MS))} Tage gewartet. Es hat sich gelohnt. Hoffentlich.`,
  },
];

export function fineInterval(diff: number): FineInterval | null {
  return FINE_INTERVALS.find((i) => diff >= i.min && diff < i.max) ?? null;
}

/* ------------------------------------------------------------------ */
/* Briefings                                                           */
/* ------------------------------------------------------------------ */
export function briefingContext(now: number): BriefingContext {
  const p = zonedParts(now, TZ);
  const today = { y: p.y, m: p.m, d: p.d };
  const start = getStart();
  const s = settings();
  return {
    now,
    d: civilDiff(today, RELEASE_CIVIL),
    hour: p.hour,
    minute: p.minute,
    weekday: WEEKDAYS[p.weekday],
    dateLabel: `${p.d}.${p.m}.`,
    cal: calendarCounts(now),
    name: s.callsign || 'Spieler',
    pct: progressFrom(start.at, now) * 100,
    startLabel: start.label,
    hoursLeft: Math.max(0, Math.ceil((RELEASE - now) / HOUR_MS)),
    lessons: s.lessonsPerDay,
    preloadIn: PRELOAD - now,
    examsIn: EXAMS_END - now,
  };
}

/** Das Briefing für einen bestimmten Moment. */
export function briefingAt(now: number): BriefingView {
  const diff = RELEASE - now;
  if (diff <= 0 || diff < 45 * MINUTE_MS) {
    const f = fineInterval(diff)!;
    return { key: `fine-${f.id}`, tag: diff > 0 ? 'Letzte Minuten' : 'Nach dem Release', title: f.title, text: f.text(now), d: null };
  }
  const c = briefingContext(now);
  const wd = WD_SHORT[zonedParts(now, TZ).weekday];
  if (c.d === 1) {
    const minute = c.hour * 60 + c.minute;
    const entry = [...FINAL_DAY].reverse().find((e) => minute >= e.from) ?? FINAL_DAY[0];
    return { key: `final-${entry.from}`, tag: `Finaler Tag · ${wd} ${c.dateLabel} · ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')} Uhr`, title: entry.title, text: entry.text(c), d: 1 };
  }
  const daily = DAILY[c.d];
  if (daily && c.d <= BRIEFING_DAYS) {
    return { key: `day-${c.d}`, tag: `Briefing ${BRIEFING_DAYS + 1 - c.d} von ${BRIEFING_DAYS} · ${wd} ${c.dateLabel}`, title: daily.title, text: daily.text(c), d: c.d };
  }
  return { key: 'before', tag: `${wd} ${c.dateLabel}`, title: BEFORE_WINDOW.title, text: BEFORE_WINDOW.text(c), d: c.d };
}

/** Kalendertag zu „d Tage vor dem Release“. */
export function briefingDate(d: number): CivilDate {
  return civilAddDays(RELEASE_CIVIL, -d);
}

/** Archiv: Briefing eines vergangenen Tages (so, wie es mittags zu lesen war). */
export function briefingForDay(d: number): BriefingView {
  const c = briefingDate(d);
  return briefingAt(zonedToUtc(c.y, c.m, c.d, d === 1 ? 8 : 12, 0, 0, TZ));
}

/** Zeitpunkt, an dem das nächste Briefing erscheint (nächste Mitternacht bzw. nächste Tageszeit am letzten Tag). */
export function nextBriefingAt(now: number): number | null {
  if (RELEASE - now <= 45 * MINUTE_MS) return null;
  const c = briefingContext(now);
  const today = civilFromMs(now, TZ);
  if (c.d === 1) {
    const minute = c.hour * 60 + c.minute;
    const next = FINAL_DAY.find((e) => e.from > minute);
    return next ? zonedToUtc(today.y, today.m, today.d, Math.floor(next.from / 60), next.from % 60, 0, TZ) : RELEASE - 45 * MINUTE_MS;
  }
  const tomorrow = civilAddDays(today, 1);
  return zonedToUtc(tomorrow.y, tomorrow.m, tomorrow.d, 0, 0, 0, TZ);
}
