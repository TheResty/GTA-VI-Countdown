/**
 * Kalender-Visualisierungen: Countdown-Kalender, Wartejahre in Wochen,
 * Zeitspirale und Stundenbudget.
 */
import { CONFIG } from '../config';
import { DAY_TYPE_LABEL, DayType, dayType, holidayOf, isSchoolDay } from '../core/calendar';
import { clock } from '../core/clock';
import { fmtDate, num, plural } from '../core/format';
import { onSettings, settings } from '../core/settings';
import { ANCHORS, EXAMS_END, LAST_WAIT_DAY, RELEASE, RELEASE_CIVIL, TZ } from '../core/timeline';
import {
  CivilDate,
  DAY_MS,
  HOUR_MS,
  civilAddDays,
  civilCompare,
  civilDiff,
  civilEquals,
  civilFromMs,
  civilKey,
  civilWeekday,
  parseLocal,
  startOfCivilDay,
  zonedParts,
} from '../core/tz';
import { HISTORY } from '../data/history';
import { fitCanvas, h, s } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';
import { bindTip, hideTip, showTip } from '../ui/tooltip';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const TYPE_COLOR: Record<DayType, string> = {
  holiday: '#ff8a3d',
  school: '#19f0ff',
  weekend: '#ff2e97',
  free: '#9b6bff',
  preload: '#ffd23f',
  release: '#fff4d6',
  exams: '#9b6bff',
};

