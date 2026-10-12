/**
 * Astronomie für die Zeitmodule:
 *  - Sonnenauf- und -untergang nach den NOAA-Näherungsformeln (± ca. 2 Minuten)
 *  - Neu- und Vollmond nach Jean Meeus, „Astronomical Algorithms“, Kap. 49 (± wenige Minuten)
 */
import { CivilDate, DAY_MS, dayOfYear, isLeapYear } from './tz';

const RAD = Math.PI / 180;

export interface SunTimes {
  sunrise: number | null;
  sunset: number | null;
  /** Tageslänge in ms (0 bei Polarnacht) */
  dayLength: number;
}

/** Sonnenauf- und -untergang (UTC-Zeitpunkte) für einen Kalendertag an einem Ort. */
export function sunTimes(c: CivilDate, lat: number, lon: number): SunTimes {
  const n = dayOfYear(c);
  const daysInYear = isLeapYear(c.y) ? 366 : 365;
  const gamma = ((2 * Math.PI) / daysInYear) * (n - 1);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const latR = lat * RAD;
  const cosHa = Math.cos(90.833 * RAD) / (Math.cos(latR) * Math.cos(decl)) - Math.tan(latR) * Math.tan(decl);
  const midnightUtc = Date.UTC(c.y, c.m - 1, c.d);
  if (cosHa > 1) return { sunrise: null, sunset: null, dayLength: 0 };
  if (cosHa < -1) return { sunrise: null, sunset: null, dayLength: DAY_MS };
  const ha = Math.acos(cosHa) / RAD;
  const sunriseMin = 720 - 4 * (lon + ha) - eqTime;
  const sunsetMin = 720 - 4 * (lon - ha) - eqTime;
  const sunrise = midnightUtc + sunriseMin * 60_000;
  const sunset = midnightUtc + sunsetMin * 60_000;
  return { sunrise, sunset, dayLength: sunset - sunrise };
}

/* ------------------------------------------------------------------ */
/* Mondphasen                                                          */
/* ------------------------------------------------------------------ */

const JD_UNIX_EPOCH = 2440587.5;
/** ΔT (TT − UT) für die 2020er-Jahre, ca. 69 Sekunden */
const DELTA_T_DAYS = 69 / 86400;

export function jdToMs(jd: number): number {
  return (jd - JD_UNIX_EPOCH) * DAY_MS;
}

export function msToJd(ms: number): number {
  return ms / DAY_MS + JD_UNIX_EPOCH;
}

/** Zeitpunkt (ms) einer Neumond- (frac 0) oder Vollmond-Phase (frac 0.5) für Lunation k. */
export function moonPhaseTime(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;
  const sin = Math.sin;
  const isFull = Math.abs(k - Math.floor(k) - 0.5) < 1e-6;
  const c = isFull
    ? [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209]
    : [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208];
  jde +=
    c[0] * sin(Mp) +
    c[1] * E * sin(M) +
    c[2] * sin(2 * Mp) +
    c[3] * sin(2 * F) +
    c[4] * E * sin(Mp - M) +
    c[5] * E * sin(Mp + M) +
    c[6] * E * E * sin(2 * M) -
    0.00111 * sin(Mp - 2 * F) -
    0.00057 * sin(Mp + 2 * F) +
    0.00056 * E * sin(2 * Mp + M) -
    0.00042 * sin(3 * Mp) +
    0.00042 * E * sin(M + 2 * F) +
    0.00038 * E * sin(M - 2 * F) -
    0.00024 * E * sin(2 * Mp - M) -
    0.00017 * sin(O);
  return jdToMs(jde - DELTA_T_DAYS);
}

export interface MoonEvent {
  type: 'new' | 'full';
  at: number;
}

/** Alle Neu- und Vollmonde zwischen zwei Zeitpunkten. */
export function moonEvents(from: number, to: number): MoonEvent[] {
  const yearFrac = 1970 + from / (365.2425 * DAY_MS);
  let k = Math.floor((yearFrac - 2000) * 12.3685) - 1;
  const out: MoonEvent[] = [];
  for (let guard = 0; guard < 2000; guard++) {
    const tNew = moonPhaseTime(k);
    const tFull = moonPhaseTime(k + 0.5);
    if (tNew > to && tFull > to) break;
    if (tNew >= from && tNew <= to) out.push({ type: 'new', at: tNew });
    if (tFull >= from && tFull <= to) out.push({ type: 'full', at: tFull });
    k++;
  }
  return out;
}

export interface MoonState {
  /** 0 = Neumond, 0,5 = Vollmond, → 1 = nächster Neumond */
  phase: number;
  /** beleuchteter Anteil 0–1 */
  illumination: number;
  waxing: boolean;
  name: string;
  lastNew: number;
  nextNew: number;
}

/** Mondzustand zu einem Zeitpunkt (Phase relativ zwischen zwei Neumonden). */
export function moonState(ms: number): MoonState {
  const yearFrac = 1970 + ms / (365.2425 * DAY_MS);
  let k = Math.floor((yearFrac - 2000) * 12.3685) - 1;
  while (moonPhaseTime(k + 1) <= ms) k++;
  while (moonPhaseTime(k) > ms) k--;
  const lastNew = moonPhaseTime(k);
  const nextNew = moonPhaseTime(k + 1);
  const full = moonPhaseTime(k + 0.5);
  // Phase stückweise linear zwischen Neumond → Vollmond → Neumond
  const phase = ms < full ? 0.5 * ((ms - lastNew) / (full - lastNew)) : 0.5 + 0.5 * ((ms - full) / (nextNew - full));
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  return { phase, illumination, waxing: phase < 0.5, name: moonName(phase), lastNew, nextNew };
}

export function moonName(phase: number): string {
  if (phase < 0.02 || phase > 0.98) return 'Neumond';
  if (phase < 0.23) return 'Zunehmende Sichel';
  if (phase < 0.27) return 'Erstes Viertel';
  if (phase < 0.48) return 'Zunehmender Mond';
  if (phase < 0.52) return 'Vollmond';
  if (phase < 0.73) return 'Abnehmender Mond';
  if (phase < 0.77) return 'Letztes Viertel';
  return 'Abnehmende Sichel';
}
