/**
 * Vergleichsmodule: Einheiten-Umrechner, historische Maßstäbe,
 * Wochentage, Weltzeit und Zeitumstellung.
 */
import { calendarCounts } from '../core/calendar';
import { fmtDate, fmtInZone, humanDuration, num, plural } from '../core/format';
import { ANCHORS, DST_CHANGES, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, HOUR_MS, civilDayLength, civilFromMs, zonedParts } from '../core/tz';
import { REFERENCES, UNITS, WORLD_ZONES } from '../data/comparisons';
import { h, s, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';
import { bindTip } from '../ui/tooltip';
import { load, save } from '../core/store';

/* ------------------------------------------------------------------ */
/* T-17 Einheiten-Umrechner                                            */
/* ------------------------------------------------------------------ */
export function unitConverter(): HTMLElement {
  let current = load<string>('unit', 'lesson');
  if (!UNITS.some((u) => u.id === current)) current = 'lesson';
  const big = h('b.converter__value');
  const label = h('span.converter__label');
  const note = h('p.converter__note');
  const chips = h(
    'div.chips',
    { role: 'listbox', 'aria-label': 'Einheit wählen' },
    UNITS.map((u) =>
      h(
        'button.chip-btn',
        {
          type: 'button',
          role: 'option',
          'aria-selected': String(u.id === current),
          dataset: { id: u.id },
          onclick: () => {
            current = u.id;
            save('unit', current);
            chips.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === current)));
          },
        },
        u.label,
      ),
    ),
  );
  const allRows = UNITS.map((u) => ({ u, value: h('b') }));
  const all = h(
    'ul.units-all',
    allRows.map((r) => h('li', r.value, h('span', r.u.label))),
  );
  const el = panel({
    id: 'umrechner',
    code: 'T-17',
    title: 'Wartezeit-Umrechner',
    kicker: 'Die Restzeit in Einheiten, die man wirklich kennt.',
    tone: 'pink',
    span: 2,
    body: h('div.converter', h('div.converter__display', big, label), note, chips, h('p.subhead', 'Alle Einheiten auf einen Blick'), all),
  });
  registerModule({
    el,
    frame(now) {
      const u = UNITS.find((x) => x.id === current)!;
      const v = Math.max(0, RELEASE - now) / u.ms;
      setText(big, num(v, v < 100 ? 4 : 2, v < 100 ? 4 : 2));
      setText(label, u.label);
      setText(note, u.note);
    },
    second(now) {
      const rem = Math.max(0, RELEASE - now);
      for (const r of allRows) {
        const v = rem / r.u.ms;
        setText(r.value, num(v, v < 10 ? 2 : v < 1000 ? 1 : 0, v < 10 ? 2 : v < 1000 ? 1 : 0));
      }
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-18 Historische Maßstäbe                                           */
/* ------------------------------------------------------------------ */
export function historicScale(): HTMLElement {
  type Span = 'rest' | 't1' | 'gta5';
  let span: Span = 'rest';
  const list = h('ul.scale-list');
  const head = h('p.scale__head');
  const seg = h(
    'div.seg.seg--small',
    { role: 'tablist', 'aria-label': 'Zeitspanne' },
    (
      [
        ['rest', 'Restzeit'],
        ['t1', 'Seit Trailer 1'],
        ['gta5', 'Seit GTA V'],
      ] as [Span, string][]
    ).map(([k, l]) =>
      h(
        'button.seg__btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(k === span),
          onclick: (e: Event) => {
            span = k;
            seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget)));
            lastKey = '';
          },
        },
        l,
      ),
    ),
  );
  const el = panel({
    id: 'massstaebe',
    code: 'T-18',
    title: 'Historische Maßstäbe',
    kicker: 'Wie lang ist das eigentlich – verglichen mit Mondlandung, Kolumbus und dem Empire State Building?',
    tone: 'sun',
    span: 2,
    actions: seg,
    body: h('div', head, list),
    note: 'Skala logarithmisch: Mitte = gleich lang, links = Referenz länger, rechts = Wartezeit länger.',
  });
  let lastKey = '';
  registerModule({
    el,
    second(now) {
      const key = `${span}-${Math.floor(now / 60_000)}`;
      if (key === lastKey) return;
      lastKey = key;
      const value =
        span === 'rest' ? Math.max(0, RELEASE - now) : span === 't1' ? RELEASE - ANCHORS.trailer1 : RELEASE - ANCHORS.gta5;
      const label = span === 'rest' ? 'Die Restzeit' : span === 't1' ? 'Die Wartezeit seit Trailer 1' : 'Die Wartezeit seit GTA V';
      setText(head, `${label}: ${humanDuration(value, 2)} (${num(value / DAY_MS, 1, 1)} Tage)`);
      const items = [...REFERENCES].sort((a, b) => a.ms - b.ms);
      list.replaceChildren(
        ...items.map((r) => {
          const ratio = value / r.ms;
          const lg = Math.max(-2, Math.min(2, Math.log10(ratio)));
          const pos = 50 + (lg / 2) * 50;
          const phrase = ratio >= 1 ? `${num(ratio, ratio < 10 ? 2 : 1, ratio < 10 ? 2 : 1)}× so lang` : `${num(ratio * 100, 1, 1)} % davon`;
          return h(
            'li.scale',
            h('div.scale__text', h('b', r.label), h('small', r.note)),
            h('div.scale__meter', h('span.scale__mid'), h('span.scale__dot', { style: { left: `${pos}%` } })),
            h('span.scale__ratio', phrase),
          );
        }),
      );
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-19 Wochentage                                                     */
/* ------------------------------------------------------------------ */
export function weekdaysModule(): HTMLElement {
  const names = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const W = 320;
  const H = 170;
  const bars = names.map((n, i) => {
    const rect = s<SVGRectElement>('rect.wd__bar', { x: String(18 + i * 43), width: '22', rx: '4' });
    const val = s('text.wd__val', { x: String(29 + i * 43), 'text-anchor': 'middle' });
    const lab = s('text.wd__lab', { x: String(29 + i * 43), y: String(H - 4), 'text-anchor': 'middle' }, n.slice(0, 2));
    const hit = s('rect.wd__hit', { x: String(8 + i * 43), y: '0', width: '42', height: String(H) });
    return { n, rect, val, lab, hit };
  });
  const svg = s(
    'svg.wd',
    { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Verbleibende Wochentage bis zum Release' },
    s('line.wd__base', { x1: '10', x2: String(W - 10), y1: String(H - 20), y2: String(H - 20) }),
    bars.map((b) => [b.rect, b.val, b.lab, b.hit]),
  );
  const comment = h('p.wd__comment');
  const el = panel({
    id: 'wochentage',
    code: 'T-19',
    title: 'Wochentage bis Release',
    kicker: 'Wie viele Montage du noch überstehen musst. Und wie viele Freitage du dir verdient hast.',
    tone: 'mint',
    body: h('div', svg, comment),
    note: 'Gezählt werden alle Kalendertage ab heute bis einschließlich Mittwoch, 18.11.2026.',
  });
  let counts = [0, 0, 0, 0, 0, 0, 0];
  bars.forEach((b, i) => bindTip(b.hit, () => ({ title: names[i], lines: [`noch ${counts[(i + 1) % 7]}× bis zum Release`] })));
  let lastKey = '';
  registerModule({
    el,
    second(now) {
      const cal = calendarCounts(now);
      const key = cal.weekdayCounts.join(',');
      const todayWd = (zonedParts(now, TZ).weekday + 6) % 7;
      if (key + todayWd === lastKey) return;
      lastKey = key + todayWd;
      counts = cal.weekdayCounts;
      const max = Math.max(1, ...counts);
      bars.forEach((b, i) => {
        const v = counts[(i + 1) % 7];
        const hgt = (v / max) * (H - 50);
        b.rect.setAttribute('y', String(H - 20 - hgt));
        b.rect.setAttribute('height', String(Math.max(0, hgt)));
        b.rect.classList.toggle('is-weekend', i >= 5);
        b.rect.classList.toggle('is-today', i === todayWd);
        b.val.setAttribute('y', String(H - 26 - hgt));
        b.val.textContent = String(v);
      });
      const mondays = counts[1];
      const fridays = counts[5];
      setText(
        comment,
        mondays === 0
          ? 'Kein einziger Montag mehr. Das ist der schönste Satz auf dieser Seite.'
          : `Noch ${plural(mondays, 'Montag', 'Montage')} und ${plural(fridays, 'Freitag', 'Freitage')}. ${mondays > fridays ? 'Unfair, aber so ist der Kalender.' : 'Ausgeglichen – fast schon gerecht.'}`,
      );
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-20 Weltzeit                                                       */
/* ------------------------------------------------------------------ */
export function worldClock(): HTMLElement {
  const rows = WORLD_ZONES.map((z) => ({ ...z, now: h('span.world__now'), rel: h('span.world__rel') }));
  const el = panel({
    id: 'weltzeit',
    code: 'T-20',
    title: 'Release rund um die Welt',
    kicker: 'Dein Release-Moment (00:00 Uhr MEZ) in anderen Zeitzonen.',
    tone: 'cyan',
    body: h(
      'table.world',
      h('thead', h('tr', h('th', 'Ort'), h('th', 'Jetzt'), h('th', 'Dein Release dort'))),
      h(
        'tbody',
        rows.map((r) => h('tr', h('th', { scope: 'row' }, r.city, r.note ? h('small', r.note) : null), h('td', r.now), h('td', r.rel))),
      ),
    ),
    note: 'Die USA stellen schon am 1. November auf Winterzeit um, Europa am 25. Oktober – zwischen den Terminen schrumpft der Abstand nach Vice City auf 5 Stunden.',
  });
  registerModule({
    el,
    second(now) {
      for (const r of rows) {
        setText(r.now, fmtInZone(now, r.tz, { weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setText(r.rel, fmtInZone(RELEASE, r.tz, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }));
      }
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-21 Zeitumstellung                                                 */
/* ------------------------------------------------------------------ */
export function dstModule(): HTMLElement {
  const change = DST_CHANGES.find((c) => c.after < c.before && c.at < RELEASE) ?? DST_CHANGES[0];
  const status = h('p.dst__status');
  const countdown = h('b.big-stat');
  const dayLen = change ? civilDayLength(civilFromMs(change.at, TZ), TZ) : DAY_MS;
  const segs = Math.round(dayLen / HOUR_MS);
  const bar = h(
    'div.dst__bar',
    Array.from({ length: segs }, (_, i) => {
      const label = i < 3 ? String(i).padStart(2, '0') : i === 3 ? '02' : String(i - 1).padStart(2, '0');
      return h(`span.dst__seg${i === 2 || i === 3 ? '.is-double' : ''}`, { title: `${label}:00 Uhr${i === 2 ? ' (MESZ)' : i === 3 ? ' (MEZ)' : ''}` }, label);
    }),
  );
  const el = panel({
    id: 'zeitumstellung',
    code: 'T-21',
    title: 'Die geschenkte Stunde',
    kicker: change
      ? `Am ${fmtDate(change.at, 'full')} hat der Tag ${num(dayLen / HOUR_MS)} Stunden.`
      : 'Keine Zeitumstellung vor dem Release.',
    tone: 'orange',
    body: h('div.dst', countdown, status, bar),
    note: 'Der Countdown zählt echte, physikalische Sekunden. Kalendertage werden separat nach Wanduhrzeit gezählt – deshalb stimmt beides.',
  });
  registerModule({
    el,
    second(now) {
      if (!change) return;
      if (now < change.at) {
        setText(countdown, humanDuration(change.at - now, 3));
        setText(
          status,
          'bis die Uhr um 03:00 Uhr auf 02:00 Uhr zurückspringt. Die Nacht zum Sonntag dauert 25 Stunden – und der Countdown zählt diese Extrastunde ehrlich mit. Die EU schenkt dir also eine Stunde mehr Wartezeit. Danke für nichts.',
        );
      } else {
        setText(countdown, 'Erledigt');
        setText(status, `Die Zeitumstellung liegt ${humanDuration(now - change.at, 2)} zurück. Seitdem gilt MEZ (UTC+1) – bis zum Release ändert sich daran nichts mehr.`);
      }
    },
  });
  return el;
}
