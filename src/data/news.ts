/**
 * Intel-Zentrale: kuratierte Meldungen rund um GTA VI.
 * Neueste Meldung oben. Zeiten sind deutsche Zeit (Europe/Berlin).
 * Neue Einträge einfach oben ergänzen und `NEWS_UPDATED` anpassen.
 *
 * kind:
 *  - trailer  : offizielle Trailer und Videos von Rockstar
 *  - official : offizielle Ankündigungen von Rockstar / Take-Two / Partnern
 *  - leak     : Leaks – immer unbestätigt, Inhalte hinter Spoiler-Schutz
 *  - report   : Berichte, Insider, Gerüchte
 */

export type NewsKind = 'trailer' | 'official' | 'leak' | 'report';

export interface NewsSource {
  label: string;
  url: string;
}

export interface NewsItem {
  id: string;
  /** YYYY-MM-DD oder YYYY-MM-DDTHH:mm (deutsche Zeit) */
  at: string;
  /** Tag/Uhrzeit nur ungefähr bekannt */
  approx?: boolean;
  kind: NewsKind;
  title: string;
  text: string;
  facts?: string[];
  /** Inhalt erst nach Antippen zeigen */
  spoiler?: boolean;
  sources?: NewsSource[];
}

/** Stand der kuratierten Liste */
export const NEWS_UPDATED = '2026-10-15T21:00';

export const NEWS: NewsItem[] = [
  {
    id: 'launch-trailer',
    at: '2026-10-15T15:00',
    kind: 'trailer',
    title: 'Der Launch-Trailer ist da',
    text: 'Ohne jede Vorankündigung: Um 9 Uhr Ostküstenzeit (15 Uhr bei dir) hat Rockstar den Launch-Trailer auf YouTube, X und der GTA-VI-Seite veröffentlicht. 90 Sekunden, laut Abspann komplett in-game auf einer normalen PS5 aufgenommen. Neu zu sehen: mehr Vice City, mehr Story – und zum ersten Mal Lucias Fußfessel. Nach einer Stunde stand er bei über einer Million Aufrufen.',
    facts: ['90 Sekunden', 'In-game auf PS5', 'Musik: Justice – „Flower in a Hurricane“', 'feat. Tame Impala, SZA & King Gizzard'],
    sources: [
      { label: 'Rockstar Games', url: 'https://www.rockstargames.com/VI' },
      { label: 'Forbes', url: 'https://www.forbes.com/sites/paultassi/2026/10/15/new-gta-6-launch-trailer-hits-with-sex-money-and-special-ops-missions/' },
      { label: 'PlayStation LifeStyle', url: 'https://www.playstationlifestyle.net/2026/10/15/gta-6-launch-trailer-jason-lucia' },
    ],
  },
  {
    id: 'cyberleek-ultimatum',
    at: '2026-10-11',
    approx: true,
    kind: 'leak',
    title: 'CyberLeek stellt Take-Two ein Ultimatum',
    text: 'Die Leak-Gruppe droht, einen angeblichen Build mit der kompletten Story zu veröffentlichen – falls Take-Two keine echten Discs bringt und sich öffentlich entschuldigt. Gekoppelt ist das an den Kurs eines eigenen Memecoins. Nichts davon ist bestätigt. Take-Two geht mit Vorladungen gegen Discord und Co. vor, und angebliche Build-Downloads wurden laut Berichten mit Schadsoftware in Verbindung gebracht.',
    sources: [
      { label: 'VGC', url: 'https://www.videogameschronicle.com/news/group-threatens-to-leak-full-gta-6-build-if-physical-plans-arent-reversed/' },
      { label: 'HotHardware', url: 'https://hothardware.com/news/gta-6-leaker-guns-take-two-disc-apology-ultimatum' },
    ],
  },
  {
    id: 'cyberleek-25min',
    at: '2026-10-08',
    kind: 'leak',
    title: 'CyberLeek ist zurück: rund 25 Minuten Gameplay',
    text: 'Das bisher längste Leak-Video – mit Story-Zwischensequenzen und den ersten Szenen, in denen Lucia gesteuert wird. Eurogamer hat das Material gesichtet und hält es für echt. Rockstar lässt die Clips per DMCA entfernen.',
    spoiler: true,
    sources: [{ label: 'Dexerto', url: 'https://www.dexerto.com/gta/gta-6-leaker-cyberleek-returns-with-massive-25-minute-gameplay-leak-3416630/' }],
  },
  {
    id: 'extended-look',
    at: '2026-08-27T21:00',
    kind: 'trailer',
    title: '„An Extended Look“: Gameplay zuerst auf Netflix',
    text: 'Rund 26 Minuten Gameplay – Premiere um 21 Uhr deutscher Zeit auf Netflix, sechs Stunden später auf YouTube und der GTA-VI-Website. Rockstar hatte vorher bestätigt, dass die Show trotz der Leak-Welle wie geplant läuft.',
    sources: [{ label: 'PC Games', url: 'https://www.pcgames.de/GTA-6-Spiel-55239/News/Trailer-Extended-Look-Gameplay-Exklusiv-Netflix-1550469/' }],
  },
  {
    id: 'cyberleek-start',
    at: '2026-08-18',
    kind: 'leak',
    title: 'Die CyberLeek-Leaks beginnen',
    text: 'Eine anonyme Gruppe veröffentlicht unveröffentlichte Gameplay-Clips und angebliche Bilder der Leonida-Karte. Es folgen bis Ende August weitere Clips. Rockstar lässt sie per DMCA entfernen, Take-Two versucht juristisch, die Verantwortlichen zu ermitteln. Als Motiv nennt die Gruppe den Protest gegen die Box ohne Disc.',
    spoiler: true,
    sources: [{ label: 'GameSpot', url: 'https://www.gamespot.com/articles/gta-6-leaks-a-timeline-of-the-events-so-far/' }],
  },
  {
    id: 'preorders',
    at: '2026-06-25',
    kind: 'official',
    title: 'Vorbestellungen, Preise und die Box ohne Disc',
    text: 'Die Vorbestellungen laufen: Standard-Edition 79,99 US-$, Ultimate-Edition 99,99 US-$. Die physische Version enthält keine Disc, sondern einen Download-Code. Wer vorbestellt, kann ab dem 12. November vorladen.',
    sources: [{ label: 'VGC', url: 'https://www.videogameschronicle.com/news/rockstar-confirms-there-will-be-no-disc-version-of-gta6-at-launch/' }],
  },
];

/** Kommende feste Termine für die Intel-Zentrale */
export interface UpcomingItem {
  id: string;
  at: string;
  title: string;
  note: string;
}

export const UPCOMING: UpcomingItem[] = [
  { id: 'preload', at: '2026-11-12T00:00', title: 'Preload-Start', note: 'Für Vorbesteller, digital wie Box-Code.' },
  { id: 'release', at: '2026-11-19T00:00', title: 'GTA VI erscheint', note: 'PS5 und Xbox Series X|S.' },
  { id: 'heat', at: '2026-11-19T01:00', title: 'Vice City Night der Miami Heat', note: 'Heat gegen Bucks auf einem „Vice City Court“ – Tip-off 19 Uhr in Miami, bei dir eine Stunde nach dem Release.' },
];
