/**
 * Intel-Zentrale: kuratierte Meldungen rund um GTA VI.
 * Neueste Meldung oben. Zeiten sind deutsche Zeit (Europe/Berlin).
 * Neue Einträge oben ergänzen und `NEWS_UPDATED` anpassen.
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
export const NEWS_UPDATED = '2026-10-17T17:30';

export const NEWS: NewsItem[] = [
  {
    id: 'launch-trailer',
    at: '2026-10-15T15:00',
    kind: 'trailer',
    title: 'Der Launch-Trailer ist da',
    text: 'Ohne Vorankündigung um 15 Uhr deutscher Zeit: 90 Sekunden, laut Abspann komplett in-game auf einer normalen PS5 aufgenommen. Mehr Vice City, mehr Story – und zum ersten Mal Lucias Fußfessel.',
    facts: ['90 Sek.', 'In-game auf PS5', 'Justice – „Flower in a Hurricane“'],
    sources: [
      { label: 'Rockstar Games', url: 'https://www.rockstargames.com/VI' },
      { label: 'heise', url: 'https://www.heise.de/news/GTA-6-Rockstar-veroeffentlicht-Launch-Trailer-fuenf-Wochen-vor-Release-11490271.html' },
      { label: 'Forbes', url: 'https://www.forbes.com/sites/paultassi/2026/10/15/new-gta-6-launch-trailer-hits-with-sex-money-and-special-ops-missions/' },
    ],
  },
  {
    id: 'game-awards',
    at: '2026-10-15',
    approx: true,
    kind: 'report',
    title: 'GTA VI darf bei den Game Awards antreten',
    text: 'Stichtag ist der 20. November um 21 Uhr Westküstenzeit. GTA VI erscheint einen Tag vorher und kann damit auch als Spiel des Jahres nominiert werden. Die Show läuft am 10. Dezember.',
    sources: [
      { label: 'Kotaku', url: 'https://kotaku.com/gta-6-avoids-a-very-awkward-situation-by-officially-being-eligible-for-the-2026-game-awards-2000746320' },
      { label: 'Push Square', url: 'https://www.pushsquare.com/news/2026/10/gta-6-barely-makes-the-cut-for-the-game-awards-game-of-the-year-vote' },
    ],
  },
  {
    id: 'cyberleek-end',
    at: '2026-10-14',
    kind: 'leak',
    title: 'CyberLeek hört auf – vorerst',
    text: 'Unter dem Titel „End of the Road“ erklärt die Gruppe, weder einen Build noch das Ende zu veröffentlichen. Ihr Memecoin hatte das 30-Millionen-Ziel weit verfehlt. Ein Comeback vor dem Release schließt sie nicht aus.',
    sources: [
      { label: 'Kotaku', url: 'https://kotaku.com/gta-6-leaker-announces-they-wont-leak-the-full-game-the-leeks-stop-for-now-2000745917' },
      { label: 'Dexerto', url: 'https://www.dexerto.com/gta/cyberleek-stops-gta-6-leaks-for-now-after-posting-parts-of-final-missions-3418808/' },
    ],
  },
  {
    id: 'bloomberg',
    at: '2026-10-14',
    kind: 'report',
    title: 'Bloomberg: Rockstar im Endspurt',
    text: 'Jason Schreier war Ende September bei Rockstar North: Das Spiel ist noch nicht Gold, das Team behebt Fehler und poliert. Technikchef Phil Hooker: „Das Spiel ist nie ganz fertig.“ Der 19. November gilt trotzdem als echter Termin.',
    sources: [
      { label: 'GamesRadar', url: 'https://www.gamesradar.com/games/grand-theft-auto/gta-6-is-still-undergoing-changes-despite-releasing-next-month-rockstar-boss-says-the-game-is-never-completely-settled/' },
      { label: 'Notebookcheck', url: 'https://notebookcheck.com/GTA-6-ist-noch-nicht-fertig-Rockstar-erklaert-Endspurt-vor-dem-Release.1426543.0.html' },
    ],
  },
  {
    id: 'cyberleek-ultimatum',
    at: '2026-10-11',
    approx: true,
    kind: 'leak',
    title: 'CyberLeek stellt Take-Two ein Ultimatum',
    text: 'Echte Discs und eine Entschuldigung – sonst komme ein Build mit der kompletten Story, gekoppelt an den Kurs eines eigenen Memecoins. Nichts davon ist bestätigt; angebliche Build-Downloads wurden mit Schadsoftware in Verbindung gebracht.',
    sources: [{ label: 'VGC', url: 'https://www.videogameschronicle.com/news/group-threatens-to-leak-full-gta-6-build-if-physical-plans-arent-reversed/' }],
  },
  {
    id: 'cyberleek-25min',
    at: '2026-10-08',
    kind: 'leak',
    title: 'CyberLeek: rund 25 Minuten Gameplay',
    text: 'Das längste Leak-Video – mit Story-Zwischensequenzen und den ersten Szenen, in denen Lucia gesteuert wird. Eurogamer hält das Material für echt, Rockstar lässt es per DMCA entfernen.',
    spoiler: true,
    sources: [{ label: 'Dexerto', url: 'https://www.dexerto.com/gta/gta-6-leaker-cyberleek-returns-with-massive-25-minute-gameplay-leak-3416630/' }],
  },
  {
    id: 'collectors-box',
    at: '2026-09-24',
    kind: 'official',
    title: 'Collector’s Box für 399,99 US-$ – ohne Spiel',
    text: '„The Goodtime State – Vice City Collection“ mit Alligator-Figur, Oakley-Sonnenbrille, Cap und Leonida-Karte, nur im Rockstar Store. Das Spiel selbst ist nicht dabei; Versand zum Release.',
    sources: [
      { label: 'TechRadar', url: 'https://techradar.com/gaming/gta-6-gets-a-vice-city-collection-box-set-for-super-fans-but-its-usd399-and-doesnt-even-come-with-the-game' },
      { label: 'Kotaku', url: 'https://kotaku.com/rockstar-reveals-400-special-edition-of-grand-theft-auto-6-2000736975' },
    ],
  },
  {
    id: 'extended-look',
    at: '2026-08-27T21:00',
    kind: 'trailer',
    title: '„An Extended Look“: Gameplay zuerst auf Netflix',
    text: 'Rund 26 Minuten Gameplay – Premiere um 21 Uhr deutscher Zeit auf Netflix, sechs Stunden später auf YouTube und der GTA-VI-Website.',
    sources: [{ label: 'PC Games', url: 'https://www.pcgames.de/GTA-6-Spiel-55239/News/Trailer-Extended-Look-Gameplay-Exklusiv-Netflix-1550469/' }],
  },
  {
    id: 'cyberleek-start',
    at: '2026-08-18',
    kind: 'leak',
    title: 'Die CyberLeek-Leaks beginnen',
    text: 'Unveröffentlichte Gameplay-Clips und angebliche Bilder der Leonida-Karte tauchen auf. Rockstar lässt sie per DMCA entfernen, Take-Two geht juristisch gegen die Verantwortlichen vor.',
    spoiler: true,
    sources: [{ label: 'GameSpot', url: 'https://www.gamespot.com/articles/gta-6-leaks-a-timeline-of-the-events-so-far/' }],
  },
  {
    id: 'preorders',
    at: '2026-06-25',
    kind: 'official',
    title: 'Vorbestellungen und die Box ohne Disc',
    text: 'Standard-Edition 79,99 US-$, Ultimate 99,99 US-$. Die Box-Version enthält keine Disc, sondern einen Download-Code. Vorladen ab 12. November.',
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
  { id: 'preload', at: '2026-11-12T00:00', title: 'Preload-Start', note: 'Für Vorbesteller.' },
  { id: 'release', at: '2026-11-19T00:00', title: 'GTA VI erscheint', note: 'PS5 und Xbox Series X|S.' },
  { id: 'heat', at: '2026-11-19T01:00', title: 'Vice City Night der Miami Heat', note: 'Heat gegen Bucks auf dem „Vice City Court“ – eine Stunde nach dem Release.' },
];