/* ------------------------------------------------------------------ */
/* T-05 Countdown-Kalender                                             */
/* ------------------------------------------------------------------ */
export function countdownCalendar(): HTMLElement {
  const months = h('div.cal-months');
  const legendTypes: DayType[] = ['holiday', 'school', 'weekend', 'preload', 'release', 'exams'];
  const legend = h(
    'ul.legend.legend--row',
    legendTypes.map((t) => h('li', h('span.legend__swatch', { style: { background: TYPE_COLOR[t] } }), DAY_TYPE_LABEL[t])),
    h('li', h('span.legend__swatch.legend__swatch--past'), 'geschafft'),
  );

  let builtFor = '';
  const build = (now: number) => {
    const today = civilFromMs(now, TZ);
    const key = civilKey(today);
    if (key === builtFor) return;
    builtFor = key;
    const examsEnd = civilFromMs(EXAMS_END, TZ);
    const first = { y: today.y, m: today.m, d: 1 };
    const endMonth = civilCompare(examsEnd, RELEASE_CIVIL) > 0 ? examsEnd : RELEASE_CIVIL;
    const blocks: HTMLElement[] = [];
    let cursor = first;
    for (let guard = 0; guard < 6 && (cursor.y < endMonth.y || (cursor.y === endMonth.y && cursor.m <= endMonth.m)); guard++) {
      blocks.push(monthGrid(cursor, today));
      cursor = cursor.m === 12 ? { y: cursor.y + 1, m: 1, d: 1 } : { y: cursor.y, m: cursor.m + 1, d: 1 };
    }
    months.replaceChildren(...blocks);
  };

  function monthGrid(m: CivilDate, today: CivilDate): HTMLElement {
    const firstWd = (civilWeekday(m) + 6) % 7; // Montag = 0
    const daysIn = new Date(Date.UTC(m.y, m.m, 0)).getUTCDate();
    const cells: HTMLElement[] = [];
    for (let i = 0; i < firstWd; i++) cells.push(h('span.cal__cell.is-empty', { 'aria-hidden': 'true' }));
    for (let d = 1; d <= daysIn; d++) {
      const c = { y: m.y, m: m.m, d };
      const type = dayType(c);
      const past = civilCompare(c, today) < 0;
      const isToday = civilEquals(c, today);
      const after = civilCompare(c, RELEASE_CIVIL) > 0;
      const daysTo = civilDiff(today, RELEASE_CIVIL) - civilDiff(today, c);
      const cell = h(
        `button.cal__cell.type-${type}${past ? '.is-past' : ''}${isToday ? '.is-today' : ''}${after ? '.is-after' : ''}`,
        { type: 'button', style: { '--c': TYPE_COLOR[type] }, 'aria-label': `${d}. ${MONTHS[m.m - 1]}: ${DAY_TYPE_LABEL[type]}` },
        h('span.cal__num', String(d)),
      );
      bindTip(cell, () => {
        const hol = holidayOf(c);
        const lines = [`${DAY_TYPE_LABEL[type]}${hol ? ` (${hol})` : ''}`];
        if (civilCompare(c, RELEASE_CIVIL) < 0) lines.push(past ? 'geschafft' : isToday ? 'heute' : `danach noch ${plural(daysTo, 'Tag', 'Tage')} bis GTA VI`);
        else if (civilEquals(c, RELEASE_CIVIL)) lines.push('00:00 Uhr: GTA VI');
        return { title: fmtDate(startOfCivilDay(c, TZ) + 12 * HOUR_MS, 'full'), lines };
      });
      cells.push(cell);
    }
    return h(
      'div.cal',
      h('h4.cal__title', `${MONTHS[m.m - 1]} ${m.y}`),
      h('div.cal__head', WD_SHORT.map((w) => h('span', w))),
      h('div.cal__grid', cells),
    );
  }

  const el = panel({
    id: 'kalender',
    code: 'T-05',
    title: 'Countdown-Kalender',
    kicker: 'Jeder verbleibende Tag nach Art: Ferien, Schule, Wochenende, Preload, Release und Klausurphase.',
    tone: 'violet',
    span: 2,
    body: h('div', months, legend),
  });
  registerModule({ el, second: build, refresh: (now) => ((builtFor = ''), build(now)) });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-06 Wartejahre in Wochen                                           */
/* ------------------------------------------------------------------ */
export function waitWeeks(): HTMLElement {
  const start = ANCHORS.gta5;
  const totalWeeks = Math.ceil((RELEASE - start) / (7 * DAY_MS));
  const cols = 52;
  const rows = Math.ceil(totalWeeks / cols);
  const cell = 10;
  const gap = 2;
  const labelW = 30;
  const W = labelW + cols * (cell + gap);
  const H = rows * (cell + gap);
  const kindColor: Record<string, string> = {
    release: '#ffd23f',
    trailer: '#19f0ff',
    delay: '#ff3b5c',
    announce: '#3dffb5',
    leak: '#9b6bff',
  };
  const eventsByWeek = new Map<number, typeof HISTORY>();
  for (const e of HISTORY) {
    const t = parseLocal(e.date, TZ);
    if (t < start || t > RELEASE) continue;
    const w = Math.floor((t - start) / (7 * DAY_MS));
    if (!eventsByWeek.has(w)) eventsByWeek.set(w, []);
    eventsByWeek.get(w)!.push(e);
  }
  const rects: SVGRectElement[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const x = labelW + (i % cols) * (cell + gap);
    const y = Math.floor(i / cols) * (cell + gap);
    const ev = eventsByWeek.get(i);
    const kind = ev?.find((e) => kindColor[e.kind])?.kind;
    const r = s<SVGRectElement>('rect.week', { x: String(x), y: String(y), width: String(cell), height: String(cell), rx: '2' });
    if (kind) {
      r.classList.add('is-event');
      r.style.setProperty('--ev', kindColor[kind]);
    }
    rects.push(r);
  }
  const yearLabels = Array.from({ length: rows }, (_, i) =>
    s('text.weeks__year', { x: '0', y: String(i * (cell + gap) + cell - 1) }, String(new Date(start + i * 52 * 7 * DAY_MS).getUTCFullYear())),
  );
  const svg = s('svg.weeks', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${totalWeeks} Wochen zwischen GTA V und GTA VI` }, yearLabels, rects);
  const summary = h('p.weeks__summary');
  const legend = h(
    'ul.legend.legend--row',
    [
      ['release', 'Release'],
      ['trailer', 'Trailer'],
      ['announce', 'Ankündigung'],
      ['delay', 'Verschiebung'],
      ['leak', 'Leak'],
    ].map(([k, l]) => h('li', h('span.legend__swatch', { style: { background: kindColor[k] } }), l)),
    h('li', h('span.legend__swatch.legend__swatch--past'), 'vergangen'),
  );

  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W - labelW;
    const sy = ((e.clientY - r.top) / r.height) * H;
    if (sx < 0) return hideTip();
    const i = Math.floor(sy / (cell + gap)) * cols + Math.floor(sx / (cell + gap));
    if (i < 0 || i >= totalWeeks) return hideTip();
    const ws = start + i * 7 * DAY_MS;
    const ev = eventsByWeek.get(i) ?? [];
    showTip(e.clientX, e.clientY, `Woche ${num(i + 1)} von ${num(totalWeeks)}`, [
      `${fmtDate(ws, 'date')} – ${fmtDate(ws + 6 * DAY_MS, 'date')}`,
      ...ev.map((x) => `● ${x.title}`),
    ]);
  });
  svg.addEventListener('pointerleave', hideTip);

  const el = panel({
    id: 'wochen',
    code: 'T-06',
    title: '13 Jahre in Wochen',
    kicker: 'Jedes Kästchen ist eine Woche seit dem Release von GTA V. Eine Zeile entspricht 52 Wochen.',
    tone: 'pink',
    span: 2,
    body: h('div', h('div.weeks__scroll', svg), summary, legend),
  });

  let lastIdx = -1;
  registerModule({
    el,
    second(now) {
      const idx = Math.floor((now - start) / (7 * DAY_MS));
      if (idx === lastIdx) return;
      lastIdx = idx;
      rects.forEach((r, i) => {
        r.classList.toggle('is-past', i < idx);
        r.classList.toggle('is-now', i === idx);
      });
      const left = Math.max(0, totalWeeks - idx - 1);
      summary.textContent = `${num(Math.min(idx, totalWeeks))} von ${num(totalWeeks)} Wochen vergangen – noch ${plural(left, 'Woche', 'Wochen')} plus die aktuelle.`;
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-07 Zeitspirale                                                    */
/* ------------------------------------------------------------------ */
export function timeSpiral(): HTMLElement {
  const canvas = h<HTMLCanvasElement>('canvas.spiral', { role: 'img', 'aria-label': 'Zeitspirale: ein Punkt pro Tag' });
  let mode: 't1' | 'gta5' = 't1';
  const seg = h(
    'div.seg.seg--small',
    { role: 'tablist', 'aria-label': 'Startpunkt der Spirale' },
    [
      ['t1', 'Seit Trailer 1'],
      ['gta5', 'Seit GTA V'],
    ].map(([k, l]) =>
      h(
        'button.seg__btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(k === mode),
          onclick: (e: Event) => {
            mode = k as typeof mode;
            seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget)));
            dots = layout();
            draw(clock.now());
          },
        },
        l,
      ),
    ),
  );
  const caption = h('p.spiral__caption');

  interface Dot {
    t: number;
    x: number;
    y: number;
    special?: string;
    color?: string;
  }
  let dots: Dot[] = [];
  let size = { w: 0, h: 0 };

  function layout(): Dot[] {
    const start = mode === 't1' ? ANCHORS.trailer1 : ANCHORS.gta5;
    const startDay = civilFromMs(start, TZ);
    const total = civilDiff(startDay, RELEASE_CIVIL);
    const specials = new Map<string, { label: string; color: string }>();
    for (const e of HISTORY) {
      const color = e.kind === 'release' ? '#ffd23f' : e.kind === 'trailer' ? '#19f0ff' : e.kind === 'delay' ? '#ff3b5c' : e.kind === 'announce' ? '#3dffb5' : '';
      if (color) specials.set(e.date, { label: e.title, color });
    }
    const out: Dot[] = [];
    const r0 = 0.12;
    for (let i = 0; i <= total; i++) {
      const c = civilAddDays(startDay, i);
      const theta = (i / 365.2425) * Math.PI * 2 - Math.PI / 2;
      const r = r0 + (1 - r0) * (i / Math.max(1, total));
      const sp = specials.get(civilKey(c));
      out.push({ t: startOfCivilDay(c, TZ), x: Math.cos(theta) * r, y: Math.sin(theta) * r, special: sp?.label, color: sp?.color });
    }
    return out;
  }
  dots = layout();

  function draw(now: number) {
    const { ctx, w, h: hh } = fitCanvas(canvas);
    size = { w, h: hh };
    ctx.clearRect(0, 0, w, hh);
    const R = Math.min(w, hh) / 2 - 10;
    const cx = w / 2;
    const cy = hh / 2;
    const idx = dots.findIndex((d) => d.t > now) - 1;
    const cur = idx < 0 ? dots.length - 1 : idx;
    const dense = dots.length > 2000;
    const rad = dense ? 1.1 : 2;
    // Verbindungslinie
    ctx.beginPath();
    dots.forEach((d, i) => (i === 0 ? ctx.moveTo(cx + d.x * R, cy + d.y * R) : ctx.lineTo(cx + d.x * R, cy + d.y * R)));
    ctx.strokeStyle = 'rgba(245,236,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    dots.forEach((d, i) => {
      const x = cx + d.x * R;
      const y = cy + d.y * R;
      if (i <= cur) {
        const age = (cur - i) / Math.max(1, cur);
        ctx.fillStyle = `rgba(255, ${Math.round(46 + 110 * (1 - age))}, ${Math.round(151 - 90 * (1 - age))}, ${0.35 + 0.6 * (1 - age)})`;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(25, 240, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, rad + 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    for (const d of dots) {
      if (!d.color) continue;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(cx + d.x * R, cy + d.y * R, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#120628';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const c = dots[cur];
    const pulse = 6 + Math.sin(now / 250) * 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + c.x * R, cy + c.y * R, pulse, 0, Math.PI * 2);
    ctx.stroke();
    // Ziel im Zentrum? Nein: Ziel ist das äußere Ende der Spirale
    const end = dots[dots.length - 1];
    ctx.fillStyle = '#ffd23f';
    ctx.font = '600 11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GTA VI', cx + end.x * R, cy + end.y * R - 9);
    const left = dots.length - 1 - cur;
    caption.textContent = `${num(cur + 1)} von ${num(dots.length)} Tagen auf der Spirale erreicht – noch ${plural(left, 'Punkt', 'Punkte')} bis zum äußeren Ende. Eine Umdrehung ist ein Jahr.`;
  }

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const R = Math.min(size.w, size.h) / 2 - 10;
    const mx = (e.clientX - r.left - size.w / 2) / R;
    const my = (e.clientY - r.top - size.h / 2) / R;
    let best: Dot | null = null;
    let bd = Infinity;
    for (const d of dots) {
      const dd = (d.x - mx) ** 2 + (d.y - my) ** 2;
      if (dd < bd) {
        bd = dd;
        best = d;
      }
    }
    if (!best || Math.sqrt(bd) * R > 14) return hideTip();
    showTip(e.clientX, e.clientY, fmtDate(best.t + 12 * HOUR_MS, 'full'), best.special ? [best.special] : []);
  });
  canvas.addEventListener('pointerleave', hideTip);

  const el = panel({
    id: 'spirale',
    code: 'T-07',
    title: 'Zeitspirale',
    kicker: 'Ein Punkt pro Tag, von innen nach außen. Gefüllt = gewartet, Umriss = steht noch bevor.',
    tone: 'cyan',
    tall: true,
    actions: seg,
    body: h('div.spiral-wrap', canvas, caption),
  });
  let lastDraw = 0;
  registerModule({
    el,
    frame(now) {
      if (performance.now() - lastDraw < 50) return;
      lastDraw = performance.now();
      draw(now);
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-08 Stundenbudget                                                  */
/* ------------------------------------------------------------------ */
type HourKind = 'sleep' | 'school' | 'free' | 'past';

function hm(v: string): number {
  const [a, b] = v.split(':').map(Number);
  return a + b / 60;
}

export function hourBudget(): HTMLElement {
  const grid = h('div.hours');
  const totals = { sleep: h('b'), school: h('b'), free: h('b') };
  const summary = h(
    'ul.legend.legend--row',
    h('li', h('span.legend__swatch', { style: { background: '#9b6bff' } }), 'Schlaf ', totals.sleep),
    h('li', h('span.legend__swatch', { style: { background: '#19f0ff' } }), 'Schule ', totals.school),
    h('li', h('span.legend__swatch', { style: { background: '#ff2e97' } }), 'Freizeit ', totals.free),
  );

  function kindAt(c: CivilDate, hour: number): Exclude<HourKind, 'past'> {
    const st = settings();
    const bed = hm(CONFIG.assumptions.bedtime);
    const wake = (bed + st.sleepHours) % 24;
    const asleep = bed > wake ? hour >= bed || hour < wake : hour >= bed && hour < wake;
    if (asleep) return 'sleep';
    if (isSchoolDay(c) && hour >= Math.floor(hm(CONFIG.school.dayStart)) && hour < Math.ceil(hm(CONFIG.school.dayEnd))) return 'school';
    return 'free';
  }

  let builtKey = '';
  const build = (now: number) => {
    const p = zonedParts(now, TZ);
    const key = `${p.y}-${p.m}-${p.d}-${p.hour}-${settings().sleepHours}`;
    if (key === builtKey) return;
    builtKey = key;
    const today = { y: p.y, m: p.m, d: p.d };
    const rows: HTMLElement[] = [];
    const sum = { sleep: 0, school: 0, free: 0 };
    if (RELEASE > now) {
      let c = today;
      while (civilCompare(c, LAST_WAIT_DAY) <= 0) {
        const cells: HTMLElement[] = [];
        for (let hr = 0; hr < 24; hr++) {
          const isPast = civilEquals(c, today) && hr < p.hour;
          const isNow = civilEquals(c, today) && hr === p.hour;
          const k = kindAt(c, hr);
          if (!isPast) sum[k] += isNow ? (60 - p.minute) / 60 : 1;
          cells.push(h(`span.hour.k-${isPast ? 'past' : k}${isNow ? '.is-now' : ''}`));
        }
        const wd = WD_SHORT[(civilWeekday(c) + 6) % 7];
        rows.push(h('div.hours__row', { dataset: { day: civilKey(c) } }, h('span.hours__label', `${wd} ${c.d}.${c.m}.`), h('div.hours__cells', cells)));
        c = civilAddDays(c, 1);
      }
    }
    grid.replaceChildren(
      h('div.hours__row.hours__axis', h('span.hours__label'), h('div.hours__cells', [0, 6, 12, 18].map((x) => h('span', { style: { gridColumn: `${x + 1} / span 6` } }, `${String(x).padStart(2, '0')}`)))),
      ...rows,
    );
    totals.sleep.textContent = `${num(sum.sleep, 0)} Std.`;
    totals.school.textContent = `${num(sum.school, 0)} Std.`;
    totals.free.textContent = `${num(sum.free, 0)} Std.`;
  };

  grid.addEventListener('pointermove', (e) => {
    const t = e.target as HTMLElement;
    if (!t.classList.contains('hour')) return hideTip();
    const row = t.closest<HTMLElement>('.hours__row');
    const idx = Array.from(t.parentElement!.children).indexOf(t);
    const kind = t.className.match(/k-(\w+)/)?.[1] ?? '';
    const label = { sleep: 'Schlaf', school: 'Schule', free: 'Freizeit', past: 'vorbei' }[kind] ?? '';
    showTip(e.clientX, e.clientY, `${row?.dataset.day?.split('-').reverse().join('.')} · ${String(idx).padStart(2, '0')}:00–${String(idx + 1).padStart(2, '0')}:00`, [label]);
  });
  grid.addEventListener('pointerleave', hideTip);

  const el = panel({
    id: 'stundenbudget',
    code: 'T-08',
    title: 'Stundenbudget',
    kicker: 'Jede verbleibende Stunde als Kästchen – eingeteilt in Schlaf, Schule und Freizeit.',
    tone: 'violet',
    span: 2,
    tall: true,
    body: h('div', summary, h('div.hours-scroll', grid)),
    note: `Annahmen: Schlaf ab ${CONFIG.assumptions.bedtime} Uhr (Dauer laut Einstellungen), Unterricht an Schultagen ${CONFIG.school.dayStart}–${CONFIG.school.dayEnd} Uhr.`,
  });
  registerModule({ el, second: build, refresh: (now) => ((builtKey = ''), build(now)) });
  onSettings(() => ((builtKey = ''), build(clock.now())));
  return el;
}

