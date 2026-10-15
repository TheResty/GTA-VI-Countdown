/**
 * Tagesbriefings für die letzten 36 Tage vor dem Release.
 * Schlüssel ist die Zahl der Kalendertage bis zum Release-Tag (36 = Mi 14.10.2026,
 * 1 = Mi 18.11.2026). Zahlen in den Texten werden live aus deinem Kalender berechnet.
 * Der letzte Tag hat zusätzlich eigene Texte für jede Tageszeit.
 */
import { CalendarCounts } from '../core/calendar';
import { num, plural } from '../core/format';

export interface BriefingContext {
  now: number;
  /** Kalendertage bis zum Release-Tag */
  d: number;
  hour: number;
  minute: number;
  weekday: string;
  dateLabel: string;
  cal: CalendarCounts;
  name: string;
  /** Fortschritt seit dem gewählten Startpunkt, 0–100 */
  pct: number;
  startLabel: string;
  hoursLeft: number;
  lessons: number;
  preloadIn: number;
  examsIn: number;
}

export interface Briefing {
  title: string;
  text: (c: BriefingContext) => string;
}

const school = (c: BriefingContext) => plural(c.cal.schoolDaysRemaining, 'Schultag', 'Schultage');
const nights = (c: BriefingContext) => `${num(c.cal.nights)}-mal schlafen`;
const pct = (c: BriefingContext, d = 2) => `${num(c.pct, d, d)} %`;

