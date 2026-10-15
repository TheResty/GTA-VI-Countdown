# GTA VI Countdown Command Center 🌴

Ein persönliches Countdown Command Center für **Grand Theft Auto VI** – Vice City trifft Mission Control.
Release-Ziel: **Donnerstag, 19. November 2026, 00:00 Uhr MEZ** (Europe/Berlin).

## Starten

```bash
npm install
npm run dev          # Entwicklungsserver auf http://localhost:5173
npm test             # Unit-Tests für Zeitkern, Kalender, Sonnenstand, Briefings, Intel-Feed
npm run build        # Produktions-Build nach dist/
npm run build:single # eine einzelne HTML-Datei (inkl. Fonts) nach dist-single/
```

Stack: Vite, TypeScript (ohne Framework), Three.js für die 3D-Szenen, lokal eingebundene Schriften (keine externen Requests).

## Persönliche Daten anpassen

Alles Zentrale steht in **`src/config.ts`**:

| Bereich | Was |
| --- | --- |
| `release.date`, `preload` | Release (19.11.2026, 00:00) und Preload-Start (12.11.2026) |
| `user` | Rufname, Geburtsdatum, Einschulung, Standort für Sonnenaufgänge |
| `school.holidays` | Ferien (Herbstferien bis 25.10.2026, danach Schule) |
| `school.freeDays`, `lessonsPerDay`, `dayStart/dayEnd` | Schulfreie Tage und Unterrichtszeiten |
| `examsEnd` | Ende der Klausuren (24.11.2026) |
| `assumptions` | Annahmen für Schätzungen (Schlaf, Mahlzeiten, Puls, Training …) |
| `events` | Termine für Timeline, Countdown-Wand und Tunnel-Tore |

Rufname, Geburtsdatum, Einschulung, Standort und die Annahmen lassen sich zusätzlich direkt auf der Seite
(Einstellungen oben rechts bzw. Bereich „Persönlich“) überschreiben. Eigene Countdowns legst du in der
Countdown-Wand an. Alles wird nur im Browser gespeichert (localStorage).

## Was drin ist

- **Hero:** 3D-Synthwave-Fahrt (Neon-Gitter, Palmen, gestreifte Sonne), riesiger Live-Countdown,
  Fortschritt seit deinem Startpunkt und das **Tagesbriefing**: ein eigener Text für jeden der letzten
  36 Tage (Ferien, Zeitumstellung, Schulstart, Preload, letztes Wochenende …), am letzten Tag stundengenau,
  in den letzten 45 Minuten minutengenau. Vergangene Briefings lassen sich nachlesen, kommende bleiben
  gesperrt – auch in der Zeitmaschine.
- **Bay 01 – Intel-Zentrale:** Eilmeldung (gerade: der Launch-Trailer vom 15.10.2026), Trailer-Rhythmus,
  kommende Termine mit Live-Countdown, News-Feed mit Spoiler-Schutz für Leaks, Newsflut-Barometer
  (Meldungen pro Tag bis zum Release) und eigene Meldungen, die nur im Browser gespeichert werden.
  Neue Meldungen erscheinen auch als Eilmeldung im Hero, im Live-Ticker und als Zähler in der Navigation.
- **Bay 02 – Startpunkt-Studio:** Ab wann wartest du? Trailer 1, GTA V, Verschiebung, Ferienbeginn, erster
  Besuch, Geburtstag oder ein eigener Moment – der gewählte Startpunkt gilt seitenweit (Hero-Fortschritt,
  Prozent-Meilensteine, Zeitspiegel, Maßstäbe, Zeitachse).
  - **Zeitlupe:** stufenlos zoombare Zeitachse von der gesamten Wartezeit bis auf 12 Millisekunden.
    Riesenziffern für Jahr, Monat, Tag, Stunde, Minute, Sekunde; „Jetzt folgen“ lässt die Achse live
    mitlaufen, der „Sturzflug ins Jetzt“ zoomt automatisch bis in die Millisekunden. Die Anzeige
    „Zeitfluss“ verrät, wie schnell die Zeit gerade über den Bildschirm wandert – von Kontinentaldrift
    bis Ocean Drive.
  - **Sanduhr** mit echter Korn-Physik, **Wartetag** (die Wartezeit als 24-Stunden-Uhr) und
    **Prozent-Marken** bis 99,9999 %.
