/**
 * English edition: sections (Intel, Your Wait, Time Mirror, Time Tunnel).
 */
import { clock } from '../core/clock';
import { CivilDate, civilAddDays, civilCompare, civilDiff, civilFromMs, civilWeekday, startOfCivilDay } from '../core/tz';
import { createSandGlass } from '../modules/sand';
import { createTunnel, TunnelDay, TunnelGate, TunnelScene } from '../three/tunnel';
import { bay } from '../ui/bay';
import { fitCanvas, h, s, setAttr, setText, watchVisibility } from '../ui/dom';
import { icon } from '../ui/icons';
import { registerModule } from '../ui/panel';
import { NEWS, NEWS_UPDATED, NewsItem, NewsKind } from './news';
import { ANCHORS, DAY_MS, PRELOAD, RELEASE, TZ, duration, fmt, num, pad, progressFrom, relative, split } from './time';
import { createZoom } from './zoom';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KIND_LABEL: Record<NewsKind, string> = { trailer: 'Trailer', official: 'Official', leak: 'Leak · unconfirmed', report: 'Report' };
const KIND_COLOR: Record<NewsKind, string> = { trailer: '#19f0ff', official: '#ffd23f', leak: '#9b6bff', report: '#ff8a3d' };
const BREAKING_MS = 72 * 3_600_000;

