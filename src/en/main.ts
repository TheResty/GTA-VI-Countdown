/**
 * GTA VI Countdown – English public edition.
 * Lean, non-personalized: hero countdown, intel, your wait, time mirror, time tunnel.
 */
import '@fontsource/anton/latin-400.css';
import '@fontsource/chakra-petch/latin-400.css';
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/mr-dafoe/latin-400.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/hero.css';
import '../styles/modules.css';
import '../styles/studio.css';
import '../styles/intel.css';
import './en.css';
import { clock } from '../core/clock';
import { createSynthwave } from '../three/synthwave';
import { h, setText, watchVisibility } from '../ui/dom';
import { Odometer } from '../ui/odometer';
import { registerModule } from '../ui/panel';
import { breaking, getStart, intelSection, mirrorSection, onStart, tunnelSection, waitSection } from './sections';
import { DAY_MS, PRELOAD, RELEASE, TZ, duration, fmt, num, pad, progressFrom, split, tzName } from './time';

function hud(): HTMLElement {
  const mini = h('span.hud__mini');
  const NAV = [
    { id: 'intel', label: 'Intel' },
    { id: 'wait', label: 'Your Wait' },
    { id: 'mirror', label: 'Mirror' },
    { id: 'tunnel', label: 'Tunnel' },
  ];
  const nav = h('nav.hud__nav', { 'aria-label': 'Sections' }, h('ul.hud__nav-list', NAV.map((n) => h('li', h('a.hud__link', { href: `#${n.id}` }, n.label)))));
  const menuBtn = h(
    'button.hud__menu',
    {
      type: 'button',
      'aria-expanded': 'false',
      'aria-label': 'Open navigation',
      onclick: () => {
        const open = !nav.classList.contains('is-open');
        nav.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
      },
    },
    h('span'),
    h('span'),
    h('span'),
  );
  nav.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) {
      nav.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
  clock.onSecond((now) => {
    const d = RELEASE - now;
    const p = split(Math.abs(d));
    setText(mini, d > 0 ? `${p.days}d ${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}` : 'OUT NOW');
  });
  return h(
    'header.hud',
    h(
      'div.hud__inner',
      h('a.hud__brand', { href: '#start', 'aria-label': 'Back to the countdown' }, h('span.hud__logo', 'VI'), h('span.hud__name', 'Countdown')),
      h('div.hud__status', mini),
      nav,
      h('div.hud__right', menuBtn),
    ),
  );
}

