/**
 * Kalender-Visualisierungen: Countdown-Kalender und Wartejahre in Wochen.
 */
import { DAY_TYPE_LABEL, DayType, dayType, holidayOf } from '../core/calendar';
import { fmtDate, num, plural } from '../core/format';
import { ANCHORS, EXAMS_END, RELEASE, RELEASE_CIVIL, TZ } from '../core/timeline';
import {
  CivilDate,
  DAY_MS,
  HOUR_MS,
  civilCompare,
  civilDiff,
  civilEquals,
  civilFromMs,
  civilKey,
  civilWeekday,
  parseLocal,
  startOfCivilDay,
} from '../core/tz';
import { HISTORY } from '../data/history';
import { h, s } from '../ui/dom';
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
    span: 4,
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
