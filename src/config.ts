/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ZENTRALE KONFIGURATION – GTA VI COUNTDOWN COMMAND CENTER           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Alle Zeitpunkte werden als lokale Wanduhrzeit in `timezone` angegeben
 * (Format `YYYY-MM-DD` oder `YYYY-MM-DDTHH:mm`). Die Umrechnung in echte
 * Zeitpunkte – inklusive Sommer-/Winterzeit – übernimmt `src/core/tz.ts`.
 *
 * Persönliche Werte (Rufname, Geburtsdatum, Einschulung, Standort, Annahmen)
 * lassen sich zusätzlich direkt auf der Seite unter „Einstellungen“ ändern.
 * Diese Werte hier sind die Standardwerte, die im Browser überschrieben werden.
 */

export type EventKind = 'gta' | 'school' | 'personal' | 'system' | 'holiday';

export interface ConfigEvent {
  id: string;
  title: string;
  /** Lokale Zeit in `timezone`, z. B. `2026-11-24` oder `2026-11-12T00:00` */
  date: string;
  kind: EventKind;
  description: string;
  /** Wird als eigener Countdown in der Countdown-Wand angezeigt */
  countdown?: boolean;
}

export interface HolidayRange {
  name: string;
  /** erster freier Tag (inklusive) */
  start: string;
  /** letzter freier Tag (inklusive) */
  end: string;
}

export const CONFIG = {
  timezone: 'Europe/Berlin',

  release: {
    /** GTA VI Release: 19. November 2026, 00:00 Uhr MEZ */
    date: '2026-11-19T00:00',
    title: 'Grand Theft Auto VI',
    platforms: 'PlayStation 5 · Xbox Series X|S',
  },

  /** Preload-Start (laut Rockstar ab 12.11.2026) – Uhrzeit 00:00 ist eine Annahme */
  preload: '2026-11-12T00:00',

  user: {
    /** Wie dich das Command Center anspricht */
    callsign: 'Spieler',
    /** Geburtsdatum `YYYY-MM-DD` – `null` = noch nicht eingetragen (auf der Seite einstellbar) */
    birthDate: null as string | null,
    /** Einschulung / erster Schultag `YYYY-MM-DD` – `null` = noch nicht eingetragen */
    schoolStartDate: null as string | null,
    /** Standort für Sonnenaufgänge & Tageslicht */
    location: { name: 'Berlin', lat: 52.52, lon: 13.405 },
  },

  school: {
    /** Schultage: 1 = Montag … 5 = Freitag */
    weekdays: [1, 2, 3, 4, 5],
    /** Annahme: Unterrichtsstunden pro Schultag */
    lessonsPerDay: 6,
    /** Unterrichtsbeginn / -ende (für Stundenbudget & Kommentare) */
    dayStart: '08:00',
    dayEnd: '13:15',
    holidays: [
      // Ende laut Vorgabe: Ferien bis 25.10., ab 26.10. wieder Schule.
      // Der Ferienbeginn ist eine Annahme und kann hier angepasst werden.
      { name: 'Herbstferien', start: '2026-10-12', end: '2026-10-25' },
      // Weitere Ferien einfach ergänzen, z. B.:
      // { name: 'Weihnachtsferien', start: '2026-12-23', end: '2027-01-06' },
    ] as HolidayRange[],
    /** Einzelne schulfreie Tage (z. B. Feiertage, Brückentage) */
    freeDays: [] as string[],
  },

  /** Ende der Klausurphase */
  examsEnd: '2026-11-24T23:59',

  /** Klar gekennzeichnete Annahmen für alle Schätzungen */
  assumptions: {
    sleepHours: 8,
    mealsPerDay: 3,
    trainingsPerWeek: 3,
    restingHeartRate: 70,
    breathsPerMinute: 15,
    stepsPerDay: 8000,
    waterLitersPerDay: 2,
    phoneUnlocksPerDay: 80,
    /** Schlafzyklus in Minuten (Schlafforschung: ca. 90 Minuten) */
    sleepCycleMinutes: 90,
    /** Uhrzeit, zu der du typischerweise schlafen gehst */
    bedtime: '23:00',
  },

  /** Persönliche & besondere Termine (Timeline + Countdown-Wand) */
  events: [
    {
      id: 'ferien-ende',
      title: 'Ende der Herbstferien',
      date: '2026-10-25T23:59',
      kind: 'holiday',
      description: 'Letzter Ferientag. Danach ist wieder Schule angesagt.',
      countdown: true,
    },
    {
      id: 'schulstart',
      title: 'Erster Schultag nach den Ferien',
      date: '2026-10-26T08:00',
      kind: 'school',
      description: 'Wecker stellen. Leider kein Cheat dagegen.',
    },
    {
      id: 'preload',
      title: 'Preload-Start',
      date: '2026-11-12T00:00',
      kind: 'gta',
      description: 'GTA VI kann vorab auf die Konsole geladen werden. Spielen kannst du es noch nicht.',
      countdown: true,
    },
    {
      id: 'release',
      title: 'GTA VI Release',
      date: '2026-11-19T00:00',
      kind: 'gta',
      description: 'Willkommen in Leonida.',
      countdown: true,
    },
    {
      id: 'klausuren-ende',
      title: 'Ende der Klausuren',
      date: '2026-11-24T23:59',
      kind: 'school',
      description: 'Die letzte Klausur ist geschrieben. Ab jetzt ist GTA VI offiziell Freizeitbeschäftigung.',
      countdown: true,
    },
    {
      id: 'weihnachten',
      title: 'Heiligabend',
      date: '2026-12-24T18:00',
      kind: 'personal',
      description: 'Erstes Weihnachten mit GTA VI.',
      countdown: true,
    },
    {
      id: 'silvester',
      title: 'Silvester',
      date: '2027-01-01T00:00',
      kind: 'personal',
      description: 'Feuerwerk über Vice City und über dir.',
      countdown: true,
    },
  ] as ConfigEvent[],
};

export type AppConfig = typeof CONFIG;
