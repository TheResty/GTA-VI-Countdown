import { describe, expect, it } from 'vitest';
import { sunTimes } from '../src/core/astro';
import { calendarCounts, dayType } from '../src/core/calendar';
import { humanDuration, splitDuration } from '../src/core/format';
import { FINE_INTERVALS, briefingAt, nextBriefingAt } from '../src/core/intervals';
import { DAILY } from '../src/data/briefings';
import { progressFrom } from '../src/core/startpoint';
import { milestones } from '../src/core/milestones';
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

describe('Sonnenstand', () => {
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
    for (let i = 1; i < milestones().length; i++) expect(milestones()[i].at).toBeGreaterThanOrEqual(milestones()[i - 1].at);
    expect(milestones().find((m) => m.id === 'd30')?.at).toBe(RELEASE - 30 * DAY_MS);
    expect(milestones().find((m) => m.id === 's1000000')?.at).toBe(RELEASE - 1_000_000_000);
  });

  it('Die letzten Minuten und die Zeit danach sind lückenlos abgedeckt', () => {
    const samples = [44 * 60_000, 30 * 60_000, 10 * 60_000, 3 * 60_000, 30_000, 5_000, -1000, -5 * HOUR_MS, -3 * DAY_MS, -30 * DAY_MS];
    for (const d of samples) expect(FINE_INTERVALS.filter((i) => d >= i.min && d < i.max).length).toBe(1);
  });
});

describe('Tagesbriefings', () => {
  it('gibt es für jeden der Tage 36 bis 2', () => {
    for (let d = 2; d <= 36; d++) expect(DAILY[d]).toBeDefined();
  });

  it('zeigt am 14.10. das erste Briefing', () => {
    const b = briefingAt(parseLocal('2026-10-14T15:00', TZ));
    expect(b.key).toBe('day-36');
    expect(b.tag).toContain('Briefing 1 von 36');
  });

  it('wechselt am letzten Tag nach Tageszeit', () => {
    expect(briefingAt(parseLocal('2026-11-18T09:00', TZ)).title).toBe('Der letzte Schultag');
    expect(briefingAt(parseLocal('2026-11-18T19:30', TZ)).title).toBe('Das letzte Abendessen');
  });

  it('nutzt in der letzten Dreiviertelstunde Minutentexte', () => {
    expect(briefingAt(RELEASE - 30 * 60_000).title).toBe('Weniger als eine Schulstunde');
    expect(briefingAt(RELEASE + 10_000).title).toBe('Es ist da.');
  });

  it('kündigt das nächste Briefing für Mitternacht an', () => {
    expect(nextBriefingAt(parseLocal('2026-10-14T15:00', TZ))).toBe(parseLocal('2026-10-15T00:00', TZ));
  });
});

describe('Startpunkt', () => {
  it('berechnet den Fortschritt zwischen Start und Release', () => {
    const start = RELEASE - 100 * DAY_MS;
    expect(progressFrom(start, RELEASE - 25 * DAY_MS)).toBeCloseTo(0.75, 10);
    expect(progressFrom(start, start - 1)).toBe(0);
    expect(progressFrom(start, RELEASE + 1)).toBe(1);
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
