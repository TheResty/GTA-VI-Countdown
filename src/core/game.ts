/**
 * Gamification: Besuche, Daily Check-ins, Serien, Achievements,
 * Fahndungsstufe und Kontostand. Alles lokal im Browser gespeichert.
 */
import { ACHIEVEMENTS } from '../data/achievements';
import { emit } from './bus';
import { calendarCounts, holidayOf } from './calendar';
import { clock } from './clock';
import { settings } from './settings';
import {
  CheckinState,
  GameState,
  ProfileState,
  loadCheckins,
  loadGame,
  loadProfile,
  save,
} from './store';
import { DST_CHANGES, EXAMS_END, HOLIDAYS, RELEASE, TZ } from './timeline';
import { civilAddDays, civilCompare, civilFromMs, civilKey, zonedParts, DAY_MS } from './tz';

let profile: ProfileState;
let checkins: CheckinState;
let state: GameState;

export function realNow(): number {
  return Date.now();
}

function todayKey(ms: number): string {
  return civilKey(civilFromMs(ms, TZ));
}

export function initGame(): { previousVisit: number } {
  profile = loadProfile();
  checkins = loadCheckins();
  state = loadGame();
  const now = realNow();
  const previousVisit = profile.lastVisit;
  profile.visits += 1;
  profile.lastVisit = now;
  const key = todayKey(now);
  profile.visitsByDay[key] = (profile.visitsByDay[key] ?? 0) + 1;
  if (!Array.isArray(profile.visitsByHour) || profile.visitsByHour.length !== 24) profile.visitsByHour = Array.from({ length: 24 }, () => 0);
  profile.visitsByHour[zonedParts(now, TZ).hour] += 1;
  // Alte Tageszähler aufräumen (nur die letzten 60 Tage behalten)
  const keys = Object.keys(profile.visitsByDay).sort();
  while (keys.length > 60) delete profile.visitsByDay[keys.shift()!];
  saveProfile();

  // Aktive Zeit zählen, solange der Tab sichtbar ist
  let unsaved = 0;
  setInterval(() => {
    if (document.hidden) return;
    profile.activeSeconds += 1;
    unsaved += 1;
    if (unsaved >= 15) {
      unsaved = 0;
      saveProfile();
      if (profile.activeSeconds >= 3600) unlock('minutes_60');
    }
  }, 1000);
  window.addEventListener('pagehide', saveProfile);

  return { previousVisit };
}

function saveProfile(): void {
  save('profile', profile);
}

function saveState(): void {
  save('game', state);
  emit('game-changed', undefined);
}

export function getProfile(): ProfileState {
  return profile;
}

export function getState(): GameState {
  return state;
}

