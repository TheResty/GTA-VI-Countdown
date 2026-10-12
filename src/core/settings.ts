import { CONFIG } from '../config';
import { load, save } from './store';

export interface Location {
  name: string;
  lat: number;
  lon: number;
}

export interface Settings {
  callsign: string;
  birthDate: string | null;
  schoolStartDate: string | null;
  location: Location;
  sleepHours: number;
  mealsPerDay: number;
  trainingsPerWeek: number;
  restingHeartRate: number;
  lessonsPerDay: number;
  stepsPerDay: number;
  enable3d: boolean;
  reduceMotion: boolean;
}

export const LOCATIONS: Location[] = [
  { name: 'Berlin', lat: 52.52, lon: 13.405 },
  { name: 'Hamburg', lat: 53.551, lon: 9.993 },
  { name: 'München', lat: 48.137, lon: 11.575 },
  { name: 'Köln', lat: 50.938, lon: 6.96 },
  { name: 'Frankfurt am Main', lat: 50.11, lon: 8.682 },
  { name: 'Stuttgart', lat: 48.775, lon: 9.182 },
  { name: 'Düsseldorf', lat: 51.227, lon: 6.773 },
  { name: 'Leipzig', lat: 51.34, lon: 12.375 },
  { name: 'Dresden', lat: 51.05, lon: 13.738 },
  { name: 'Hannover', lat: 52.375, lon: 9.732 },
  { name: 'Nürnberg', lat: 49.452, lon: 11.077 },
  { name: 'Bremen', lat: 53.079, lon: 8.801 },
  { name: 'Dortmund', lat: 51.514, lon: 7.465 },
  { name: 'Kiel', lat: 54.323, lon: 10.123 },
  { name: 'Rostock', lat: 54.092, lon: 12.099 },
  { name: 'Freiburg', lat: 47.999, lon: 7.842 },
  { name: 'Wien', lat: 48.208, lon: 16.373 },
  { name: 'Zürich', lat: 47.377, lon: 8.541 },
];

function defaultsFromConfig(): Settings {
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return {
    callsign: CONFIG.user.callsign,
    birthDate: CONFIG.user.birthDate,
    schoolStartDate: CONFIG.user.schoolStartDate,
    location: { ...CONFIG.user.location },
    sleepHours: CONFIG.assumptions.sleepHours,
    mealsPerDay: CONFIG.assumptions.mealsPerDay,
    trainingsPerWeek: CONFIG.assumptions.trainingsPerWeek,
    restingHeartRate: CONFIG.assumptions.restingHeartRate,
    lessonsPerDay: CONFIG.school.lessonsPerDay,
    stepsPerDay: CONFIG.assumptions.stepsPerDay,
    enable3d: true,
    reduceMotion: Boolean(prefersReduced),
  };
}

let current: Settings = { ...defaultsFromConfig(), ...load<Partial<Settings>>('settings', {}) };
const listeners = new Set<(s: Settings) => void>();

export function settings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  // Nur Abweichungen von der Code-Konfiguration speichern
  const base = defaultsFromConfig();
  const diff: Partial<Settings> = {};
  (Object.keys(current) as (keyof Settings)[]).forEach((k) => {
    if (JSON.stringify(current[k]) !== JSON.stringify(base[k])) {
      (diff as Record<string, unknown>)[k] = current[k];
    }
  });
  save('settings', diff);
  listeners.forEach((fn) => fn(current));
}

export function resetSettings(): void {
  current = defaultsFromConfig();
  save('settings', {});
  listeners.forEach((fn) => fn(current));
}

export function onSettings(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
