/**
 * English edition: time base and formatting.
 * Everything is shown in the viewer's own time zone. The countdown targets
 * Thursday, November 19, 2026, 00:00 local time (PS5 digital unlocks at local midnight).
 */
import { DAY_MS, HOUR_MS, MINUTE_MS, zonedToUtc } from '../core/tz';

export const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

export const RELEASE = zonedToUtc(2026, 11, 19, 0, 0, 0, TZ);
/** PS5 digital pre-load: midnight local time on November 10 */
export const PRELOAD = zonedToUtc(2026, 11, 10, 0, 0, 0, TZ);

/** Global moments as real instants (UTC) */
export const ANCHORS = {
  gta5: Date.UTC(2013, 8, 17, 4, 0),
  confirmed: Date.UTC(2022, 1, 4, 14, 0),
  trailer1: Date.UTC(2023, 11, 4, 23, 0), // Dec 4, 2023, 6 pm ET
  trailer2: Date.UTC(2025, 4, 6, 14, 0), // May 6, 2025, 10 am ET
  delay2: Date.UTC(2025, 10, 6, 21, 0),
  preorders: Date.UTC(2026, 5, 25, 14, 0),
  extendedLook: Date.UTC(2026, 7, 27, 19, 0), // Aug 27, 2026, 3 pm ET (Netflix)
  launchTrailer: Date.UTC(2026, 9, 15, 13, 0), // Oct 15, 2026, 9 am ET
};

export interface HistoryEvent {
  at: number;
  title: string;
  kind: 'release' | 'trailer' | 'delay' | 'announce' | 'leak' | 'milestone';
}

export const HISTORY: HistoryEvent[] = [
  { at: ANCHORS.gta5, title: 'GTA V released', kind: 'release' },
  { at: ANCHORS.confirmed, title: 'GTA VI officially confirmed', kind: 'announce' },
  { at: Date.UTC(2022, 8, 18, 12, 0), title: 'The big 2022 leak', kind: 'leak' },
  { at: Date.UTC(2023, 10, 8, 12, 0), title: 'Trailer announced', kind: 'announce' },
  { at: ANCHORS.trailer1, title: 'Trailer 1', kind: 'trailer' },
  { at: Date.UTC(2025, 4, 2, 13, 0), title: 'First delay', kind: 'delay' },
  { at: ANCHORS.trailer2, title: 'Trailer 2', kind: 'trailer' },
  { at: ANCHORS.delay2, title: 'Second delay', kind: 'delay' },
  { at: ANCHORS.preorders, title: 'Pre-orders open', kind: 'milestone' },
  { at: ANCHORS.extendedLook, title: 'An Extended Look', kind: 'trailer' },
  { at: ANCHORS.launchTrailer, title: 'Launch Trailer', kind: 'trailer' },
  { at: PRELOAD, title: 'Pre-load', kind: 'milestone' },
];

export const KIND_COLOR: Record<HistoryEvent['kind'], string> = {
  release: '#ffd23f',
  trailer: '#19f0ff',
  delay: '#ff3b5c',
  announce: '#3dffb5',
  leak: '#9b6bff',
  milestone: '#ff8a3d',
};

/* Formatting --------------------------------------------------------- */
const nfCache = new Map<string, Intl.NumberFormat>();
export function num(value: number, decimals = 0, minDecimals = decimals): string {
  if (!Number.isFinite(value)) return '–';
  const key = `${minDecimals}-${decimals}`;
  let nf = nfCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: minDecimals, maximumFractionDigits: decimals });
    nfCache.set(key, nf);
  }
  return nf.format(value);
}

export const pad = (n: number, w = 2) => String(Math.floor(Math.abs(n))).padStart(w, '0');

export function split(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(t / 86400), hours: Math.floor((t % 86400) / 3600), minutes: Math.floor((t % 3600) / 60), seconds: t % 60 };
}

/** "3 days, 4 hrs" */
export function duration(ms: number, maxUnits = 2): string {
  const p = split(Math.abs(ms));
  const parts: string[] = [];
  const add = (n: number, one: string, many: string) => {
    if (n && parts.length < maxUnits) parts.push(`${num(n)} ${n === 1 ? one : many}`);
  };
  add(p.days, 'day', 'days');
  if (parts.length || p.hours) add(p.hours, 'hr', 'hrs');
  if (parts.length < maxUnits) add(p.minutes, 'min', 'min');
  if (parts.length < maxUnits) add(p.seconds, 'sec', 'sec');
  return parts.length ? parts.join(', ') : '0 sec';
}

export function relative(target: number, now: number): string {
  const d = target - now;
  return d >= 0 ? `in ${duration(d, 2)}` : `${duration(-d, 2)} ago`;
}

const fmts = {
  full: new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  date: new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' }),
  short: new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }),
  wdShort: new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' }),
  time: new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }),
  tz: new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'short' }),
};
export type FmtStyle = keyof Omit<typeof fmts, 'tz'>;
export const fmt = (ms: number, style: FmtStyle = 'date') => fmts[style].format(new Date(ms));
export const tzName = (ms: number) => fmts.tz.formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? TZ;

export { DAY_MS, HOUR_MS, MINUTE_MS };

export const progressFrom = (start: number, now: number) => Math.max(0, Math.min(1, (now - start) / (RELEASE - start)));