function hero(): HTMLElement {
  const stage = h('div.hero__stage', { 'aria-hidden': 'true' });
  const units = [
    { key: 'days', label: 'Days', short: 'Days', odo: new Odometer(2, 'odo--days') },
    { key: 'hours', label: 'Hours', short: 'Hrs', odo: new Odometer(2) },
    { key: 'minutes', label: 'Minutes', short: 'Min', odo: new Odometer(2) },
    { key: 'seconds', label: 'Seconds', short: 'Sec', odo: new Odometer(2) },
  ];
  const count = h(
    'div.count',
    { role: 'timer', 'aria-live': 'off' },
    units.map((u, i) => [
      h(`div.count__unit.count__unit--${u.key}`, h('div.count__digits', u.odo.el), h('span.count__label', h('span.count__long', u.label), h('span.count__short', { 'aria-hidden': 'true' }, u.short))),
      i < units.length - 1 ? h('span.count__sep', { 'aria-hidden': 'true' }, ':') : null,
    ]),
  );
  const out = h('div.post', { hidden: true }, h('p.post__eyebrow', 'Mission passed'), h('h2.post__title', 'GTA VI is out.'));
  const aria = h('p.sr-only', { 'aria-live': 'polite' });

  const eyebrow = h('p.hero__eyebrow', h('span.dot'), 'Leonida · Vice City');
  const alertText = h('span.hero__alert-text');
  const alertAgo = h('span.hero__alert-ago');
  const alert = h('a.hero__eyebrow.hero__alert', { href: '#intel', hidden: true }, h('span.hero__alert-tag', h('span.dot'), 'Breaking'), alertText, alertAgo);

  const progFill = h('span.hero-progress__fill');
  const progPct = h('span.hero-progress__pct');
  const progStart = h('a.hero-progress__start', { href: '#wait', title: 'Change your start point' });
  const syncStart = () => setText(progStart, `Since ${getStart().short}`);
  syncStart();
  onStart(syncStart);
  const progress = h(
    'div.hero-progress',
    h('div.hero-progress__labels', progStart, progPct, h('span', 'Release')),
    h('div.hero-progress__track', { role: 'progressbar', 'aria-label': 'Progress since your start point' }, progFill),
  );
  const preload = h('p.hero__next');

  const content = h(
    'div.hero__content.wrap',
    eyebrow,
    alert,
    h('h1.hero__title', h('span.hero__script', 'Vice City'), h('span.hero__gta', 'GTA'), h('span.hero__vi', 'VI'), h('span.sr-only', ' Countdown')),
    h(
      'p.hero__release',
      h('time', { datetime: new Date(RELEASE).toISOString() }, `${fmt(RELEASE, 'full')} · 12:00 AM ${tzName(RELEASE)}`),
      h('span.hero__platforms', 'PS5 · Xbox Series X|S'),
    ),
    count,
    aria,
    out,
    progress,
    preload,
    h('p.hero__tznote', `Counting down to midnight in your time zone (${TZ.replace(/_/g, ' ')}) – when PS5 digital copies unlock.`),
  );
  const section = h('section.hero#start', { 'aria-label': 'Countdown' }, stage, h('div.hero__shade'), content);

  const scene = createSynthwave(stage);
  if (!scene) section.classList.add('no-webgl', 'no-3d');
  scene?.setReducedMotion(document.documentElement.classList.contains('reduce-motion'));
  watchVisibility(section, (v) => scene?.setActive(v), '0px');
  section.addEventListener('click', (e) => {
    if (!scene || (e.target as HTMLElement).closest('a,button,.count')) return;
    if (scene.hitSun(e.clientX, e.clientY)) scene.flash();
  });

  registerModule({
    el: section,
    second(now) {
      const diff = RELEASE - now;
      const days = Math.max(0, diff / DAY_MS);
      scene?.setIntensity(diff <= 0 ? 1 : Math.max(0, Math.min(1, 1 - Math.log10(1 + days) / Math.log10(61))));
      count.hidden = diff <= 0;
      out.hidden = diff > 0;
      const p = split(diff);
      units[0].odo.set(p.days);
      units[1].odo.set(p.hours);
      units[2].odo.set(p.minutes);
      units[3].odo.set(p.seconds);
      if (p.seconds % 15 === 0) aria.textContent = `${p.days} days, ${p.hours} hours, ${p.minutes} minutes until GTA VI.`;
      const news = breaking(now);
      alert.hidden = !news;
      eyebrow.hidden = Boolean(news);
      if (news) {
        setText(alertText, news.title);
        setText(alertAgo, `${duration(now - news.at, 1)} ago`);
      }
      setText(preload, PRELOAD > now ? `PS5 pre-load starts in ${duration(PRELOAD - now, 2)} · up to 212 GB` : diff > 0 ? 'Pre-load is live – up to 212 GB. Clear some space.' : '');
    },
    frame(now) {
      const f = progressFrom(getStart().at, now);
      progFill.style.transform = `scaleX(${f})`;
      setText(progPct, `${num(f * 100, 7, 7)}%`);
    },
  });
  return section;
}

function footer(): HTMLElement {
  return h(
    'footer.footer',
    h(
      'div.wrap.en-footer',
      h('p', h('b', 'GTA VI Countdown'), ' · unofficial fan project, not affiliated with Rockstar Games or Take-Two Interactive.'),
      h('p', 'Times are shown in your local time zone. Leaks are unconfirmed – never download “leaked builds”.'),
    ),
  );
}

function boot(): void {
  const root = document.documentElement;
  try {
    root.classList.toggle('reduce-motion', window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    /* ignore */
  }
  const app = document.getElementById('app') ?? document.body;
  app.replaceChildren(hud(), h('main#main', hero(), intelSection(), waitSection(), mirrorSection(), tunnelSection()), footer());
  root.style.setProperty('--intensity', String(Math.max(0, Math.min(1, 1 - Math.log10(1 + (RELEASE - clock.now()) / DAY_MS) / Math.log10(61)))));
  clock.start();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
