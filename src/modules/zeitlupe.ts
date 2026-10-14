/**
 * Die Zeitlupe: eine stufenlos zoombare Zeitachse vom Startpunkt bis zum Release.
 * Von der gesamten Wartezeit bis hinunter zu einzelnen Millisekunden – im Jetzt-Modus
 * läuft die Achse live mit, und je tiefer man zoomt, desto sichtbarer fließt die Zeit.
 */
import { CONFIG } from '../config';
import { DayType, dayType } from '../core/calendar';
import { clock } from '../core/clock';
import { num, pad } from '../core/format';
import { unlock } from '../core/game';
import { HOUR_KIND_COLOR, hourKind } from '../core/schedule';
import { DST_CHANGES, HOLIDAYS, RELEASE, TZ } from '../core/timeline';
import {
  CivilDate,
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  civilAddDays,
  civilCompare,
  civilFromMs,
  civilWeekday,
  parseLocal,
  startOfCivilDay,
  tzOffset,
  zonedParts,
} from '../core/tz';
import { HISTORY } from '../data/history';
import { TYPE_COLOR } from './calendarViz';
import { h, setText } from '../ui/dom';
import { icon } from '../ui/icons';

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MIN_SPAN = 12; // ms
const YEAR_MS = 365.2425 * DAY_MS;

interface Ev {
  at: number;
  label: string;
  color: string;
}

type Unit = { key: string; ms: number; cal?: 'day' | 'week' | 'month' | 'quarter' | 'year' };

const UNITS: Unit[] = [
  { key: 'ms', ms: 1 },
  { key: '5ms', ms: 5 },
  { key: '10ms', ms: 10 },
  { key: '50ms', ms: 50 },
  { key: '100ms', ms: 100 },
  { key: '500ms', ms: 500 },
  { key: 's', ms: 1000 },
  { key: '5s', ms: 5000 },
  { key: '15s', ms: 15000 },
  { key: 'min', ms: MINUTE_MS },
  { key: '5min', ms: 5 * MINUTE_MS },
  { key: '15min', ms: 15 * MINUTE_MS },
  { key: 'h', ms: HOUR_MS },
  { key: '3h', ms: 3 * HOUR_MS },
  { key: '6h', ms: 6 * HOUR_MS },
  { key: 'day', ms: DAY_MS, cal: 'day' },
  { key: 'week', ms: 7 * DAY_MS, cal: 'week' },
  { key: 'month', ms: 30.44 * DAY_MS, cal: 'month' },
  { key: 'quarter', ms: 91.3 * DAY_MS, cal: 'quarter' },
  { key: 'year', ms: YEAR_MS, cal: 'year' },
];

const LEVELS: [number, string][] = [
  [2 * YEAR_MS, 'Jahre'],
  [80 * DAY_MS, 'Monate'],
  [12 * DAY_MS, 'Wochen'],
  [40 * HOUR_MS, 'Tage'],
  [2.5 * HOUR_MS, 'Stunden'],
  [2.5 * MINUTE_MS, 'Minuten'],
  [2500, 'Sekunden'],
  [0, 'Millisekunden'],
];

const unit = (key: string) => UNITS.find((u) => u.key === key)!;
const BIG: { ms: number; unit: Unit; fmt: (p: ReturnType<typeof zonedParts>) => string }[] = [
  { ms: 1000, unit: unit('s'), fmt: (p) => pad(p.second) },
  { ms: MINUTE_MS, unit: unit('min'), fmt: (p) => `${pad(p.hour)}:${pad(p.minute)}` },
  { ms: HOUR_MS, unit: unit('h'), fmt: (p) => `${pad(p.hour)} Uhr` },
  { ms: DAY_MS, unit: unit('day'), fmt: (p) => `${WD[p.weekday]} ${p.d}.${p.m}.` },
  { ms: 30.44 * DAY_MS, unit: unit('month'), fmt: (p) => MONTHS_LONG[p.m - 1] },
  { ms: YEAR_MS, unit: unit('year'), fmt: (p) => String(p.y) },
];

function levelName(span: number): string {
  return LEVELS.find(([min]) => span >= min)![1];
}

export interface Zeitlupe {
  el: HTMLElement;
  frame(now: number): void;
  setStart(at: number, label: string): void;
  visibility(v: boolean): void;
}

