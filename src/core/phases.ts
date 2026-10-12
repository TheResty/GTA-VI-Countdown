/**
 * Eskalationsstufen: Je näher der Release, desto spektakulärer die Seite.
 */
import { DAY_MS, HOUR_MS } from './tz';

export type PhaseId =
  | 'cruise'
  | 't30'
  | 't14'
  | 't7'
  | 't3'
  | 't1'
  | 'lasthour'
  | 'lastminute'
  | 'release'
  | 'post';

export interface Phase {
  id: PhaseId;
  level: number; // 0 … 9
  /** Untergrenze der Restzeit (ms), ab der die Phase gilt */
  label: string;
  code: string;
  description: string;
  unlocks: string;
}

export const PHASES: Phase[] = [
  {
    id: 'cruise',
    level: 0,
    label: 'Reiseflug',
    code: 'VICE-CON 5',
    description: 'Mehr als 30 Tage. Ruhig bleiben, Trailer zum 400. Mal schauen.',
    unlocks: 'Grundsystem online',
  },
  {
    id: 't30',
    level: 1,
    label: 'T-30',
    code: 'VICE-CON 4',
    description: 'Unter 30 Tagen. Die Palmen werden unruhig.',
    unlocks: 'Neon-Flackern, schnellere Synthwave-Fahrt',
  },
  {
    id: 't14',
    level: 2,
    label: 'T-14',
    code: 'VICE-CON 3',
    description: 'Zwei Wochen. Die Sonne über Vice City glüht heller.',
    unlocks: 'Glühende HUD-Ränder, Funkenflug',
  },
  {
    id: 't7',
    level: 3,
    label: 'T-7 · Preload',
    code: 'VICE-CON 2',
    description: 'Eine Woche. Der Preload läuft, die Nerven auch.',
    unlocks: 'Alarm-Scanlines, Preload-Anzeige, Puls-Effekte',
  },
  {
    id: 't3',
    level: 4,
    label: 'T-3',
    code: 'VICE-CON 1',
    description: 'Drei Tage. Schlaf wird überbewertet.',
    unlocks: 'Rote Warnleuchten, dauerhafter Glow',
  },
  {
    id: 't1',
    level: 5,
    label: 'Finale 24 Stunden',
    code: 'FINAL COUNTDOWN',
    description: 'Die letzten 24 Stunden. Jede Sekunde zählt – wörtlich.',
    unlocks: 'Final-Countdown-Inszenierung mit Hundertstelsekunden',
  },
  {
    id: 'lasthour',
    level: 6,
    label: 'Letzte Stunde',
    code: 'T-MINUS 60',
    description: 'Weniger als eine Stunde. Controller laden. Jetzt.',
    unlocks: 'Herzschlag-Modus',
  },
  {
    id: 'lastminute',
    level: 7,
    label: 'Letzte Minute',
    code: 'T-MINUS 0:60',
    description: 'Die letzten 60 Sekunden – Vollbild.',
    unlocks: 'Vollbild-Countdown',
  },
  {
    id: 'release',
    level: 8,
    label: 'Release',
    code: 'MISSION PASSED',
    description: 'GTA VI ist da. Du hast es geschafft.',
    unlocks: 'Release-Feier',
  },
  {
    id: 'post',
    level: 9,
    label: 'Post-Release',
    code: 'FREE ROAM',
    description: 'Das Warten ist vorbei. Zeit zum Spielen.',
    unlocks: 'Post-Release-Modus',
  },
];

export function phaseFor(diff: number): Phase {
  const find = (id: PhaseId) => PHASES.find((p) => p.id === id)!;
  if (diff <= -DAY_MS) return find('post');
  if (diff <= 0) return find('release');
  if (diff <= 60_000) return find('lastminute');
  if (diff <= HOUR_MS) return find('lasthour');
  if (diff <= DAY_MS) return find('t1');
  if (diff <= 3 * DAY_MS) return find('t3');
  if (diff <= 7 * DAY_MS) return find('t7');
  if (diff <= 14 * DAY_MS) return find('t14');
  if (diff <= 30 * DAY_MS) return find('t30');
  return find('cruise');
}

/** Stetige Intensität 0 … 1 für Animationen (wächst exponentiell gegen Release). */
export function intensityFor(diff: number): number {
  if (diff <= 0) return 1;
  const days = diff / DAY_MS;
  return Math.max(0, Math.min(1, 1 - Math.log10(1 + days) / Math.log10(61)));
}

export const PHASE_THRESHOLDS: { id: PhaseId; at: number }[] = [
  { id: 't30', at: 30 * DAY_MS },
  { id: 't14', at: 14 * DAY_MS },
  { id: 't7', at: 7 * DAY_MS },
  { id: 't3', at: 3 * DAY_MS },
  { id: 't1', at: DAY_MS },
  { id: 'lasthour', at: HOUR_MS },
  { id: 'lastminute', at: 60_000 },
  { id: 'release', at: 0 },
];
