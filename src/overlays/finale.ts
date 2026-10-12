/**
 * Finale: Vollbild-Countdown der letzten 60 Sekunden, Release-Feier mit
 * Feuerwerk und Phasen-Banner bei jeder Eskalationsstufe.
 */
import { emit, on } from '../core/bus';
import { clock } from '../core/clock';
import { num } from '../core/format';
import { getState, setCelebrationSeen, unlock } from '../core/game';
import { Phase } from '../core/phases';
import { ANCHORS, RELEASE } from '../core/timeline';
import { DAY_MS } from '../core/tz';
import { h, setText } from '../ui/dom';
import { icon } from '../ui/icons';

function reduced(): boolean {
  return document.documentElement.classList.contains('reduce-motion');
}

/* ------------------------------------------------------------------ */
/* Feuerwerk                                                           */
/* ------------------------------------------------------------------ */
class Fireworks {
  private ctx: CanvasRenderingContext2D;
  private parts: { x: number; y: number; vx: number; vy: number; life: number; decay: number; c: string; r: number; trail?: boolean }[] = [];
  private raf = 0;
  private running = false;
  private last = 0;
  private nextLaunch = 0;
  private intensity = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.resize();
    window.addEventListener('resize', this.onResize);
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.step(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.parts = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setIntensity(v: number): void {
    this.intensity = v;
  }

  private onResize = () => this.resize();

  burst(x: number, y: number): void {
    const palettes = [
      ['#ff2e97', '#ff8fd0', '#ffffff'],
      ['#19f0ff', '#9bfaff', '#ffffff'],
      ['#ffd23f', '#ff8a3d', '#fff4d6'],
      ['#9b6bff', '#ff2e97', '#19f0ff'],
    ];
    const pal = palettes[(Math.random() * palettes.length) | 0];
    const n = reduced() ? 40 : 110;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
      const v = 1.5 + Math.random() * 4.5;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.008 + Math.random() * 0.01, c: pal[(Math.random() * pal.length) | 0], r: 1.2 + Math.random() * 1.8 });
    }
  }

  private step(t: number): void {
    const w = window.innerWidth;
    const hh = window.innerHeight;
    const dt = Math.min(50, t - this.last);
    this.last = t;
    this.nextLaunch -= dt;
    if (this.nextLaunch <= 0 && this.intensity > 0) {
      this.nextLaunch = (reduced() ? 1400 : 380) / this.intensity + Math.random() * 300;
      this.burst(w * (0.15 + Math.random() * 0.7), hh * (0.12 + Math.random() * 0.4));
    }
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0,0,0,0.22)';
    this.ctx.fillRect(0, 0, w, hh);
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.vx *= 0.988;
      p.vy *= 0.988;
      p.life -= p.decay;
      if (p.life <= 0) continue;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.c;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
    this.parts = this.parts.filter((p) => p.life > 0);
  }
}

