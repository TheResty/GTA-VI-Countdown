/**
 * Sonnenauf- und -untergang nach den NOAA-Näherungsformeln (± ca. 2 Minuten).
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
