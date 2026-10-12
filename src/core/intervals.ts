/**
 * Restzeit-Atlas: Für jedes Restzeit-Intervall ein eigener, persönlicher Text,
 * der beschreibt, wie lange es noch hin ist. Die Texte greifen auf den
 * persönlichen Kalender zu (Ferien, Schultage, Preload, Klausuren).
 */
import { calendarCounts, CalendarCounts } from './calendar';
import { num, plural, humanDuration } from './format';
import { DAY_MS, HOUR_MS, MINUTE_MS } from './tz';
import { ANCHORS, EXAMS_END, PRELOAD, RELEASE } from './timeline';
import { settings } from './settings';

export interface IntervalContext {
  now: number;
  diff: number;
  cal: CalendarCounts;
  name: string;
  preloadIn: number;
  examsIn: number;
  bpm: number;
}

export interface Interval {
  id: string;
  /** Restzeit-Bereich [min, max) in ms; bei negativen Werten = nach Release */
  min: number;
  max: number;
  range: string;
  title: string;
  text: (c: IntervalContext) => string;
}

const D = DAY_MS;
const H = HOUR_MS;
const M = MINUTE_MS;

function lifeMix(c: IntervalContext): string {
  const parts: string[] = [];
  if (c.cal.holidayDays) parts.push(plural(c.cal.holidayDays, 'Ferientag', 'Ferientage'));
  if (c.cal.schoolDays) parts.push(plural(c.cal.schoolDays, 'Schultag', 'Schultage'));
  if (c.cal.weekendDays) parts.push(plural(c.cal.weekendDays, 'Wochenendtag', 'Wochenendtage'));
  if (!parts.length) return 'nur noch ein paar Stunden';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`;
}

function preloadPhrase(c: IntervalContext): string {
  if (c.preloadIn > 0) return `Der Preload startet in ${humanDuration(c.preloadIn, 2)}.`;
  return 'Der Preload läuft bereits – GTA VI liegt schon auf deiner Festplatte und wartet genauso wie du.';
}

export const INTERVALS: Interval[] = [
  {
    id: 'years',
    min: 365 * D,
    max: Infinity,
    range: 'über 1 Jahr',
    title: 'Noch über ein Jahr',
    text: (c) =>
      `Das ist mehr als ein komplettes Schuljahr, ${c.name}. Rockstar hat offensichtlich wieder Zeit – du leider auch.`,
  },
  {
    id: 'half-year',
    min: 180 * D,
    max: 365 * D,
    range: '6–12 Monate',
    title: 'Noch ein halbes Jahr plus',
    text: () => 'Genug Zeit für zwei Zeugnisse, drei Trailer-Analysen pro Tag und mindestens eine Verschiebungs-Panik.',
  },
  {
    id: 'quarter',
    min: 90 * D,
    max: 180 * D,
    range: '3–6 Monate',
    title: 'Noch ein paar Monate',
    text: (c) =>
      `Ein Geschäftsquartal, sagt Take-Two. Eine Ewigkeit, sagst du. Noch ${plural(c.cal.schoolDays, 'Schultag', 'Schultage')} bis dahin.`,
  },
  {
    id: 'two-months',
    min: 60 * D,
    max: 90 * D,
    range: '2–3 Monate',
    title: 'Noch zwei bis drei Monate',
    text: (c) => `Ungefähr ein Halbjahr Mathe – zumindest gefühlt. Konkret: ${lifeMix(c)}.`,
  },
  {
    id: 'seven-weeks',
    min: 45 * D,
    max: 60 * D,
    range: '45–60 Tage',
    title: 'Noch knapp zwei Monate',
    text: (c) => `Zwei Monate sind schnell vorbei, sagen Erwachsene. Du hast nachgerechnet: ${lifeMix(c)}.`,
  },
  {
    id: 'six-weeks',
    min: 38 * D,
    max: 45 * D,
    range: '38–45 Tage',
    title: 'Noch etwa sechs Wochen',
    text: (c) =>
      `So lang wie die Sommerferien – nur ohne Sommer und ohne Ferien. Vor dir liegen ${lifeMix(c)}.`,
  },
  {
    id: 'month-plus',
    min: 30 * D,
    max: 38 * D,
    range: '30–38 Tage',
    title: 'Noch gut ein Monat',
    text: (c) =>
      c.cal.holidayDays > 0
        ? `Einmal die restlichen ${plural(c.cal.holidayDays, 'Ferientag', 'Ferientage')} genießen, dann ${num(c.cal.schoolDays)} Schultage, ${num(c.cal.weekends)} Wochenenden und ein Preload. Klingt machbar. Ist es auch – irgendwie.`
        : `Etwas mehr als ein Monat: ${lifeMix(c)}. Die Herbstferien sind Geschichte, GTA VI noch nicht Gegenwart.`,
  },
  {
    id: 'february',
    min: 28 * D,
    max: 30 * D,
    range: '28–30 Tage',
    title: 'Unter 30 Tagen',
    text: (c) =>
      `Die Wartezeit passt jetzt in einen einzigen Monat. Noch ${c.cal.nights}-mal schlafen, ${c.name}. Die Tageszahl beginnt ab jetzt mit einer 2 – und bald mit einer 1.`,
  },
  {
    id: 'four-weeks',
    min: 21 * D,
    max: 28 * D,
    range: '3–4 Wochen',
    title: 'Passt in einen Februar',
    text: (c) =>
      `Weniger als ein Februar. ${plural(c.cal.schoolDaysRemaining, 'Schultag', 'Schultage')}, ${plural(c.cal.weekends, 'Wochenende', 'Wochenenden')}. Das schaffst du mit links – rechts hältst du schon mal den Controller warm.`,
  },
  {
    id: 'three-weeks',
    min: 14 * D,
    max: 21 * D,
    range: '2–3 Wochen',
    title: 'Noch zwei bis drei Wochen',
    text: (c) =>
      `So lang wie zwei Wochen Herbstferien – nur leider mit ${plural(c.cal.schoolDaysRemaining, 'Schultag', 'Schultagen')} dazwischen. ${preloadPhrase(c)}`,
  },
  {
    id: 'two-weeks',
    min: 10 * D,
    max: 14 * D,
    range: '10–14 Tage',
    title: 'Unter zwei Wochen',
    text: (c) =>
      `Die Wochenenden bis GTA VI kannst du jetzt an einer Hand abzählen – es sind nur noch ${num(c.cal.weekends)}. ${preloadPhrase(c)}`,
  },
  {
    id: 'preload-near',
    min: 7 * D,
    max: 10 * D,
    range: '7–10 Tage',
    title: 'Preload in Sichtweite',
    text: (c) =>
      `${preloadPhrase(c)} Räum schon mal die Festplatte auf. Die alten Savegames verstehen das.`,
  },
  {
    id: 'preload-week',
    min: 5 * D,
    max: 7 * D,
    range: '5–7 Tage',
    title: 'Preload-Woche',
    text: (c) =>
      `GTA VI ist physisch näher als je zuvor – es liegt (hoffentlich) schon auf deiner Konsole. Zeitlich trennen dich noch ${plural(c.cal.schoolDaysRemaining, 'Schultag', 'Schultage')} und ${c.cal.nights} Nächte.`,
  },
  {
    id: 'one-hand',
    min: 3 * D,
    max: 5 * D,
    range: '3–5 Tage',
    title: 'Weniger Tage als Finger an einer Hand',
    text: (c) =>
      `Noch ${c.cal.nights}-mal schlafen. Mehr Schultage als dir lieb ist: ${num(c.cal.schoolDaysRemaining)}. Konzentration im Unterricht: theoretisch möglich.`,
  },
  {
    id: 'two-days',
    min: 2 * D,
    max: 3 * D,
    range: '48–72 Std.',
    title: 'Noch zwei, drei Tage',
    text: (c) => `Noch ${c.cal.nights}-mal schlafen – falls du schlafen kannst. Die Release-Nacht zählt nicht, da schläft sowieso niemand.`,
  },
  {
    id: 'tomorrow',
    min: D,
    max: 2 * D,
    range: '24–48 Std.',
    title: 'Übermorgen ist fast morgen',
    text: (c) =>
      `Morgen ist der letzte volle Tag ohne GTA VI. ${c.cal.schoolDaysRemaining > 0 ? `Noch ${plural(c.cal.schoolDaysRemaining, 'Schultag', 'Schultage')} – der Stundenplan hat Rockstar nicht gefragt.` : 'Kein Schultag mehr dazwischen.'}`,
  },
  {
    id: 'last-day',
    min: 12 * H,
    max: D,
    range: '12–24 Std.',
    title: 'Die letzten 24 Stunden',
    text: (c) =>
      c.cal.isSchoolDayToday
        ? `Ein letzter Schultag. Der längste deines Lebens. Heute Nacht um 00:00 Uhr öffnet Leonida.`
        : `Ein letzter Tag. Heute Nacht um 00:00 Uhr öffnet Leonida. Bis dahin: essen, trinken, Controller laden.`,
  },
  {
    id: 'half-day',
    min: 6 * H,
    max: 12 * H,
    range: '6–12 Std.',
    title: 'Weniger als ein halber Tag',
    text: () => 'So lang wie ein Schultag mit Nachmittagsunterricht und verspätetem Bus. Danach: Vice City.',
  },
  {
    id: 'movie-night',
    min: 3 * H,
    max: 6 * H,
    range: '3–6 Std.',
    title: 'Ein Herr-der-Ringe-Abend',
    text: () => 'Etwa ein Herr-der-Ringe-Film in der Extended Edition. Oder ein sehr langer Mathe-Nachmittag. Du entscheidest, was schneller vergeht.',
  },
  {
    id: 'two-movies',
    min: 90 * M,
    max: 3 * H,
    range: '90 Min.–3 Std.',
    title: 'Ein, zwei Filme lang',
    text: () => 'Ein Film. Vielleicht zwei. Popcorn wäre Verschwendung – du schaust eh nur auf diese Uhr.',
  },
  {
    id: 'double-lesson',
    min: 45 * M,
    max: 90 * M,
    range: '45–90 Min.',
    title: 'Eine Doppelstunde',
    text: () => 'Eine Doppelstunde trennt dich von Vice City. Die längsten 90 Minuten seit deiner letzten Mathe-Klausur.',
  },
  {
    id: 'one-lesson',
    min: 20 * M,
    max: 45 * M,
    range: '20–45 Min.',
    title: 'Weniger als eine Schulstunde',
    text: () => 'Eine Schulstunde. Ohne Lehrkraft, ohne Pause, ohne Gnade. Getränk bereit? Snacks bereit? Gut.',
  },
  {
    id: 'pizza',
    min: 5 * M,
    max: 20 * M,
    range: '5–20 Min.',
    title: 'Eine Pizza-Lieferung',
    text: () => 'So lange braucht eine Pizza, wenn der Lieferdienst gut drauf ist. Bestell lieber nicht mehr – du würdest die Tür nicht hören.',
  },
  {
    id: 'one-song',
    min: M,
    max: 5 * M,
    range: '1–5 Min.',
    title: 'Ein Song lang',
    text: () => 'Ein Song. Ungefähr einmal „Africa“ von Toto. Geh jetzt nicht mehr weg.',
  },
  {
    id: 'seconds',
    min: 10_000,
    max: M,
    range: '10–60 Sek.',
    title: 'Unter einer Minute',
    text: (c) => `Dein Puls liegt vermutlich nicht mehr bei ${c.bpm}. Völlig normal.`,
  },
  {
    id: 'ten',
    min: 0,
    max: 10_000,
    range: '0–10 Sek.',
    title: 'JETZT GLEICH',
    text: () => 'Zehn. Neun. Du weißt, wie das geht.',
  },
  {
    id: 'released',
    min: -H,
    max: 0,
    range: 'Release + 1 Std.',
    title: 'Es ist da.',
    text: () => 'GTA VI ist erschienen. Warum liest du noch diesen Text?',
  },
  {
    id: 'day-one',
    min: -D,
    max: -H,
    range: 'Release-Tag',
    title: 'Day One',
    text: (c) =>
      `Release-Tag. Schlaf ist optional, Klausuren leider nicht – die letzte ist in ${humanDuration(Math.max(0, c.examsIn), 2)} geschrieben.`,
  },
  {
    id: 'exam-split',
    min: -(EXAMS_END - RELEASE),
    max: -D,
    range: 'bis Klausurende',
    title: 'Der Klausur-Spagat',
    text: (c) =>
      `GTA VI läuft. Die Klausuren auch – noch ${humanDuration(Math.max(0, c.examsIn), 2)}. Rockstar hat deinen Stundenplan offensichtlich nicht gelesen.`,
  },
  {
    id: 'free-roam',
    min: -Infinity,
    max: -(EXAMS_END - RELEASE),
    range: 'danach',
    title: 'Free Roam',
    text: () =>
      `Klausuren vorbei, GTA VI installiert. Du hast seit Trailer 1 ganze ${num(Math.floor((RELEASE - ANCHORS.trailer1) / DAY_MS))} Tage gewartet. Es hat sich gelohnt. Hoffentlich.`,
  },
];

export function intervalContext(now: number): IntervalContext {
  const s = settings();
  return {
    now,
    diff: RELEASE - now,
    cal: calendarCounts(now),
    name: s.callsign || 'Spieler',
    preloadIn: PRELOAD - now,
    examsIn: EXAMS_END - now,
    bpm: s.restingHeartRate,
  };
}

export function currentInterval(diff: number): Interval {
  return INTERVALS.find((i) => diff >= i.min && diff < i.max) ?? INTERVALS[INTERVALS.length - 1];
}