const store = {
  get<T>(k: string, fb: T): T {
    try {
      const v = localStorage.getItem(`gta6-en:${k}`);
      return v === null ? fb : (JSON.parse(v) as T);
    } catch {
      return fb;
    }
  },
  set(k: string, v: unknown): void {
    try {
      localStorage.setItem(`gta6-en:${k}`, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  },
};

const links = (n: NewsItem) => n.sources.flatMap((s, i) => [i ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer nofollow' }, s.label)]);

export function latestOfficial(now: number): NewsItem | null {
  return NEWS.filter((n) => n.at <= now && (n.kind === 'official' || n.kind === 'trailer')).sort((a, b) => b.at - a.at)[0] ?? null;
}
export function breaking(now: number): NewsItem | null {
  const n = latestOfficial(now);
  return n && now - n.at < BREAKING_MS ? n : null;
}

/* ===================================================================== */
/* Intel                                                                 */
/* ===================================================================== */
export function intelSection(): HTMLElement {
  const bTag = h('span.intel__live');
  const bWhen = h('time.intel__when');
  const bTitle = h('h3.intel__title');
  const bAgo = h('p.intel__ago');
  const bText = h('p.intel__lead');
  const bSrc = h('p.intel__src');
  const top = h('section.intel__top', h('header.intel__bhead', bTag, bWhen), bTitle, bAgo, bText, h('footer.intel__bfoot', bSrc));

  const upcoming = [
    { id: 'preload', at: PRELOAD, title: 'Pre-load (PS5)', note: 'Xbox: 00:00 GMT · code-in-box: Nov 12' },
    { id: 'reviews', at: Date.UTC(2026, 10, 18, 11, 1), title: 'Reviews (reported)', note: 'Embargo per insiders, not confirmed' },
    { id: 'release', at: RELEASE, title: 'GTA VI launches', note: 'PS5 & Xbox Series X|S' },
  ].map((u) => ({ ...u, count: h('b.up__count') }));
  const upBox = h(
    'section.intel__box',
    h('h4.intel__h', icon('calendar', 14), 'Coming up'),
    h(
      'ul.up',
      upcoming.map((u) =>
        h('li.up__item', { title: `${u.title} – ${u.note}` }, h('span.up__date', fmt(u.at, 'short'), h('span.up__time', ` · ${fmt(u.at, 'time')}`)), h('span.up__title', u.title), u.count),
      ),
    ),
  );

  const marks = [
    { label: 'Trailer 1', at: ANCHORS.trailer1 },
    { label: 'Trailer 2', at: ANCHORS.trailer2 },
    { label: 'Launch', at: ANCHORS.launchTrailer },
    { label: 'Release', at: RELEASE },
  ];
  const gaps = marks.slice(1).map((m, i) => ({ label: `${marks[i].label} → ${m.label}`, days: civilDiff(civilFromMs(marks[i].at, 'America/New_York'), civilFromMs(m.at, 'America/New_York')) }));
  const maxDays = Math.max(...gaps.map((g) => g.days));
  const rhythm = h(
    'section.intel__box',
    h('h4.intel__h', icon('play', 14), 'Trailer rhythm'),
    h(
      'ol.rhythm',
      gaps.map((g, i) =>
        h(
          `li.rhythm__row${i === gaps.length - 1 ? '.is-last' : ''}`,
          h('span.rhythm__label', g.label),
          h('span.rhythm__track', h('span.rhythm__fill', { style: { width: `${Math.max(2, (g.days / maxDays) * 100)}%` } })),
          h('b.rhythm__val', `${num(g.days)} d`),
        ),
      ),
    ),
    h('p.intel__caption', 'Almost the exact same gap between the big trailers – and just five weeks from the Launch Trailer to release.'),
  );

  type Filter = 'all' | 'official' | 'leak';
  let filter: Filter = 'all';
  let expanded = false;
  let shield = store.get('shield', true);
  const revealed = new Set<string>();
  const openIds = new Set<string>();
  const seg = h(
    'div.seg.seg--small.intel__seg',
    { role: 'tablist', 'aria-label': 'Filter news' },
    (
      [
        ['all', 'All'],
        ['official', 'Official'],
        ['leak', 'Leaks'],
      ] as [Filter, string][]
    ).map(([k, l]) =>
      h(
        'button.seg__btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(k === filter),
          dataset: { f: k },
          onclick: () => {
            filter = k;
            seg.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f === k)));
            renderFeed(clock.now());
          },
        },
        l,
      ),
    ),
  );
  const shieldBtn = h<HTMLButtonElement>('button.intel__shield', { type: 'button' });
  shieldBtn.addEventListener('click', () => {
    shield = !shield;
    store.set('shield', shield);
    renderFeed(clock.now());
  });
  const list = h('ol.intel__feed');
  const moreBtn = h<HTMLButtonElement>('button.intel__more', { type: 'button' });
  moreBtn.addEventListener('click', () => {
    expanded = !expanded;
    renderFeed(clock.now());
  });
  const feedBox = h(
    'section.intel__feedbox',
    h('header.intel__feedhead', h('h4.intel__h', icon('radar', 14), 'News'), h('div.intel__tools', seg, shieldBtn)),
    list,
    moreBtn,
    h('p.intel__note', `Updated ${fmt(NEWS_UPDATED, 'short')} · Leaks are unconfirmed – “leaked build downloads” are usually malware.`),
  );

  function itemEl(n: NewsItem, now: number): HTMLElement {
    const c = civilFromMs(n.at, TZ);
    const hidden = n.spoiler && shield && !revealed.has(n.id);
    const text = h('p.intel__text', n.text);
    const body = hidden
      ? h(
          'div.intel__spoiler',
          text,
          h(
            'button.intel__reveal',
            {
              type: 'button',
              onclick: () => {
                revealed.add(n.id);
                renderFeed(clock.now());
              },
            },
            icon('eye', 14),
            'Reveal spoiler',
          ),
        )
      : text;
    const det = h<HTMLDetailsElement>(
      'details.intel__item',
      { style: { '--c': KIND_COLOR[n.kind] } },
      h(
        'summary.intel__sum',
        h('span.intel__d', h('b', `${MON[c.m - 1]} ${c.d}`), h('small', WD[civilWeekday(c)])),
        h('span.intel__st', h('span.intel__meta', h('span.intel__chip', KIND_LABEL[n.kind]), h('span.intel__rel', relative(n.at, now))), h('span.intel__ititle', n.title)),
        icon('plus', 14, 'icon intel__chev'),
      ),
      h('div.intel__body', body, h('p.intel__src', 'Sources: ', ...links(n))),
    );
    if (openIds.has(n.id)) det.open = true;
    det.addEventListener('toggle', () => (det.open ? openIds.add(n.id) : openIds.delete(n.id)));
    return det;
  }

  function renderFeed(now: number) {
    const topId = latestOfficial(now)?.id;
    const items = NEWS.filter((n) => n.at <= now && n.id !== topId && (filter === 'all' || (filter === 'leak' ? n.kind === 'leak' : n.kind !== 'leak'))).sort((a, b) => b.at - a.at);
    const shown = expanded ? items : items.slice(0, 4);
    list.replaceChildren(...(shown.length ? shown.map((n) => h('li', itemEl(n, now))) : [h('li.intel__empty', 'Nothing here.')]));
    moreBtn.hidden = items.length <= 4;
    moreBtn.replaceChildren(icon(expanded ? 'close' : 'plus', 14), expanded ? 'Show less' : `All ${items.length} stories`);
    shieldBtn.setAttribute('aria-pressed', String(shield));
    shieldBtn.title = shield ? 'Spoiler shield on' : 'Spoiler shield off';
    shieldBtn.replaceChildren(icon(shield ? 'lock' : 'eye', 14), h('span', shield ? 'Spoiler shield' : 'Spoilers visible'));
  }

  let topKey = '';
  function renderTop(now: number) {
    const n = latestOfficial(now);
    if (!n) return;
    const isBreaking = now - n.at < BREAKING_MS;
    if (topKey !== `${n.id}${isBreaking}`) {
      topKey = `${n.id}${isBreaking}`;
      top.classList.toggle('is-breaking', isBreaking);
      bTag.replaceChildren(h('span.dot'), isBreaking ? 'Breaking' : `Latest official · ${KIND_LABEL[n.kind]}`);
      setText(bWhen, fmt(n.at, 'wdShort'));
      setText(bTitle, n.title);
      setText(bText, n.text);
      bSrc.replaceChildren(...links(n));
    }
    setText(bAgo, `${duration(now - n.at, 2)} ago`);
  }

  const feature = h('article.feature.feature--intel#mod-intel', h('div.intel__head', top, h('div.intel__side', upBox, rhythm)), feedBox);
  let lastMin = -1;
  registerModule({
    el: feature,
    second(now) {
      renderTop(now);
      for (const u of upcoming) {
        const d = u.at - now;
        if (d <= 0) setText(u.count, u.id === 'release' ? 'Live!' : 'live');
        else {
          const p = split(d);
          setText(u.count, `${p.days ? `${p.days}d ` : ''}${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`);
        }
      }
      const m = Math.floor(now / 60_000);
      if (m !== lastMin) {
        lastMin = m;
        renderFeed(now);
      }
    },
  });

  return bay({ id: 'intel', index: 1, eyebrow: 'Intel · news radar', script: 'Breaking', title: 'Intel', tone: 'ocean', compact: true, body: feature });
}