export function getCheckins(): CheckinState {
  return checkins;
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export function isUnlocked(id: string): boolean {
  return Boolean(state.achievements[id]);
}

export function unlock(id: string): boolean {
  if (state.achievements[id]) return false;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return false;
  state.achievements[id] = realNow();
  saveState();
  emit('achievement', { id });
  emit('toast', {
    title: `Achievement: ${def.title}`,
    text: `${def.description}  ·  Respekt +${def.respect}`,
    tone: 'gold',
    icon: def.icon,
  });
  return true;
}

export function respect(): number {
  let total = checkins.days.length * 5;
  for (const id of Object.keys(state.achievements)) {
    total += ACHIEVEMENTS.find((a) => a.id === id)?.respect ?? 0;
  }
  return total;
}

/** Respekt-Level im Stil von San Andreas */
export function respectLevel(points: number): { level: number; title: string; progress: number; next: number } {
  const steps = [0, 50, 120, 220, 360, 550, 800, 1100, 1500];
  const titles = [
    'Tourist',
    'Strandläufer',
    'Neon-Fan',
    'Trailer-Analyst',
    'Leonida-Insider',
    'Vice-City-Local',
    'Countdown-Veteran',
    'Rockstar-Legende',
    'Mythos von Leonida',
  ];
  let level = 0;
  while (level < steps.length - 1 && points >= steps[level + 1]) level++;
  const next = steps[level + 1] ?? steps[level];
  const progress = level >= steps.length - 1 ? 1 : (points - steps[level]) / (next - steps[level]);
  return { level: level + 1, title: titles[level], progress, next };
}

/** Prüft zeit- und besuchsabhängige Achievements (nur mit echter Uhrzeit). */
export function evaluateAchievements(): void {
  if (clock.simulated) return;
  const now = realNow();
  const p = zonedParts(now, TZ);
  const diff = RELEASE - now;
  const today = { y: p.y, m: p.m, d: p.d };
  const cal = calendarCounts(now);

  unlock('first_contact');
  if (profile.visits >= 10) unlock('visits_10');
  if (profile.visits >= 50) unlock('visits_50');
  if (p.hour >= 0 && p.hour < 4) unlock('night_owl');
  if (p.hour >= 5 && p.hour < 7) unlock('early_bird');
  if (p.weekday === 0 || p.weekday === 6) unlock('weekend');
  if (holidayOf(today)) unlock('holiday');
  if (today.y === 2026 && today.m === 10 && today.d === 15) unlock('launch_day');
  const minute = p.hour * 60 + p.minute;
  if (cal.isSchoolDayToday && minute >= 8 * 60 && minute < 13 * 60 + 15 && now < RELEASE) unlock('under_the_desk');
  const autumnEnd = HOLIDAYS.find((h) => h.name.toLowerCase().includes('herbst'))?.end;
  if (autumnEnd && civilCompare(today, autumnEnd) > 0) unlock('back_to_school');
  if (DST_CHANGES.some((c) => c.after < c.before && now >= c.at && now - c.at < 60 * DAY_MS)) unlock('dst');
  if (diff <= 30 * DAY_MS) unlock('t30');
  if (diff <= 14 * DAY_MS) unlock('t14');
  if (diff <= 7 * DAY_MS) unlock('t7');
  if (diff <= 3 * DAY_MS) unlock('t3');
  if (diff <= DAY_MS) unlock('t1');
  if (diff <= 0 && diff > -DAY_MS) unlock('day_one');
  if (now > EXAMS_END) unlock('exam_survivor');
  if (settings().birthDate) unlock('configured');
  if (profile.activeSeconds >= 3600) unlock('minutes_60');
  if (wantedLevel() >= 5) unlock('wanted_5');
}

/* ------------------------------------------------------------------ */
/* Daily Check-in                                                      */
/* ------------------------------------------------------------------ */

export function checkedInToday(): boolean {
  return checkins.days.includes(todayKey(realNow()));
}

export function currentStreak(): number {
  const set = new Set(checkins.days);
  let day = civilFromMs(realNow(), TZ);
  if (!set.has(civilKey(day))) day = civilAddDays(day, -1);
  let streak = 0;
  while (set.has(civilKey(day))) {
    streak++;
    day = civilAddDays(day, -1);
  }
  return streak;
}

export function checkIn(): { ok: boolean; streak: number } {
  const key = todayKey(realNow());
  if (checkins.days.includes(key)) return { ok: false, streak: currentStreak() };
  checkins.days.push(key);
  checkins.days.sort();
  const streak = currentStreak();
  checkins.best = Math.max(checkins.best, streak);
  save('checkins', checkins);
  unlock('checkin_1');
  if (streak >= 3) unlock('streak_3');
  if (streak >= 7) unlock('streak_7');
  if (streak >= 14) unlock('streak_14');
  if (streak >= 30) unlock('streak_30');
  emit('checkin', { day: key, streak });
  emit('game-changed', undefined);
  return { ok: true, streak };
}

export function checkinDays(): Set<string> {
  return new Set(checkins.days);
}

export function firstVisitDay(): string {
  return todayKey(profile.firstVisit);
}

/* ------------------------------------------------------------------ */
/* Fahndungsstufe (nach Besuchen pro Tag)                              */
/* ------------------------------------------------------------------ */

export function visitsToday(): number {
  return profile.visitsByDay[todayKey(realNow())] ?? 0;
}

export function wantedLevel(): number {
  const visits = visitsToday();
  const lvl = visits >= 50 ? 5 : visits >= 35 ? 4 : visits >= 20 ? 3 : visits >= 10 ? 2 : visits >= 5 ? 1 : 0;
  return lvl;
}

export function sunClick(): number {
  state.sunClicks += 1;
  saveState();
  if (state.sunClicks >= 7) unlock('sun_clicker');
  return state.sunClicks;
}

export function markMilestoneSeen(id: string): boolean {
  if (state.milestonesSeen.includes(id)) return false;
  state.milestonesSeen.push(id);
  if (state.milestonesSeen.length > 200) state.milestonesSeen.splice(0, state.milestonesSeen.length - 200);
  saveState();
  return true;
}

export function setCelebrationSeen(): void {
  state.celebrationSeen = true;
  saveState();
}

