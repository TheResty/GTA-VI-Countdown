import { describe, expect, it } from 'vitest';
import { moonPhaseTime, moonEvents, sunTimes } from '../src/core/astro';
import { calendarCounts, dayType } from '../src/core/calendar';
import { humanDuration, splitDuration } from '../src/core/format';
import { INTERVALS, currentInterval } from '../src/core/intervals';
import { MILESTONES } from '../src/core/milestones';
import { phaseFor } from '../src/core/phases';
import { DST_CHANGES, PRELOAD, RELEASE } from '../src/core/timeline';
import { DAY_MS, HOUR_MS, civilDayLength, parseLocal, zonedParts, zonedToUtc } from '../src/core/tz';

const TZ = 'Europe/Berlin';

describe('Zeitzonen & Sommerzeit', () => {
  it('Release ist 19.11.2026 00:00 MEZ = 18.11.2026 23:00 UTC', () => {
    expect(RELEASE).toBe(Date.UTC(2026, 10, 18, 23, 0));
  });

  it('Preload ist exakt 7 Tage vor dem Release', () => {
    expect(RELEASE - PRELOAD).toBe(7 * DAY_MS);
  });

  it('Sommerzeit (MESZ) wird korrekt umgerechnet', () => {
    expect(parseLocal('2026-10-12T15:00', TZ)).toBe(Date.UTC(2026, 9, 12, 13, 0));
  });

  it('Der 25.10.2026 hat 25 Stunden, der 29.03.2026 nur 23', () => {
    expect(civilDayLength({ y: 2026, m: 10, d: 25 }, TZ)).toBe(25 * HOUR_MS);
    expect(civilDayLength({ y: 2026, m: 3, d: 29 }, TZ)).toBe(23 * HOUR_MS);
    expect(civilDayLength({ y: 2026, m: 11, d: 18 }, TZ)).toBe(24 * HOUR_MS);
  });

  it('Doppelte Uhrzeit bei der Herbst-Umstellung wählt die Sommerzeit', () => {
    expect(zonedToUtc(2026, 10, 25, 2, 30, 0, TZ)).toBe(Date.UTC(2026, 9, 25, 0, 30));
  });

  it('Zeitumstellungen werden aus den Zeitzonendaten erkannt', () => {
    const autumn = DST_CHANGES.find((c) => c.after < c.before);
    expect(autumn?.at).toBe(Date.UTC(2026, 9, 25, 1, 0));
    const spring = DST_CHANGES.find((c) => c.after > c.before);
    expect(spring?.at).toBe(Date.UTC(2026, 2, 29, 1, 0));
  });

  it('zonedParts liefert Wanduhrzeit und Wochentag', () => {
    const p = zonedParts(RELEASE, TZ);
    expect([p.y, p.m, p.d, p.hour, p.minute, p.weekday]).toEqual([2026, 11, 19, 0, 0, 4]);
  });
});

describe('Kalender', () => {
  const now = parseLocal('2026-10-12T15:00', TZ);
  const cal = calendarCounts(now);

  it('zählt die Tage bis zum letzten Wartetag inklusive heute', () => {
    expect(cal.days).toBe(38);
  });

  it('zählt Ferien-, Schul- und Wochenendtage', () => {
    expect(cal.holidayDays).toBe(14);
    expect(cal.schoolDays).toBe(18);
    expect(cal.weekendDays).toBe(10);
    expect(cal.weekends).toBe(5);
    expect(cal.fridays).toBe(5);
    expect(cal.mondays).toBe(6);
  });

  it('zählt die Nächte bis zum Release', () => {
    expect(cal.nights).toBe(37);
  });

  it('erkennt Sondertage', () => {
    expect(dayType({ y: 2026, m: 11, d: 19 })).toBe('release');
    expect(dayType({ y: 2026, m: 11, d: 12 })).toBe('preload');
    expect(dayType({ y: 2026, m: 10, d: 20 })).toBe('holiday');
    expect(dayType({ y: 2026, m: 10, d: 26 })).toBe('school');
    expect(dayType({ y: 2026, m: 10, d: 31 })).toBe('weekend');
    expect(dayType({ y: 2026, m: 11, d: 23 })).toBe('exams');
  });

  it('Schultage zählen nach Unterrichtsende nicht mehr mit', () => {
    const morning = calendarCounts(parseLocal('2026-11-18T09:00', TZ));
    const evening = calendarCounts(parseLocal('2026-11-18T18:00', TZ));
    expect(morning.schoolDaysRemaining).toBe(1);
    expect(evening.schoolDaysRemaining).toBe(0);
  });
});