- **Bay 03 – Zeitspiegel:** welcher Moment in der Vergangenheit genauso weit entfernt ist wie der Release.
- **Bay 04 – Zeittunnel (3D):** jeder verbleibende Tag als Ring aus 24 Stundensegmenten (Schlaf, Schule,
  Freizeit), Tore für Schulstart, Zeitumstellung und Preload, Release-Portal mit Partikelwirbel, Autopilot.
  Ringe antippen öffnet den Tag.
- **Bay 05 – Telemetrie (9 Instrumente):** Countdown-Kalender, Zahlenmystik, Einheiten-Kaskade,
  Stundenbudget, Wartezeit-Umrechner, 13 Jahre in Wochen, historische Maßstäbe, Sonnenaufgänge, Zahlensysteme.
- **Bay 06 – Persönlich:** Wochenenden, Schultage, Körper-Zähler, Annahmen-Regler, Leben im Vergleich, Freizeit-Bilanz.
- **Bay 07 – Timeline:** interaktive Zeitachse, Countdown-Wand mit eigenen Countdowns, Meilenstein-Tracker,
  Abstände zwischen den GTA-Hauptteilen.
- **Bay 08 – HQ:** Daily Check-in & Serien, Respekt-Level, 40 Achievements, Besuchs-Log, Fahndungsstufe.
- **Bay 09 – Zeitmaschine:** Vorschau der Eskalationsstufen, der letzten 24 Stunden, des Vollbild-Countdowns
  und der Release-Feier.

### Eskalation

Ab T-30, T-14, T-7 (Preload), T-3 und in den letzten 24 Stunden wird die Seite schrittweise lauter
(Neon-Flackern, glühende Panels, Alarm-Scanlines, Warnleuchten). Die letzten 24 Stunden zeigen eine eigene
Final-Countdown-Inszenierung mit Hundertstelsekunden, die letzte Minute läuft im Vollbild, bei 00:00 startet
die Release-Feier. Danach wechselt alles in den Post-Release-Modus.

### Easter Eggs

Der Konami-Code und eine Sonne, die angeklickt werden möchte. Und ein paar Achievements, die erst
auftauchen, wenn man sie findet.

Neue Meldungen für die Intel-Zentrale kommen oben in **`src/data/news.ts`** dazu (Art, Zeitpunkt, Text,
Quellen; Leaks mit `spoiler: true`), dann `NEWS_UPDATED` anpassen. Die Briefing-Texte stehen in **`src/data/briefings.ts`** (je Tag bis zum Release), die Startpunkt-Vorgaben
in **`src/core/startpoint.ts`**.

## Zeitberechnung

`src/core/tz.ts` rechnet Wanduhrzeiten über die Zeitzonendaten des Browsers in echte Zeitpunkte um.
Der Countdown zählt physikalische Sekunden; Kalendertage (Schultage, Wochenenden, Sonnenaufgänge) werden
nach deutscher Wanduhrzeit gezählt. Die Zeitumstellung am 25.10.2026 (25-Stunden-Tag) wird automatisch erkannt.

## Deployment

`.github/workflows/deploy.yml` baut und veröffentlicht die Seite auf GitHub Pages, sobald auf `main` gepusht wird.
Dafür in den Repository-Einstellungen unter *Settings → Pages* als Quelle „GitHub Actions“ auswählen.

---

Inoffizielles Fan-Projekt ohne Verbindung zu Rockstar Games oder Take-Two Interactive.
