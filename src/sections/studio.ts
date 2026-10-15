/**
 * Bay 01 – Startpunkt-Studio: Ab wann zählt deine Wartezeit?
 * Globaler Startpunkt, Live-Fortschritt, Zeitlupe (Deep Zoom), Sanduhr mit Sandphysik,
 * Wartetag-Uhr und Prozent-Marken.
 */
import { on } from '../core/bus';
import { clock } from '../core/clock';
import { fmtDate, fmtDateTime, humanDuration, num, pad, splitDuration } from '../core/format';
import { unlock } from '../core/game';
import { onSettings } from '../core/settings';
import { StartPoint, getStart, progressFrom, setCustomStart, setStart, startPresets } from '../core/startpoint';
import { RELEASE, TZ } from '../core/timeline';
import { DAY_MS, parseLocal } from '../core/tz';
import { createSandGlass } from '../modules/sand';
import { createZeitlupe } from '../modules/zeitlupe';
import { bay } from '../ui/bay';
import { fitCanvas, h, s, setAttr, setText } from '../ui/dom';
import { icon } from '../ui/icons';
import { refreshAll, registerModule } from '../ui/panel';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function studioSection(): HTMLElement {
  /* Startpunkt-Auswahl ------------------------------------------- */
  const chipRow = h('div.sp__chips', { role: 'radiogroup', 'aria-label': 'Startpunkt wählen' });
  const customLabel = h<HTMLInputElement>('input.input#sp-label', { type: 'text', maxLength: 40, placeholder: 'z. B. Mein Geburtstag 2025' });
  const customAt = h<HTMLInputElement>('input.input#sp-at', { type: 'datetime-local', step: '1' });
  const customErr = h('p.form-error', { hidden: true });
  const customForm = h(
    'form.sp__custom',
    { hidden: true },
    h('label.field', h('span', 'Name'), customLabel),
    h('label.field', h('span', 'Zeitpunkt (deutsche Zeit)'), customAt),
    h('button.btn.btn--pink', { type: 'submit' }, icon('target', 18), 'Als Startpunkt setzen'),
    customErr,
  );
  customForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!customAt.value) return;
    let at: number;
    try {
      at = parseLocal(customAt.value, TZ);
    } catch {
      customErr.hidden = false;
      customErr.textContent = 'Der Zeitpunkt konnte nicht gelesen werden.';
      return;
    }
    if (at >= RELEASE) {
      customErr.hidden = false;
      customErr.textContent = 'Der Startpunkt muss vor dem Release liegen.';
      return;
    }
    customErr.hidden = true;
    setCustomStart(at, customLabel.value || 'Dein Moment');
    unlock('startpoint');
  });

  const renderChips = () => {
    const cur = getStart();
    const mk = (p: StartPoint) =>
      h(
        'button.chip-btn.sp__chip',
        {
          type: 'button',
          role: 'radio',
          'aria-checked': String(cur.id === p.id),
          title: `${p.label} · ${fmtDate(p.at, 'date')}`,
          onclick: () => {
            customForm.hidden = true;
            setStart(p.id);
          },
        },
        h('span', p.short),
        h('small', fmtDate(p.at, 'date')),
      );
    const presets = startPresets();
    chipRow.replaceChildren(
      h('span.sp__group', 'GTA'),
      ...presets.filter((p) => p.group === 'gta').map(mk),
      h('span.sp__group', 'Du'),
      ...presets.filter((p) => p.group === 'personal').map(mk),
      h(
        'button.chip-btn.sp__chip.sp__chip--custom',
        {
          type: 'button',
          role: 'radio',
          'aria-checked': String(cur.id === 'custom'),
          onclick: () => {
            customForm.hidden = !customForm.hidden;
            if (!customForm.hidden) customLabel.focus();
          },
        },
        icon('plus', 14),
        h('span', cur.id === 'custom' ? cur.short : 'Eigener Moment'),
        cur.id === 'custom' ? h('small', fmtDate(cur.at, 'date')) : null,
      ),
    );
  };

  /* Readout --------------------------------------------------------- */
  const pctInt = h('span.sp__pct-int');
  const pctDec = h('span.sp__pct-dec');
  const pctSub = h('p.sp__pct-sub');
  const waited = h('b');
  const left = h('b');
  const total = h('b');
  const ringArc = s('circle.sp__ring-arc', { cx: '60', cy: '60', r: '52', transform: 'rotate(-90 60 60)' });
  const ring = s(
    'svg.sp__ring',
    { viewBox: '0 0 120 120', 'aria-hidden': 'true' },
    s('circle.sp__ring-track', { cx: '60', cy: '60', r: '52' }),
    ringArc,
  );
  const C = 2 * Math.PI * 52;
  ringArc.setAttribute('stroke-dasharray', `${C} ${C}`);

  /* Zeitlupe -------------------------------------------------------- */
  const zl = createZeitlupe();

  /* Sanduhr --------------------------------------------------------- */
  const glass = createSandGlass();
  const sandPct = h('b');
  const sandGrain = h('span');

  /* Wartetag-Uhr ---------------------------------------------------- */
  const dial = h<HTMLCanvasElement>('canvas.wd-clock', { 'aria-hidden': 'true' });
  const dayTime = h('b.wd-time');
  const dayRate = h('p.wd-rate');
  const asYear = h('dd');
  const asMatch = h('dd');
  const asLesson = h('dd');

  /* Prozent-Marken -------------------------------------------------- */
  const marksList = h('ol.pm');
  const nextMark = h('div.pm-next');

  const feature = h(
    'article.feature.feature--studio#mod-studio',
    h('div.sp__picker', h('p.sp__label', icon('target', 16), 'Dein Startpunkt'), chipRow, customForm),
    h(
      'div.sp__readout',
      h('div.sp__ringwrap', ring, h('div.sp__pct', h('div.sp__pct-num', pctInt, pctDec, h('span.sp__pct-sign', '%')), pctSub)),
      h('dl.sp__stats', h('div', h('dt', 'Gewartet'), h('dd', waited)), h('div', h('dt', 'Noch'), h('dd', left)), h('div', h('dt', 'Gesamt'), h('dd', total))),
    ),
    h('div.sp__zl', h('h3.sp__h', h('span', 'Zeitlupe'), h('small', 'Zoom von der gesamten Wartezeit bis in die Millisekunde')), zl.el),
    h(
      'div.sp__cards',
      h('section.sp__card.tone-sun', h('h3.sp__h', h('span', 'Sanduhr'), h('small', 'Ein Korn für jeden Bruchteil deiner Wartezeit')), glass.el, h('p.sp__cap', sandPct, ' durchgelaufen · ', sandGrain)),
      h(
        'section.sp__card.tone-orange',
        h('h3.sp__h', h('span', 'Der Wartetag'), h('small', 'Deine Wartezeit, gestaucht auf 24 Stunden')),
        dial,
        h('p.wd-readout', 'Es ist ', dayTime),
        dayRate,
        h('dl.kv', h('div', h('dt', 'Als Kalenderjahr'), asYear), h('div', h('dt', 'Als Fußballspiel'), asMatch), h('div', h('dt', 'Als Schulstunde'), asLesson)),
      ),
      h('section.sp__card.tone-cyan', h('h3.sp__h', h('span', 'Prozent-Marken'), h('small', 'Wann du welchen Anteil geschafft hast')), nextMark, marksList),
    ),
  );

  /* Logik ----------------------------------------------------------- */
  let start = getStart();
  const applyStart = () => {
    start = getStart();
    renderChips();
    zl.setStart(start.at, start.short);
    glass.reset(1 - progressFrom(start.at, clock.now()));
    setText(total, `${num((RELEASE - start.at) / DAY_MS, 0)} Tage`);
    renderMarks(clock.now());
    setText(pctSub, `der Wartezeit seit ${start.label} (${fmtDateTime(start.at)}) sind geschafft.`);
    const rate = (RELEASE - start.at) / 86_400_000; // echte ms pro Wartetag-ms
    setText(
      dayRate,
      `Auf dieser Uhr ist Mitternacht der Release. Eine Wartetag-Sekunde dauert ${humanDuration(rate * 1000, 2)} echte Zeit, eine Wartetag-Minute ${humanDuration(rate * 60_000, 2)} echte Zeit.`,
    );
    const grainMs = (RELEASE - start.at) / 1000;
    setText(sandGrain, `jedes Promille ≈ ${humanDuration(grainMs, 2)}`);
  };
  on('startpoint', () => {
    applyStart();
    refreshAll();
  });
  onSettings(renderChips);

  const marks = [90, 95, 97, 98, 99, 99.5, 99.9, 99.99, 99.999, 99.9999];
  let lastMarksKey = '';
  function renderMarks(now: number) {
    const key = `${start.id}-${start.at}-${Math.floor(now / 30_000)}`;
    if (key === lastMarksKey) return;
    lastMarksKey = key;
    marksList.replaceChildren(
      ...marks.map((p) => {
        const at = start.at + (RELEASE - start.at) * (p / 100);
        const done = at <= now;
        return h(
          `li.pm__item${done ? '.is-done' : ''}`,
          h('span.pm__p', `${num(p, 4, 0)} %`),
          h('time.pm__at', `${fmtDate(at, 'dateShort')} ${fmtDate(at, 'time')}`),
          h('span.pm__rel', done ? icon('check', 14) : humanDuration(at - now, 1)),
        );
      }),
    );
  }

  function drawDial(f: number) {
    const rect = dial.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) return;
    const { ctx, w, h: hh } = fitCanvas(dial);
    ctx.clearRect(0, 0, w, hh);
    const r = Math.min(w, hh) / 2 - 8;
    const cx = w / 2;
    const cy = hh / 2;
    // 24-Stunden-Zifferblatt: oben = 00:00 = Startpunkt / Release
    const ang = (frac: number) => frac * Math.PI * 2 - Math.PI / 2;
    // Fortschrittsbogen
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, '#ff2e97');
    grad.addColorStop(1, '#ffd23f');
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, ang(0), ang(f));
    ctx.stroke();
    // Stundenmarken
    for (let i = 0; i < 24; i++) {
      const a = ang(i / 24);
      const inner = i % 6 === 0 ? r - 20 : r - 14;
      ctx.strokeStyle = i % 6 === 0 ? 'rgba(247,239,255,0.8)' : 'rgba(247,239,255,0.3)';
      ctx.lineWidth = i % 6 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * (r - 9), cy + Math.sin(a) * (r - 9));
      ctx.stroke();
      if (i % 6 === 0) {
        ctx.fillStyle = 'rgba(247,239,255,0.6)';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pad(i), cx + Math.cos(a) * (r - 32), cy + Math.sin(a) * (r - 32) + 4);
      }
    }
    const daySec = f * 86400;
    const hand = (frac: number, len: number, width: number, color: string) => {
      const a = ang(frac);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    };
    hand(daySec / 86400, r * 0.5, 5, '#f7efff');
    hand((daySec % 3600) / 3600, r * 0.72, 3, '#ff8a3d');
    hand((daySec % 60) / 60, r * 0.82, 1.5, '#ff2e97');
    ctx.fillStyle = '#ff2e97';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  let sandTick = 0;
  registerModule({
    el: feature,
    frame(now) {
      const f = progressFrom(start.at, now);
      const pctStr = num(f * 100, 8, 8);
      const [ip, dp] = pctStr.split(',');
      setText(pctInt, ip);
      setText(pctDec, `,${dp ?? ''}`);
      setAttr(ringArc, 'stroke-dashoffset', String(C * (1 - f)));
      const w = splitDuration(Math.max(0, Math.min(now, RELEASE) - start.at));
      setText(waited, `${num(w.days)} T · ${pad(w.hours)}:${pad(w.minutes)}:${pad(w.seconds)}`);
      const l = splitDuration(Math.max(0, RELEASE - now));
      setText(left, `${num(l.days)} T · ${pad(l.hours)}:${pad(l.minutes)}:${pad(l.seconds)}`);
      zl.frame(now);
      glass.setFraction(1 - f);
      if (!document.documentElement.classList.contains('reduce-motion')) {
        glass.step();
        if (++sandTick % 2 === 0) glass.step();
      }
      glass.draw();
      setText(sandPct, `${num(f * 100, 3, 3)} %`);
      // Wartetag
      const daySec = f * 86400;
      const ms = Math.floor((daySec % 1) * 1000);
      setText(dayTime, `${pad(Math.floor(daySec / 3600))}:${pad(Math.floor((daySec % 3600) / 60))}:${pad(Math.floor(daySec % 60))},${String(ms).padStart(3, '0')} Uhr`);
      drawDial(f);
    },
    second(now) {
      const f = progressFrom(start.at, now);
      const d = new Date(Date.UTC(2025, 0, 1) + Math.min(364.999, f * 365) * DAY_MS);
      setText(asYear, `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} Uhr`);
      const minute = f * 90;
      setText(asMatch, minute >= 90 ? 'Abpfiff!' : `${Math.floor(minute) + 1}. Minute`);
      const lm = f * 45;
      setText(asLesson, `Minute ${Math.floor(lm)}:${pad((lm % 1) * 60)} von 45`);
      renderMarks(now);
      const next = marks.map((p) => ({ p, at: start.at + (RELEASE - start.at) * (p / 100) })).find((m) => m.at > now);
      if (next) {
        const sp = splitDuration(next.at - now);
        nextMark.replaceChildren(
          h('span.pm-next__tag', 'Nächste Marke'),
          h('b.pm-next__p', `${num(next.p, 4, 0)} %`),
          h('span.pm-next__count', `${sp.days ? `${sp.days} T ` : ''}${pad(sp.hours)}:${pad(sp.minutes)}:${pad(sp.seconds)}`),
        );
      } else nextMark.replaceChildren(h('b.pm-next__p', '100 % – geschafft.'));
    },
    visibility(v) {
      zl.visibility(v);
    },
  });

  applyStart();

  return bay({
    id: 'studio',
    index: 2,
    eyebrow: 'Startpunkt-Studio',
    script: 'Deine',
    title: 'Zeitrechnung',
    tone: 'sunset',
    lead: 'Ab wann wartest du eigentlich? Wähle deinen Startpunkt – Trailer 1, GTA V, den Ferienbeginn oder einen ganz eigenen Moment. Fortschritt, Zeitlupe, Sanduhr, Wartetag und alle Prozent-Meilensteine der Seite richten sich danach.',
    body: feature,
  });
}
