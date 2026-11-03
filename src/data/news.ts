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
export const NEWS_UPDATED = '2026-11-03T20:00';

export const NEWS: NewsItem[] = [
  {
    id: 'preload-early',
    at: '2026-11-03',
    kind: 'official',
    title: 'Preload schon ab 10. November – 212 GB',
    text: 'Rockstar zieht den Preload zwei Tage vor: Auf der PS5 startet er am 10. November um 00:00 Uhr Ortszeit, auf der Xbox um 01:00 Uhr deutscher Zeit. Bis zu 212 GB, Box-Codes erst ab 12. November. Spielen geht weiterhin ab 19. November.',
    facts: ['PS5: 10.11., 00:00', 'Xbox: 10.11., 01:00', 'bis zu 212 GB', 'Box-Codes: 12.11.'],
    sources: [
      { label: 'Rockstar Newswire', url: 'https://www.rockstargames.com/newswire/article/k4ak9okk485712/grand-theft-auto-vi-pre-load-begins-on-november-10' },
      { label: 'GamesRadar', url: 'https://www.gamesradar.com/games/grand-theft-auto/rockstar-confirms-gta-6-is-212gb-pre-loading-opens-earlier-than-previously-announced-for-digital-orders/' },
      { label: 'VGC', url: 'https://www.videogameschronicle.com/news/rockstar-details-grand-theft-auto-6-pre-load-date-and-time-and-file-size/' },
    ],
  },
  {
    id: 'file-size',
    at: '2026-10-27',
    kind: 'report',
    title: 'Rund 210 GB Download auf der PS5',
    text: 'Laut Daten aus dem PlayStation Store braucht die Standard-Edition etwa 210 GB, ein Day-One-Patch käme womöglich noch dazu. Inzwischen hat Rockstar bis zu 212 GB bestätigt.',
    sources: [
      { label: 'Kotaku', url: 'https://kotaku.com/gta-6s-expectedly-massive-file-size-has-been-revealed-2000750298' },
      { label: 'Complex', url: 'https://www.complex.com/pop-culture/a/treyalston/gta-6-file-size-210gb-preload' },
    ],
  },
  {
    id: 'review-codes',
    at: '2026-10-26',
    kind: 'report',
    title: 'Testmuster verschickt – Tests am 18. November?',
    text: 'Laut Insider NateTheHate hat Rockstar die Review-Codes an die Presse verschickt, das Embargo soll am 18. November fallen – einen Tag vor dem Release, wie bei GTA V und Red Dead 2. Offiziell bestätigt ist das nicht.',
    sources: [
      { label: 'altchar', url: 'https://www.altchar.com/game-news/gta-6-reviews-reportedly-set-for-november-18-as-review-copies-reach-media-ateti7l7KLK3' },
      { label: 'Notebookcheck', url: 'https://www.notebookcheck.net/GTA-6-review-codes-are-out-in-the-wild-giving-outlets-just-over-three-weeks.1434328.0.html' },
    ],
  },
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
    id: 'radio',
    at: '2026-10-09',
    approx: true,
    kind: 'official',
    title: 'Die ersten sechs Radiosender',
    text: 'Rockstar stellt AfroBank FM, Back Country Radio, Dirty South Classics, Flash FM, The Chamber 106.6 und Cocoteo FM vor – mit Hörproben auf der offiziellen Website. Weitere Sender folgen im Spiel.',
    sources: [
      { label: 'KeenGamer', url: 'https://www.keengamer.com/articles/news/gta-6-reveals-its-first-six-radio-stations-hosted-by-bad-bunny-slayer-and-more/' },
      { label: 'GosuGamers', url: 'https://www.gosugamers.net/entertainment/news/79321-you-can-now-preview-grand-theft-auto-vi-s-in-game-radio-stations-on-foot-listening-confirmed' },
    ],
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
    text: 'Standard-Edition 79,99 US-$, Ultimate 99,99 US-$. Die Box-Version enthält keine Disc, sondern einen Download-Code. Vorladen war für den 12. November angekündigt.',
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
  { id: 'preload', at: '2026-11-10T00:00', title: 'Preload-Start', note: 'PS5 digital – Xbox ab 01:00, Box-Codes ab 12.11.' },
  { id: 'reviews', at: '2026-11-18T12:01', title: 'Test-Embargo (Insider)', note: 'Laut Insidern fallen die Tests einen Tag vor dem Release – unbestätigt.' },
  { id: 'release', at: '2026-11-19T00:00', title: 'GTA VI erscheint', note: 'PS5 und Xbox Series X|S.' },
  { id: 'heat', at: '2026-11-19T01:00', title: 'Vice City Night der Miami Heat', note: 'Heat gegen Bucks auf dem „Vice City Court“ – eine Stunde nach dem Release.' },
];
