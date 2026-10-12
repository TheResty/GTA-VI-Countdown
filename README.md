# GTA VI Countdown Command Center 🌴

Ein persönliches Countdown Command Center für **Grand Theft Auto VI** – Vice City trifft Mission Control.
Release-Ziel: **Donnerstag, 19. November 2026, 00:00 Uhr MEZ** (Europe/Berlin).

## Starten

```bash
npm install
npm run dev          # Entwicklungsserver auf http://localhost:5173
npm test             # Unit-Tests für Zeitkern, Kalender, Astronomie, Phasen
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
| `events` | Termine für Timeline und Countdown-Wand |

Rufname, Geburtsdatum, Einschulung, Standort und die Annahmen lassen sich zusätzlich direkt auf der Seite
(Einstellungen oben rechts bzw. Bereich „Persönlich“) überschreiben. Eigene Countdowns legst du in der
Countdown-Wand an. Alles wird nur im Browser gespeichert (localStorage).

## Was drin ist

- **Hero:** 3D-Synthwave-Fahrt (Neon-Gitter, Palmen, gestreifte Sonne), riesiger Live-Countdown,
  persönlicher Restzeit-Text, Fortschritt seit Trailer 1, Live-Ticker.
- **Bay 01 – Zeitspiegel:** welcher Moment in der Vergangenheit genauso weit entfernt ist wie der Release.
- **Bay 02 – Telemetrie (21 Instrumente):** Einheiten-Kaskade, Startpunkte, Uhrwerk-Ringe, Sanduhr,
  Countdown-Kalender, 13 Jahre in Wochen, Zeitspirale, Stundenbudget, Zahlensysteme, Zahlenmystik,
  komprimierte Zeit, Zenons Paradoxon, Mondphasen, Sonnenaufgänge, kosmische Perspektive,
  Planetentage & Relativität, Umrechner, historische Maßstäbe, Wochentage, Weltzeit, Zeitumstellung.
- **Bay 03 – Zeittunnel (3D):** jeder verbleibende Tag als Neon-Ring bis zum Release-Portal.
- **Bay 04 – Persönlich:** Wochenenden, Schultage, Körper-Zähler, Annahmen-Regler, Leben in Wochen, Freizeit-Bilanz.
- **Bay 05 – Timeline:** interaktive Zeitachse, Countdown-Wand mit eigenen Countdowns, Meilenstein-Tracker, Restzeit-Atlas.
- **Bay 06 – Rockstar-Historie:** Release-Abstände, Ankündigungszyklen, GTA V vs. VI, Verschiebungen, Release-Muster, Trivia.
- **Bay 07 – HQ:** Daily Check-in & Serien, Respekt-Level, 36 Achievements, Cheat-Terminal, Besuchs-Log, Fahndungsstufe.
- **Bay 08 – Zeitmaschine:** Vorschau aller Eskalationsstufen, der letzten 24 Stunden, des Vollbild-Countdowns und der Release-Feier.

### Eskalation

Ab T-30, T-14, T-7 (Preload), T-3 und in den letzten 24 Stunden wird die Seite schrittweise lauter
(Neon-Flackern, glühende Panels, Alarm-Scanlines, Warnleuchten). Die letzten 24 Stunden zeigen eine eigene
Final-Countdown-Inszenierung mit Hundertstelsekunden, die letzte Minute läuft im Vollbild, bei 00:00 startet
die Release-Feier. Danach wechselt alles in den Post-Release-Modus.

### Easter Eggs

Klassische GTA-Cheats funktionieren per Tastatur überall auf der Seite – oder über das Cheat-Terminal im HQ.
Dazu kommen der Konami-Code und eine Sonne, die angeklickt werden möchte.

## Zeitberechnung

`src/core/tz.ts` rechnet Wanduhrzeiten über die Zeitzonendaten des Browsers in echte Zeitpunkte um.
Der Countdown zählt physikalische Sekunden; Kalendertage (Schultage, Wochenenden, Sonnenaufgänge) werden
nach deutscher Wanduhrzeit gezählt. Die Zeitumstellung am 25.10.2026 (25-Stunden-Tag) wird automatisch erkannt.

## Deployment

`.github/workflows/deploy.yml` baut und veröffentlicht die Seite auf GitHub Pages, sobald auf `main` gepusht wird.
Dafür in den Repository-Einstellungen unter *Settings → Pages* als Quelle „GitHub Actions“ auswählen.

---

Inoffizielles Fan-Projekt ohne Verbindung zu Rockstar Games oder Take-Two Interactive.
