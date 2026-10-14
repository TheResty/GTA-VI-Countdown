/**
 * Rockstar- & GTA-Historie.
 * Daten: Erstveröffentlichung (Region/Plattform angegeben). Wo der genaue Tag
 * je nach Quelle/Region schwankt, ist `approx: true` gesetzt und die UI zeigt „≈“.
 */

export type HistoryKind = 'release' | 'announce' | 'trailer' | 'delay' | 'leak' | 'milestone' | 'port';

export interface HistoryEvent {
  id: string;
  date: string; // YYYY-MM-DD
  approx?: boolean;
  title: string;
  detail: string;
  kind: HistoryKind;
  game?: string;
}

export interface MainGame {
  id: string;
  title: string;
  short: string;
  release: string;
  approx?: boolean;
  setting: string;
  platform: string;
  planned?: boolean;
}

export const MAIN_GAMES: MainGame[] = [
  { id: 'gta1', title: 'Grand Theft Auto', short: 'GTA', release: '1997-10-21', approx: true, setting: 'Liberty City, Vice City, San Andreas', platform: 'MS-DOS / Windows (Okt./Nov. 1997 je nach Region)' },
  { id: 'gta2', title: 'Grand Theft Auto 2', short: 'GTA 2', release: '1999-10-22', approx: true, setting: 'Anywhere City', platform: 'Windows / PlayStation (Sept./Okt. 1999 je nach Region)' },
  { id: 'gta3', title: 'Grand Theft Auto III', short: 'GTA III', release: '2001-10-22', setting: 'Liberty City', platform: 'PlayStation 2 (Nordamerika)' },
  { id: 'gtavc', title: 'Grand Theft Auto: Vice City', short: 'Vice City', release: '2002-10-29', setting: 'Vice City (1986)', platform: 'PlayStation 2 (Nordamerika)' },
  { id: 'gtasa', title: 'Grand Theft Auto: San Andreas', short: 'San Andreas', release: '2004-10-26', setting: 'San Andreas (1992)', platform: 'PlayStation 2 (Nordamerika)' },
  { id: 'gta4', title: 'Grand Theft Auto IV', short: 'GTA IV', release: '2008-04-29', setting: 'Liberty City', platform: 'PS3 / Xbox 360 (weltweit)' },
  { id: 'gta5', title: 'Grand Theft Auto V', short: 'GTA V', release: '2013-09-17', setting: 'Los Santos & Blaine County', platform: 'PS3 / Xbox 360 (weltweit)' },
  { id: 'gta6', title: 'Grand Theft Auto VI', short: 'GTA VI', release: '2026-11-19', setting: 'Leonida & Vice City', platform: 'PS5 / Xbox Series X|S', planned: true },
];

