/**
 * Fortschritts-Module: Einheiten-Kaskade, Startpunkte, Uhrwerk, Sanduhr.
 */
import { clock } from '../core/clock';
import { clamp, fmtDate, num, pad, splitDuration } from '../core/format';
import { getProfile } from '../core/game';
import { onSettings, settings } from '../core/settings';
import { ANCHORS, HOLIDAYS, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, HOUR_MS, MINUTE_MS, parseLocal, startOfCivilDay } from '../core/tz';
import { fitCanvas, h, s, setAttr, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';

/* ------------------------------------------------------------------ */
/* T-01 Einheiten-Kaskade                                             */
/* ------------------------------------------------------------------ */
export function unitCascade(): HTMLElement {
  const rows = [
    { key: 'weeks', label: 'Wochen', div: 7 * DAY_MS, dec: 6 },
    { key: 'days', label: 'Tage', div: DAY_MS, dec: 5 },
    { key: 'hours', label: 'Stunden', div: HOUR_MS, dec: 3 },
    { key: 'minutes', label: 'Minuten', div: MINUTE_MS, dec: 1 },
    { key: 'seconds', label: 'Sekunden', div: 1000, dec: 0 },
    { key: 'ms', label: 'Millisekunden', div: 1, dec: 0 },
  ].map((r) => ({ ...r, value: h('span.cascade__value') }));

  const el = panel({
    id: 'kaskade',
    code: 'T-01',
    title: 'Einheiten-Kaskade',
    kicker: 'Dieselbe Restzeit in sechs Auflösungen – live.',
    tone: 'cyan',
    body: h('dl.cascade', rows.map((r) => h(`div.cascade__row.cascade__row--${r.key}`, h('dt', r.label), h('dd', r.value)))),
  });

  registerModule({
    el,
    frame(now) {
      const rem = Math.max(0, RELEASE - now);
      for (const r of rows) {
        const v = r.dec === 0 ? Math.floor(rem / r.div) : rem / r.div;
        setText(r.value, num(v, r.dec, r.dec));
      }
    },
    second(now) {
      this.frame!(now);
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-02 Startpunkte                                                   */
/* ------------------------------------------------------------------ */
interface Start {
  label: string;
  at: number;
  personal?: boolean;
}

function starts(): Start[] {
  const st = settings();
  const list: Start[] = [
    { label: 'GTA V Release', at: ANCHORS.gta5 },
    { label: 'GTA VI bestätigt', at: ANCHORS.gta6Confirmed },
    { label: 'Der große Leak', at: ANCHORS.leak },
    { label: 'Trailer 1', at: ANCHORS.trailer1 },
    { label: 'Trailer 2', at: ANCHORS.trailer2 },
    { label: 'Zweite Verschiebung', at: ANCHORS.delay2 },
    { label: 'Jahresbeginn 2026', at: ANCHORS.year2026 },
    { label: 'Vorbestellungen', at: ANCHORS.preorders },
  ];
  const autumn = HOLIDAYS[0];
  if (autumn) list.push({ label: `${autumn.name}-Beginn`, at: startOfCivilDay(autumn.start, TZ), personal: true });
  list.push({ label: 'Dein erster Besuch hier', at: getProfile().firstVisit, personal: true });
  if (st.birthDate) list.push({ label: 'Deine Geburt', at: parseLocal(st.birthDate, TZ), personal: true });
  if (st.schoolStartDate) list.push({ label: 'Deine Einschulung', at: parseLocal(st.schoolStartDate, TZ), personal: true });
  return list.filter((s) => s.at < RELEASE).sort((a, b) => a.at - b.at);
}

export function startPoints(): HTMLElement {
  const list = h('ol.starts');
  let rows: { start: Start; fill: HTMLElement; pct: HTMLElement }[] = [];

  const build = () => {
    rows = starts().map((start) => ({ start, fill: h('span.bar__fill'), pct: h('span.starts__pct') }));
    list.replaceChildren(
      ...rows.map((r) =>
        h(
          `li.starts__row${r.start.personal ? '.is-personal' : ''}`,
          h('span.starts__label', r.start.label, h('small', fmtDate(r.start.at, 'date'))),
          h('span.bar', h('span.bar__track', r.fill)),
          r.pct,
        ),
      ),
    );
  };
  build();
  onSettings(build);

  const el = panel({
    id: 'startpunkte',
    code: 'T-02',
    title: 'Fortschritt nach Startpunkt',
    kicker: 'Wie viel Prozent der Wartezeit geschafft sind, hängt davon ab, wann du angefangen hast zu warten.',
    tone: 'pink',
    span: 2,
    tall: true,
    body: list,
    note: 'Persönliche Startpunkte sind hervorgehoben. Geburtstag und Einschulung erscheinen, sobald sie in den Einstellungen eingetragen sind.',
  });

  registerModule({
    el,
    frame(now) {
      for (const r of rows) {
        const f = clamp((now - r.start.at) / (RELEASE - r.start.at));
        r.fill.style.transform = `scaleX(${f})`;
        setText(r.pct, `${num(f * 100, 5, 5)} %`);
      }
    },
    refresh: build,
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-03 Uhrwerk (konzentrische Ringe)                                  */
/* ------------------------------------------------------------------ */
export function clockwork(): HTMLElement {
  const rings = [
    { key: 'days', label: 'Tage (Skala 100)', r: 92, color: '#ff2e97' },
    { key: 'hours', label: 'Stunden (Skala 24)', r: 74, color: '#ff8a3d' },
    { key: 'minutes', label: 'Minuten (Skala 60)', r: 56, color: '#ffd23f' },
    { key: 'seconds', label: 'Sekunden (Skala 60)', r: 38, color: '#19f0ff' },
  ].map((ring) => {
    const c = 2 * Math.PI * ring.r;
    const arc = s('circle.ring__arc', {
      cx: '110',
      cy: '110',
      r: String(ring.r),
      stroke: ring.color,
      'stroke-dasharray': `${c} ${c}`,
      transform: 'rotate(-90 110 110)',
    });
    return { ...ring, c, arc, track: s('circle.ring__track', { cx: '110', cy: '110', r: String(ring.r) }), value: h('b') };
  });
  const center = s('text.ring__center', { x: '110', y: '116', 'text-anchor': 'middle' });
  const svg = s('svg.rings', { viewBox: '0 0 220 220', role: 'img', 'aria-label': 'Konzentrische Countdown-Ringe' }, rings.map((r) => [r.track, r.arc]), center);
  const legend = h(
    'ul.legend',
    rings.map((r) => h('li', h('span.legend__swatch', { style: { background: r.color } }), h('span', r.label), r.value)),
  );
  const el = panel({
    id: 'uhrwerk',
    code: 'T-03',
    title: 'Countdown-Uhrwerk',
    kicker: 'Vier Ringe, die sich leeren. Der äußere zeigt die Tage auf einer 100-Tage-Skala.',
    tone: 'orange',
    body: h('div.rings-wrap', svg, legend),
  });
  registerModule({
    el,
    frame(now) {
      const rem = Math.max(0, RELEASE - now);
      const p = splitDuration(rem);
      const fr = [
        Math.min(1, rem / (100 * DAY_MS)),
        (rem % DAY_MS) / DAY_MS,
        (rem % HOUR_MS) / HOUR_MS,
        (rem % MINUTE_MS) / MINUTE_MS,
      ];
      rings.forEach((r, i) => setAttr(r.arc, 'stroke-dashoffset', String(r.c * (1 - fr[i]))));
      setText(rings[0].value, num(p.days));
      setText(rings[1].value, pad(p.hours));
      setText(rings[2].value, pad(p.minutes));
      setText(rings[3].value, pad(p.seconds));
      setText(center, `${p.days}:${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`);
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-04 Sanduhr                                                        */
/* ------------------------------------------------------------------ */
export function hourglass(): HTMLElement {
  const canvas = h<HTMLCanvasElement>('canvas.hourglass', { 'aria-hidden': 'true' });
  const pctEl = h('b');
  const restEl = h('span');
  const el = panel({
    id: 'sanduhr',
    code: 'T-04',
    title: 'Die Sanduhr',
    kicker: 'Umgedreht am 6. November 2025, als Rockstar den 19. November 2026 festlegte.',
    tone: 'sun',
    body: h('div.hourglass-wrap', canvas, h('p.hourglass__caption', pctEl, ' durchgelaufen · ', restEl)),
    note: 'Sandmenge oben = verbleibender Anteil der Zeit seit der zweiten Verschiebung.',
  });

  const grains: { x: number; y: number; v: number }[] = [];
  const start = ANCHORS.delay2;

  registerModule({
    el,
    second(now) {
      const f = clamp((now - start) / (RELEASE - start));
      setText(pctEl, `${num(f * 100, 3, 3)} %`);
      setText(restEl, `noch ${num((1 - f) * 100, 3, 3)} % oben`);
    },
    frame(now) {
      const { ctx, w, h: hh } = fitCanvas(canvas);
      const f = clamp((now - start) / (RELEASE - start));
      const top = 1 - f;
      ctx.clearRect(0, 0, w, hh);
      const cx = w / 2;
      const gw = Math.min(w * 0.42, hh * 0.36);
      const y0 = 10;
      const y1 = hh - 10;
      const mid = (y0 + y1) / 2;
      const neck = 5;
      // Glas
      const glass = new Path2D();
      glass.moveTo(cx - gw, y0);
      glass.lineTo(cx + gw, y0);
      glass.bezierCurveTo(cx + gw, mid - 30, cx + neck, mid - 12, cx + neck, mid);
      glass.bezierCurveTo(cx + neck, mid + 12, cx + gw, mid + 30, cx + gw, y1);
      glass.lineTo(cx - gw, y1);
      glass.bezierCurveTo(cx - gw, mid + 30, cx - neck, mid + 12, cx - neck, mid);
      glass.bezierCurveTo(cx - neck, mid - 12, cx - gw, mid - 30, cx - gw, y0);
      glass.closePath();
      ctx.save();
      ctx.clip(glass);
      const grad = ctx.createLinearGradient(0, y0, 0, y1);
      grad.addColorStop(0, '#ffd23f');
      grad.addColorStop(1, '#ff8a3d');
      ctx.fillStyle = grad;
      // Oberer Sand: Volumen ~ Höhe^1.6 (Trichterform), unten wächst ein Kegel
      const topH = Math.pow(top, 0.62) * (mid - y0 - 6);
      ctx.fillRect(cx - gw, mid - topH, gw * 2, topH);
      const botH = Math.pow(f, 0.7) * (y1 - mid - 8);
      ctx.beginPath();
      ctx.moveTo(cx - gw, y1);
      ctx.lineTo(cx - gw, y1 - botH * 0.55);
      ctx.quadraticCurveTo(cx, y1 - botH * 1.25, cx + gw, y1 - botH * 0.55);
      ctx.lineTo(cx + gw, y1);
      ctx.closePath();
      ctx.fill();
      // Rieselnder Sand
      if (top > 0 && !document.documentElement.classList.contains('reduce-motion')) {
        if (grains.length < 60) grains.push({ x: cx + (Math.random() - 0.5) * 3, y: mid, v: 1 + Math.random() * 2 });
        ctx.fillStyle = '#ffe28a';
        for (const g of grains) {
          g.y += g.v;
          g.v += 0.25;
          ctx.fillRect(g.x, g.y, 1.6, 1.6);
          if (g.y > y1 - botH * 1.1) {
            g.y = mid;
            g.v = 1 + Math.random() * 2;
          }
        }
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(245, 236, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke(glass);
      ctx.fillStyle = 'rgba(245, 236, 255, 0.85)';
      ctx.fillRect(cx - gw - 8, y0 - 4, gw * 2 + 16, 4);
      ctx.fillRect(cx - gw - 8, y1, gw * 2 + 16, 4);
    },
  });
  clock.onSimulationChange(() => (grains.length = 0));
  return el;
}
