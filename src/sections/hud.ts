/**
 * HUD: Sticky Kopfleiste mit Mini-Countdown, Alarmstufe, Navigation,
 * Fahndungslevel, Kontostand, Check-in und Einstellungen.
 */
import { on } from '../core/bus';
import { clock } from '../core/clock';
import { pad, splitDuration } from '../core/format';
import { checkedInToday, wantedLevel } from '../core/game';
import { phaseFor } from '../core/phases';
import { RELEASE } from '../core/timeline';
import { h, setText } from '../ui/dom';
import { icon } from '../ui/icons';

export const NAV = [
  { id: 'studio', label: 'Studio' },
  { id: 'zeitspiegel', label: 'Zeitspiegel' },
  { id: 'zeittunnel', label: 'Zeittunnel' },
  { id: 'telemetrie', label: 'Telemetrie' },
  { id: 'persoenlich', label: 'Persönlich' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'hq', label: 'HQ' },
];

export function hud(openSettings: () => void): HTMLElement {
  const mini = h('span.hud__mini');
  const phaseChip = h('span.hud__phase');
  const sim = h(
    'button.hud__sim',
    { type: 'button', hidden: true, title: 'Simulation beenden und zur Echtzeit zurückkehren', onclick: () => clock.reset() },
    icon('clock', 14),
    h('span', 'Simulation'),
    icon('close', 12),
  );
  const stars = h(
    'span.hud__wanted',
    { title: 'Fahndungsstufe', role: 'img' },
    Array.from({ length: 5 }, () => icon('star', 15, 'icon star')),
  );
  const checkDot = h('span.hud__dot');
  const checkBtn = h(
    'a.hud__btn.hud__checkin',
    { href: '#hq', title: 'Daily Check-in' },
    icon('check', 18),
    h('span.hud__btn-label', 'Check-in'),
    checkDot,
  );
  const settingsBtn = h(
    'button.hud__btn',
    { type: 'button', title: 'Einstellungen', 'aria-label': 'Einstellungen öffnen', onclick: openSettings },
    icon('settings', 18),
  );

  const navList = h(
    'ul.hud__nav-list',
    NAV.map((n) => h('li', h('a.hud__link', { href: `#${n.id}`, dataset: { target: n.id } }, n.label))),
  );
  const menuBtn = h(
    'button.hud__menu',
    {
      type: 'button',
      'aria-expanded': 'false',
      'aria-label': 'Navigation öffnen',
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
  const nav = h('nav.hud__nav', { 'aria-label': 'Bereiche' }, navList);
  nav.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) {
      nav.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  const el = h(
    'header.hud',
    h(
      'div.hud__inner',
      h('a.hud__brand', { href: '#start', 'aria-label': 'Zum Countdown' }, h('span.hud__logo', 'VI'), h('span.hud__name', 'Command Center')),
      h('div.hud__status', mini, phaseChip, sim),
      nav,
      h('div.hud__right', stars, checkBtn, settingsBtn, menuBtn),
    ),
  );

  const updateGame = () => {
    const lvl = wantedLevel();
    stars.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('is-on', i < lvl));
    stars.setAttribute('aria-label', `Fahndungsstufe ${lvl} von 5`);
    stars.classList.toggle('is-active', lvl > 0);
    checkDot.hidden = checkedInToday();
    checkBtn.classList.toggle('is-done', checkedInToday());
  };
  updateGame();
  on('game-changed', updateGame);
  setInterval(updateGame, 30_000);

  clock.onSecond((now) => {
    const diff = RELEASE - now;
    const p = splitDuration(Math.abs(diff));
    const txt = `${diff < 0 ? '+' : ''}${p.days}T ${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
    setText(mini, txt);
    const phase = phaseFor(diff);
    setText(phaseChip, phase.code);
    phaseChip.dataset.level = String(phase.level);
  });
  clock.onSimulationChange(() => {
    sim.hidden = !clock.simulated;
  });

  // Aktiven Bereich in der Navigation markieren
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          navList.querySelectorAll('a').forEach((a) => a.classList.toggle('is-active', a.dataset.target === e.target.id));
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    requestAnimationFrame(() => NAV.forEach((n) => {
      const sec = document.getElementById(n.id);
      if (sec) io.observe(sec);
    }));
  }
  return el;
}