/* ------------------------------------------------------------------ */
/* Init                                                                */
/* ------------------------------------------------------------------ */
export function initFinale(): void {
  // Letzte Minute
  const secEl = h('span.takeover__sec');
  const ring = h('span.takeover__ring');
  const takeover = h(
    'div.takeover',
    { hidden: true, role: 'timer', 'aria-label': 'Letzte Minute bis GTA VI' },
    h('p.takeover__eyebrow', 'GTA VI · Release in'),
    h('div.takeover__num', ring, secEl),
    h('p.takeover__sub', 'Sekunden. Nicht blinzeln.'),
    h('button.takeover__hide', { type: 'button', onclick: () => ((dismissed = true), (takeover.hidden = true)) }, 'Ausblenden'),
  );
  let dismissed = false;
  let watchedFinalMinute = false;

  // Feier
  const canvas = h<HTMLCanvasElement>('canvas.celebrate__canvas', { 'aria-hidden': 'true' });
  const fw = new Fireworks(canvas);
  const statT1 = h('b');
  const statV = h('b');
  const celebrate = h(
    'div.celebrate',
    { hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'celebrate-title' },
    canvas,
    h(
      'div.celebrate__content',
      h('p.celebrate__eyebrow', 'Mission Passed'),
      h('h2.celebrate__title#celebrate-title', h('span.celebrate__script', 'Willkommen in'), h('span.celebrate__big', 'Leonida')),
      h('p.celebrate__respect', 'Respekt +∞'),
      h('p.celebrate__text', 'GTA VI ist erschienen. Du hast ', statT1, ' Tage seit Trailer 1 gewartet und ', statV, ' Tage seit GTA V. Das Warten ist vorbei.'),
      h(
        'div.celebrate__actions',
        h('button.btn.btn--gold', { type: 'button', onclick: () => closeCelebration() }, icon('gamepad', 18), 'Ab nach Vice City'),
      ),
    ),
  );
  document.body.append(takeover, celebrate);

  function openCelebration(replay: boolean): void {
    if (!replay && getState().celebrationSeen && clock.now() - RELEASE > 60_000) return;
    setText(statT1, num(Math.floor((RELEASE - ANCHORS.trailer1) / DAY_MS)));
    setText(statV, num(Math.floor((RELEASE - ANCHORS.gta5) / DAY_MS)));
    takeover.hidden = true;
    celebrate.hidden = false;
    document.documentElement.classList.add('is-celebrating');
    fw.setIntensity(1);
    fw.start();
    for (let i = 0; i < 4; i++) setTimeout(() => fw.burst(window.innerWidth * (0.2 + 0.2 * i), window.innerHeight * 0.3), i * 180);
    (celebrate.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
    if (!clock.simulated) {
      setCelebrationSeen();
      unlock('day_one');
    }
    // Nach 40 Sekunden ruhiger werden
    setTimeout(() => fw.setIntensity(0.35), 40_000);
  }
  function closeCelebration(): void {
    celebrate.hidden = true;
    document.documentElement.classList.remove('is-celebrating');
    fw.stop();
  }
  celebrate.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCelebration();
  });
  on('celebrate', ({ replay }) => openCelebration(replay));

  let prevDiff = RELEASE - clock.now();
  let lastSec = -1;
  clock.onFrame((now) => {
    const diff = RELEASE - now;
    // Letzte Minute
    if (diff > 0 && diff <= 60_000) {
      if (!dismissed) takeover.hidden = false;
      const sec = Math.ceil(diff / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        setText(secEl, String(sec));
        takeover.classList.toggle('is-final', sec <= 10);
        secEl.classList.remove('is-tick');
        void secEl.offsetWidth;
        secEl.classList.add('is-tick');
        if (sec <= 10) {
          ring.classList.remove('is-wave');
          void ring.offsetWidth;
          ring.classList.add('is-wave');
        }
      }
      takeover.style.setProperty('--p', String(1 - diff / 60_000));
      if (!clock.simulated && diff <= 59_000) watchedFinalMinute = true;
    } else if (!takeover.hidden) {
      takeover.hidden = true;
    }
    if (diff > 60_000) dismissed = false;
    // Release-Moment
    if (prevDiff > 0 && diff <= 0) {
      if (watchedFinalMinute) unlock('final_minute');
      emit('celebrate', { replay: false });
    }
    prevDiff = diff;
  });

  // Seite nach Release geöffnet: Feier einmalig zeigen (am Release-Tag)
  const diff0 = RELEASE - clock.now();
  if (diff0 <= 0 && diff0 > -DAY_MS && !getState().celebrationSeen) {
    setTimeout(() => emit('celebrate', { replay: false }), 800);
  }
  clock.onSimulationChange(() => {
    prevDiff = RELEASE - clock.now();
    if (prevDiff > 0) closeCelebration();
  });
}

/* ------------------------------------------------------------------ */
/* Phasen-Banner                                                       */
/* ------------------------------------------------------------------ */
export function showPhaseBanner(phase: Phase): void {
  const el = h(
    'div.phase-banner',
    { role: 'status' },
    h('span.phase-banner__code', phase.code),
    h('b.phase-banner__label', phase.label),
    h('span.phase-banner__text', phase.description),
  );
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => el.classList.add('is-out'), 5200);
  setTimeout(() => el.remove(), 6000);
}