export const HISTORY: HistoryEvent[] = [
  { id: 'gta1', date: '1997-10-21', approx: true, kind: 'release', game: 'GTA', title: 'Grand Theft Auto erscheint', detail: 'Top-down-Chaos von DMA Design aus Schottland. Arbeitstitel: „Race’n’Chase“.' },
  { id: 'gta2', date: '1999-10-22', approx: true, kind: 'release', game: 'GTA 2', title: 'GTA 2 erscheint', detail: 'Retro-Futurismus in „Anywhere City“, mit Gang-Respekt-System.' },
  { id: 'gta3', date: '2001-10-22', kind: 'release', game: 'GTA III', title: 'GTA III erscheint', detail: 'Der Sprung in die dritte Dimension – Liberty City, PS2.' },
  { id: 'gtavc', date: '2002-10-29', kind: 'release', game: 'Vice City', title: 'GTA: Vice City erscheint', detail: 'Neon, Hawaiihemden, 1986. Die Stadt, in die GTA VI zurückkehrt.' },
  { id: 'gtasa', date: '2004-10-26', kind: 'release', game: 'San Andreas', title: 'GTA: San Andreas erscheint', detail: 'Ein ganzer Bundesstaat: Los Santos, San Fierro, Las Venturas.' },
  { id: 'gta4-announce', date: '2006-05-09', kind: 'announce', game: 'GTA IV', title: 'GTA IV angekündigt', detail: 'Enthüllung auf der E3 2006.' },
  { id: 'gta4-trailer', date: '2007-03-29', kind: 'trailer', game: 'GTA IV', title: 'GTA IV Trailer 1', detail: '„Think it’s gonna be different this time?“' },
  { id: 'gta4-delay', date: '2007-08-02', kind: 'delay', game: 'GTA IV', title: 'GTA IV verschoben', detail: 'Vom 16.10.2007 ins Jahr 2008.' },
  { id: 'gta4', date: '2008-04-29', kind: 'release', game: 'GTA IV', title: 'GTA IV erscheint', detail: 'Niko Bellic, Liberty City, Physik-Engine Euphoria.' },
  { id: 'gta5-announce', date: '2011-10-25', kind: 'announce', game: 'GTA V', title: 'GTA V angekündigt', detail: 'Ein einziges Logo-Bild auf dem Rockstar Newswire.' },
  { id: 'gta5-trailer', date: '2011-11-02', kind: 'trailer', game: 'GTA V', title: 'GTA V Trailer 1', detail: 'Los Santos ist zurück.' },
  { id: 'gta5-delay', date: '2013-01-31', kind: 'delay', game: 'GTA V', title: 'GTA V verschoben', detail: 'Von Frühjahr 2013 auf den 17. September 2013.' },
  { id: 'gta5', date: '2013-09-17', kind: 'release', game: 'GTA V', title: 'GTA V erscheint', detail: '800 Mio. US-$ Umsatz am ersten Tag, 1 Mrd. nach drei Tagen.' },
  { id: 'gtao', date: '2013-10-01', kind: 'milestone', game: 'GTA Online', title: 'GTA Online startet', detail: 'Der Grund, warum GTA V nie aufgehört hat.' },
  { id: 'gta5-ng', date: '2014-11-18', kind: 'port', game: 'GTA V', title: 'GTA V für PS4 & Xbox One', detail: 'Zweite Konsolengeneration für GTA V.' },
  { id: 'gta5-pc', date: '2015-04-14', kind: 'port', game: 'GTA V', title: 'GTA V für PC', detail: 'Endlich mit Maus und Mods.' },
  { id: 'rdr2', date: '2018-10-26', kind: 'release', game: 'RDR 2', title: 'Red Dead Redemption 2 erscheint', detail: 'Rockstars Wildwest-Epos – das große Spiel zwischen GTA V und VI.' },
  { id: 'gta6-confirmed', date: '2022-02-04', kind: 'announce', game: 'GTA VI', title: 'GTA VI offiziell bestätigt', detail: 'Rockstar: Die Entwicklung des nächsten GTA ist „well underway“.' },
  { id: 'gta5-gen9', date: '2022-03-15', kind: 'port', game: 'GTA V', title: 'GTA V für PS5 & Xbox Series', detail: 'Dritte Konsolengeneration für dasselbe Spiel.' },
  { id: 'leak', date: '2022-09-18', kind: 'leak', game: 'GTA VI', title: 'Der große GTA-VI-Leak', detail: 'Rund 90 Videos aus einer frühen Entwicklungsversion tauchen auf.' },
  { id: 'trailer-announce', date: '2023-11-08', kind: 'announce', game: 'GTA VI', title: 'Trailer für Dezember angekündigt', detail: 'Rockstar kündigt den ersten Trailer an – das Internet eskaliert.' },
  { id: 'trailer1', date: '2023-12-05', kind: 'trailer', game: 'GTA VI', title: 'GTA VI Trailer 1', detail: 'Wegen eines Leaks vorzeitig veröffentlicht – in den USA am Abend des 4.12., in Deutschland kurz nach Mitternacht. Weltrekord: 90,4 Mio. YouTube-Aufrufe in 24 Std. Releasefenster: 2025.' },
  { id: 'delay1', date: '2025-05-02', kind: 'delay', game: 'GTA VI', title: 'Erste Verschiebung', detail: 'Von „Herbst 2025“ auf den 26. Mai 2026.' },
  { id: 'trailer2', date: '2025-05-06', kind: 'trailer', game: 'GTA VI', title: 'GTA VI Trailer 2', detail: 'Laut Rockstar über 475 Mio. Aufrufe in 24 Std. über alle Plattformen.' },
  { id: 'delay2', date: '2025-11-06', kind: 'delay', game: 'GTA VI', title: 'Zweite Verschiebung', detail: 'Vom 26. Mai 2026 auf den 19. November 2026.' },
  { id: 'preorders', date: '2026-06-25', kind: 'milestone', game: 'GTA VI', title: 'Vorbestellungen starten', detail: 'Laut Berichten mit 79,99 US-$ für die Standard-Edition.' },
  { id: 'preload', date: '2026-11-12', kind: 'milestone', game: 'GTA VI', title: 'Preload-Start', detail: 'Download vorab, spielen noch nicht.' },
  { id: 'gta6', date: '2026-11-19', kind: 'release', game: 'GTA VI', title: 'GTA VI erscheint', detail: 'PS5 und Xbox Series X|S. Ein PC-Termin ist nicht angekündigt.' },
];
