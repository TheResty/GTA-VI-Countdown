/**
 * Bay 05 – Timeline & Meilensteine: interaktive Zeitachse, Countdown-Wand
 * mit eigenen Countdowns, Meilenstein-Tracker und Restzeit-Atlas.
 */
import { CONFIG } from '../config';
import { emit, on } from '../core/bus';
import { clock } from '../core/clock';
import { fmtDate, fmtDateTime, fmtDstChange, humanDuration, num, pad, relative, splitDuration } from '../core/format';
import { getProfile, unlock } from '../core/game';
import { INTERVALS, currentInterval, intervalContext } from '../core/intervals';
import { MILESTONES, MILESTONE_KIND_LABEL, Milestone, MilestoneKind } from '../core/milestones';
import { CustomCountdown, load, save } from '../core/store';
import { ANCHORS, DST_CHANGES, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, parseLocal } from '../core/tz';
import { HISTORY } from '../data/history';
import { bay } from '../ui/bay';
import { h, s, setText } from '../ui/dom';
import { icon } from '../ui/icons';
import { panel, registerModule } from '../ui/panel';
import { hideTip, showTip } from '../ui/tooltip';

/* ------------------------------------------------------------------ */
/* Ereignisse für die Zeitachse                                        */
/* ------------------------------------------------------------------ */
type Lane = 'rockstar' | 'personal' | 'countdown';

interface TLEvent {
  id: string;
  at: number;
  title: string;
  detail: string;
  lane: Lane;
  kind: string;
  approx?: boolean;
}

function customCountdowns(): CustomCountdown[] {
  return load<CustomCountdown[]>('custom', []);
}

function allEvents(): TLEvent[] {
  const list: TLEvent[] = HISTORY.map((e) => ({
    id: `h-${e.id}`,
    at: parseLocal(e.date, TZ),
    title: e.title,
    detail: e.detail,
    lane: 'rockstar',
    kind: e.kind,
    approx: e.approx,
  }));
  for (const e of CONFIG.events) {
    if (e.id === 'release' || e.id === 'preload') continue;
    list.push({ id: `c-${e.id}`, at: parseLocal(e.date, TZ), title: e.title, detail: e.description, lane: 'personal', kind: e.kind });
  }
  for (const c of DST_CHANGES) {
    list.push({ id: `dst-${c.at}`, at: c.at, title: c.after < c.before ? 'Zeitumstellung (Winterzeit)' : 'Zeitumstellung (Sommerzeit)', detail: `Die Uhr wird umgestellt: ${fmtDstChange(c.at, c.before, c.after)}.`, lane: 'personal', kind: 'system' });
  }
  for (const c of customCountdowns()) {
    list.push({ id: `u-${c.id}`, at: parseLocal(c.date, TZ), title: c.title, detail: 'Eigener Countdown', lane: 'personal', kind: 'custom' });
  }
  for (const m of MILESTONES.filter((m) => m.major && m.kind === 'days')) {
    list.push({ id: `m-${m.id}`, at: m.at, title: `T-${m.id.slice(1)} Tage`, detail: m.detail, lane: 'countdown', kind: 'milestone' });
  }
  return list.sort((a, b) => a.at - b.at);
}

const KIND_COLOR: Record<string, string> = {
  release: '#ffd23f',
  announce: '#3dffb5',
  trailer: '#19f0ff',
  delay: '#ff3b5c',
  leak: '#9b6bff',
  milestone: '#ff8a3d',
  port: '#b9a8d6',
  school: '#19f0ff',
  holiday: '#ff8a3d',
  personal: '#ff2e97',
  system: '#b9a8d6',
  custom: '#ff2e97',
  gta: '#ffd23f',
};

