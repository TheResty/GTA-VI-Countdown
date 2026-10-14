/**
 * Browser-Speicher (localStorage) mit sauberem Fallback:
 * Ist der Speicher blockiert (privates Fenster, Vorschau), läuft alles im
 * Arbeitsspeicher weiter – die Seite funktioniert, merkt sich nur nichts.
 */

const PREFIX = 'gta6cc:v1:';
const memory = new Map<string, string>();

function rawGet(key: string): string | null {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v !== null) return v;
  } catch {
    /* Speicher nicht verfügbar */
  }
  return memory.get(key) ?? null;
}

function rawSet(key: string, value: string): void {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export function load<T>(key: string, fallback: T): T {
  const raw = rawGet(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  rawSet(key, JSON.stringify(value));
}

export function clearAll(): void {
  memory.clear();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export function storageAvailable(): boolean {
  try {
    const k = PREFIX + '__probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Typisierte Zustände                                                 */
/* ------------------------------------------------------------------ */

export interface ProfileState {
  firstVisit: number;
  lastVisit: number;
  visits: number;
  /** Seitenaufrufe pro Kalendertag (Schlüssel YYYY-MM-DD) */
  visitsByDay: Record<string, number>;
  /** Aktive Zeit auf der Seite in Sekunden */
  activeSeconds: number;
  /** Seitenaufrufe nach Stunde des Tages (0–23) */
  visitsByHour: number[];
}

export interface CheckinState {
  days: string[]; // YYYY-MM-DD, sortiert
  best: number;
}

export interface GameState {
  achievements: Record<string, number>; // id → Zeitpunkt der Freischaltung
  sunClicks: number;
  milestonesSeen: string[];
  celebrationSeen: boolean;
}

export interface CustomCountdown {
  id: string;
  title: string;
  date: string; // YYYY-MM-DDTHH:mm
  created: number;
}

export const defaults = {
  profile: (): ProfileState => ({
    firstVisit: Date.now(),
    lastVisit: 0,
    visits: 0,
    visitsByDay: {},
    activeSeconds: 0,
    visitsByHour: Array.from({ length: 24 }, () => 0),
  }),
  checkins: (): CheckinState => ({ days: [], best: 0 }),
  game: (): GameState => ({
    achievements: {},
    sunClicks: 0,
    milestonesSeen: [],
    celebrationSeen: false,
  }),
};

export function loadProfile(): ProfileState {
  return { ...defaults.profile(), ...load<Partial<ProfileState>>('profile', {}) };
}

export function loadCheckins(): CheckinState {
  return { ...defaults.checkins(), ...load<Partial<CheckinState>>('checkins', {}) };
}

export function loadGame(): GameState {
  return { ...defaults.game(), ...load<Partial<GameState>>('game', {}) };
}
