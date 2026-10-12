/**
 * Referenzwerte für Zeitvergleiche. Schätzungen sind als solche markiert.
 */
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../core/tz';

export interface Unit {
  id: string;
  label: string;
  /** Länge in ms */
  ms: number;
  note: string;
}

/** Einheiten für den Wartezeit-Umrechner */
export const UNITS: Unit[] = [
  { id: 'lesson', label: 'Schulstunden', ms: 45 * MINUTE_MS, note: '45 Minuten' },
  { id: 'double', label: 'Doppelstunden', ms: 90 * MINUTE_MS, note: '90 Minuten' },
  { id: 'football', label: 'Fußballspiele', ms: 90 * MINUTE_MS, note: '90 Minuten reine Spielzeit' },
  { id: 'movie', label: 'Kinofilme', ms: 2 * HOUR_MS, note: 'Annahme: 2 Stunden pro Film' },
  { id: 'lotr', label: 'Herr-der-Ringe-Marathons', ms: 686 * MINUTE_MS, note: 'Extended-Trilogie ≈ 11 Std. 26 Min.' },
  { id: 'gta5story', label: 'GTA-V-Storydurchläufe', ms: 32 * HOUR_MS, note: '≈ 32 Std. Hauptstory (Spielzeit-Statistiken)' },
  { id: 'trailer1', label: 'Mal Trailer 1', ms: 91_000, note: 'Trailer 1 dauert 1:31' },
  { id: 'trailer2', label: 'Mal Trailer 2', ms: 166_000, note: 'Trailer 2 dauert 2:46' },
  { id: 'nap', label: 'Power-Naps', ms: 20 * MINUTE_MS, note: '20 Minuten' },
  { id: 'sleepcycle', label: 'Schlafzyklen', ms: 90 * MINUTE_MS, note: '≈ 90 Minuten pro Zyklus' },
  { id: 'egg', label: 'wachsweiche Eier', ms: 7 * MINUTE_MS, note: '7 Minuten Kochzeit' },
  { id: 'song', label: 'Songs', ms: 210_000, note: 'Annahme: 3:30 pro Song' },
  { id: 'tiktok', label: 'Kurzvideos', ms: 30_000, note: 'Annahme: 30 Sekunden pro Video' },
  { id: 'teeth', label: 'Mal Zähneputzen', ms: 2 * MINUTE_MS, note: '2 Minuten (Empfehlung)' },
  { id: 'pizza', label: 'Tiefkühlpizzen', ms: 12 * MINUTE_MS, note: '12 Minuten Backzeit' },
];

export interface Reference {
  id: string;
  label: string;
  ms: number;
  note: string;
}

/** Historische & natürliche Zeitspannen für „Historische Maßstäbe“ */
export const REFERENCES: Reference[] = [
  { id: 'apollo11', label: 'Apollo-11-Mission', ms: 8 * DAY_MS + 3 * HOUR_MS + 18 * MINUTE_MS, note: '16.–24. Juli 1969' },
  { id: 'columbus', label: 'Kolumbus’ Atlantiküberquerung', ms: 36 * DAY_MS, note: 'La Gomera → Guanahani, 6.9.–12.10.1492' },
  { id: 'worldcup', label: 'Fußball-WM 2014', ms: 32 * DAY_MS, note: '12.6.–13.7.2014' },
  { id: 'lunar', label: 'Mondmonat', ms: 29.530589 * DAY_MS, note: 'Neumond bis Neumond' },
  { id: 'verne', label: 'In 80 Tagen um die Welt', ms: 80 * DAY_MS, note: 'Jules Verne, 1872' },
  { id: 'mars', label: 'Flug von Perseverance zum Mars', ms: 203 * DAY_MS, note: '30.7.2020–18.2.2021' },
  { id: 'pregnancy', label: 'Menschliche Schwangerschaft', ms: 280 * DAY_MS, note: '≈ 40 Wochen' },
  { id: 'empire', label: 'Bau des Empire State Building', ms: 410 * DAY_MS, note: '17.3.1930–1.5.1931' },
  { id: 'polyakov', label: 'Längster Raumflug (Poljakow)', ms: 437 * DAY_MS, note: '1994–1995 auf der Mir' },
  { id: 'elephant', label: 'Elefanten-Schwangerschaft', ms: 645 * DAY_MS, note: '≈ 21–22 Monate' },
  { id: 'gta5cycle', label: 'GTA V: Ankündigung bis Release', ms: 693 * DAY_MS, note: '25.10.2011–17.09.2013' },
  { id: 'eiffel', label: 'Bau des Eiffelturms', ms: 793 * DAY_MS, note: '28.1.1887–31.3.1889' },
  { id: 'wall', label: 'Berliner Mauer', ms: 10_315 * DAY_MS, note: '13.8.1961–9.11.1989' },
];

/** Physikalische Konstanten für die kosmische Perspektive */
export const COSMOS = {
  c: 299_792.458, // km/s
  au: 149_597_870.7, // km
  earthOrbitSpeed: 29.78, // km/s
  issPeriod: 92.9 * MINUTE_MS,
  issSpeed: 7.66, // km/s
  siderealDay: 86_164.0905 * 1000,
  sunMassLossPerSecond: 4.26e6, // Tonnen/s durch Kernfusion
  moonRecessionPerYear: 3.8, // cm/Jahr
  atlanticWideningPerYear: 2.5, // cm/Jahr (Mittelatlantischer Rücken, Mittelwert)
  earthMoonDistance: 384_400, // km
  lightDay: 299_792.458 * 86_400, // km
};

export const PLANET_DAYS: { name: string; ms: number; note: string }[] = [
  { name: 'Merkur', ms: 175.94 * DAY_MS, note: 'Sonnentag: 175,94 Erdtage' },
  { name: 'Venus', ms: 116.75 * DAY_MS, note: 'Sonnentag: 116,75 Erdtage' },
  { name: 'Erde', ms: DAY_MS, note: '24 Stunden' },
  { name: 'Mars', ms: 88_775_244, note: 'Sol: 24 Std. 39 Min. 35 Sek.' },
  { name: 'Jupiter', ms: 35_730_000, note: 'ca. 9 Std. 56 Min.' },
  { name: 'Saturn', ms: 38_018_000, note: 'ca. 10 Std. 34 Min.' },
  { name: 'Uranus', ms: 62_040_000, note: 'ca. 17 Std. 14 Min.' },
  { name: 'Neptun', ms: 57_960_000, note: 'ca. 16 Std. 6 Min.' },
];

/** Weltzeit: Release-Moment in anderen Zeitzonen */
export const WORLD_ZONES: { city: string; tz: string; note?: string }[] = [
  { city: 'Berlin', tz: 'Europe/Berlin', note: 'Deine Zeitzone' },
  { city: 'London', tz: 'Europe/London' },
  { city: 'Vice City (Miami)', tz: 'America/New_York', note: 'Leonidas reales Vorbild' },
  { city: 'Los Santos (Los Angeles)', tz: 'America/Los_Angeles' },
  { city: 'Edinburgh (Rockstar North)', tz: 'Europe/London' },
  { city: 'Tokio', tz: 'Asia/Tokyo' },
  { city: 'Sydney', tz: 'Australia/Sydney' },
];