export const DAILY: Record<number, Briefing> = {
  36: {
    title: 'Ferienmittwoch, Mitte der Woche',
    text: (c) =>
      `Mitten in den Herbstferien und mitten in der Woche – und GTA VI ist so nah, dass ein einziger Kalendermonat fast reicht. Noch ${plural(c.cal.holidayDays, 'Ferientag', 'Ferientage')} inklusive heute, danach ${school(c)}. ${c.name}, das ist der Plan.`,
  },
  35: {
    title: 'Launch-Trailer-Tag',
    text: (c) =>
      c.hour < 15
        ? `Donnerstag in den Ferien – und irgendwas liegt in der Luft. Halte heute Nachmittag dein Handy in der Nähe. Nur so ein Gefühl. Bis Leonida: ${nights(c)}.`
        : `Um 15 Uhr hat Rockstar ohne jede Vorwarnung den Launch-Trailer rausgehauen: 90 Sekunden, komplett auf der PS5 aufgenommen. Zwischen Trailer 2 und heute lagen 527 Tage – zwischen heute und dem Release nur noch ${nights(c)}. Ab jetzt ist jeder Tag ein News-Tag.`,
  },
  34: {
    title: 'Freitag mit Bonus',
    text: (c) =>
      `Ein Freitag in den Ferien zählt doppelt – und der Launch-Trailer läuft seit gestern in Dauerschleife. Echte Freitage bis zum Release: ${num(c.cal.fridays)}. Seit ${c.startLabel} sind ${pct(c)} der Wartezeit geschafft – der Rest ist Formsache.`,
  },
  33: {
    title: 'Wochenende eins von fünf',
    text: (c) =>
      `Das erste von noch ${num(c.cal.weekends)} Wochenenden beginnt. Keine Schule, kein Wecker – nur leider auch noch kein GTA VI. Mehr Wochenenden musst du nicht mehr überstehen.`,
  },
  32: {
    title: 'Der letzte Dreißiger-Sonntag',
    text: () =>
      'Genieß den letzten Sonntag, an dem die Tageszahl noch mit einer 3 beginnt. In der Nacht zu Dienstag fällt die Restzeit unter 30 Tage – und das Command Center wird lauter.',
  },
  31: {
    title: 'Ein Montag, den man mag',
    text: () =>
      'Montage in den Ferien sind die einzigen Montage, die niemand hasst. Heute Nacht um 01:00 Uhr sind es nur noch 30 Tage – eine Stunde nach Mitternacht, weil die Zeitumstellung noch eine Stunde Wartezeit draufpackt.',
  },
  30: {
    title: 'T-30. Es geht los.',
    text: (c) =>
      `Seit 01:00 Uhr ist es offiziell: weniger als 30 Tage. Ab jetzt passt die Wartezeit in einen einzigen Monat. ${nights(c)}, ${school(c)}, ${plural(c.cal.weekends, 'Wochenende', 'Wochenenden')}.`,
  },
  29: {
    title: 'Ferien im Ladebalken-Modus',
    text: (c) =>
      `Nur noch ${plural(c.cal.holidayDays, 'Ferientag', 'Ferientage')}. Herbstferien verhalten sich wie ein Ladebalken bei 90 %: Am Ende werden sie plötzlich schnell. GTA VI leider nicht.`,
  },
  28: {
    title: 'Exakt ein Februar',
    text: () =>
      'Von heute bis zum Release passen genau 28 Kalendertage – ein ganzer Februar. Vier Wochen. Vier Donnerstage. Der vierte ist der Release-Tag.',
  },
  27: {
    title: 'Der letzte Ferienfreitag',
    text: () =>
      'Nächsten Freitag sitzt du wieder im Unterricht. Heute nicht. Das ist der letzte freie Freitag vor GTA VI – mach was draus. Oder schau den Trailer ein weiteres Mal. Beides legitim.',
  },
  26: {
    title: 'Ferienfinale, Teil 1',
    text: () =>
      'Das letzte Ferienwochenende beginnt. In der Nacht auf morgen wird die Uhr zurückgestellt: Du bekommst eine Stunde geschenkt. Die Wartezeit übrigens auch.',
  },
  25: {
    title: 'Die 25-Stunden-Nacht',
    text: () =>
      'Heute Nacht sprang die Uhr von 03:00 auf 02:00 Uhr zurück. Dieser Sonntag hat 25 Stunden – der längste Tag deiner gesamten Wartezeit. Und der letzte Ferientag. Wecker für morgen schon gestellt?',
  },
  24: {
    title: 'Zurück auf der Schulbank',
    text: (c) =>
      `Erster Schultag nach den Ferien. Ab heute zählt das Command Center Schultage rückwärts: ${school(c)}, diesen eingerechnet. Das sind ${num(c.cal.schoolDaysRemaining * c.lessons)} Unterrichtsstunden bis Leonida.`,
  },
  23: {
    title: 'Rhythmus gefunden',
    text: (c) =>
      `Zweiter Schultag. Aufstehen, Schule, warten, schlafen. Noch ${school(c)} in diesem Rhythmus – dann ändert sich der Plan für eine ziemlich lange Zeit.`,
  },
  22: {
    title: 'Bergfest',
    text: (c) =>
      `Mittwoch: Die Schulwoche ist halb rum. Die Wartezeit ist fast ganz rum – ${pct(c, 3)} seit ${c.startLabel}. Der Rest ist kleiner, als er sich anfühlt.`,
  },
  21: {
    title: 'Drei Wochen',
    text: (c) => `Ab heute sind es drei Wochen. 21 Kalendertage, ${nights(c)}, ${plural(c.cal.weekends, 'Wochenende', 'Wochenenden')}. Drei Donnerstage – der dritte ist der Release-Tag.`,
  },
  20: {
    title: 'Erste Schulwoche überlebt',
    text: (c) => `Woche eins nach den Ferien ist geschafft. Noch ${school(c)}. Belohnung: ein Wochenende. Danach nur noch drei weitere Schulwochen – die letzte davon hat nur drei Tage.`,
  },
  19: {
    title: 'Halloween in Leonida',
    text: (c) => `In Vice City zieht heute garantiert jemand im Hawaiihemd als Zombie um die Häuser. Bei dir: Samstag, noch ${plural(c.cal.weekends, 'Wochenende', 'Wochenenden')} bis zum Release, dieses mitgezählt.`,
  },
  18: {
    title: 'Vice City stellt die Uhr um',
    text: () => 'Heute Nacht hat auch Miami auf Winterzeit umgestellt. Zwischen dir und Vice City liegen wieder sechs Stunden – zwischen dir und GTA VI noch 18 Tage.',
  },
  17: {
    title: 'November. Release-Monat.',
    text: (c) => `Der Monat, in dem GTA VI erscheint, ist da. Ab jetzt lautet die Antwort auf „Wann kommt es?“ nur noch: diesen Monat. Noch ${school(c)}.`,
  },
  16: {
    title: 'Herbstferien plus Wochenende',
    text: () => 'Sechzehn Tage. Genau so lang wie die Herbstferien plus ein Wochenende – und die sind dir gerade erst wie im Flug vergangen.',
  },
  15: {
    title: 'Morgen: T-14',
    text: () => 'Um Mitternacht fällt die Restzeit unter zwei Wochen. Das Command Center bereitet sich auf die nächste Stufe vor. Du solltest das auch tun – Speicherplatz, Controller, Snacks.',
  },
  14: {
    title: 'T-14. Zwei Wochen.',
    text: (c) => `Zwei Wochen. Ab hier lässt sich alles an zwei Händen abzählen: ${school(c)}, ${plural(c.cal.weekends, 'Wochenende', 'Wochenenden')}, ${nights(c)}.`,
  },
  13: {
    title: 'Ein Jahr ohne Verschiebung',
    text: () => 'Heute vor einem Jahr hat Rockstar den Release auf den 19. November 2026 gelegt. Seitdem: keine weitere Verschiebung. Ein ganzes Jahr Ruhe. Bitte genau so weitermachen.',
  },
  12: {
    title: 'Das vorletzte Wochenende',
    text: () => 'Das vorletzte Wochenende ohne GTA VI. Nächsten Samstag liegt das Spiel schon vollständig auf deiner Festplatte – nur starten lässt es sich dann noch nicht.',
  },
  11: {
    title: 'Festplatten-Sonntag',
    text: () => 'Perfekter Tag zum Aufräumen: In vier Tagen startet der Preload. Alte Spiele, die du seit Monaten nicht angefasst hast, dürfen jetzt gehen. Sie verstehen das.',
  },
  10: {
    title: 'Der letzte zweistellige Montag',
    text: (c) => `Zehn Tage. Ab morgen passt die Restzeit in eine einzige Ziffer. Noch ${school(c)} – diese Woche hat fünf davon, die nächste nur drei.`,
  },
  9: {
    title: 'Einstellig',
    text: () => 'Neun Tage. Zum ersten Mal reicht eine Ziffer. Neun ist eine gute Zahl. Acht wäre besser. Sieben wäre Preload.',
  },
  8: {
    title: 'Elfter Elfter',
    text: () => 'Anderswo beginnt heute die Karnevalssaison. Hier beginnt die letzte Nacht vor dem Preload: Um Mitternacht darf deine Konsole loslegen. Router motivieren, Konsole im Standby lassen.',
  },
  7: {
    title: 'PRELOAD',
    text: () => 'Seit 00:00 Uhr kann GTA VI vorgeladen werden. Das Spiel kommt zu dir nach Hause – nur abspielen lässt es sich noch eine Woche lang nicht. T-7. Ab jetzt ist es physisch da.',
  },
  6: {
    title: 'Freitag, der 13.',
    text: (c) => `Ausgerechnet heute. Aber keine Sorge: Freitag, der 13. ist auch nur ein Freitag – und zwar dein allerletzter vor GTA VI. Noch ${school(c)}.`,
  },
  5: {
    title: 'Das letzte Wochenende',
    text: () => 'Das allerletzte Wochenende ohne GTA VI. Nächstes Wochenende lautet die Antwort auf „Was machst du am Wochenende?“ nur noch: Leonida.',
  },
  4: {
    title: 'Der letzte Sonntagabend',
    text: (c) => `Der letzte Sonntagabend vor dem Release. Morgen beginnt die letzte Schulwoche ohne GTA VI – sie hat nur ${plural(c.cal.schoolDaysRemaining, 'Tag', 'Tage')}.`,
  },
  3: {
    title: 'T-3. Der letzte Montag.',
    text: (c) => `Der letzte Montag deiner Wartezeit. Drei Tage, ${school(c)}, ${nights(c)}. Ab heute leuchtet hier alles rot. Das ist Absicht.`,
  },
  2: {
    title: 'Übermorgen',
    text: () => 'Übermorgen um 00:00 Uhr. Heute ist der vorletzte Schultag, morgen der letzte. Vorschlag für heute Abend: früh schlafen. Morgen Abend wird das nichts.',
  },
};