/* ------------------------------------------------------------------ */
/* L-01 Interaktive Zeitachse                                          */
/* ------------------------------------------------------------------ */
function interactiveTimeline(): HTMLElement {
  const ranges = [
    { id: 'all', label: '1997 – heute', from: parseLocal('1997-06-01', TZ), to: parseLocal('2027-02-01', TZ) },
    { id: 'v6', label: 'GTA V → VI', from: parseLocal('2013-06-01', TZ), to: parseLocal('2027-01-01', TZ) },
    { id: 't1', label: 'Seit Trailer 1', from: parseLocal('2023-10-01', TZ), to: parseLocal('2026-12-31', TZ) },
    { id: 'y26', label: '2026', from: parseLocal('2026-01-01', TZ), to: parseLocal('2027-01-10', TZ) },
    { id: 'near', label: 'Nächste 60 Tage', from: 0, to: 0 },
  ];
  let range = load<string>('tl-range', 'near');
  if (!ranges.some((r) => r.id === range)) range = 'near';
  const lanes: { id: Lane; label: string }[] = [
    { id: 'rockstar', label: 'Rockstar' },
    { id: 'personal', label: 'Persönlich' },
    { id: 'countdown', label: 'Countdown' },
  ];
  const enabled = new Set<Lane>(['rockstar', 'personal', 'countdown']);

  const seg = h(
    'div.seg',
    { role: 'tablist', 'aria-label': 'Zeitraum' },
    ranges.map((r) =>
      h(
        'button.seg__btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(r.id === range),
          dataset: { id: r.id },
          onclick: () => {
            range = r.id;
            save('tl-range', range);
            seg.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === range)));
            render(clock.now());
          },
        },
        r.label,
      ),
    ),
  );
  const filters = h(
    'div.filters',
    lanes.map((l) => {
      const cb = h<HTMLInputElement>('input', { type: 'checkbox', checked: true, id: `tl-${l.id}` });
      cb.addEventListener('change', () => {
        if (cb.checked) enabled.add(l.id);
        else enabled.delete(l.id);
        render(clock.now());
      });
      return h('label.filter', cb, h('span', l.label));
    }),
  );

  const svgWrap = h('div.tl__scroll');
  const detail = h('div.tl__detail', { 'aria-live': 'polite' });
  const listEl = h('ol.tl__list');
  let selected: TLEvent | null = null;

  const W = 1400;
  const laneH = 46;
  const top = 34;

  function showDetail(e: TLEvent, now: number) {
    selected = e;
    detail.replaceChildren(
      h('span.tl__detail-kind', { style: { '--c': KIND_COLOR[e.kind] ?? '#ff2e97' } }, laneLabel(e.lane)),
      h('h4', e.title),
      h('p.tl__detail-date', `${e.approx ? '≈ ' : ''}${fmtDate(e.at, 'full')} · ${relative(e.at, now)}`),
      h('p', e.detail),
    );
  }
  const laneLabel = (l: Lane) => lanes.find((x) => x.id === l)?.label ?? '';

  function render(now: number) {
    const r = ranges.find((x) => x.id === range)!;
    const from = r.id === 'near' ? now - 7 * DAY_MS : r.from;
    const to = r.id === 'near' ? now + 60 * DAY_MS : r.to;
    const span = to - from;
    const xOf = (t: number) => 30 + ((t - from) / span) * (W - 60);
    const events = allEvents().filter((e) => enabled.has(e.lane) && e.at >= from && e.at <= to);
    const activeLanes = lanes.filter((l) => enabled.has(l.id));
    const H = top + activeLanes.length * laneH + 30;

    // Achsen-Ticks
    const ticks: SVGElement[] = [];
    const days = span / DAY_MS;
    const d0 = new Date(from);
    if (days > 800) {
      for (let y = d0.getUTCFullYear(); y <= new Date(to).getUTCFullYear() + 1; y++) {
        const t = parseLocal(`${y}-01-01`, TZ);
        if (t < from || t > to) continue;
        const step = days > 6000 ? 2 : 1;
        if (y % step) continue;
        ticks.push(s('line.tl__grid', { x1: String(xOf(t)), x2: String(xOf(t)), y1: String(top - 8), y2: String(H - 22) }));
        ticks.push(s('text.tl__tick', { x: String(xOf(t)), y: String(H - 6), 'text-anchor': 'middle' }, String(y)));
      }
    } else {
      const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      let y = d0.getUTCFullYear();
      let m = d0.getUTCMonth() + 1;
      for (let i = 0; i < 60; i++) {
        const t = parseLocal(`${y}-${String(m).padStart(2, '0')}-01`, TZ);
        if (t > to) break;
        if (t >= from && (days < 400 || m % 3 === 1)) {
          ticks.push(s('line.tl__grid', { x1: String(xOf(t)), x2: String(xOf(t)), y1: String(top - 8), y2: String(H - 22) }));
          ticks.push(s('text.tl__tick', { x: String(xOf(t)), y: String(H - 6), 'text-anchor': 'middle' }, m === 1 ? `${months[0]} ${y}` : months[m - 1]));
        }
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
      if (days <= 90) {
        // Wochenmarken
        const dayStart = Math.floor(from / DAY_MS) * DAY_MS;
        for (let t = dayStart; t <= to; t += DAY_MS) {
          if (new Date(t).getUTCDay() !== 1) continue;
          ticks.push(s('line.tl__grid.tl__grid--minor', { x1: String(xOf(t)), x2: String(xOf(t)), y1: String(top - 4), y2: String(H - 22) }));
        }
      }
    }

    const laneEls = activeLanes.map((l, i) => {
      const y = top + i * laneH + laneH / 2;
      return [
        s('line.tl__lane', { x1: '30', x2: String(W - 30), y1: String(y), y2: String(y) }),
        s('text.tl__lane-label', { x: '34', y: String(y - 12) }, l.label),
      ];
    });

    const dots = events.map((e) => {
      const li = activeLanes.findIndex((l) => l.id === e.lane);
      const y = top + li * laneH + laneH / 2;
      const x = xOf(e.at);
      const past = e.at <= now;
      const g = s(
        `g.tl__ev${past ? '.is-past' : ''}${selected?.id === e.id ? '.is-selected' : ''}`,
        { tabindex: '0', role: 'button', 'aria-label': `${e.title}, ${fmtDate(e.at, 'date')}` },
        s('circle.tl__hit', { cx: String(x), cy: String(y), r: '13' }),
        s('circle.tl__dot', { cx: String(x), cy: String(y), r: e.kind === 'release' ? '7' : '5', style: `--c:${KIND_COLOR[e.kind] ?? '#ff2e97'}` }),
      );
      g.addEventListener('pointerenter', (ev) => showTip((ev as PointerEvent).clientX, (ev as PointerEvent).clientY, e.title, [`${e.approx ? '≈ ' : ''}${fmtDate(e.at, 'date')}`, relative(e.at, now)]));
      g.addEventListener('pointerleave', hideTip);
      g.addEventListener('click', () => {
        showDetail(e, clock.now());
        render(clock.now());
      });
      g.addEventListener('keydown', (ev) => {
        if ((ev as KeyboardEvent).key === 'Enter' || (ev as KeyboardEvent).key === ' ') {
          ev.preventDefault();
          showDetail(e, clock.now());
        }
      });
      return g;
    });

    // Direkte Beschriftung – nur dort, wo Platz ist, wichtige Ereignisse zuerst
    const priority: Record<string, number> = { release: 0, trailer: 1, delay: 2, announce: 3, milestone: 4, gta: 4, leak: 5, school: 5, holiday: 5, custom: 5, personal: 5 };
    const placed = new Map<number, [number, number][]>();
    const labels: SVGElement[] = [];
    [...events]
      .sort((a, b) => (priority[a.kind] ?? 6) - (priority[b.kind] ?? 6) || a.at - b.at)
      .forEach((e) => {
        const li = activeLanes.findIndex((l) => l.id === e.lane);
        const text = e.title.length > 26 ? `${e.title.slice(0, 25)}…` : e.title;
        const w = text.length * 6.4 + 8;
        const x = xOf(e.at);
        const a = Math.max(30, x - w / 2);
        const b = a + w;
        if (b > W - 20) return;
        const taken = placed.get(li) ?? [[30, 112] as [number, number]];
        if (taken.some(([p, q]) => a < q + 6 && b > p - 6)) return;
        taken.push([a, b]);
        placed.set(li, taken);
        const y = top + li * laneH + laneH / 2 - 11;
        labels.push(s('text.tl__label', { x: String(a + w / 2), y: String(y), 'text-anchor': 'middle' }, text));
      });

    const nowX = xOf(now);
    const nowEls = now >= from && now <= to ? [s('line.tl__now', { x1: String(nowX), x2: String(nowX), y1: '14', y2: String(H - 22) }), s('text.tl__now-label', { x: String(nowX), y: '12', 'text-anchor': 'middle' }, 'JETZT')] : [];
    const relX = xOf(RELEASE);
    const relEls = RELEASE >= from && RELEASE <= to ? [s('line.tl__release', { x1: String(relX), x2: String(relX), y1: '14', y2: String(H - 22) }), s('text.tl__release-label', { x: String(relX), y: '12', 'text-anchor': 'middle' }, 'GTA VI')] : [];

    const svg = s('svg.tl', { viewBox: `0 0 ${W} ${H}`, width: String(W), height: String(H), role: 'img', 'aria-label': 'Interaktive Zeitachse' }, ticks, laneEls, relEls, nowEls, labels, dots);
    svgWrap.replaceChildren(svg);
    // Zum „Jetzt“ scrollen
    requestAnimationFrame(() => {
      const ratio = svgWrap.scrollWidth / W;
      svgWrap.scrollLeft = Math.max(0, nowX * ratio - svgWrap.clientWidth * 0.6);
    });

    listEl.replaceChildren(
      ...events.map((e) =>
        h(
          `li.tl__item${e.at <= now ? '.is-past' : ''}`,
          h('span.tl__item-dot', { style: { background: KIND_COLOR[e.kind] ?? '#ff2e97' } }),
          h('time', `${e.approx ? '≈ ' : ''}${fmtDate(e.at, 'date')}`),
          h('button.linklike', { type: 'button', onclick: () => showDetail(e, clock.now()) }, e.title),
          h('span.tl__item-rel', relative(e.at, now)),
        ),
      ),
    );
    if (!selected) {
      const next = events.find((e) => e.at > now) ?? events[events.length - 1];
      if (next) showDetail(next, now);
    }
  }

  const el = panel({
    id: 'zeitachse',
    code: 'L-01',
    title: 'Interaktive Zeitachse',
    kicker: 'Rockstar-Geschichte, persönliche Termine und Countdown-Marken auf einer Achse. Punkt antippen für Details.',
    tone: 'cyan',
    span: 4,
    body: h('div.tl-wrap', h('div.tl__controls', seg, filters), svgWrap, h('div.tl__bottom', detail, h('div.tl__list-wrap', listEl))),
  });
  let lastMin = -1;
  registerModule({
    el,
    second(now) {
      const m = Math.floor(now / 60_000);
      if (m === lastMin) return;
      lastMin = m;
      render(now);
    },
    refresh: (now) => render(now),
  });
  on('custom-countdowns', () => render(clock.now()));
  return el;
}