/* ===================================================================== */
/* Your Wait: start point, zoom, hourglass, the wait as one day           */
/* ===================================================================== */
interface Start {
  id: string;
  short: string;
  label: string;
  at: number;
}

const STARTS: Start[] = [
  { id: 'gta5', short: 'GTA V', label: 'GTA V release', at: ANCHORS.gta5 },
  { id: 'confirmed', short: 'Confirmed', label: 'GTA VI confirmed', at: ANCHORS.confirmed },
  { id: 'trailer1', short: 'Trailer 1', label: 'Trailer 1', at: ANCHORS.trailer1 },
  { id: 'trailer2', short: 'Trailer 2', label: 'Trailer 2', at: ANCHORS.trailer2 },
  { id: 'delay2', short: 'Delay', label: 'the second delay', at: ANCHORS.delay2 },
  { id: 'extended', short: 'Extended Look', label: 'An Extended Look', at: ANCHORS.extendedLook },
  { id: 'launch', short: 'Launch Trailer', label: 'the Launch Trailer', at: ANCHORS.launchTrailer },
];

let currentStart: Start = STARTS.find((p) => p.id === store.get('start', 'trailer1')) ?? STARTS[2];
const startListeners = new Set<(s: Start) => void>();
export const getStart = () => currentStart;
export const onStart = (fn: (s: Start) => void) => startListeners.add(fn);
function setStart(s: Start) {
  currentStart = s;
  store.set('start', s.id);
  startListeners.forEach((fn) => fn(s));
}