/** Der letzte Tag (Mi, 18.11.): eigene Texte je Tageszeit. Schlüssel = Startminute des Tages. */
export const FINAL_DAY: { from: number; title: string; text: (c: BriefingContext) => string }[] = [
  {
    from: 0,
    title: 'Die letzte Nacht ohne GTA VI',
    text: (c) => `Die finalen 24 Stunden laufen. Noch ${num(c.hoursLeft)} Stunden. Schlaf jetzt, ${c.name} – in der kommenden Nacht wird das nämlich nichts.`,
  },
  {
    from: 6 * 60,
    title: 'Der letzte Morgen',
    text: () => 'Aufstehen für den letzten Schultag ohne GTA VI. Frühstück zählt. Heute Abend gibt es Wichtigeres als Essen.',
  },
  {
    from: 8 * 60,
    title: 'Der letzte Schultag',
    text: (c) => `Gerade läuft Unterricht. Noch ${num(c.hoursLeft)} Stunden bis Leonida, und die Lehrkraft vorne weiß von nichts. Unauffällig bleiben.`,
  },
  {
    from: 13 * 60 + 15,
    title: 'Schulschluss. Endgültig.',
    text: (c) => `Der letzte Schultag ohne GTA VI ist vorbei. Ab jetzt liegt zwischen dir und Vice City nur noch Freizeit – ${num(c.hoursLeft)} Stunden davon.`,
  },
  {
    from: 16 * 60,
    title: 'Der längste Nachmittag',
    text: () => 'Hausaufgaben? Die Klausuren laufen noch bis zum 24. November, also leider ja. Am besten jetzt – heute Nacht hast du ganz sicher keine Zeit.',
  },
  {
    from: 19 * 60,
    title: 'Das letzte Abendessen',
    text: () => 'Das letzte Abendessen vor GTA VI. Iss ordentlich. Und nimm Snacks mit, für später. Für viel später.',
  },
  {
    from: 21 * 60,
    title: 'Systemcheck',
    text: () => 'Controller geladen? Konsole aktualisiert? Preload vollständig? Getränk kalt? Sofa frei? Dann ist alles bereit. Nur die Uhr noch nicht.',
  },
  {
    from: 22 * 60 + 15,
    title: 'Die letzten 105 Minuten',
    text: (c) => `Eine Doppelstunde plus Pause trennt dich noch von Leonida. Es ist ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')} Uhr. Nicht einschlafen.`,
  },
];

/** Allgemeiner Text, falls der Release mehr als 36 Tage entfernt ist. */
export const BEFORE_WINDOW: Briefing = {
  title: 'Noch über einen Monat',
  text: (c) => `Die heiße Phase mit täglichem Briefing beginnt 36 Tage vor dem Release. Bis dahin: ${nights(c)}, ${school(c)}.`,
};