/* ------------------------------------------------------------------ */
/* L-02 Countdown-Wand                                                 */
/* ------------------------------------------------------------------ */
function countdownWall(): HTMLElement {
  const grid = h('div.cd-grid');
  const title = h<HTMLInputElement>('input.input#cd-title', { type: 'text', maxLength: 60, placeholder: 'z. B. Geburtstag von Lea', required: true });
  const date = h<HTMLInputElement>('input.input#cd-date', { type: 'date', required: true });
  const time = h<HTMLInputElement>('input.input#cd-time', { type: 'time', value: '00:00' });
  const err = h('p.form-error', { hidden: true });
  const form = h(
    'form.cd-form',
    h('h4.subhead', 'Eigenen Countdown hinzufügen'),
    h('div.cd-form__row', h('label.field', h('span', 'Titel'), title), h('label.field', h('span', 'Datum'), date), h('label.field', h('span', 'Uhrzeit'), time)),
    err,
    h('button.btn.btn--pink', { type: 'submit' }, icon('plus', 18), 'Countdown anlegen'),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t || !date.value) {
      err.hidden = false;
      err.textContent = 'Bitte Titel und Datum angeben.';
      return;
    }
    const value = `${date.value}T${time.value || '00:00'}`;
    let at: number;
    try {
      at = parseLocal(value, TZ);
    } catch {
      err.hidden = false;
      err.textContent = 'Das Datum konnte nicht gelesen werden.';
      return;
    }
    if (at <= clock.now()) {
      err.hidden = false;
      err.textContent = 'Der Termin liegt in der Vergangenheit. Ein Countdown braucht ein Ziel in der Zukunft.';
      return;
    }
    err.hidden = true;
    const list = customCountdowns();
    list.push({ id: Math.random().toString(36).slice(2, 9), title: t, date: value, created: clock.now() });
    save('custom', list);
    title.value = '';
    unlock('custom_countdown');
    emit('toast', { title: 'Countdown angelegt', text: `${t} – ${fmtDateTime(at)}`, tone: 'good', icon: 'plus' });
    emit('custom-countdowns', undefined);
  });

  interface Card {
    id: string;
    title: string;
    at: number;
    dateText: string;
    start: number;
    custom: boolean;
    kind: string;
    value: HTMLElement;
    sub: HTMLElement;
    fill: HTMLElement;
    el: HTMLElement;
  }
  let cards: Card[] = [];

  const build = () => {
    const first = getProfile().firstVisit;
    const defs: Omit<Card, 'value' | 'sub' | 'fill' | 'el'>[] = [
      ...CONFIG.events.filter((e) => e.countdown).map((e) => {
        const at = parseLocal(e.date, TZ);
        return { id: e.id, title: e.title, at, dateText: fmtDateTime(at), start: Math.min(first, ANCHORS.year2026), custom: false, kind: e.kind };
      }),
      ...DST_CHANGES.filter((c) => c.at > clock.now() - 30 * DAY_MS && c.at < RELEASE + 60 * DAY_MS).map((c) => ({
        id: `dst-${c.at}`,
        title: c.after < c.before ? 'Zeitumstellung (Winterzeit)' : 'Zeitumstellung (Sommerzeit)',
        at: c.at,
        dateText: fmtDstChange(c.at, c.before, c.after),
        start: Math.min(first, ANCHORS.year2026),
        custom: false,
        kind: 'system',
      })),
      ...customCountdowns().map((c) => {
        const at = parseLocal(c.date, TZ);
        return { id: c.id, title: c.title, at, dateText: fmtDateTime(at), start: c.created, custom: true, kind: 'custom' };
      }),
    ].sort((a, b) => a.at - b.at);
    cards = defs.map((d) => {
      const value = h('b.cd__value');
      const sub = h('span.cd__sub');
      const fill = h('span.bar__fill');
      const del = d.custom
        ? h(
            'button.cd__del',
            {
              type: 'button',
              'aria-label': `${d.title} löschen`,
              title: 'Löschen',
              onclick: () => {
                save('custom', customCountdowns().filter((c) => c.id !== d.id));
                emit('custom-countdowns', undefined);
              },
            },
            icon('trash', 16),
          )
        : null;
      const el = h(
        `article.cd.kind-${d.kind}${d.id === 'release' ? '.cd--release' : ''}`,
        h('header.cd__head', h('h4', d.title), del),
        h('p.cd__date', d.dateText),
        value,
        h('span.bar', h('span.bar__track', fill)),
        sub,
      );
      return { ...d, value, sub, fill, el };
    });
    grid.replaceChildren(...cards.map((c) => c.el));
  };
  build();
  on('custom-countdowns', build);

  const el = panel({
    id: 'countdowns',
    code: 'L-02',
    title: 'Countdown-Wand',
    kicker: 'Alle Termine rund um den Release – plus deine eigenen. Fortschritt jeweils seit deinem ersten Besuch bzw. seit Anlegen.',
    tone: 'pink',
    span: 4,
    body: h('div', grid, form),
  });
  registerModule({
    el,
    second(now) {
      for (const c of cards) {
        const diff = c.at - now;
        const p = splitDuration(Math.abs(diff));
        setText(c.value, diff > 0 ? `${p.days}T ${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}` : 'Erreicht');
        c.el.classList.toggle('is-done', diff <= 0);
        const f = Math.max(0, Math.min(1, (now - c.start) / Math.max(1, c.at - c.start)));
        c.fill.style.transform = `scaleX(${f})`;
        const relToRelease = c.at - RELEASE;
        setText(
          c.sub,
          diff <= 0
            ? `vor ${humanDuration(-diff, 2)}`
            : c.id === 'release'
              ? 'Das Hauptziel.'
              : Math.abs(relToRelease) < 60_000
                ? 'zeitgleich mit dem Release'
                : `${humanDuration(Math.abs(relToRelease), 2)} ${relToRelease < 0 ? 'vor' : 'nach'} dem Release`,
        );
      }
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* L-03 Meilenstein-Tracker                                            */
/* ------------------------------------------------------------------ */
function milestoneTracker(): HTMLElement {
  const majors = MILESTONES.filter((m) => m.kind === 'days' && m.major);
  const majorEls = majors.map((m) => ({ m, el: h('li.major'), status: h('span.major__status'), when: h('span.major__when') }));
  majorEls.forEach((x) => x.el.append(h('b.major__label', `T-${m2d(x.m)}`), x.when, x.status));
  const nextBox = h('div.next-ms');
  let kind: MilestoneKind | 'all' = 'all';
  const kinds: (MilestoneKind | 'all')[] = ['all', 'days', 'hours', 'minutes', 'seconds', 'percent', 'event'];
  const seg = h(
    'div.seg.seg--small',
    { role: 'tablist', 'aria-label': 'Meilenstein-Art' },
    kinds.map((k) =>
      h(
        'button.seg__btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(k === kind),
          onclick: (e: Event) => {
            kind = k;
            seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget)));
            lastKey = '';
          },
        },
        k === 'all' ? 'Alle' : MILESTONE_KIND_LABEL[k],
      ),
    ),
  );
  const list = h('ol.ms-list');
  const el = panel({
    id: 'meilensteine',
    code: 'L-03',
    title: 'Meilenstein-Tracker',
    kicker: 'Tages-, Stunden-, Sekunden- und Prozentmarken – mit exaktem Zeitpunkt. Wer eine Marke live miterlebt, bekommt ein Achievement.',
    tone: 'orange',
    span: 2,
    tall: true,
    actions: seg,
    body: h('div', h('ul.majors', majorEls.map((x) => x.el)), nextBox, h('div.ms-scroll', list)),
  });
  let lastKey = '';
  registerModule({
    el,
    second(now) {
      for (const x of majorEls) {
        const done = x.m.at <= now;
        x.el.classList.toggle('is-done', done);
        setText(x.when, `${fmtDate(x.m.at, 'dateShort')}, ${fmtDate(x.m.at, 'time')}`);
        setText(x.status, done ? 'erreicht' : humanDuration(x.m.at - now, 2));
      }
      const next = MILESTONES.find((m) => m.at > now);
      if (next) {
        const p = splitDuration(next.at - now);
        nextBox.replaceChildren(
          h('span.next-ms__tag', 'Nächster Meilenstein'),
          h('b.next-ms__label', next.label),
          h('span.next-ms__count', `${p.days ? `${p.days}T ` : ''}${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`),
          h('span.next-ms__detail', `${fmtDateTime(next.at, true)} · ${next.detail}`),
        );
      } else nextBox.replaceChildren(h('b.next-ms__label', 'Alle Meilensteine erreicht.'));
      const key = `${kind}-${Math.floor(now / 30_000)}`;
      if (key === lastKey) return;
      lastKey = key;
      const items = MILESTONES.filter((m) => kind === 'all' || m.kind === kind);
      list.replaceChildren(
        ...items.map((m) =>
          h(
            `li.ms${m.at <= now ? '.is-done' : ''}${m === next ? '.is-next' : ''}`,
            h('span.ms__check', { 'aria-hidden': 'true' }, m.at <= now ? '✓' : ''),
            h('span.ms__label', m.label, h('small', MILESTONE_KIND_LABEL[m.kind])),
            h('time.ms__time', m.timeText ?? fmtDateTime(m.at)),
            h('span.ms__rel', relative(m.at, now)),
          ),
        ),
      );
      const nextEl = list.querySelector<HTMLElement>('.is-next');
      if (nextEl && list.parentElement) {
        const sc = list.parentElement;
        sc.scrollTop = Math.max(0, nextEl.offsetTop - sc.clientHeight / 3);
      }
    },
  });
  return el;
}