export function waitSection(): HTMLElement {
  const chips = h('div.sp__chips', { role: 'radiogroup', 'aria-label': 'Choose your start point' });
  const renderChips = () =>
    chips.replaceChildren(
      ...STARTS.map((p) =>
        h(
          'button.chip-btn.sp__chip',
          { type: 'button', role: 'radio', 'aria-checked': String(p.id === currentStart.id), onclick: () => setStart(p) },
          h('span', p.short),
          h('small', fmt(p.at, 'date')),
        ),
      ),
    );

  const pctInt = h('span.sp__pct-int');
  const pctDec = h('span.sp__pct-dec');
  const pctSub = h('p.sp__pct-sub');
  const waited = h('b');
  const left = h('b');
  const total = h('b');
  const ringArc = s('circle.sp__ring-arc', { cx: '60', cy: '60', r: '52', transform: 'rotate(-90 60 60)' });
  const C = 2 * Math.PI * 52;
  ringArc.setAttribute('stroke-dasharray', `${C} ${C}`);
  const ring = s('svg.sp__ring', { viewBox: '0 0 120 120', 'aria-hidden': 'true' }, s('circle.sp__ring-track', { cx: '60', cy: '60', r: '52' }), ringArc);

  const zoom = createZoom();
  const glass = createSandGlass({ labels: ['LEFT', 'DONE'], pct: (v) => `${num(v, 3, 3)}%`, ariaLabel: 'Hourglass of the wait' });
  const sandPct = h('b');

  const dial = h<HTMLCanvasElement>('canvas.wd-clock', { 'aria-hidden': 'true' });
  const dayTime = h('b.wd-time');
  const dayRate = h('p.wd-rate');

  const feature = h(
    'article.feature.feature--studio#mod-studio',
    h('div.sp__picker', h('p.sp__label', icon('target', 16), 'Count your wait from'), chips),
    h(
      'div.sp__readout',
      h('div.sp__ringwrap', ring, h('div.sp__pct', h('div.sp__pct-num', pctInt, pctDec, h('span.sp__pct-sign', '%')), pctSub)),
      h('dl.sp__stats', h('div', h('dt', 'Waited'), h('dd', waited)), h('div', h('dt', 'Left'), h('dd', left)), h('div', h('dt', 'Total'), h('dd', total))),
    ),
    h('div.sp__zl', h('h3.sp__h', h('span', 'Zoom'), h('small', 'From the whole wait down to the millisecond')), zoom.el),
    h(
      'div.sp__cards.sp__cards--two',
      h('section.sp__card.tone-sun', h('h3.sp__h', h('span', 'Hourglass'), h('small', 'The sand on top is the time still ahead · tap to shake')), glass.el, h('p.sp__cap', sandPct, ' run through')),
      h(
        'section.sp__card.tone-orange',
        h('h3.sp__h', h('span', 'The wait as one day'), h('small', 'Your whole wait squeezed into 24 hours – midnight is release')),
        dial,
        h('p.wd-readout', 'It is ', dayTime),
        dayRate,
      ),
    ),
  );

  const apply = () => {
    renderChips();
    zoom.setStart(currentStart.at, currentStart.short);
    glass.reset(1 - progressFrom(currentStart.at, clock.now()));
    setText(total, `${num((RELEASE - currentStart.at) / DAY_MS, 0)} days`);
    setText(pctSub, `of the wait since ${currentStart.label} (${fmt(currentStart.at, 'date')}) is done.`);
    const rate = (RELEASE - currentStart.at) / 86_400_000;
    setText(dayRate, `One second on this clock lasts ${duration(rate * 1000, 2)} in real life – one minute lasts ${duration(rate * 60_000, 2)}.`);
  };
  onStart(apply);

  function drawDial(f: number) {
    const rect = dial.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) return;
    const { ctx, w, h: hh } = fitCanvas(dial);
    ctx.clearRect(0, 0, w, hh);
    const r = Math.min(w, hh) / 2 - 8;
    const cx = w / 2;
    const cy = hh / 2;
    const ang = (frac: number) => frac * Math.PI * 2 - Math.PI / 2;
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
    const sec = f * 86400;
    hand(sec / 86400, r * 0.5, 5, '#f7efff');
    hand((sec % 3600) / 3600, r * 0.72, 3, '#ff8a3d');
    hand((sec % 60) / 60, r * 0.82, 1.5, '#ff2e97');
    ctx.fillStyle = '#ff2e97';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  registerModule({
    el: feature,
    frame(now) {
      const f = progressFrom(currentStart.at, now);
      const [ip, dp] = num(f * 100, 8, 8).split('.');
      setText(pctInt, ip);
      setText(pctDec, `.${dp ?? ''}`);
      setAttr(ringArc, 'stroke-dashoffset', String(C * (1 - f)));
      const w = split(Math.max(0, Math.min(now, RELEASE) - currentStart.at));
      setText(waited, `${num(w.days)} d · ${pad(w.hours)}:${pad(w.minutes)}:${pad(w.seconds)}`);
      const l = split(Math.max(0, RELEASE - now));
      setText(left, `${num(l.days)} d · ${pad(l.hours)}:${pad(l.minutes)}:${pad(l.seconds)}`);
      zoom.frame(now);
      glass.setFraction(1 - f);
      if (!document.documentElement.classList.contains('reduce-motion')) glass.step();
      glass.draw();
      setText(sandPct, `${num(f * 100, 3, 3)}%`);
      const sec = f * 86400;
      setText(dayTime, `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(Math.floor(sec % 60))}.${String(Math.floor((sec % 1) * 1000)).padStart(3, '0')}`);
      drawDial(f);
    },
    visibility(v) {
      zoom.visibility(v);
    },
  });
  apply();

  return bay({
    id: 'wait',
    index: 2,
    eyebrow: 'Start point studio',
    script: 'Your',
    title: 'Wait',
    tone: 'sunset',
    lead: 'Since when have you been waiting? Pick a moment – the progress bar, the zoom and the hourglass all follow it.',
    body: feature,
  });
}

