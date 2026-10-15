export type AchievementGroup = 'Treue' | 'Tageszeit' | 'Countdown' | 'Entdecker' | 'Geheim';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  group: AchievementGroup;
  icon: string; // Name aus ui/icons
  secret?: boolean;
  respect: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_contact', title: 'Erster Kontakt', description: 'Das Command Center zum ersten Mal geöffnet.', group: 'Treue', icon: 'radar', respect: 10 },
  { id: 'checkin_1', title: 'Eingecheckt', description: 'Den ersten Daily Check-in gemacht.', group: 'Treue', icon: 'check', respect: 10 },
  { id: 'streak_3', title: 'Gewohnheitstier', description: '3 Tage Check-in-Serie.', group: 'Treue', icon: 'flame', respect: 20 },
  { id: 'streak_7', title: 'Eine Woche Wahnsinn', description: '7 Tage Check-in-Serie.', group: 'Treue', icon: 'flame', respect: 40 },
  { id: 'streak_14', title: 'Zwei-Wochen-Sicht', description: '14 Tage Check-in-Serie.', group: 'Treue', icon: 'flame', respect: 70 },
  { id: 'streak_30', title: 'Monatsabo', description: '30 Tage Check-in-Serie.', group: 'Treue', icon: 'crown', respect: 150 },
  { id: 'visits_10', title: 'Stammgast', description: '10 Besuche im Command Center.', group: 'Treue', icon: 'door', respect: 15 },
  { id: 'visits_50', title: 'Inventar', description: '50 Besuche. Du gehörst zur Einrichtung.', group: 'Treue', icon: 'door', respect: 50 },
  { id: 'minutes_60', title: 'Sitzfleisch', description: 'Insgesamt 60 Minuten auf der Seite verbracht.', group: 'Treue', icon: 'hourglass', respect: 30 },

  { id: 'night_owl', title: 'Nachteule', description: 'Besuch zwischen 00:00 und 04:00 Uhr.', group: 'Tageszeit', icon: 'moon', respect: 15 },
  { id: 'early_bird', title: 'Frühaufsteher', description: 'Besuch zwischen 05:00 und 07:00 Uhr.', group: 'Tageszeit', icon: 'sun', respect: 15 },
  { id: 'under_the_desk', title: 'Unterm Tisch', description: 'Besuch an einem Schultag während der Unterrichtszeit.', group: 'Tageszeit', icon: 'eye', respect: 15 },
  { id: 'weekend', title: 'Wochenend-Wache', description: 'Besuch an einem Samstag oder Sonntag.', group: 'Tageszeit', icon: 'palm', respect: 10 },
  { id: 'holiday', title: 'Ferien-Modus', description: 'Besuch in den Ferien.', group: 'Tageszeit', icon: 'palm', respect: 10 },
  { id: 'back_to_school', title: 'Zurück auf der Schulbank', description: 'Besuch nach dem Ende der Herbstferien.', group: 'Tageszeit', icon: 'book', respect: 15 },
  { id: 'dst', title: 'Geschenkte Stunde', description: 'Besuch nach der Zeitumstellung am 25.10.', group: 'Tageszeit', icon: 'clock', respect: 15 },

  { id: 't30', title: 'T-30', description: 'Besuch in den letzten 30 Tagen.', group: 'Countdown', icon: 'target', respect: 20 },
  { id: 't14', title: 'T-14', description: 'Besuch in den letzten 14 Tagen.', group: 'Countdown', icon: 'target', respect: 30 },
  { id: 't7', title: 'Preload-Pionier', description: 'Besuch in der letzten Woche – Preload läuft.', group: 'Countdown', icon: 'download', respect: 40 },
  { id: 't3', title: 'T-3', description: 'Besuch in den letzten 3 Tagen.', group: 'Countdown', icon: 'target', respect: 50 },
  { id: 't1', title: 'Die letzten 24 Stunden', description: 'Besuch am letzten Tag vor dem Release.', group: 'Countdown', icon: 'bolt', respect: 75 },
  { id: 'final_minute', title: 'Augenzeuge', description: 'Live dabei in der letzten Minute.', group: 'Countdown', icon: 'eye', respect: 120 },
  { id: 'day_one', title: 'Day One', description: 'Besuch am Release-Tag.', group: 'Countdown', icon: 'trophy', respect: 150 },
  { id: 'exam_survivor', title: 'Klausur-Überlebender', description: 'Besuch nach dem Ende der Klausuren.', group: 'Countdown', icon: 'book', respect: 60 },
  { id: 'milestone_live', title: 'Live-Zeuge', description: 'Einen Countdown-Meilenstein live miterlebt.', group: 'Countdown', icon: 'star', respect: 30 },

  { id: 'configured', title: 'Personalisiert', description: 'Geburtsdatum in den Einstellungen eingetragen.', group: 'Entdecker', icon: 'user', respect: 15 },
  { id: 'custom_countdown', title: 'Eigener Countdown', description: 'Einen eigenen Countdown angelegt.', group: 'Entdecker', icon: 'plus', respect: 15 },
  { id: 'time_traveler', title: 'Zeitreisender', description: 'Die Zeitmaschine benutzt.', group: 'Entdecker', icon: 'clock', respect: 15 },
  { id: 'mirror', title: 'Spiegelblick', description: 'Im Zeitspiegel ein anderes Ziel gespiegelt.', group: 'Entdecker', icon: 'mirror', respect: 10 },
  { id: 'tunnel', title: 'Tunnelblick', description: 'Im Zeittunnel bis zum Release geflogen.', group: 'Entdecker', icon: 'tunnel', respect: 15 },
  { id: 'startpoint', title: 'Eigene Zeitrechnung', description: 'Im Startpunkt-Studio einen eigenen Moment als Startpunkt gesetzt.', group: 'Entdecker', icon: 'target', respect: 15 },
  { id: 'zoom_ms', title: 'Millisekunden-Jäger', description: 'In der Zeitlupe bis auf einzelne Millisekunden hineingezoomt.', group: 'Entdecker', icon: 'eye', respect: 25 },
  { id: 'zoom_flight', title: 'Sturzflug', description: 'Den Auto-Zoom von der ganzen Wartezeit bis ins Jetzt erlebt.', group: 'Entdecker', icon: 'rocket', respect: 15 },
  { id: 'launch_day', title: 'Launch-Trailer-Tag', description: 'Am Tag des Launch-Trailers im Command Center gewesen.', group: 'Countdown', icon: 'play', respect: 20 },
  { id: 'intel_reporter', title: 'Reporter', description: 'Eine eigene Meldung in der Intel-Zentrale erfasst.', group: 'Entdecker', icon: 'radar', respect: 15 },
  { id: 'explorer', title: 'Komplett-Scroller', description: 'Bis ganz nach unten gescrollt.', group: 'Entdecker', icon: 'map', respect: 10 },

  { id: 'konami', title: '↑↑↓↓←→←→BA', description: 'Den Konami-Code eingegeben.', group: 'Geheim', icon: 'gamepad', respect: 30, secret: true },
  { id: 'sun_clicker', title: 'Sonnenanbeter', description: '7× auf die Sonne über Vice City geklickt.', group: 'Geheim', icon: 'sun', respect: 20, secret: true },
  { id: 'spoiler_peek', title: 'Neugier siegt', description: 'Einen Leak hinter dem Spoiler-Schutz aufgedeckt.', group: 'Geheim', icon: 'eye', respect: 10, secret: true },
  { id: 'wanted_5', title: 'Meistgesucht', description: 'Fahndungsstufe 5 erreicht.', group: 'Geheim', icon: 'star', respect: 25, secret: true },
];