function m2d(m: Milestone): string {
  return m.id.slice(1);
}

/* ------------------------------------------------------------------ */
/* L-04 Restzeit-Atlas                                                 */
/* ------------------------------------------------------------------ */
function intervalAtlas(): HTMLElement {
  const list = h('ol.atlas');
  const el = panel({
    id: 'atlas',
    code: 'L-04',
    title: 'Restzeit-Atlas',
    kicker: 'Für jede Restzeit-Phase ein eigener Text. Kommende Phasen zeigen eine Vorschau – berechnet für genau den Moment, in dem sie beginnen.',
    tone: 'violet',
    span: 2,
    tall: true,
    body: h('div.atlas-scroll', list),
  });
  el.id = 'restzeit-atlas';
  let lastKey = '';
  registerModule({
    el,
    second(now) {
      const diff = RELEASE - now;
      const cur = currentInterval(diff);
      const key = `${cur.id}-${Math.floor(now / 60_000)}`;
      if (key === lastKey) return;
      lastKey = key;
      list.replaceChildren(
        ...INTERVALS.map((iv) => {
          const isCur = iv === cur;
          const passed = diff < iv.min;
          // Vorschau-Zeitpunkt: Beginn der Phase (bzw. jetzt für die aktuelle)
          let at = now;
          if (!isCur && !passed) at = Number.isFinite(iv.max) ? RELEASE - iv.max + 1000 : now;
          if (passed) at = Number.isFinite(iv.min) ? RELEASE - Math.max(iv.min, -400 * DAY_MS) - 1000 : now;
          const text = iv.text(intervalContext(at));
          const startsAt = Number.isFinite(iv.max) ? RELEASE - iv.max : null;
          return h(
            `li.atlas__item${isCur ? '.is-current' : ''}${passed ? '.is-past' : ''}`,
            h('div.atlas__meta', h('span.atlas__range', iv.range), isCur ? h('span.badge', 'Jetzt') : startsAt && startsAt > now ? h('span.atlas__when', `ab ${fmtDateTime(startsAt)}`) : null),
            h('b.atlas__title', iv.title),
            h('p.atlas__text', text),
          );
        }),
      );
      const curEl = list.querySelector<HTMLElement>('.is-current');
      const sc = list.parentElement;
      if (curEl && sc) sc.scrollTop = Math.max(0, curEl.offsetTop - 20);
    },
  });
  return el;
}

export function timelineSection(): HTMLElement {
  const total = MILESTONES.length;
  return bay({
    id: 'timeline',
    index: 5,
    eyebrow: 'Timeline & Meilensteine',
    script: 'Route',
    title: 'Der Weg nach Leonida',
    tone: 'ocean',
    lead: `Vergangene und kommende Ereignisse, ${num(total)} exakt berechnete Meilensteine und eigene Countdowns – etwa für das Ende der Klausuren am 24. November.`,
    body: h('div.grid', interactiveTimeline(), countdownWall(), milestoneTracker(), intervalAtlas()),
  });
}

