/**
 * English edition: curated GTA VI news, newest first.
 * Dates are calendar days in US Eastern time; `at` is a UTC instant.
 */
export type NewsKind = 'trailer' | 'official' | 'leak' | 'report';

export interface NewsItem {
  id: string;
  at: number;
  kind: NewsKind;
  title: string;
  text: string;
  /** hide text behind a spoiler shield */
  spoiler?: boolean;
  sources: { label: string; url: string }[];
}

export const NEWS_UPDATED = Date.UTC(2026, 10, 5, 12, 0);

export const NEWS: NewsItem[] = [
  {
    id: 'preload-early',
    at: Date.UTC(2026, 10, 3, 15, 0),
    kind: 'official',
    title: 'Pre-load moves up to November 10 – 212 GB',
    text: 'Digital pre-load starts two days earlier than announced: PS5 at midnight local time on Nov 10, Xbox at 00:00 GMT on Nov 10. Up to 212 GB. Code-in-box copies still pre-load from Nov 12. Playable from Nov 19.',
    sources: [
      { label: 'Rockstar Newswire', url: 'https://www.rockstargames.com/newswire/article/k4ak9okk485712/grand-theft-auto-vi-pre-load-begins-on-november-10' },
      { label: 'GamesRadar', url: 'https://www.gamesradar.com/games/grand-theft-auto/rockstar-confirms-gta-6-is-212gb-pre-loading-opens-earlier-than-previously-announced-for-digital-orders/' },
    ],
  },
  {
    id: 'review-codes',
    at: Date.UTC(2026, 9, 26, 15, 0),
    kind: 'report',
    title: 'Review codes out – reviews on Nov 18?',
    text: 'According to NateTheHate, Rockstar has sent review code to press, with the embargo lifting on November 18 – one day before launch, like GTA V and Red Dead 2. Not officially confirmed.',
    sources: [{ label: 'altchar', url: 'https://www.altchar.com/game-news/gta-6-reviews-reportedly-set-for-november-18-as-review-copies-reach-media-ateti7l7KLK3' }],
  },
  {
    id: 'launch-trailer',
    at: Date.UTC(2026, 9, 15, 13, 0),
    kind: 'trailer',
    title: 'The Launch Trailer is here',
    text: 'Dropped without warning: 90 seconds, captured entirely in-game on a base PS5. More Vice City, more story – and the first look at Lucia’s ankle monitor. Music: Justice – “Flower in a Hurricane”.',
    sources: [
      { label: 'Rockstar Games', url: 'https://www.rockstargames.com/VI' },
      { label: 'Forbes', url: 'https://www.forbes.com/sites/paultassi/2026/10/15/new-gta-6-launch-trailer-hits-with-sex-money-and-special-ops-missions/' },
    ],
  },
  {
    id: 'game-awards',
    at: Date.UTC(2026, 9, 15, 18, 0),
    kind: 'report',
    title: 'GTA VI makes The Game Awards cutoff',
    text: 'The 2026 eligibility deadline is November 20, 9 pm PT. Launching a day earlier, GTA VI can be nominated for Game of the Year. The show airs December 10.',
    sources: [{ label: 'Kotaku', url: 'https://kotaku.com/gta-6-avoids-a-very-awkward-situation-by-officially-being-eligible-for-the-2026-game-awards-2000746320' }],
  },
  {
    id: 'bloomberg',
    at: Date.UTC(2026, 9, 14, 12, 0),
    kind: 'report',
    title: 'Bloomberg: Rockstar in the final stretch',
    text: 'Jason Schreier visited Rockstar North: the game isn’t gold yet and the team is fixing bugs and polishing – but November 19 looks like the real date.',
    sources: [{ label: 'GamesRadar', url: 'https://www.gamesradar.com/games/grand-theft-auto/gta-6-is-still-undergoing-changes-despite-releasing-next-month-rockstar-boss-says-the-game-is-never-completely-settled/' }],
  },
  {
    id: 'cyberleek-end',
    at: Date.UTC(2026, 9, 14, 18, 0),
    kind: 'leak',
    title: 'CyberLeek stops leaking – for now',
    text: 'In an “End of the Road” post, the leaker says no build and no ending will be released. A return before launch isn’t ruled out. Alleged “build downloads” are reportedly malware.',
    sources: [{ label: 'Kotaku', url: 'https://kotaku.com/gta-6-leaker-announces-they-wont-leak-the-full-game-the-leeks-stop-for-now-2000745917' }],
  },
  {
    id: 'radio',
    at: Date.UTC(2026, 9, 9, 15, 0),
    kind: 'official',
    title: 'First six radio stations revealed',
    text: 'AfroBank FM, Back Country Radio, Dirty South Classics, Flash FM, The Chamber 106.6 and Cocoteo FM – with previews on the official site.',
    sources: [{ label: 'KeenGamer', url: 'https://www.keengamer.com/articles/news/gta-6-reveals-its-first-six-radio-stations-hosted-by-bad-bunny-slayer-and-more/' }],
  },
  {
    id: 'cyberleek-25min',
    at: Date.UTC(2026, 9, 8, 15, 0),
    kind: 'leak',
    title: 'CyberLeek posts ~25 minutes of gameplay',
    text: 'The longest leak so far, with story cutscenes and the first footage of Lucia as the playable character. Eurogamer believes it is genuine.',
    spoiler: true,
    sources: [{ label: 'Dexerto', url: 'https://www.dexerto.com/gta/gta-6-leaker-cyberleek-returns-with-massive-25-minute-gameplay-leak-3416630/' }],
  },
  {
    id: 'collectors-box',
    at: Date.UTC(2026, 8, 24, 15, 0),
    kind: 'official',
    title: '$399.99 Collector’s Box – game not included',
    text: '“The Goodtime State – Vice City Collection” with a gator figure, Oakley shades, cap and a Leonida map. Rockstar Store only, ships at launch.',
    sources: [{ label: 'TechRadar', url: 'https://techradar.com/gaming/gta-6-gets-a-vice-city-collection-box-set-for-super-fans-but-its-usd399-and-doesnt-even-come-with-the-game' }],
  },
  {
    id: 'extended-look',
    at: Date.UTC(2026, 7, 27, 19, 0),
    kind: 'trailer',
    title: '“An Extended Look” premieres on Netflix',
    text: 'About 26 minutes of gameplay, first on Netflix, then on YouTube and the official site six hours later.',
    sources: [{ label: 'Gfinity', url: 'https://www.gfinityesports.com/article/an-extended-look-at-gta-6-will-premiere-on-netflix-this-month' }],
  },
  {
    id: 'preorders',
    at: Date.UTC(2026, 5, 25, 14, 0),
    kind: 'official',
    title: 'Pre-orders open – no disc in the box',
    text: 'Standard $79.99, Ultimate $99.99. The physical version contains a download code instead of a disc.',
    sources: [{ label: 'VGC', url: 'https://www.videogameschronicle.com/news/rockstar-confirms-there-will-be-no-disc-version-of-gta6-at-launch/' }],
  },
];

export interface UpcomingItem {
  id: string;
  at: number;
  title: string;
  note: string;
}
