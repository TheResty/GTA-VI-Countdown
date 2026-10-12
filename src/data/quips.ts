/**
 * Live-Ticker: humorvolle, teils satirische Kommentare – viele davon
 * mit echten, live berechneten Zahlen.
 */
import { calendarCounts } from '../core/calendar';
import { num, compact } from '../core/format';
import { settings } from '../core/settings';
import { ANCHORS, PRELOAD, RELEASE } from '../core/timeline';
import { DAY_MS, HOUR_MS } from '../core/tz';

export function tickerItems(now: number): string[] {
  const diff = RELEASE - now;
  const s = settings();
  const cal = calendarCounts(now);
  const hours = diff / HOUR_MS;
  const sinceT1 = (now - ANCHORS.trailer1) / DAY_MS;
  const items: string[] = [];

  if (diff > 0) {
    items.push(
      `EILMELDUNG: Noch ${num(Math.ceil(diff / 1000))} Sekunden. Experten raten zu Geduld. Niemand hört auf sie.`,
      `VERKEHR: Stau auf dem Weg nach Leonida – voraussichtliche Ankunft in ${num(Math.ceil(hours))} Stunden.`,
      `WETTER VICE CITY: 29 Grad, Sonne, Neon. In deiner Stadt: ${cal.isHolidayToday ? 'Ferien' : cal.isSchoolDayToday ? 'Schule' : 'Wartezeit'}.`,
      `FORSCHUNG: Dein Herz schlägt bis zum Release noch rund ${compact((diff / 60_000) * s.restingHeartRate)}-mal. Bitte alle davon nutzen.`,
      `SCHULE: Noch ${num(cal.schoolDaysRemaining)} Schultage bis GTA VI. Die Kultusministerkonferenz äußerte sich auf Nachfrage nicht.`,
      `STATISTIK: Seit Trailer 1 sind ${num(Math.floor(sinceT1))} Tage vergangen. Gefühlt waren es mehr.`,
      `ROCKSTAR-WATCH: Keine neue Verschiebung gemeldet. Wir behalten das im Auge. Mit beiden Augen.`,
      `SCHLAFFORSCHUNG: Noch ${num(cal.nights)}-mal schlafen. Die Release-Nacht ist von dieser Rechnung ausgenommen.`,
      `FINANZEN: Dein Sparschwein wurde zuletzt beim Wort „Ultimate Edition“ nervös gesehen.`,
      `TECHNIK: Speicherplatz frei machen nicht vergessen. Deine Fotos vom Klassenausflug werden das verstehen.`,
      `GESELLSCHAFT: Umfrage ergibt – 100 % der Befragten dieser Seite warten auf GTA VI. Befragt wurde: du.`,
      `ASTRONOMIE: Die Erde legt bis zum Release noch ${compact((diff / 1000) * 29.78)} km um die Sonne zurück. Ohne Umweg über Vice City.`,
    );
    if (PRELOAD > now) items.push(`PRELOAD-ALARM: Download-Freigabe in ${num(Math.ceil((PRELOAD - now) / DAY_MS))} Tagen. Router schon mal motivieren.`);
    else items.push('PRELOAD LÄUFT: Bitte Konsole nicht ausschalten. Auch nicht aus Versehen. Auch nicht „nur kurz“.');
    if (diff < DAY_MS) items.push('FINALE: Weniger als 24 Stunden. Alle Systeme auf Rot. Snacks auf Grün.');
  } else {
    items.push(
      'EILMELDUNG: GTA VI ist erschienen. Diese Nachricht ist ab sofort die unwichtigste auf deinem Bildschirm.',
      'VERKEHR: Massenanreise nach Leonida. Server unter Last, Spieler über Glück.',
      `STATISTIK: Gewartet seit Trailer 1: ${num(Math.floor((RELEASE - ANCHORS.trailer1) / DAY_MS))} Tage. Seit GTA V: ${num(Math.floor((RELEASE - ANCHORS.gta5) / DAY_MS))} Tage.`,
      'SCHULE: Klausuren finden trotzdem statt. Wir haben nachgefragt.',
      'ROCKSTAR-WATCH: Nächstes Ziel – GTA-VI-PC-Version. Termin: unbekannt. Geduld: bekannt.',
    );
  }
  return items;
}
