/**
 * Bay 06 – Rockstar-Historie: Release-Abstände, Ankündigungszyklen,
 * GTA V vs. VI, Verschiebungs-Chronik, Trivia und Satire-Prognose.
 */
import { clock } from '../core/clock';
import { fmtDate, longDuration, num, plural } from '../core/format';
import { settings } from '../core/settings';
import { ANCHORS, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, parseLocal } from '../core/tz';
import { CYCLES, MAIN_GAMES, TRIVIA } from '../data/history';
import { bay } from '../ui/bay';
import { h, s, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';
import { bindTip } from '../ui/tooltip';

const YEAR = 365.2425 * DAY_MS;

/* ------------------------------------------------------------------ */
/* R-01 Release-Abstände                                               */
/* ------------------------------------------------------------------ */
function gapsChart(): HTMLElement {
  const gaps = MAIN_GAMES.slice(1).map((g, i) => {
    const prev = MAIN_GAMES[i];
    const a = parseLocal(prev.release, TZ);
    const b = parseLocal(g.release, TZ);
    return { label: `${prev.short} → ${g.short}`, ms: b - a, approx: Boolean(prev.approx || g.approx), from: a, to: b, planned: Boolean(g.planned) };
  });
  const maxYears = 14;
  const W = 640;
  const rowH = 38;
  const left = 150;
  const H = gaps.length * rowH + 30;
  const xOf = (y: number) => left + (y / maxYears) * (W - left - 70);
  const nowMark = s('line.gap__now', { y1: '0', y2: '0' });
  const bars = gaps.map((g, i) => {
    const y = 10 + i * rowH;
    const years = g.ms / YEAR;
    const rect = s('rect.gap__bar', { x: String(left), y: String(y), height: '20', width: String(xOf(years) - left), rx: '4' });
    if (g.planned) rect.classList.add('is-planned');
    const grp = s(
      'g.gap',
      s('text.gap__label', { x: String(left - 10), y: String(y + 14), 'text-anchor': 'end' }, g.label),
      rect,
      s('text.gap__value', { x: String(xOf(years) + 8), y: String(y + 14) }, `${g.approx ? '≈ ' : ''}${num(years, 1, 1)} J.`),
    );
    bindTip(grp, () => ({ title: g.label, lines: [`${fmtDate(g.from, 'date')} → ${fmtDate(g.to, 'date')}${g.planned ? ' (geplant)' : ''}`, longDuration(g.ms)] }));
    return grp;
  });
  const ticks = [0, 2, 4, 6, 8, 10, 12, 14].map((y) => [
    s('line.gap__grid', { x1: String(xOf(y)), x2: String(xOf(y)), y1: '4', y2: String(H - 22) }),
    s('text.gap__tick', { x: String(xOf(y)), y: String(H - 6), 'text-anchor': 'middle' }, `${y} J.`),
  ]);
  const lastIdx = gaps.length - 1;
  const svg = s('svg.gaps', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Jahre zwischen den GTA-Hauptteilen' }, ticks, bars, nowMark);
  const caption = h('p.gaps__caption');
  const el = panel({
    id: 'abstaende',
    code: 'R-01',
    title: 'Abstände zwischen den Hauptteilen',
    kicker: 'Jahre von Release zu Release. Die letzte Lücke ist die längste der Seriengeschichte – mit großem Abstand.',
    tone: 'sun',
    span: 2,
    body: h('div', h('div.chart-scroll', svg), caption),
    note: '≈ GTA 1 und GTA 2 erschienen je nach Region an unterschiedlichen Tagen (Okt./Nov. 1997 bzw. Sept./Okt. 1999). Übrige Daten: Erstveröffentlichung.',
  });
  registerModule({
    el,
    second(now) {
      const g = gaps[lastIdx];
      const years = Math.min(g.ms, Math.max(0, now - g.from)) / YEAR;
      const x = xOf(years);
      const y = 10 + lastIdx * rowH;
      nowMark.setAttribute('x1', String(x));
      nowMark.setAttribute('x2', String(x));
      nowMark.setAttribute('y1', String(y - 4));
      nowMark.setAttribute('y2', String(y + 24));
      const sum3 = gaps.slice(1, 4).reduce((a, b) => a + b.ms, 0);
      setText(
        caption,
        `GTA V → VI: ${longDuration(g.ms)}. Zum Vergleich: GTA 2 → III → Vice City → San Andreas dauerte zusammen nur ${num(sum3 / YEAR, 1, 1)} Jahre. Bisher vergangen: ${num((now - g.from) / YEAR, 2, 2)} Jahre.`,
      );
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* R-02 Ankündigung & Trailer bis Release                              */
/* ------------------------------------------------------------------ */
function cyclesChart(): HTMLElement {
  const data = CYCLES.map((c) => ({
    game: c.game,
    announce: (parseLocal(c.release, TZ) - parseLocal(c.announce, TZ)) / DAY_MS,
    trailer: (parseLocal(c.release, TZ) - parseLocal(c.trailer, TZ)) / DAY_MS,
    delays: c.delays,
    planned: c.planned,
  }));
  const W = 640;
  const left = 80;
  const groupH = 64;
  const H = data.length * groupH + 28;
  const max = 1800;
  const xOf = (d: number) => left + (d / max) * (W - left - 80);
  const groups = data.map((d, i) => {
    const y = 8 + i * groupH;
    const r1 = s('rect.cyc__bar.cyc__bar--a', { x: String(left), y: String(y), height: '18', width: String(xOf(d.announce) - left), rx: '4' });
    const r2 = s('rect.cyc__bar.cyc__bar--b', { x: String(left), y: String(y + 22), height: '18', width: String(xOf(d.trailer) - left), rx: '4' });
    const g = s(
      'g',
      s('text.gap__label', { x: String(left - 10), y: String(y + 26), 'text-anchor': 'end' }, d.game),
      r1,
      s('text.gap__value', { x: String(xOf(d.announce) + 8), y: String(y + 13) }, `${num(d.announce)} Tage`),
      r2,
      s('text.gap__value', { x: String(xOf(d.trailer) + 8), y: String(y + 35) }, `${num(d.trailer)} Tage`),
    );
    bindTip(g, () => ({
      title: d.game,
      lines: [`Ankündigung → Release: ${num(d.announce)} Tage`, `Trailer 1 → Release: ${num(d.trailer)} Tage`, `Verschiebungen: ${d.delays}`, ...(d.planned ? ['Release geplant'] : [])],
    }));
    return g;
  });
  const ticks = [0, 365, 730, 1095, 1460, 1825].filter((t) => t <= max).map((t) => [
    s('line.gap__grid', { x1: String(xOf(t)), x2: String(xOf(t)), y1: '2', y2: String(H - 22) }),
    s('text.gap__tick', { x: String(xOf(t)), y: String(H - 6), 'text-anchor': 'middle' }, t === 0 ? '0' : `${t / 365} J.`),
  ]);
  const svg = s('svg.cycles', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Tage von Ankündigung und erstem Trailer bis zum Release' }, ticks, groups);
  return panel({
    id: 'zyklen',
    code: 'R-02',
    title: 'Vom ersten Lebenszeichen bis zum Release',
    kicker: 'Wie lange Rockstar uns zwischen Ankündigung, erstem Trailer und Release warten lässt.',
    tone: 'cyan',
    span: 2,
    body: h(
      'div',
      h('ul.legend.legend--row', h('li', h('span.legend__swatch.cyc-a'), 'Ankündigung → Release'), h('li', h('span.legend__swatch.cyc-b'), 'Trailer 1 → Release')),
      h('div.chart-scroll', svg),
      h('p.gaps__caption', `GTA VI: ${num(data[2].announce)} Tage von der offiziellen Bestätigung bis zum Release – mehr als doppelt so lang wie bei GTA V (${num(data[1].announce)} Tage).`),
    ),
    note: 'Ankündigung GTA IV: E3 2006 · GTA V: Rockstar Newswire 25.10.2011 · GTA VI: Bestätigung 04.02.2022.',
  });
}

/* ------------------------------------------------------------------ */
/* R-03 GTA V vs. GTA VI                                               */
/* ------------------------------------------------------------------ */
function faceOff(): HTMLElement {
  const rows: [string, string, string][] = [
    ['Release', '17.09.2013', '19.11.2026'],
    ['Schauplatz', 'Los Santos & Blaine County', 'Leonida & Vice City'],
    ['Hauptfiguren', 'Michael, Franklin, Trevor', 'Lucia & Jason'],
    ['Plattformen zum Start', 'PS3 · Xbox 360', 'PS5 · Xbox Series X|S'],
    ['Ankündigung → Release', '693 Tage', '1.749 Tage'],
    ['Verschiebungen', '1', '2'],
    ['Trailer 1 – Aufrufe in 24 Std.', 'keine vergleichbare Messung', '90,4 Mio. (YouTube, Guinness)'],
    ['Verkäufe', 'über 230 Mio. (Take-Two)', 'noch nicht erschienen'],
  ];
  return panel({
    id: 'faceoff',
    code: 'R-03',
    title: 'GTA V vs. GTA VI',
    kicker: 'Zwei Spiele, dreizehn Jahre Abstand.',
    tone: 'pink',
    span: 2,
    body: h(
      'div.table-scroll',
      h(
        'table.faceoff',
        h('thead', h('tr', h('th', ''), h('th', 'GTA V'), h('th', 'GTA VI'))),
        h('tbody', rows.map(([k, a, b]) => h('tr', h('th', { scope: 'row' }, k), h('td', a), h('td', b)))),
      ),
    ),
    note: 'GTA V: 800 Mio. US-$ Umsatz am ersten Tag, 1 Mrd. nach drei Tagen. GTA VI: Preise laut Berichten 79,99 US-$ (Standard).',
  });
}

/* ------------------------------------------------------------------ */
/* R-04 Verschiebungs-Chronik                                          */
/* ------------------------------------------------------------------ */
function delayPanel(): HTMLElement {
  const counter = h('b.safety__num');
  const comment = h('p.safety__comment');
  const steps: [string, string, string][] = [
    ['05.12.2023', 'Trailer 1', 'Ziel: 2025'],
    ['02.05.2025', '1. Verschiebung', 'Ziel: 26.05.2026'],
    ['06.11.2025', '2. Verschiebung', 'Ziel: 19.11.2026'],
  ];
  const el = panel({
    id: 'verschiebungen',
    code: 'R-04',
    title: 'Verschiebungs-Barometer',
    kicker: 'Wie auf der Baustelle: Tage ohne Zwischenfall.',
    tone: 'orange',
    body: h(
      'div.safety',
      h('div.safety__sign', h('span', 'Dieser Countdown ist seit'), counter, h('span', 'Tagen verschiebungsfrei')),
      h('ol.delays', steps.map(([d, t, z]) => h('li', h('time', d), h('b', t), h('span', z)))),
      comment,
    ),
    note: 'Keine Prognose. Rockstar hat den 19.11.2026 wiederholt bestätigt – trotzdem: Daumen drücken.',
  });
  const announced2 = ANCHORS.delay2;
  const daysBefore2 = Math.round((parseLocal('2026-05-26', TZ) - announced2) / DAY_MS);
  registerModule({
    el,
    second(now) {
      const d = Math.floor((now - announced2) / DAY_MS);
      setText(counter, num(d));
      const rem = Math.ceil((RELEASE - now) / DAY_MS);
      setText(
        comment,
        rem > 0
          ? `Die zweite Verschiebung kam ${daysBefore2} Tage vor dem damaligen Termin. Bis zum aktuellen Termin sind es nur noch ${plural(rem, 'Tag', 'Tage')}.`
          : 'Der Termin hat gehalten. Das Barometer geht in den Ruhestand.',
      );
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* R-05 Trivia                                                         */
/* ------------------------------------------------------------------ */
function triviaPanel(): HTMLElement {
  const cards = TRIVIA.map((t, i) => {
    const card = h(
      'button.flip',
      { type: 'button', 'aria-pressed': 'false', 'aria-label': `${t.title} – umdrehen` },
      h('span.flip__inner', h('span.flip__front', h('span.flip__num', String(i + 1).padStart(2, '0')), h('b', t.title), h('small', 'Tippen zum Umdrehen')), h('span.flip__back', h('span', t.text), h('small', t.source))),
    );
    card.addEventListener('click', () => {
      const on = card.getAttribute('aria-pressed') !== 'true';
      card.setAttribute('aria-pressed', String(on));
    });
    return card;
  });
  return panel({
    id: 'trivia',
    code: 'R-05',
    title: 'GTA-Trivia',
    kicker: 'Zehn Fakten aus fast drei Jahrzehnten Grand Theft Auto.',
    tone: 'violet',
    span: 4,
    body: h('div.flips', cards),
  });
}

/* ------------------------------------------------------------------ */
/* R-06 Satire-Prognose GTA VII                                        */
/* ------------------------------------------------------------------ */
function gta7Panel(): HTMLElement {
  const gap = RELEASE - ANCHORS.gta5;
  const gta7 = RELEASE + gap;
  const when = h('b.big-stat');
  const age = h('p');
  const el = panel({
    id: 'gta7',
    code: 'R-06',
    title: 'Prognose: GTA VII',
    kicker: 'Wenn Rockstar exakt den gleichen Abstand hält wie zwischen GTA V und VI …',
    tone: 'mint',
    body: h('div', when, age),
    note: 'Reine Satire-Rechnung (Release VI + Abstand V→VI). Keine Ankündigung, keine Quelle, kein Versprechen.',
  });
  registerModule({
    el,
    second() {
      setText(when, fmtDate(gta7, 'dateLong'));
      const st = settings();
      if (st.birthDate) {
        const b = parseLocal(st.birthDate, TZ);
        setText(age, `Dann wärst du ${longDuration(gta7 - b)} alt. Fang schon mal an zu sparen.`);
      } else {
        setText(age, `Das sind ${longDuration(gta7 - clock.now())} ab heute. Fang schon mal an zu sparen.`);
      }
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* R-08 Release-Muster                                                 */
/* ------------------------------------------------------------------ */
function patternPanel(): HTMLElement {
  const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const rows = MAIN_GAMES.map((g) => {
    const [y, m, d] = g.release.split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return { g, wd, m };
  });
  const exact = rows.filter((r) => !r.g.approx);
  const tuesdays = exact.filter((r) => r.wd === 2 && !r.g.planned).length;
  const autumn = rows.filter((r) => r.m >= 9 && r.m <= 11).length;
  return panel({
    id: 'muster',
    code: 'R-08',
    title: 'Release-Muster',
    kicker: 'An welchen Wochentagen und in welchen Monaten Rockstar seine GTA-Teile veröffentlicht.',
    tone: 'cyan',
    span: 2,
    body: h(
      'div',
      h(
        'div.table-scroll',
        h(
          'table.faceoff.pattern',
          h('thead', h('tr', h('th', 'Spiel'), h('th', 'Erschienen'), h('th', 'Wochentag'), h('th', 'Monat'))),
          h(
            'tbody',
            rows.map((r) =>
              h(
                `tr${r.g.planned ? '.is-planned' : ''}`,
                h('th', { scope: 'row' }, r.g.short),
                h('td', `${r.g.approx ? '≈ ' : ''}${r.g.release.split('-').reverse().join('.')}`),
                h('td', r.g.approx ? '–' : WD[r.wd]),
                h('td', MONTHS[r.m - 1]),
              ),
            ),
          ),
        ),
      ),
      h(
        'p.gaps__caption',
        `${tuesdays} der ${exact.filter((r) => !r.g.planned).length} exakt datierten Hauptteile erschienen an einem Dienstag – dem klassischen US-Releasetag. GTA VI bricht mit einem Donnerstag. ${autumn} von ${rows.length} Teilen kamen im Herbst (September bis November).`,
      ),
    ),
    note: 'Wochentag nach Erstveröffentlichung in Nordamerika bzw. weltweit; bei GTA 1 und 2 schwankt das Datum je nach Region.',
  });
}

/* ------------------------------------------------------------------ */
/* R-07 Kennzahlen                                                     */
/* ------------------------------------------------------------------ */
function keyFigures(): HTMLElement {
  const gap = RELEASE - ANCHORS.gta5;
  const figs: [string, string][] = [
    [longDuration(gap).split(',').slice(0, 2).join(','), 'zwischen GTA V und GTA VI'],
    ['230 Mio.+', 'verkaufte Exemplare von GTA V'],
    ['3', 'Konsolengenerationen für GTA V'],
    ['90,4 Mio.', 'YouTube-Aufrufe von Trailer 1 in 24 Std.'],
  ];
  return panel({
    id: 'kennzahlen',
    code: 'R-07',
    title: 'Kennzahlen',
    tone: 'sun',
    span: 2,
    body: h('ul.figures', figs.map(([v, l]) => h('li', h('b', v), h('span', l)))),
    note: 'Quellen: Take-Two Quartalsberichte (2026), Guinness World Records (2023).',
  });
}

export function rockstarSection(): HTMLElement {
  return bay({
    id: 'rockstar',
    index: 6,
    eyebrow: 'Rockstar-Historie',
    script: 'Archiv',
    title: 'Fast 30 Jahre GTA',
    tone: 'gold',
    lead: 'Von „Race’n’Chase“ bis Leonida: Release-Abstände, Ankündigungszyklen, Verschiebungen und Fakten. Belegte Daten, Schätzungen sind mit ≈ markiert.',
    body: h('div.grid', keyFigures(), gapsChart(), cyclesChart(), faceOff(), delayPanel(), gta7Panel(), patternPanel(), triviaPanel()),
  });
}
