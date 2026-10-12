/**
 * Zeitzonen-Kern. Alles, was mit Wanduhrzeit, Kalendertagen und
 * Sommer-/Winterzeit zu tun hat, läuft über diese Datei.
 *
 * Grundprinzip:
 *  - Ein „Zeitpunkt“ ist immer ein Epoch-Millisekundenwert (UTC, absolut).
 *  - Ein „Kalendertag“ (CivilDate) ist ein Datum ohne Uhrzeit in einer Zeitzone.
 *  - Kalendertag-Arithmetik passiert über Date.UTC (dort gibt es keine Zeitumstellung),
 *    nie über „+ 86 400 000 ms“.
 */

export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const MINUTE_MS = 60_000;

export interface CivilDate {
  y: number;
  m: number; // 1–12
  d: number; // 1–31
}

export interface ZonedParts extends CivilDate {
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sonntag … 6 = Samstag */
  weekday: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** Zerlegt einen Zeitpunkt in die Wanduhr-Bestandteile einer Zeitzone. */
export function zonedParts(ms: number, tz: string): ZonedParts {
  const parts = partsFormatter(tz).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const y = get('year');
  const m = get('month');
  const d = get('day');
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return {
    y,
    m,
    d,
    hour,
    minute: get('minute'),
    second: get('second'),
    weekday: civilWeekday({ y, m, d }),
  };
}

/** Versatz der Zeitzone gegenüber UTC zum Zeitpunkt `ms` (in ms, z. B. +3 600 000 für MEZ). */
export function tzOffset(ms: number, tz: string): number {
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute, p.second);
  const floored = Math.floor(ms / 1000) * 1000;
  return asUtc - floored;
}

/**
 * Wandelt eine Wanduhrzeit in einer Zeitzone in einen absoluten Zeitpunkt um.
 * Bei doppelt vorkommenden Uhrzeiten (Herbst-Zeitumstellung) wird die frühere
 * (Sommerzeit) gewählt, bei übersprungenen (Frühjahr) die spätere gültige.
 */
export function zonedToUtc(
  y: number,
  m: number,
  d: number,
  hour = 0,
  minute = 0,
  second = 0,
  tz: string,
): number {
  const naive = Date.UTC(y, m - 1, d, hour, minute, second);
  // Zwei Kandidaten-Offsets: kurz vor und kurz nach dem naiven Zeitpunkt.
  const offA = tzOffset(naive - 12 * HOUR_MS, tz);
  const offB = tzOffset(naive + 12 * HOUR_MS, tz);
  const candA = naive - offA;
  const candB = naive - offB;
  const valid = (c: number) => {
    const p = zonedParts(c, tz);
    return p.y === y && p.m === m && p.d === d && p.hour === hour && p.minute === minute;
  };
  const aOk = valid(candA);
  const bOk = valid(candB);
  if (aOk && bOk) return Math.min(candA, candB);
  if (aOk) return candA;
  if (bOk) return candB;
  // Uhrzeit existiert nicht (Lücke bei Frühjahrsumstellung): späteren Offset nehmen
  return naive - Math.min(offA, offB);
}

/** Parst `YYYY-MM-DD` oder `YYYY-MM-DDTHH:mm[:ss]` als Wanduhrzeit in `tz`. */
export function parseLocal(value: string, tz: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (!match) throw new Error(`Ungültiges Datum: ${value}`);
  const [, y, m, d, hh, mm, ss] = match;
  return zonedToUtc(+y, +m, +d, hh ? +hh : 0, mm ? +mm : 0, ss ? +ss : 0, tz);
}

export function parseCivil(value: string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) throw new Error(`Ungültiges Datum: ${value}`);
  return { y: +match[1], m: +match[2], d: +match[3] };
}

export function civilFromMs(ms: number, tz: string): CivilDate {
  const p = zonedParts(ms, tz);
  return { y: p.y, m: p.m, d: p.d };
}

function civilToUtcNoon(c: CivilDate): number {
  return Date.UTC(c.y, c.m - 1, c.d, 12);
}

export function civilAddDays(c: CivilDate, n: number): CivilDate {
  const t = new Date(civilToUtcNoon(c) + n * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Anzahl Kalendertage von a nach b (b − a). */
export function civilDiff(a: CivilDate, b: CivilDate): number {
  return Math.round((civilToUtcNoon(b) - civilToUtcNoon(a)) / DAY_MS);
}

export function civilWeekday(c: CivilDate): number {
  return new Date(civilToUtcNoon(c)).getUTCDay();
}

export function civilCompare(a: CivilDate, b: CivilDate): number {
  return civilToUtcNoon(a) - civilToUtcNoon(b);
}

export function civilKey(c: CivilDate): string {
  return `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`;
}

export function civilEquals(a: CivilDate, b: CivilDate): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

/** Zeitpunkt von 00:00 Uhr Wanduhrzeit an diesem Kalendertag. */
export function startOfCivilDay(c: CivilDate, tz: string): number {
  return zonedToUtc(c.y, c.m, c.d, 0, 0, 0, tz);
}

/** Tatsächliche Länge eines Kalendertages in ms (23, 24 oder 25 Stunden). */
export function civilDayLength(c: CivilDate, tz: string): number {
  return startOfCivilDay(civilAddDays(c, 1), tz) - startOfCivilDay(c, tz);
}

export function dayOfYear(c: CivilDate): number {
  return Math.round((Date.UTC(c.y, c.m - 1, c.d) - Date.UTC(c.y, 0, 1)) / DAY_MS) + 1;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Iteriert über alle Kalendertage von `from` bis `to` (inklusive). */
export function* civilRange(from: CivilDate, to: CivilDate): Generator<CivilDate> {
  let c = from;
  while (civilCompare(c, to) <= 0) {
    yield c;
    c = civilAddDays(c, 1);
  }
}

/** Findet alle Zeitumstellungen (Offset-Wechsel) zwischen zwei Zeitpunkten. */
export function findOffsetChanges(fromMs: number, toMs: number, tz: string): { at: number; before: number; after: number }[] {
  const changes: { at: number; before: number; after: number }[] = [];
  const step = 6 * HOUR_MS;
  let prev = tzOffset(fromMs, tz);
  for (let t = fromMs + step; t <= toMs + step; t += step) {
    const cur = tzOffset(Math.min(t, toMs), tz);
    if (cur !== prev) {
      // Binärsuche auf die Minute genau
      let lo = t - step;
      let hi = Math.min(t, toMs);
      while (hi - lo > MINUTE_MS) {
        const mid = Math.floor((lo + hi) / 2 / MINUTE_MS) * MINUTE_MS;
        if (tzOffset(mid, tz) === prev) lo = mid;
        else hi = mid;
      }
      changes.push({ at: hi, before: prev, after: cur });
      prev = cur;
    }
    if (t >= toMs) break;
  }
  return changes;
}
