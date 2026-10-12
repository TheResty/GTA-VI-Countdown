import { CONFIG } from '../config';
import { fmtDate, tzLabel } from '../core/format';
import { RELEASE } from '../core/timeline';
import { h } from '../ui/dom';

export function footer(): HTMLElement {
  return h(
    'footer.footer',
    h(
      'div.wrap.footer__inner',
      h(
        'div.footer__brand',
        h('span.hud__logo', 'VI'),
        h('p', h('b', 'GTA VI Countdown Command Center'), h('br'), `Ziel: ${fmtDate(RELEASE, 'full')}, 00:00 Uhr ${tzLabel(RELEASE)} (${CONFIG.timezone}).`),
      ),
      h(
        'div.footer__cols',
        h(
          'div',
          h('h3', 'Zeitberechnung'),
          h('p', 'Ein zentraler Zeitkern rechnet in echten Sekunden und zählt Kalendertage nach deutscher Wanduhrzeit – inklusive Sommer- und Winterzeit. Grundlage ist die Systemuhr deines Geräts.'),
        ),
        h(
          'div',
          h('h3', 'Daten & Annahmen'),
          h('p', 'Historische Daten: Erstveröffentlichungen laut Rockstar Games und Take-Two; Schätzungen sind mit ≈ oder „Annahme“ gekennzeichnet. Persönliche Werte stehen zentral in src/config.ts und lassen sich in den Einstellungen überschreiben.'),
        ),
        h(
          'div',
          h('h3', 'Fan-Projekt'),
          h('p', 'Inoffizielles, privates Fan-Projekt ohne Verbindung zu Rockstar Games oder Take-Two Interactive. Grand Theft Auto ist eine Marke von Take-Two Interactive.'),
        ),
      ),
      h('p.footer__fine', 'Keine Musik. Keine Cookies. Kein Konto. Nur Warten – aber mit Stil.'),
    ),
  );
}
