/**
 * Vergleichsmodule: Wartezeit-Umrechner und historische Maßstäbe.
 */
import { on } from '../core/bus';
import { humanDuration, num } from '../core/format';
import { getStart } from '../core/startpoint';
import { load, save } from '../core/store';
import { ANCHORS, RELEASE } from '../core/timeline';
import { DAY_MS } from '../core/tz';
import { REFERENCES, UNITS } from '../data/comparisons';
import { h, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';

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
  type Span = 'rest' | 'start' | 'gta5';
  let span: Span = 'rest';
  const list = h('ul.scale-list');
  const head = h('p.scale__head');
  const seg = h(
    'div.seg.seg--small',
    { role: 'tablist', 'aria-label': 'Zeitspanne' },
    (
      [
        ['rest', 'Restzeit'],
        ['start', 'Seit Startpunkt'],
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
  on('startpoint', () => (lastKey = ''));
  registerModule({
    el,
    second(now) {
      const key = `${span}-${Math.floor(now / 60_000)}`;
      if (key === lastKey) return;
      lastKey = key;
      const value =
        span === 'rest' ? Math.max(0, RELEASE - now) : span === 'start' ? RELEASE - getStart().at : RELEASE - ANCHORS.gta5;
      const label = span === 'rest' ? 'Die Restzeit' : span === 'start' ? `Die Wartezeit seit ${getStart().label}` : 'Die Wartezeit seit GTA V';
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