export function createZeitlupe(): Zeitlupe {
  const canvas = h<HTMLCanvasElement>('canvas.zl__canvas', { tabindex: '0', 'aria-label': 'Zeitlupe: zoombare Zeitachse. Pfeiltasten verschieben, Plus und Minus zoomen.' });
  const mini = h<HTMLCanvasElement>('canvas.zl__mini', { 'aria-hidden': 'true' });
  const levelEl = h('b.zl__level');
  const crumbEl = h('span.zl__crumb');
  const scaleEl = h('span.zl__scale');
  const speedEl = h('span.zl__speed');
  const flash = h('div.zl__flash', { 'aria-hidden': 'true' });
  const followBtn = h<HTMLButtonElement>('button.chip-btn.zl__follow', { type: 'button', 'aria-pressed': 'true' }, icon('radar', 16), 'Jetzt folgen');
  const diveBtn = h<HTMLButtonElement>('button.btn.btn--pink.zl__dive', { type: 'button' }, icon('rocket', 18), 'Sturzflug ins Jetzt');
  const presets: [string, number][] = [
    ['Alles', -1],
    ['Monat', 31 * DAY_MS],
    ['Woche', 7 * DAY_MS],
    ['Tag', DAY_MS],
    ['Stunde', HOUR_MS],
    ['Minute', MINUTE_MS],
    ['Sekunde', 1500],
    ['Millisek.', 40],
  ];
  const presetBar = h(
    'div.zl__presets',
    presets.map(([label, span]) => h('button.chip-btn', { type: 'button', onclick: () => zoomTo(span) }, label)),
  );

  const el = h(
    'div.zl',
    h('div.zl__bar', presetBar, h('div.zl__actions', followBtn, diveBtn)),
    h('div.zl__stage', canvas, flash),
    h('div.zl__hud', h('div.zl__hud-l', levelEl, crumbEl), h('div.zl__hud-r', speedEl, scaleEl)),
    mini,
    h('p.zl__hint', 'Mausrad oder zwei Finger: zoomen · ziehen: verschieben · Doppelklick: hineinzoomen · Tasten + / − / ← / →'),
  );

  /* Zustand ------------------------------------------------------- */
  let start = RELEASE - 1000 * DAY_MS;
  let startLabel = 'Start';
  let viewStart = 0;
  let viewSpan = 1;
  let follow = true;
  let visible = false;
  let W = 800;
  let H = 440;
  let dpr = 1;
  let velocity = 0;
  let lastLevel = '';
  let anim: { t0: number; dur: number; spanFrom: number; spanTo: number; centerFrom: number; centerTo: number | null; dive?: boolean } | null = null;
  let events: Ev[] = [];
  const ctx = canvas.getContext('2d')!;
  const mctx = mini.getContext('2d')!;

  const bounds = () => {
    const pad = (RELEASE - start) * 0.04;
    return { min: start - pad, max: RELEASE + pad };
  };
  const fullSpan = () => {
    const b = bounds();
    return b.max - b.min;
  };
  const clampView = () => {
    const b = bounds();
    viewSpan = Math.max(MIN_SPAN, Math.min(fullSpan(), viewSpan));
    viewStart = Math.max(b.min, Math.min(b.max - viewSpan, viewStart));
  };
  const xOf = (t: number) => ((t - viewStart) / viewSpan) * W;
  const tOf = (x: number) => viewStart + (x / W) * viewSpan;

  function buildEvents(): void {
    const evs: Ev[] = [];
    const kindColor: Record<string, string> = { release: '#ffd23f', trailer: '#19f0ff', delay: '#ff3b5c', announce: '#3dffb5', leak: '#9b6bff', milestone: '#ff8a3d', port: '#b9a8d6' };
    for (const e of HISTORY) {
      const at = parseLocal(e.date, TZ);
      if (e.id === 'gta6') continue;
      evs.push({ at, label: e.title, color: kindColor[e.kind] ?? '#b9a8d6' });
    }
    for (const e of CONFIG.events) {
      if (e.id === 'release' || e.id === 'preload') continue;
      evs.push({ at: parseLocal(e.date, TZ), label: e.title, color: '#ff2e97' });
    }
    for (const c of DST_CHANGES) evs.push({ at: c.at, label: c.after < c.before ? 'Zeitumstellung' : 'Sommerzeit', color: '#b9a8d6' });
    events = evs.filter((e) => e.at >= start - (RELEASE - start) && e.at <= RELEASE + 60 * DAY_MS).sort((a, b) => a.at - b.at);
  }

  /* Zoom-Steuerung ------------------------------------------------- */
  function setFollow(v: boolean): void {
    follow = v;
    followBtn.setAttribute('aria-pressed', String(v));
  }

  function zoomAround(factor: number, x: number): void {
    const t = follow ? clock.now() : tOf(x);
    const rel = follow ? 0.5 : x / W;
    viewSpan = viewSpan * factor;
    clampView();
    viewStart = t - rel * viewSpan;
    clampView();
  }

  function zoomTo(span: number, dur = 1100): void {
    const target = span < 0 ? fullSpan() : span;
    const centerTo = span < 0 ? (bounds().min + bounds().max) / 2 : null;
    if (span >= 0) setFollow(true);
    else setFollow(false);
    anim = { t0: performance.now(), dur, spanFrom: viewSpan, spanTo: target, centerFrom: viewStart + viewSpan / 2, centerTo };
  }

  function dive(): void {
    const b = bounds();
    viewSpan = fullSpan();
    viewStart = b.min;
    setFollow(true);
    anim = { t0: performance.now(), dur: reducedMotion() ? 1 : 11000, spanFrom: fullSpan(), spanTo: 40, centerFrom: (b.min + b.max) / 2, centerTo: null, dive: true };
  }

  function reducedMotion(): boolean {
    return document.documentElement.classList.contains('reduce-motion');
  }

  followBtn.addEventListener('click', () => {
    setFollow(!follow);
    anim = null;
  });
  diveBtn.addEventListener('click', dive);

  /* Eingabe -------------------------------------------------------- */
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      anim = null;
      const r = canvas.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAround(Math.exp(dy * 0.0016), e.clientX - r.left);
    },
    { passive: false },
  );

  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  let lastX = 0;
  let lastMoveT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    anim = null;
    velocity = 0;
    lastX = e.clientX;
    lastMoveT = performance.now();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = canvas.getBoundingClientRect();
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) zoomAround(pinchDist / d, (a.x + b.x) / 2 - r.left);
      pinchDist = d;
      return;
    }
    const dx = e.clientX - lastX;
    if (Math.abs(dx) > 0) {
      if (follow && Math.abs(dx) > 2) setFollow(false);
      if (!follow) {
        viewStart -= (dx / W) * viewSpan;
        clampView();
        const t = performance.now();
        velocity = (-(dx / W) * viewSpan) / Math.max(8, t - lastMoveT);
        lastMoveT = t;
      }
    }
    lastX = e.clientX;
  });
  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('dblclick', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const t = follow ? clock.now() : tOf(x);
    anim = { t0: performance.now(), dur: 600, spanFrom: viewSpan, spanTo: Math.max(MIN_SPAN, viewSpan / 6), centerFrom: viewStart + viewSpan / 2, centerTo: follow ? null : t };
  });
  canvas.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === '+' || k === '=') zoomAround(0.6, W / 2);
    else if (k === '-') zoomAround(1.6, W / 2);
    else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      setFollow(false);
      viewStart += (k === 'ArrowLeft' ? -0.15 : 0.15) * viewSpan;
      clampView();
    } else if (k === '0') zoomTo(-1);
    else return;
    e.preventDefault();
  });

  // Minimap: Klick/Ziehen zentriert die Ansicht
  let miniDrag = false;
  const miniTo = (clientX: number) => {
    const r = mini.getBoundingClientRect();
    const b = bounds();
    const t = b.min + ((clientX - r.left) / r.width) * (b.max - b.min);
    setFollow(false);
    anim = null;
    viewStart = t - viewSpan / 2;
    clampView();
  };
  mini.addEventListener('pointerdown', (e) => {
    miniDrag = true;
    mini.setPointerCapture(e.pointerId);
    miniTo(e.clientX);
  });
  mini.addEventListener('pointermove', (e) => miniDrag && miniTo(e.clientX));
  mini.addEventListener('pointerup', () => (miniDrag = false));

  /* Größe ---------------------------------------------------------- */
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, r.width);
    H = Math.max(200, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const mr = mini.getBoundingClientRect();
    mini.width = Math.round(Math.max(100, mr.width) * dpr);
    mini.height = Math.round(Math.max(20, mr.height) * dpr);
  };
  new ResizeObserver(resize).observe(canvas);

  /* Zeichnen ------------------------------------------------------- */
  function chooseUnits(): { minor: Unit; major: Unit } {
    const pxPer = W / viewSpan;
    const minor = UNITS.find((u) => u.ms * pxPer >= 7) ?? UNITS[UNITS.length - 1];
    const major = UNITS.find((u) => u.ms * pxPer >= 95 && u.ms >= minor.ms) ?? UNITS[UNITS.length - 1];
    return { minor, major };
  }

  function boundaries(u: Unit, from: number, to: number): number[] {
    const out: number[] = [];
    if (!u.cal) {
      const off = u.ms >= HOUR_MS ? tzOffset(from, TZ) : 0;
      let t = Math.ceil((from + off) / u.ms) * u.ms - off;
      for (let i = 0; t <= to && i < 4000; i++, t += u.ms) out.push(t);
      return out;
    }
    let c: CivilDate = civilFromMs(from, TZ);
    if (u.cal === 'week') {
      const wd = (civilWeekday(c) + 6) % 7;
      c = civilAddDays(c, -wd);
    } else if (u.cal === 'month' || u.cal === 'quarter') c = { y: c.y, m: c.m, d: 1 };
    else if (u.cal === 'year') c = { y: c.y, m: 1, d: 1 };
    for (let i = 0; i < 4000; i++) {
      const t = startOfCivilDay(c, TZ);
      if (t > to) break;
      if (t >= from && (u.cal !== 'quarter' || (c.m - 1) % 3 === 0)) out.push(t);
      if (u.cal === 'day') c = civilAddDays(c, 1);
      else if (u.cal === 'week') c = civilAddDays(c, 7);
      else if (u.cal === 'year') c = { y: c.y + 1, m: 1, d: 1 };
      else c = c.m === 12 ? { y: c.y + 1, m: 1, d: 1 } : { y: c.y, m: c.m + 1, d: 1 };
    }
    return out;
  }

  function label(u: Unit, t: number): string {
    const p = zonedParts(t, TZ);
    switch (u.cal) {
      case 'year':
        return String(p.y);
      case 'quarter':
      case 'month':
        return p.m === 1 ? `${MONTHS[0]} ${p.y}` : `${MONTHS[p.m - 1]} ${String(p.y).slice(2)}`;
      case 'week':
        return `KW ${isoWeek(t)}`;
      case 'day':
        return `${WD[p.weekday]} ${p.d}.${p.m}.`;
    }
    if (u.ms >= HOUR_MS) return `${pad(p.hour)}:00`;
    if (u.ms >= MINUTE_MS) return `${pad(p.hour)}:${pad(p.minute)}`;
    if (u.ms >= 1000) return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
    const ms = ((t % 1000) + 1000) % 1000;
    return `${pad(p.second)},${String(Math.round(ms)).padStart(3, '0')}`;
  }

  const firstWindowDay = HOLIDAYS[0]?.start ?? civilFromMs(RELEASE - 60 * DAY_MS, TZ);

  /** Tage vor dem Ferienfenster: Farbverlauf Pink → Violett über die gesamte Wartezeit */
  function dayColor(c: CivilDate, t0: number): { color: string; type: DayType | 'plain'; pre: boolean } {
    if (civilCompare(c, firstWindowDay) < 0) {
      const wd = civilWeekday(c);
      const f = Math.max(0, Math.min(1, (t0 - start) / (RELEASE - start)));
      const color = `rgb(${Math.round(255 - 100 * f)},${Math.round(46 + 61 * f)},${Math.round(151 + 104 * f)})`;
      return { color, type: wd === 0 || wd === 6 ? 'weekend' : 'plain', pre: true };
    }
    const t = dayType(c);
    return { color: TYPE_COLOR[t], type: t, pre: false };
  }

  function draw(now: number): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pxPerMs = W / viewSpan;
    const vEnd = viewStart + viewSpan;

    // Hintergrund
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0320');
    bg.addColorStop(1, '#07020f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const yDay = 104;
    const hDay = 54;
    const yHour = yDay + hDay + 8;
    const hHour = 44;
    const yFine = yHour + hHour + 10;
    const yRuler = H - 28;

    // Außerhalb [Start, Release] schraffieren
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    const xs = xOf(start);
    const xr = xOf(RELEASE);
    if (xs > 0) ctx.fillRect(0, 0, Math.min(W, xs), H);
    if (xr < W) ctx.fillRect(Math.max(0, xr), 0, W - Math.max(0, xr), H);
    ctx.restore();

    // Tage
    const dayPx = DAY_MS * pxPerMs;
    if (dayPx >= 0.7) {
      let c = civilFromMs(Math.max(viewStart, start - DAY_MS), TZ);
      for (let i = 0; i < 3000; i++) {
        const t0 = startOfCivilDay(c, TZ);
        if (t0 > vEnd || t0 >= RELEASE) break;
        const t1 = startOfCivilDay(civilAddDays(c, 1), TZ);
        if (t1 >= start) {
          const x0 = xOf(Math.max(t0, start));
          const x1 = xOf(Math.min(t1, RELEASE));
          const { color, type, pre } = dayColor(c, t0);
          const past = t1 <= now;
          ctx.globalAlpha = past ? (pre ? (type === 'weekend' ? 0.62 : 0.4) : 0.26) : 0.85;
          ctx.fillStyle = color;
          ctx.fillRect(x0 + (dayPx > 6 ? 1 : 0), yDay, Math.max(0.6, x1 - x0 - (dayPx > 6 ? 2 : 0)), hDay);
          ctx.globalAlpha = 1;
          if (x1 - x0 > 54) {
            ctx.fillStyle = past ? 'rgba(247,239,255,0.45)' : '#14051f';
            ctx.font = '700 12px "JetBrains Mono", monospace';
            const p = zonedParts(t0 + 12 * HOUR_MS, TZ);
            const txt = x1 - x0 > 130 ? `${WD[p.weekday]} ${p.d}.${p.m}.` : `${p.d}.${p.m}.`;
            ctx.fillText(txt, Math.max(x0, 0) + 6, yDay + 20);
            if (x1 - x0 > 130) {
              ctx.font = '500 11px "Chakra Petch", sans-serif';
              const t = type;
              const names: Record<string, string> = { holiday: 'Ferien', school: 'Schultag', weekend: 'Wochenende', preload: 'Preload', release: 'Release', exams: 'Klausuren', free: 'Schulfrei', plain: 'Wochentag' };
              ctx.fillText(names[t] ?? '', Math.max(x0, 0) + 6, yDay + 38);
            }
          }
        }
        c = civilAddDays(c, 1);
      }
    } else {
      // zu weit draußen: nur Vergangenheit/Zukunft als Band
      ctx.fillStyle = 'rgba(255,46,151,0.18)';
      ctx.fillRect(Math.max(0, xs), yDay, Math.max(0, Math.min(W, xOf(now)) - Math.max(0, xs)), hDay);
      ctx.fillStyle = 'rgba(25,240,255,0.22)';
      ctx.fillRect(Math.max(0, xOf(now)), yDay, Math.max(0, Math.min(W, xr) - Math.max(0, xOf(now))), hDay);
    }

    // Stunden
    const hourPx = HOUR_MS * pxPerMs;
    if (hourPx >= 1.2) {
      const alpha = Math.min(1, (hourPx - 1.2) / 6);
      const off = tzOffset(viewStart, TZ);
      let t = Math.floor((viewStart + off) / HOUR_MS) * HOUR_MS - off;
      for (let i = 0; i < 3000 && t < vEnd; i++, t += HOUR_MS) {
        if (t + HOUR_MS < start || t >= RELEASE) continue;
        const p = zonedParts(t, TZ);
        const c = { y: p.y, m: p.m, d: p.d };
        const inWindow = civilCompare(c, firstWindowDay) >= 0;
        const kind = inWindow ? hourKind(c, p.hour) : p.hour < 7 || p.hour >= 23 ? 'sleep' : 'free';
        const x0 = xOf(Math.max(t, start));
        const x1 = xOf(Math.min(t + HOUR_MS, RELEASE));
        const past = t + HOUR_MS <= now;
        ctx.globalAlpha = alpha * (past ? 0.2 : 0.8);
        ctx.fillStyle = HOUR_KIND_COLOR[kind];
        ctx.fillRect(x0 + (hourPx > 8 ? 1 : 0), yHour, Math.max(0.5, x1 - x0 - (hourPx > 8 ? 2 : 0)), hHour);
        if (hourPx > 46) {
          ctx.globalAlpha = alpha * (past ? 0.5 : 1);
          ctx.fillStyle = '#14051f';
          ctx.font = '700 11px "JetBrains Mono", monospace';
          ctx.fillText(`${pad(p.hour)} Uhr`, Math.max(x0, 0) + 5, yHour + 17);
          if (hourPx > 110) {
            ctx.font = '500 11px "Chakra Petch", sans-serif';
            ctx.fillText(kind === 'sleep' ? 'Schlaf' : kind === 'school' ? 'Schule' : 'Freizeit', Math.max(x0, 0) + 5, yHour + 33);
          }
        }
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, yHour, W, hHour);
    }

    // Feine Ebene: Minuten, Sekunden, Millisekunden
    const fineH = yRuler - yFine - 6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, yFine, W, fineH);
    ctx.clip();
    // Riesenziffern: die feinste Einheit, die noch Platz hat (Jahr … Sekunde)
    const big = BIG.find((b) => b.ms * pxPerMs >= 150) ?? BIG[BIG.length - 1];
    const bs = boundaries(big.unit, viewStart - big.ms * 1.2, vEnd);
    const maxSize = Math.min(118, fineH * 0.86);
    for (let i = 0; i < bs.length; i++) {
      const t = bs[i];
      const tNext = bs[i + 1] ?? t + big.ms;
      const x0 = xOf(t);
      const x1 = xOf(tNext);
      if (x1 < 0 || x0 > W) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(Math.round(x0), yFine, 1, fineH);
      const txt = big.fmt(zonedParts(t, TZ));
      ctx.font = '400 100px Anton, Impact, sans-serif';
      const w100 = ctx.measureText(txt).width;
      const size = Math.min(maxSize, (100 * (x1 - x0 - 24)) / w100);
      if (size < 22) continue;
      ctx.font = `400 ${size}px Anton, Impact, sans-serif`;
      const tw = (w100 * size) / 100;
      const tx = Math.min(Math.max(x0, 0) + 12, x1 - tw - 12);
      const isNow = now >= t && now < tNext;
      ctx.fillStyle = isNow ? 'rgba(255,210,63,0.34)' : tNext <= now ? 'rgba(255,46,151,0.11)' : 'rgba(25,240,255,0.15)';
      ctx.fillText(txt, tx, yFine + fineH / 2 + size * 0.37);
    }
    const msPx = pxPerMs;
    if (msPx >= 0.8) {
      const step = msPx >= 6 ? 1 : msPx >= 1.4 ? 5 : 10;
      let t = Math.floor(viewStart / step) * step;
      for (let i = 0; i < 3000 && t < vEnd; i++, t += step) {
        const x = xOf(t);
        const big = t % 100 === 0 ? 0.6 : t % 10 === 0 ? 0.35 : 0.16;
        ctx.fillStyle = t < now ? `rgba(255,46,151,${big * 0.6})` : `rgba(25,240,255,${big})`;
        ctx.fillRect(x, yFine + fineH * (1 - big), 1, fineH * big);
        if (msPx * 10 >= 46 && t % 10 === 0) {
          ctx.fillStyle = 'rgba(247,239,255,0.55)';
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillText(`${String(((t % 1000) + 1000) % 1000).padStart(3, '0')}`, x + 3, yFine + 12);
        }
      }
    }
    const xn = xOf(now);
    ctx.restore();

    // Lineal
    const { minor, major } = chooseUnits();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, yRuler, W, 1);
    for (const t of boundaries(minor, viewStart, vEnd)) {
      const x = Math.round(xOf(t)) + 0.5;
      ctx.fillStyle = 'rgba(214,170,255,0.25)';
      ctx.fillRect(x, yRuler, 1, 5);
    }
    ctx.font = '500 11px "JetBrains Mono", monospace';
    let lastEnd = -Infinity;
    for (const t of boundaries(major, viewStart, vEnd)) {
      const x = Math.round(xOf(t)) + 0.5;
      ctx.fillStyle = 'rgba(214,170,255,0.12)';
      ctx.fillRect(x, 26, 1, yRuler - 26);
      ctx.fillStyle = 'rgba(214,170,255,0.55)';
      ctx.fillRect(x, yRuler, 1, 9);
      const txt = label(major, t);
      const w = ctx.measureText(txt).width;
      if (x + 4 > lastEnd + 8 && x + 4 + w < W) {
        ctx.fillStyle = '#cdbbe8';
        ctx.fillText(txt, x + 4, yRuler + 21);
        lastEnd = x + 4 + w;
      }
    }

    // Ereignisse
    const rows = [0, 0, 0];
    ctx.font = '600 11px "Chakra Petch", sans-serif';
    for (const e of events) {
      const x = xOf(e.at);
      if (x < -200 || x > W + 10) continue;
      const w = ctx.measureText(e.label).width + 14;
      let row = rows.findIndex((end) => x > end + 6);
      if (row < 0) row = -1;
      ctx.fillStyle = e.color;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(Math.round(x), 30, 1, yRuler - 30);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, yDay - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (row >= 0 && x + w < W + 40) {
        const y = 32 + row * 22;
        ctx.fillStyle = 'rgba(12,4,26,0.88)';
        ctx.fillRect(x + 4, y, w, 18);
        ctx.fillStyle = e.color;
        ctx.fillRect(x + 4, y, 2, 18);
        ctx.fillStyle = '#f7efff';
        ctx.fillText(e.label, x + 11, y + 13);
        rows[row] = x + 4 + w;
      }
    }

    // Start und Release
    const marker = (t: number, color: string, text: string, alignRight = false) => {
      const x = xOf(t);
      if (x < -2 || x > W + 2) return;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x) - 1, 0, 2, H);
      ctx.font = '700 11px "JetBrains Mono", monospace';
      const w = ctx.measureText(text).width + 12;
      const bx = alignRight ? x - w - 4 : x + 4;
      ctx.fillRect(bx, H - 58, w, 18);
      ctx.fillStyle = '#14051f';
      ctx.fillText(text, bx + 6, H - 45);
    };
    marker(start, '#19f0ff', `START · ${startLabel}`);
    marker(RELEASE, '#ffd23f', 'GTA VI', true);

    // Jetzt-Linie
    if (xn >= -40 && xn <= W + 40) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
      const g = ctx.createLinearGradient(xn - 18, 0, xn + 18, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${0.12 + pulse * 0.1})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(xn - 18, 0, 36, H);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(xn) - 1, 0, 2, H);
      const p = zonedParts(now, TZ);
      const ms = Math.floor(now % 1000);
      const txt = viewSpan < 20_000 ? `JETZT ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)},${String(ms).padStart(3, '0')}` : viewSpan < 3 * HOUR_MS ? `JETZT ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` : 'JETZT';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      const w = ctx.measureText(txt).width + 14;
      const bx = Math.min(W - w - 2, Math.max(2, xn - w / 2));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, 4, w, 20);
      ctx.fillStyle = '#14051f';
      ctx.fillText(txt, bx + 7, 18);
    } else {
      // Richtungspfeil zum Jetzt
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText(xn < 0 ? '◀ JETZT' : 'JETZT ▶', xn < 0 ? 8 : W - 70, 18);
    }
  }

  function drawMini(now: number): void {
    const mw = mini.width / dpr;
    const mh = mini.height / dpr;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, mw, mh);
    const b = bounds();
    const x = (t: number) => ((t - b.min) / (b.max - b.min)) * mw;
    mctx.fillStyle = 'rgba(255,255,255,0.04)';
    mctx.fillRect(0, 0, mw, mh);
    const g = mctx.createLinearGradient(x(start), 0, x(now), 0);
    g.addColorStop(0, 'rgba(255,46,151,0.25)');
    g.addColorStop(1, 'rgba(255,138,61,0.6)');
    mctx.fillStyle = g;
    mctx.fillRect(x(start), 8, Math.max(0, x(now) - x(start)), mh - 16);
    mctx.fillStyle = 'rgba(25,240,255,0.25)';
    mctx.fillRect(x(now), 8, Math.max(0, x(RELEASE) - x(now)), mh - 16);
    for (const e of events) {
      mctx.fillStyle = e.color;
      mctx.fillRect(x(e.at), 4, 1, mh - 8);
    }
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(x(now) - 1, 0, 2, mh);
    const vx = x(viewStart);
    const vw = Math.max(3, x(viewStart + viewSpan) - vx);
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = 1.5;
    mctx.strokeRect(vx + 0.5, 1.5, vw - 1, mh - 3);
    mctx.fillStyle = 'rgba(255,255,255,0.08)';
    mctx.fillRect(vx, 1, vw, mh - 2);
  }

  function updateHud(now: number): void {
    const lvl = levelName(viewSpan);
    setText(levelEl, lvl);
    if (lvl !== lastLevel) {
      if (lastLevel && !reducedMotion()) {
        flash.textContent = lvl;
        flash.classList.remove('is-on');
        void flash.offsetWidth;
        flash.classList.add('is-on');
      }
      lastLevel = lvl;
    }
    const center = follow ? now : viewStart + viewSpan / 2;
    const p = zonedParts(center, TZ);
    const parts = [String(p.y), MONTHS_LONG[p.m - 1]];
    if (viewSpan < 80 * DAY_MS) parts.push(`${WD[p.weekday]} ${p.d}.${p.m}.`);
    if (viewSpan < 40 * HOUR_MS) parts.push(`${pad(p.hour)} Uhr`);
    if (viewSpan < 2.5 * HOUR_MS) parts.push(`${pad(p.hour)}:${pad(p.minute)}`);
    if (viewSpan < 2.5 * MINUTE_MS) parts.push(`:${pad(p.second)}`);
    if (viewSpan < 2500) parts.push(`,${String(Math.floor(((center % 1000) + 1000) % 1000)).padStart(3, '0')} ms`);
    setText(crumbEl, parts.join(' › '));
    const perPx = viewSpan / W;
    const fmtSpan = (ms: number) =>
      ms >= DAY_MS ? `${num(ms / DAY_MS, ms < 10 * DAY_MS ? 1 : 0)} Tage` : ms >= HOUR_MS ? `${num(ms / HOUR_MS, 1)} Std.` : ms >= MINUTE_MS ? `${num(ms / MINUTE_MS, 1)} Min.` : ms >= 1000 ? `${num(ms / 1000, 1)} Sek.` : `${num(ms, ms < 10 ? 2 : 0)} ms`;
    setText(scaleEl, `Ausschnitt ${fmtSpan(viewSpan)} · 1 px ≈ ${fmtSpan(perPx)} · Zoom ×${num(fullSpan() / viewSpan, 0)}`);
    setText(speedEl, `Zeitfluss ${flowSpeed((W / viewSpan) * 1000)}`);
    if (viewSpan < 1000) unlock('zoom_ms');
  }

  /* Loop ----------------------------------------------------------- */
  function frame(now: number): void {
    if (!visible) return;
    const t = performance.now();
    if (anim) {
      const k = Math.min(1, (t - anim.t0) / anim.dur);
      const e = anim.dive ? (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2) : 1 - Math.pow(1 - k, 3);
      const span = Math.exp(Math.log(anim.spanFrom) + (Math.log(anim.spanTo) - Math.log(anim.spanFrom)) * e);
      viewSpan = span;
      if (anim.centerTo !== null) {
        const c = anim.centerFrom + (anim.centerTo - anim.centerFrom) * e;
        viewStart = c - span / 2;
      } else if (anim.dive) {
        // Mittelpunkt wandert proportional zur Spanne auf das Jetzt zu
        const c = now + (anim.centerFrom - now) * Math.min(1, span / anim.spanFrom);
        viewStart = c - span / 2;
      } else {
        viewStart = now - span / 2;
      }
      clampView();
      if (k >= 1) {
        if (anim.dive) unlock('zoom_flight');
        anim = null;
      }
    } else if (follow) {
      viewStart = now - viewSpan / 2;
      clampView();
    } else if (Math.abs(velocity) > 1e-9) {
      viewStart += velocity * 16;
      velocity *= 0.92;
      if (Math.abs(velocity * 16) < viewSpan * 0.0005) velocity = 0;
      clampView();
    }
    draw(now);
    drawMini(now);
    updateHud(now);
  }

  return {
    el,
    frame,
    setStart(at, lbl) {
      start = at;
      startLabel = lbl;
      buildEvents();
      if (!viewSpan || viewSpan <= 1) {
        viewSpan = fullSpan();
        viewStart = bounds().min;
        setFollow(false);
      } else clampView();
    },
    visibility(v) {
      visible = v;
      if (v) {
        resize();
        frame(clock.now());
      }
    },
  };
}

