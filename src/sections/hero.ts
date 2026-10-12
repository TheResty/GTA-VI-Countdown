/**
 * Hero: 3D-Synthwave-Fahrt + riesiger Live-Countdown + persönlicher
 * Restzeit-Text + Live-Ticker. Wechselt automatisch in die Final-24h-
 * Inszenierung und nach dem Release in den Post-Release-Modus.
 */
import { CONFIG } from '../config';
import { emit, on } from '../core/bus';
import { calendarCounts } from '../core/calendar';
import { clock } from '../core/clock';
import { fmtDate, humanDuration, num, pad, splitDuration, tzLabel } from '../core/format';
import { sunClick } from '../core/game';
import { currentInterval, intervalContext } from '../core/intervals';
import { nextMilestones } from '../core/milestones';
import { intensityFor, phaseFor } from '../core/phases';
import { onSettings, settings } from '../core/settings';
import { ANCHORS, DST_CHANGES, PRELOAD, RELEASE } from '../core/timeline';
import { DAY_MS, HOUR_MS } from '../core/tz';
import { tickerItems } from '../data/quips';
import { createSynthwave, SynthScene } from '../three/synthwave';
import { h, setText, watchVisibility } from '../ui/dom';
import { icon } from '../ui/icons';
import { Odometer } from '../ui/odometer';