/* ===================================================================== */
/* Time Mirror                                                           */
/* ===================================================================== */
export function mirrorSection(): HTMLElement {
  const day = h('span.mirror__weekday');
  const date = h('span.mirror__date');
  const time = h('span.mirror__time');
  const lead = h('p.mirror__lead');
  const labelL = h('span.maxis__label.maxis__label--l');
  const labelR = h('span.maxis__label.maxis__label--r');
  const capL = h('span.axis-caption__l');
  const capR = h('span.axis-caption__r');
  const axis = h(
    'div.maxis',
    { role: 'img', 'aria-label': 'Mirror axis between past, now and release' },
    h('span.maxis__line'),
    h('span.maxis__pulse.maxis__pulse--l'),
    h('span.maxis__pulse.maxis__pulse--r'),
    h('span.maxis__node.maxis__node--past'),
    h('span.maxis__node.maxis__node--now'),
    h('span.maxis__node.maxis__node--future'),
    h('span.maxis__label.maxis__label--now', 'Now'),
    labelL,
    labelR,
  );
  const feature = h(
    'article.feature.feature--mirror#mod-mirror',
    h(
      'div.mirror',
      h('div.mirror__main', h('p.mirror__kicker', 'This moment is exactly as far in the past as ', h('b', 'GTA VI'), ' is in the future:'), h('div.mirror__stamp', day, date, time), lead),
      h('div.mirror__axis', axis, h('div.axis-caption', capL, h('span.axis-caption__m', 'Mirror axis'), capR)),
    ),
  );
  const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  registerModule({
    el: feature,
    second(now) {
      const diff = RELEASE - now;
      const m = now - diff;
      const c = civilFromMs(m, TZ);
      setText(day, WDL[civilWeekday(c)]);
      setText(date, fmt(m, 'full').replace(/^[^,]+, /, ''));
      setText(time, new Date(m).toLocaleTimeString('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setText(
        lead,
        diff > 0
          ? `From then until today exactly as much time has passed as is still left until release: ${duration(diff, 3)}. The mirror point moves two seconds closer to today every second.`
          : 'Release reached – mirror and present have met.',
      );
      setText(capL, fmt(m, 'date'));
      setText(capR, fmt(RELEASE, 'date'));
      setText(labelL, `− ${duration(Math.abs(diff), 1)}`);
      setText(labelR, `+ ${duration(Math.abs(diff), 1)}`);
    },
  });
  return bay({
    id: 'mirror',
    index: 3,
    eyebrow: 'Mirror',
    script: 'Time',
    title: 'Mirror',
    tone: 'night',
    body: feature,
  });
}

/* ===================================================================== */
/* Time Tunnel (3D)                                                      */
/* ===================================================================== */
const HOUR_COLOR = { night: '#7b5cff', day: '#ff2e97', evening: '#ff8a3d' };
const hourKind = (hr: number) => (hr < 6 || hr >= 22 ? 'night' : hr < 18 ? 'day' : 'evening');

export function tunnelSection(): HTMLElement {
  const labelLayer = h('div.tunnel__labels', { 'aria-hidden': 'true' });
  const hudPos = h('b');
  const hudLeft = h('span');
  const hud = h('div.tunnel__hud', h('span.tunnel__hud-tag', 'Position'), hudPos, hudLeft);
  const viewport = h('div.tunnel__viewport', labelLayer, hud);
  const fallback = h('p.tunnel__fallback', { hidden: true }, 'Your device does not support 3D graphics (WebGL).');
  const slider = h<HTMLInputElement>('input.range#tunnel-range', { type: 'range', min: '0', max: '1', step: '0.01', value: '0', 'aria-label': 'Flight position in days' });
  const posLabel = h('output.tunnel__pos', { for: 'tunnel-range' });
  const apBtn = h<HTMLButtonElement>('button.chip-btn', { type: 'button', 'aria-pressed': 'true' });
  const flyBtn = h('button.btn.btn--pink', { type: 'button' }, icon('rocket', 18), 'Fly to the portal');
  const backBtn = h('button.btn.btn--ghost', { type: 'button' }, icon('reset', 18), 'Today');
  const legend = h(
    'ul.legend.legend--row',
    h('li', h('span.legend__swatch', { style: { background: HOUR_COLOR.night } }), 'Night'),
    h('li', h('span.legend__swatch', { style: { background: HOUR_COLOR.day } }), 'Day'),
    h('li', h('span.legend__swatch', { style: { background: HOUR_COLOR.evening } }), 'Evening'),
    h('li', h('span.legend__swatch', { style: { background: '#ffd23f' } }), 'Pre-load gate & release portal'),
  );
  const feature = h(
    'article.feature.feature--tunnel#mod-tunnel',
    viewport,
    fallback,
    h('div.tunnel__controls', h('label.tunnel__slider', h('span', 'Flight position'), slider, posLabel), h('div.tunnel__buttons', apBtn, flyBtn, backBtn)),
    legend,
  );

  let scene: TunnelScene | null = null;
  const reduced = () => document.documentElement.classList.contains('reduce-motion');
  const setAp = (on: boolean) => {
    apBtn.setAttribute('aria-pressed', String(on));
    apBtn.replaceChildren(icon(on ? 'pause' : 'play', 14), on ? 'Autopilot on' : 'Autopilot off');
    scene?.setAutopilot(on);
  };
  const maxDays = () => Math.max(0.01, (RELEASE - clock.now()) / DAY_MS - 0.35);

  const buildData = (now: number) => {
    if (!scene) return;
    const days: TunnelDay[] = [];
    const last = civilAddDays(civilFromMs(RELEASE, TZ), -1);
    for (let c: CivilDate = civilFromMs(now, TZ); civilCompare(c, last) <= 0; c = civilAddDays(c, 1)) {
      const wd = civilWeekday(c);
      days.push({
        start: startOfCivilDay(c, TZ),
        end: startOfCivilDay(civilAddDays(c, 1), TZ),
        color: wd === 0 || wd === 6 ? '#ff5fa8' : '#9b6bff',
        label: `${WD[wd]} ${MON[c.m - 1]} ${c.d}`,
        sub: wd === 0 || wd === 6 ? 'Weekend' : 'Weekday',
        hourColors: Array.from({ length: 24 }, (_, hr) => HOUR_COLOR[hourKind(hr)]),
      });
    }
    const gates: TunnelGate[] = [];
    if (PRELOAD > now) gates.push({ at: PRELOAD, label: 'Pre-load', color: '#ffd23f', kind: 'preload' });
    scene.setData(days, gates, RELEASE);
  };

  slider.addEventListener('input', () => {
    setAp(false);
    scene?.setFlight(Number(slider.value));
  });
  apBtn.addEventListener('click', () => setAp(apBtn.getAttribute('aria-pressed') !== 'true'));
  flyBtn.addEventListener('click', () => {
    setAp(false);
    scene?.flyTo(maxDays(), reduced() ? 1 : 6500);
  });
  backBtn.addEventListener('click', () => {
    setAp(false);
    scene?.flyTo(0, reduced() ? 1 : 1500);
  });

  let init = false;
  watchVisibility(
    feature,
    (v) => {
      if (v && !init) {
        init = true;
        scene = createTunnel(viewport, labelLayer);
        fallback.hidden = Boolean(scene);
        viewport.hidden = !scene;
        if (scene) {
          scene.onPick((di) => {
            setAp(false);
            const start = startOfCivilDay(civilAddDays(civilFromMs(clock.now(), TZ), di + 1), TZ);
            scene?.flyTo((start - clock.now()) / DAY_MS - 0.55, 1400);
          });
          scene.setReducedMotion(reduced());
          buildData(clock.now());
          setAp(!reduced());
        }
      }
      scene?.setActive(v);
    },
    '300px',
  );

  let lastDay = '';
  registerModule({
    el: feature,
    second(now) {
      scene?.setNow(now);
      const key = fmt(now, 'date');
      if (key !== lastDay) {
        lastDay = key;
        buildData(now);
      }
    },
    frame(now) {
      if (!scene) return;
      const f = scene.getFlight();
      const md = maxDays();
      slider.max = md.toFixed(2);
      if (document.activeElement !== slider) slider.value = String(f);
      const at = now + f * DAY_MS;
      setText(posLabel, f < 0.05 ? 'Now' : `+${num(f, 1, 1)} days`);
      setText(hudPos, f < 0.05 ? 'Now' : `${fmt(at, 'wdShort')}, ${fmt(at, 'time')}`);
      setText(hudLeft, `${duration(Math.max(0, RELEASE - at), 2)} to the portal`);
    },
  });

  const days = Math.max(0, Math.ceil((RELEASE - clock.now()) / DAY_MS));
  return bay({
    id: 'tunnel',
    index: 4,
    eyebrow: '3D · space = time',
    script: 'Fly',
    title: 'Time Tunnel',
    tone: 'night',
    lead: `Every ring is a day, every glowing segment an hour. ${days} rings to the release portal – tap a ring to fly there.`,
    body: feature,
  });
}
