/**
 * Dein Tagesplan in Stunden: Schlaf, Schule oder Freizeit.
 * Grundlage für Stundenbudget, Zeitlupe und Zeittunnel.
 */
import { CONFIG } from '../config';
import { isSchoolDay } from './calendar';
import { settings } from './settings';
import { CivilDate } from './tz';

export type HourKind = 'sleep' | 'school' | 'free';

export const HOUR_KIND_LABEL: Record<HourKind, string> = {
  sleep: 'Schlaf',
  school: 'Schule',
  free: 'Freizeit',
};

export const HOUR_KIND_COLOR: Record<HourKind, string> = {
  sleep: '#7b5cff',
  school: '#19f0ff',
  free: '#ff2e97',
};

function hm(v: string): number {
  const [a, b] = v.split(':').map(Number);
  return a + b / 60;
}

export function hourKind(c: CivilDate, hour: number): HourKind {
  const bed = hm(CONFIG.assumptions.bedtime);
  const wake = (bed + settings().sleepHours) % 24;
  const asleep = bed > wake ? hour >= bed || hour < wake : hour >= bed && hour < wake;
  if (asleep) return 'sleep';
  if (isSchoolDay(c) && hour >= Math.floor(hm(CONFIG.school.dayStart)) && hour < Math.ceil(hm(CONFIG.school.dayEnd))) return 'school';
  return 'free';
}
