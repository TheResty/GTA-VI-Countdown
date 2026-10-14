/**
 * Countdown-Meilensteine: Tages-, Stunden-, Sekunden- und Prozentmarken
 * sowie Kalender-Ereignisse. Jeder Meilenstein hat einen exakten Zeitpunkt.
 */
import { CONFIG } from '../config';
import { fmtDstChange, num } from './format';
import { on } from './bus';
import { getStart } from './startpoint';
import { DST_CHANGES, RELEASE, TZ } from './timeline';
import { DAY_MS, HOUR_MS, MINUTE_MS, parseLocal } from './tz';

export type MilestoneKind = 'days' | 'hours' | 'minutes' | 'seconds' | 'percent' | 'event';

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  at: number;
  label: string;
  detail: string;
  /** besonders hervorgehobene Meilensteine (30/14/7/3/1 Tage …) */
  major?: boolean;
  /** abweichende Zeitangabe für die Anzeige (z. B. Zeitumstellung) */
  timeText?: string;
}

const MAJOR_DAYS = new Set([30, 14, 7, 3, 1]);

function build(): Milestone[] {
  const list: Milestone[] = [];

  for (const d of [100, 60, 50, 42, 40, 30, 25, 21, 14, 10, 7, 5, 3, 2, 1]) {
    list.push({
      id: `d${d}`,
      kind: 'days',
      at: RELEASE - d * DAY_MS,
      label: d === 1 ? 'Noch 1 Tag' : `Noch ${d} Tage`,
      detail:
        d === 42
          ? 'Die Antwort auf alles: 42 Tage.'
          : d === 7
            ? 'Eine Woche – zeitgleich mit dem Preload-Start.'
            : d === 1
              ? 'Die finalen 24 Stunden beginnen.'
              : `${num(d * 24)} Stunden bis Leonida.`,
      major: MAJOR_DAYS.has(d),
    });
  }

  const hourMarks: [number, string][] = [
    [1000, 'Vierstellig war gestern.'],
    [900, 'Unter 900 Stunden.'],
    [888, 'Schnapszahl-Stunden.'],
    [777, 'Jackpot-Stunden.'],
    [666, 'Teuflisch lange noch.'],
    [500, 'Halbe Tausend.'],
    [333, 'Dreimal die Drei.'],
    [250, 'Ein Viertel von tausend Stunden.'],
    [168, 'Exakt eine Woche in Stunden.'],
    [111, 'Dreistellig mit Stil.'],
    [100, 'Zweistellig ist in Sicht.'],
    [72, 'Drei Tage in Stunden.'],
    [48, 'Zwei Tage.'],
    [12, 'Ein halber Tag.'],
    [6, 'Sechs Stunden.'],
    [3, 'Drei Stunden.'],
    [1, 'Die letzte Stunde.'],
  ];
  for (const [h, detail] of hourMarks) {
    list.push({ id: `h${h}`, kind: 'hours', at: RELEASE - h * HOUR_MS, label: `${num(h)} Stunden`, detail });
  }

  const minuteMarks: [number, string][] = [
    [50_000, 'Fünfstellige Minuten.'],
    [10_000, 'Zehntausend Minuten.'],
    [1_000, 'Tausend Minuten.'],
    [100, 'Hundert Minuten.'],
    [10, 'Zehn Minuten.'],
  ];
  for (const [m, detail] of minuteMarks) {
    list.push({ id: `m${m}`, kind: 'minutes', at: RELEASE - m * MINUTE_MS, label: `${num(m)} Minuten`, detail });
  }

  const secondMarks: [number, string][] = [
    [5_000_000, 'Fünf Millionen Sekunden.'],
    [4_444_444, 'Vierer-Schnapszahl.'],
    [3_333_333, 'Dreier-Schnapszahl.'],
    [3_000_000, 'Drei Millionen Sekunden.'],
    [2_500_000, 'Zweieinhalb Millionen.'],
    [2_222_222, 'Zweier-Schnapszahl.'],
    [2_000_000, 'Zwei Millionen Sekunden.'],
    [1_234_567, 'Aufsteigend: 1-2-3-4-5-6-7.'],
    [1_111_111, 'Einser-Schnapszahl.'],
    [1_000_000, 'Eine Million Sekunden – rund 11,6 Tage.'],
    [777_777, 'Siebener-Jackpot.'],
    [500_000, 'Eine halbe Million.'],
    [314_159, 'π × 100 000 Sekunden.'],
    [271_828, 'Eulersche Zahl × 100 000 Sekunden.'],
    [100_000, 'Sechsstellig war gestern.'],
    [86_400, 'Ein Tag in Sekunden.'],
    [10_000, 'Fünfstellig – ca. 2 Std. 47 Min.'],
    [3_600, 'Eine Stunde in Sekunden.'],
    [1_337, 'Leet.'],
    [1_000, 'Tausend Sekunden.'],
    [100, 'Hundert Sekunden.'],
    [10, 'Zehn.'],
  ];
  for (const [s, detail] of secondMarks) {
    list.push({ id: `s${s}`, kind: 'seconds', at: RELEASE - s * 1000, label: `${num(s)} Sekunden`, detail });
  }

  // Prozentmarken relativ zum gewählten Startpunkt (siehe Startpunkt-Studio)
  const start = getStart();
  for (const p of [90, 95, 97, 98, 99, 99.5, 99.9, 99.99, 99.999]) {
    const at = start.at + (RELEASE - start.at) * (p / 100);
    list.push({
      id: `p-${start.id}-${p}`,
      kind: 'percent',
      at,
      label: `${num(p, 3)} % seit ${start.short}`,
      detail: `${num(p, 3)} % der Wartezeit seit ${start.label} sind geschafft.`,
    });
  }

  for (const e of CONFIG.events) {
    if (e.id === 'release') continue;
    list.push({ id: `e-${e.id}`, kind: 'event', at: parseLocal(e.date, TZ), label: e.title, detail: e.description });
  }

  for (const c of DST_CHANGES) {
    const back = c.after < c.before;
    list.push({
      id: `dst-${c.at}`,
      kind: 'event',
      at: c.at,
      label: back ? 'Zeitumstellung auf Winterzeit' : 'Zeitumstellung auf Sommerzeit',
      timeText: fmtDstChange(c.at, c.before, c.after),
      detail: back
        ? 'Die Uhr springt von 03:00 auf 02:00 Uhr zurück – die Wartezeit wird real eine Stunde länger als der Kalender behauptet.'
        : 'Die Uhr springt von 02:00 auf 03:00 Uhr vor.',
    });
  }

  list.push({ id: 'release', kind: 'event', at: RELEASE, label: 'GTA VI Release', detail: 'Mission erfüllt.', major: true });

  return list.sort((a, b) => a.at - b.at);
}

let cache: Milestone[] | null = null;
on('startpoint', () => (cache = null));

/** Alle Meilensteine (Prozentmarken folgen dem gewählten Startpunkt). */
export function milestones(): Milestone[] {
  if (!cache) cache = build();
  return cache;
}

export function nextMilestones(now: number, count = 5): Milestone[] {
  return milestones().filter((m) => m.at > now).slice(0, count);
}

export function passedBetween(from: number, to: number): Milestone[] {
  return milestones().filter((m) => m.at > from && m.at <= to);
}

export const MILESTONE_KIND_LABEL: Record<MilestoneKind, string> = {
  days: 'Tage',
  hours: 'Stunden',
  minutes: 'Minuten',
  seconds: 'Sekunden',
  percent: 'Prozent',
  event: 'Termine',
};
