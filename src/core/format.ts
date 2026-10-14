import { CONFIG } from '../config';
import { DAY_MS, HOUR_MS, MINUTE_MS } from './tz';

const TZ = CONFIG.timezone;
const nfCache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max });
    nfCache.set(key, f);
  }
  return f;
}

/** Zahl im deutschen Format (Tausenderpunkt, Dezimalkomma). */
export function num(value: number, decimals = 0, minDecimals = decimals): string {
  if (!Number.isFinite(value)) return '–';
  return nf(minDecimals, decimals).format(value);
}

export function int(value: number): string {
  return num(Math.floor(value), 0);
}

export function pct(value: number, decimals = 2): string {
  return `${num(value * 100, decimals)} %`;
}

export function pad(value: number, len = 2): string {
  return String(Math.floor(Math.abs(value))).padStart(len, '0');
}

/** Kompakte Darstellung großer Zahlen: 1,2 Mio., 3,4 Mrd. … */
export function compact(value: number, decimals = 1): string {
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e18, 'Trillionen'],
    [1e15, 'Billiarden'],
    [1e12, 'Billionen'],
    [1e9, 'Mrd.'],
    [1e6, 'Mio.'],
  ];
  for (const [base, label] of units) {
    if (abs >= base) return `${num(value / base, decimals)} ${label}`;
  }
  return num(value, abs < 10 ? decimals : 0);
}

const dateFormats = {
  full: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  date: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }),
  dateShort: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: '2-digit', month: '2-digit' }),
  dateLong: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }),
  dayMonth: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, day: 'numeric', month: 'long' }),
  weekdayShort: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'short' }),
  time: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }),
  timeSec: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  monthYear: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, month: 'long', year: 'numeric' }),
  monthShort: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, month: 'short' }),
  tzName: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, timeZoneName: 'short' }),
};

export type DateStyle = keyof typeof dateFormats;

export function fmtDate(ms: number, style: DateStyle = 'date'): string {
  return dateFormats[style].format(new Date(ms));
}

export function fmtDateTime(ms: number, withSeconds = false): string {
  return `${fmtDate(ms, 'date')}, ${fmtDate(ms, withSeconds ? 'timeSec' : 'time')} Uhr`;
}

/** „MEZ“ / „MESZ“ für einen Zeitpunkt */
export function tzLabel(ms: number): string {
  const part = dateFormats.tzName.formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

/** Zeitumstellung lesbar: „25.10.2026, 03:00 → 02:00 Uhr“ */
export function fmtDstChange(at: number, before: number, after: number): string {
  const hh = (offset: number) => {
    const d = new Date(at + offset);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  };
  return `${fmtDate(at, 'date')}, ${hh(before)} → ${hh(after)} Uhr`;
}

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
}

export function splitDuration(ms: number): DurationParts {
  const v = Math.max(0, ms);
  return {
    days: Math.floor(v / DAY_MS),
    hours: Math.floor((v % DAY_MS) / HOUR_MS),
    minutes: Math.floor((v % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((v % MINUTE_MS) / 1000),
    ms: Math.floor(v % 1000),
  };
}

/** Menschlich lesbare Dauer: „37 Tage, 9 Std.“ */
export function humanDuration(ms: number, maxUnits = 2): string {
  const p = splitDuration(Math.abs(ms));
  const units: [number, string, string][] = [
    [p.days, 'Tag', 'Tage'],
    [p.hours, 'Std.', 'Std.'],
    [p.minutes, 'Min.', 'Min.'],
    [p.seconds, 'Sek.', 'Sek.'],
  ];
  const out: string[] = [];
  let taken = 0;
  for (const [v, s, pl] of units) {
    if (taken === 0 && v === 0) continue;
    taken++;
    if (v > 0) out.push(`${num(v)} ${v === 1 ? s : pl}`);
    if (taken >= maxUnits) break;
  }
  return out.length ? out.join(', ') : '0 Sek.';
}

/** Lange Dauer in Jahren/Monaten/Tagen (kalendarisch angenähert) */
export function longDuration(ms: number): string {
  const days = Math.floor(Math.abs(ms) / DAY_MS);
  const years = Math.floor(days / 365.2425);
  const rest = days - Math.round(years * 365.2425);
  const months = Math.floor(rest / 30.436875);
  const d = Math.max(0, Math.round(rest - months * 30.436875));
  const parts: string[] = [];
  if (years) parts.push(`${years} ${years === 1 ? 'Jahr' : 'Jahre'}`);
  if (months) parts.push(`${months} ${months === 1 ? 'Monat' : 'Monate'}`);
  if (d || !parts.length) parts.push(`${d} ${d === 1 ? 'Tag' : 'Tage'}`);
  return parts.join(', ');
}

export function plural(n: number, one: string, many: string): string {
  return `${num(n)} ${n === 1 ? one : many}`;
}

/** Relativ: „in 3 Tagen“ / „vor 2 Std.“ */
export function relative(target: number, now: number): string {
  const diff = target - now;
  const txt = humanDuration(Math.abs(diff), 2);
  return diff >= 0 ? `in ${txt}` : `vor ${txt}`;
}

export function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