/** Wie schnell die Zeitachse im Jetzt-Modus über den Bildschirm wandert (96 CSS-px ≈ 2,54 cm). */
function flowSpeed(pxPerSec: number): string {
  const mps = pxPerSec / 3780;
  const kmh = mps * 3.6;
  const value =
    kmh >= 1 ? `${num(kmh, kmh < 10 ? 1 : 0)} km/h` : mps >= 0.01 ? `${num(mps * 100, 1)} cm/s` : mps * 60_000 >= 1 ? `${num(mps * 60_000, 1)} mm/min` : mps * 3_600_000 >= 1 ? `${num(mps * 3_600_000, 1)} mm/Std.` : `${num(mps * 86_400_000, 2)} mm/Tag`;
  const like =
    kmh < 1e-6 ? 'Kontinentaldrift' : kmh < 1e-3 ? 'Gletscher' : kmh < 0.05 ? 'Schnecke' : kmh < 7 ? 'Spaziergang' : kmh < 35 ? 'Fahrrad' : kmh < 140 ? 'Ocean Drive' : kmh < 1200 ? 'Düsenjet' : 'Überschall';
  return `${value} · ${like}`;
}

function isoWeek(ms: number): number {
  const c = civilFromMs(ms, TZ);
  const d = new Date(Date.UTC(c.y, c.m - 1, c.d));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}