describe('Astronomie', () => {
  it('Vollmond am 13.01.2025 um ca. 22:27 UTC', () => {
    const events = moonEvents(Date.UTC(2025, 0, 10), Date.UTC(2025, 0, 16));
    const full = events.find((e) => e.type === 'full');
    expect(full).toBeDefined();
    expect(Math.abs(full!.at - Date.UTC(2025, 0, 13, 22, 27))).toBeLessThan(10 * 60_000);
  });

  it('Neumond am 29.01.2025 um ca. 12:36 UTC', () => {
    const k = Math.round((2025.08 - 2000) * 12.3685);
    const candidates = [k - 1, k, k + 1].map(moonPhaseTime);
    const best = candidates.reduce((a, b) => (Math.abs(a - Date.UTC(2025, 0, 29, 12, 36)) < Math.abs(b - Date.UTC(2025, 0, 29, 12, 36)) ? a : b));
    expect(Math.abs(best - Date.UTC(2025, 0, 29, 12, 36))).toBeLessThan(10 * 60_000);
  });

  it('Sonnenaufgang in Berlin am 21.06.2025 gegen 04:43 MESZ', () => {
    const st = sunTimes({ y: 2025, m: 6, d: 21 }, 52.52, 13.405);
    expect(Math.abs(st.sunrise! - Date.UTC(2025, 5, 21, 2, 43))).toBeLessThan(4 * 60_000);
  });
});

describe('Phasen, Meilensteine, Restzeit-Texte', () => {
  it('Eskalationsphasen greifen an den Schwellen', () => {
    expect(phaseFor(31 * DAY_MS).id).toBe('cruise');
    expect(phaseFor(30 * DAY_MS).id).toBe('t30');
    expect(phaseFor(7 * DAY_MS).id).toBe('t7');
    expect(phaseFor(DAY_MS).id).toBe('t1');
    expect(phaseFor(30_000).id).toBe('lastminute');
    expect(phaseFor(-5_000).id).toBe('release');
    expect(phaseFor(-2 * DAY_MS).id).toBe('post');
  });

  it('Meilensteine sind sortiert und exakt berechnet', () => {
    for (let i = 1; i < MILESTONES.length; i++) expect(MILESTONES[i].at).toBeGreaterThanOrEqual(MILESTONES[i - 1].at);
    expect(MILESTONES.find((m) => m.id === 'd30')?.at).toBe(RELEASE - 30 * DAY_MS);
    expect(MILESTONES.find((m) => m.id === 's1000000')?.at).toBe(RELEASE - 1_000_000_000);
  });

  it('Jede Restzeit fällt in genau ein Intervall', () => {
    const samples = [800 * DAY_MS, 37.4 * DAY_MS, 29 * DAY_MS, 8 * DAY_MS, 30 * HOUR_MS, 4 * HOUR_MS, 50 * 60_000, 30_000, 5_000, -1000, -5 * HOUR_MS, -3 * DAY_MS, -30 * DAY_MS];
    for (const d of samples) {
      const matches = INTERVALS.filter((i) => d >= i.min && d < i.max);
      expect(matches.length).toBe(1);
      expect(currentInterval(d)).toBe(matches[0]);
    }
  });
});

describe('Formatierung', () => {
  it('zerlegt Dauern korrekt', () => {
    expect(splitDuration(DAY_MS + 2 * HOUR_MS + 3 * 60_000 + 4_500)).toEqual({ days: 1, hours: 2, minutes: 3, seconds: 4, ms: 500 });
  });

  it('formatiert deutsch', () => {
    expect(humanDuration(37 * DAY_MS + 9 * HOUR_MS, 2)).toBe('37 Tage, 9 Std.');
    expect(humanDuration(2 * HOUR_MS + 5 * 1000, 3)).toBe('2 Std., 5 Sek.');
  });
});