export function heroSection(): HTMLElement {
  const stage = h('div.hero__stage', { 'aria-hidden': 'true' });

  /* Countdown (Normalmodus) ------------------------------------------ */
  const units = [
    { key: 'days', label: 'Tage', short: 'Tage', odo: new Odometer(2, 'odo--days') },
    { key: 'hours', label: 'Stunden', short: 'Std', odo: new Odometer(2) },
    { key: 'minutes', label: 'Minuten', short: 'Min', odo: new Odometer(2) },
    { key: 'seconds', label: 'Sekunden', short: 'Sek', odo: new Odometer(2) },
  ] as const;
  const countEl = h(
    'div.count',
    { role: 'timer', 'aria-live': 'off' },
    units.map((u, i) => [
      h(
        `div.count__unit.count__unit--${u.key}`,
        h('div.count__digits', u.odo.el),
        h('span.count__label', h('span.count__long', u.label), h('span.count__short', { 'aria-hidden': 'true' }, u.short)),
      ),
      i < units.length - 1 ? h('span.count__sep', { 'aria-hidden': 'true' }, ':') : null,
    ]),
  );
  const countAria = h('p.sr-only', { 'aria-live': 'polite' });

  /* Final 24h ------------------------------------------------------- */
  const finalTime = h('div.final__time');
  const finalCs = h('span.final__cs');
  const hourBar = h(
    'div.final__hours',
    Array.from({ length: 24 }, (_, i) => h('span.final__hour', { title: `Stunde ${24 - i}` })),
  );
  const ecg = h<HTMLCanvasElement>('canvas.final__ecg', { 'aria-hidden': 'true' });
  const finalEl = h(
    'div.final',
    { hidden: true },
    h('p.final__eyebrow', 'Final Countdown · alle Systeme auf Rot'),
    h('div.final__clock', finalTime, finalCs),
    hourBar,
    ecg,
  );

  /* Post-Release ---------------------------------------------------- */
  const sinceEl = h('div.post__since');
  const postEl = h(
    'div.post',
    { hidden: true },
    h('p.post__eyebrow', 'Mission Passed · Respekt +∞'),
    h('h2.post__title', 'GTA VI ist da.'),
    h('p.post__label', 'Seit Release vergangen'),
    sinceEl,
    h(
      'button.btn.btn--gold',
      { type: 'button', onclick: () => emit('celebrate', { replay: true }) },
      icon('star', 18),
      'Release-Feier noch einmal abspielen',
    ),
  );

  /* Restzeit-Text --------------------------------------------------- */
  const ivRange = h('span.interval__range');
  const ivTitle = h('h2.interval__title');
  const ivText = h('p.interval__text');
  const intervalEl = h(
    'a.interval',
    { href: '#restzeit-atlas', title: 'Alle Restzeit-Texte im Restzeit-Atlas' },
    h('span.interval__tag', 'Restzeit-Lage', ivRange),
    ivTitle,
    ivText,
  );

  /* Chips ----------------------------------------------------------- */
  const chipNights = h('b');
  const chipSchool = h('b');
  const chipWeekends = h('b');
  const chipPreload = h('b');
  const chipPreloadLabel = h('span');
  const chips = h(
    'ul.hero__chips',
    h('li.chip', icon('moon', 16), chipNights, h('span', '× schlafen')),
    h('li.chip', icon('book', 16), chipSchool, h('span', 'Schultage')),
    h('li.chip', icon('palm', 16), chipWeekends, h('span', 'Wochenenden')),
    h('li.chip.chip--sun', icon('download', 16), chipPreloadLabel, chipPreload),
  );

  /* Fortschritt ----------------------------------------------------- */
  const progFill = h('span.hero-progress__fill');
  const progPct = h('span.hero-progress__pct');
  const progress = h(
    'div.hero-progress',
    h('div.hero-progress__labels', h('span', 'Trailer 1 · 05.12.2023'), progPct, h('span', 'Release · 19.11.2026')),
    h('div.hero-progress__track', { role: 'progressbar', 'aria-label': 'Fortschritt seit Trailer 1' }, progFill),
  );

  const nextMs = h('p.hero__next');
  const dstNote = h('p.hero__dst', { hidden: true });

  const releaseLine = h(
    'p.hero__release',
    h('time', { datetime: new Date(RELEASE).toISOString() }, `${fmtDate(RELEASE, 'full')} · 00:00 Uhr ${tzLabel(RELEASE)}`),
    h('span.hero__platforms', CONFIG.release.platforms),
  );

  const tickerTrack = h('div.ticker__track');
  const ticker = h('div.ticker', { 'aria-label': 'Live-Ticker' }, h('span.ticker__label', 'Leonida Live'), h('div.ticker__viewport', tickerTrack));

  const content = h(
    'div.hero__content.wrap',
    h('p.hero__eyebrow', h('span.dot'), h('span.hero__eyebrow-long', 'Command Center · '), 'Leonida · Vice City'),
    h(
      'h1.hero__title',
      h('span.hero__script', 'Vice City'),
      h('span.hero__gta', 'GTA'),
      h('span.hero__vi', 'VI'),
      h('span.sr-only', ' Countdown Command Center'),
    ),
    releaseLine,
    countEl,
    countAria,
    finalEl,
    postEl,
    progress,
    intervalEl,
    chips,
    nextMs,
    dstNote,
  );

  const section = h('section.hero#start', { 'aria-label': 'Countdown' }, stage, h('div.hero__shade'), content, ticker);

  /* 3D-Szene -------------------------------------------------------- */
  let scene: SynthScene | null = null;
  const setup3d = () => {
    const s = settings();
    if (s.enable3d && !scene) {
      scene = createSynthwave(stage);
      if (!scene) section.classList.add('no-webgl');
      scene?.setReducedMotion(s.reduceMotion);
    } else if (!s.enable3d && scene) {
      scene.dispose();
      scene = null;
    }
    section.classList.toggle('no-3d', !scene);
    scene?.setReducedMotion(s.reduceMotion);
  };
  setup3d();
  onSettings(setup3d);
  watchVisibility(section, (v) => scene?.setActive(v), '0px');

  section.addEventListener('click', (e) => {
    if (!scene) return;
    const target = e.target as HTMLElement;
    if (target.closest('a,button,input,.count,.interval')) return;
    if (scene.hitSun(e.clientX, e.clientY)) {
      const n = sunClick();
      scene.flash();
      if (n < 7) emit('toast', { title: 'Die Sonne über Vice City', text: `${n}/7 – sie mag das.`, tone: 'info', icon: 'sun' });
    }
  });

  /* Ticker ---------------------------------------------------------- */
  const renderTicker = () => {
    const items = tickerItems(clock.now());
    tickerTrack.replaceChildren(
      ...[0, 1].map((k) =>
        h('div.ticker__group', { 'aria-hidden': k === 1 ? 'true' : 'false' }, items.map((t) => h('span.ticker__item', t))),
      ),
    );
    tickerTrack.style.setProperty('--ticker-duration', `${Math.max(60, items.join(' ').length / 9)}s`);
  };
  renderTicker();
  setInterval(renderTicker, 5 * 60_000);
  clock.onSimulationChange(renderTicker);

  /* Updates --------------------------------------------------------- */
  let mode: 'normal' | 'final' | 'post' = 'normal';
  const ecgCtx = ecg.getContext('2d');
  const ecgHist: number[] = [];

  const setMode = (m: typeof mode) => {
    if (m === mode) return;
    mode = m;
    countEl.hidden = m !== 'normal';
    finalEl.hidden = m !== 'final';
    postEl.hidden = m !== 'post';
    section.dataset.mode = m;
    intervalEl.classList.toggle('is-post', m === 'post');
  };
  section.dataset.mode = 'normal';

  function onSecond(now: number) {
    const diff = RELEASE - now;
    const phase = phaseFor(diff);
    scene?.setIntensity(intensityFor(diff));
    setMode(diff <= 0 ? 'post' : diff <= DAY_MS ? 'final' : 'normal');

    const p = splitDuration(diff);
    if (mode === 'normal') {
      units[0].odo.set(p.days);
      units[1].odo.set(p.hours);
      units[2].odo.set(p.minutes);
      units[3].odo.set(p.seconds);
      if (p.seconds % 15 === 0) countAria.textContent = `Noch ${p.days} Tage, ${p.hours} Stunden, ${p.minutes} Minuten bis GTA VI.`;
    } else if (mode === 'final') {
      setText(finalTime, `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`);
      const hoursLeft = Math.ceil(diff / HOUR_MS);
      hourBar.querySelectorAll<HTMLElement>('.final__hour').forEach((el, i) => {
        el.classList.toggle('is-burnt', i >= hoursLeft);
        el.classList.toggle('is-current', i === hoursLeft - 1);
      });
    } else {
      const since = splitDuration(-diff);
      const clockTxt = `${pad(since.hours)}:${pad(since.minutes)}:${pad(since.seconds)}`;
      setText(sinceEl, since.days ? `${num(since.days)} ${since.days === 1 ? 'Tag' : 'Tage'}, ${clockTxt}` : clockTxt);
    }

    // Restzeit-Text
    const iv = currentInterval(diff);
    const ctx = intervalContext(now);
    setText(ivRange, iv.range);
    setText(ivTitle, iv.title);
    setText(ivText, iv.text(ctx));

    // Chips
    const cal = calendarCounts(now);
    setText(chipNights, num(cal.nights));
    setText(chipSchool, num(cal.schoolDaysRemaining));
    setText(chipWeekends, num(cal.weekends));
    if (PRELOAD > now) {
      setText(chipPreloadLabel, 'Preload in');
      setText(chipPreload, humanDuration(PRELOAD - now, 2));
    } else if (diff > 0) {
      setText(chipPreloadLabel, 'Preload');
      setText(chipPreload, 'läuft');
    } else {
      setText(chipPreloadLabel, 'Status');
      setText(chipPreload, 'installiert');
    }
    chips.hidden = diff <= 0;

    // Nächster Meilenstein
    const nm = nextMilestones(now, 1)[0];
    nextMs.hidden = !nm || diff <= 0;
    if (nm) setText(nextMs, `Nächster Meilenstein: ${nm.label} – ${humanDuration(nm.at - now, 3)}`);

    // Zeitumstellungs-Hinweis
    const pendingDst = DST_CHANGES.find((c) => c.at > now && c.at < RELEASE);
    dstNote.hidden = !pendingDst;
    if (pendingDst) {
      const extra = (pendingDst.before - pendingDst.after) / HOUR_MS;
      setText(
        dstNote,
        `Echtzeit-Countdown: Durch die Zeitumstellung am ${fmtDate(pendingDst.at, 'dayMonth')} ist die Wartezeit ${extra > 0 ? 'eine Stunde länger' : 'eine Stunde kürzer'}, als die Uhr an der Wand vermuten lässt.`,
      );
    }
    section.dataset.phase = phase.id;
  }

  function onFrame(now: number) {
    const diff = RELEASE - now;
    // Fortschritt seit Trailer 1 mit vielen Nachkommastellen
    const frac = Math.min(1, Math.max(0, (now - ANCHORS.trailer1) / (RELEASE - ANCHORS.trailer1)));
    progFill.style.transform = `scaleX(${frac})`;
    setText(progPct, `${num(frac * 100, 7, 7)} %`);
    if (mode === 'final') {
      const cs = Math.floor((Math.max(0, diff) % 1000) / 10);
      setText(finalCs, `.${pad(cs)}`);
      drawEcg(now, diff);
    }
  }

  function drawEcg(now: number, diff: number) {
    if (!ecgCtx) return;
    const w = ecg.clientWidth;
    const hgt = ecg.clientHeight;
    if (!w || !hgt) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (ecg.width !== w * dpr) {
      ecg.width = w * dpr;
      ecg.height = hgt * dpr;
    }
    ecgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Herzfrequenz steigt von 70 auf 160 bpm, je näher der Release rückt
    const bpm = 70 + 90 * (1 - Math.min(1, diff / DAY_MS));
    const beat = ((now / 1000) * bpm) / 60;
    const ph = beat - Math.floor(beat);
    const v = ph < 0.04 ? -ph * 10 : ph < 0.08 ? (ph - 0.04) * 40 - 0.4 : ph < 0.12 ? 1.2 - (ph - 0.08) * 45 : ph < 0.3 ? Math.sin((ph - 0.12) * 17) * 0.12 : 0;
    ecgHist.push(v);
    while (ecgHist.length > w / 2) ecgHist.shift();
    ecgCtx.clearRect(0, 0, w, hgt);
    ecgCtx.beginPath();
    ecgHist.forEach((val, i) => {
      const x = i * 2;
      const y = hgt / 2 - val * hgt * 0.38;
      if (i === 0) ecgCtx.moveTo(x, y);
      else ecgCtx.lineTo(x, y);
    });
    ecgCtx.strokeStyle = '#ff3b5c';
    ecgCtx.lineWidth = 2;
    ecgCtx.shadowColor = '#ff3b5c';
    ecgCtx.shadowBlur = 10;
    ecgCtx.stroke();
  }

  clock.onSecond(onSecond);
  clock.onFrame(onFrame);
  onSecond(clock.now());
  on('cheat', ({ code }) => {
    if (code === 'BIGBANG') scene?.flash();
  });
  return section;
}
