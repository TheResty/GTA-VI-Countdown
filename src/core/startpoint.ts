/**
 * Globaler Startpunkt: Ab wann zählt „deine“ Wartezeit?
 * Standard ist Trailer 1. Wählbar sind feste GTA-Momente, persönliche Daten
 * oder ein frei gewählter Zeitpunkt. Alle Fortschrittsanzeigen richten sich danach.
 */
import { emit } from './bus';
import { getProfile } from './game';
import { settings } from './settings';
import { load, save } from './store';
import { ANCHORS, HOLIDAYS, RELEASE, TZ } from './timeline';
import { parseLocal, startOfCivilDay } from './tz';

export interface StartPoint {
  id: string;
  label: string;
  short: string;
  at: number;
  group: 'gta' | 'personal' | 'custom';
}

interface Stored {
  id: string;
  customAt?: number;
  customLabel?: string;
}

let stored: Stored = load<Stored>('startpoint', { id: 'trailer1' });

export function startPresets(): StartPoint[] {
  const st = settings();
  const list: StartPoint[] = [
    { id: 'gta5', label: 'GTA V Release', short: 'GTA V', at: ANCHORS.gta5, group: 'gta' },
    { id: 'confirmed', label: 'GTA VI offiziell bestätigt', short: 'Bestätigung', at: ANCHORS.gta6Confirmed, group: 'gta' },
    { id: 'leak', label: 'Der große Leak', short: 'Leak', at: ANCHORS.leak, group: 'gta' },
    { id: 'trailer1', label: 'Trailer 1', short: 'Trailer 1', at: ANCHORS.trailer1, group: 'gta' },
    { id: 'trailer2', label: 'Trailer 2', short: 'Trailer 2', at: ANCHORS.trailer2, group: 'gta' },
    { id: 'delay2', label: 'Zweite Verschiebung', short: 'Verschiebung', at: ANCHORS.delay2, group: 'gta' },
    { id: 'year2026', label: 'Jahresbeginn 2026', short: '2026', at: ANCHORS.year2026, group: 'gta' },
    { id: 'preorders', label: 'Vorbestellungsstart', short: 'Vorbestellung', at: ANCHORS.preorders, group: 'gta' },
    { id: 'launchtrailer', label: 'Launch-Trailer', short: 'Launch-Trailer', at: ANCHORS.launchTrailer, group: 'gta' },
  ];
  const autumn = HOLIDAYS[0];
  if (autumn) list.push({ id: 'holidays', label: `Beginn der ${autumn.name}`, short: autumn.name, at: startOfCivilDay(autumn.start, TZ), group: 'personal' });
  list.push({ id: 'firstvisit', label: 'Dein erster Besuch hier', short: 'Erster Besuch', at: getProfile()?.firstVisit ?? Date.now(), group: 'personal' });
  if (st.birthDate) list.push({ id: 'birth', label: 'Deine Geburt', short: 'Geburt', at: parseLocal(st.birthDate, TZ), group: 'personal' });
  if (st.schoolStartDate) list.push({ id: 'school', label: 'Deine Einschulung', short: 'Einschulung', at: parseLocal(st.schoolStartDate, TZ), group: 'personal' });
  return list.filter((p) => p.at < RELEASE);
}

export function getStart(): StartPoint {
  if (stored.id === 'custom' && stored.customAt && stored.customAt < RELEASE) {
    return { id: 'custom', label: stored.customLabel || 'Dein Moment', short: stored.customLabel || 'Dein Moment', at: stored.customAt, group: 'custom' };
  }
  return startPresets().find((p) => p.id === stored.id) ?? startPresets().find((p) => p.id === 'trailer1')!;
}

export function setStart(id: string): void {
  stored = { ...stored, id };
  save('startpoint', stored);
  emit('startpoint', getStart());
}

export function setCustomStart(at: number, label: string): void {
  stored = { id: 'custom', customAt: at, customLabel: label.trim().slice(0, 40) };
  save('startpoint', stored);
  emit('startpoint', getStart());
}

/** Anteil der Wartezeit seit dem Startpunkt (0 … 1) */
export function progressFrom(start: number, now: number): number {
  return Math.min(1, Math.max(0, (now - start) / (RELEASE - start)));
}
