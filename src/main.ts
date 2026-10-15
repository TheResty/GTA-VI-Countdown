/**
 * GTA VI Countdown Command Center – Einstiegspunkt.
 */
import '@fontsource/anton/latin-400.css';
import '@fontsource/chakra-petch/latin-400.css';
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/mr-dafoe/latin-400.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/hero.css';
import './styles/modules.css';
import './styles/overlays.css';
import './styles/studio.css';
import './styles/intel.css';
import './styles/phases.css';

import { emit, on } from './core/bus';
import { clock } from './core/clock';
import { humanDuration } from './core/format';
import { evaluateAchievements, initGame, markMilestoneSeen, unlock } from './core/game';
import { passedBetween } from './core/milestones';
import { Phase, phaseFor, intensityFor } from './core/phases';
import { onSettings, settings } from './core/settings';
import { RELEASE } from './core/timeline';
import { initKonami } from './overlays/effects';
import { initFinale, showPhaseBanner } from './overlays/finale';
import { initSettings } from './overlays/settings';
import { footer } from './sections/footer';
import { heroSection } from './sections/hero';
import { hqSection } from './sections/hq';
import { intelSection } from './sections/intel';
import { hud } from './sections/hud';
import { mirrorSection } from './sections/mirror';
import { personalSection } from './sections/personal';
import { studioSection } from './sections/studio';
import { telemetrySection } from './sections/telemetry';
import { timelineSection } from './sections/timeline';
import { timeMachineSection } from './sections/timemachine';
import { tunnelSection } from './sections/tunnel';
import { h } from './ui/dom';
import { initToasts } from './ui/toast';

function boot(): void {
  const root = document.documentElement;
  const applyMotion = () => root.classList.toggle('reduce-motion', settings().reduceMotion);
  applyMotion();
  onSettings(applyMotion);

  const { previousVisit } = initGame();
  initToasts();
  const openSettings = initSettings();

  const app = document.getElementById('app') ?? document.body;
  app.replaceChildren(
    h('a.skip-link', { href: '#studio' }, 'Zum Inhalt springen'),
    hud(openSettings),
    h(
      'main#main',
      heroSection(),
      intelSection(),
      studioSection(),
      mirrorSection(),
      tunnelSection(),
      telemetrySection(),
      personalSection(),
      timelineSection(),
      hqSection(),
      timeMachineSection(),
    ),
    footer(),
  );

  initFinale();
  initKonami();

  /* Eskalationsphase ------------------------------------------------ */
  let phase: Phase | null = null;
  const applyPhase = (now: number) => {
    const diff = RELEASE - now;
    const next = phaseFor(diff);
    root.style.setProperty('--intensity', intensityFor(diff).toFixed(3));
    if (phase?.id === next.id) return;
    const previous = phase;
    phase = next;
    root.dataset.phase = next.id;
    root.dataset.level = String(next.level);
    if (previous) {
      emit('phase', { phase: next, previous });
      if (next.level >= 1 && next.level !== 7 && next.level !== 8) showPhaseBanner(next);
      if (!clock.simulated) evaluateAchievements();
    }
  };

  /* Meilensteine live --------------------------------------------- */
  let lastCheck = clock.now();
  const checkMilestones = (now: number) => {
    if (now < lastCheck || now - lastCheck > 5 * 60_000) {
      // Sprung (Simulation oder Tab im Hintergrund): keine Meilenstein-Flut
      lastCheck = now;
      return;
    }
    const passed = passedBetween(lastCheck, now);
    lastCheck = now;
    for (const m of passed.slice(-3)) {
      emit('milestone', { milestone: m, live: !clock.simulated });
      emit('toast', { title: `Meilenstein: ${m.label}`, text: m.detail, tone: m.major ? 'gold' : 'info', icon: 'star' });
      if (!clock.simulated && markMilestoneSeen(m.id)) unlock('milestone_live');
    }
  };

  clock.onSecond((now) => {
    applyPhase(now);
    checkMilestones(now);
  });
  clock.onSimulationChange(() => {
    lastCheck = clock.now();
    root.classList.toggle('is-simulated', clock.simulated);
  });
  applyPhase(clock.now());
  clock.start();

  /* Achievements & Begrüßung ----------------------------------------- */
  evaluateAchievements();
  setInterval(evaluateAchievements, 60_000);
  if (!previousVisit) {
    setTimeout(
      () =>
        emit('toast', {
          title: 'Willkommen im Command Center',
          text: `Noch ${humanDuration(RELEASE - Date.now(), 2)} bis GTA VI. Persönliche Daten kannst du oben rechts in den Einstellungen eintragen.`,
          tone: 'info',
          icon: 'radar',
        }),
      1200,
    );
  } else {
    const missed = passedBetween(previousVisit, Date.now()).filter((m) => m.kind !== 'percent');
    if (missed.length) {
      setTimeout(
        () =>
          emit('toast', {
            title: `Seit deinem letzten Besuch: ${missed.length} Meilenstein${missed.length === 1 ? '' : 'e'}`,
            text: missed.slice(-4).map((m) => m.label).join(' · '),
            tone: 'gold',
            icon: 'star',
          }),
        1200,
      );
    }
  }

  // Bis ganz nach unten gescrollt
  const sentinel = document.querySelector('.footer');
  if (sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        unlock('explorer');
        io.disconnect();
      }
    });
    io.observe(sentinel);
  }

  on('phase', ({ phase: p }) => {
    document.title = p.level >= 5 && p.level < 8 ? `${p.code} · GTA VI Command Center` : 'GTA VI Command Center';
  });

  // Tab-Titel zeigt die Restzeit, wenn der Tab im Hintergrund ist
  const baseTitle = document.title;
  clock.onSecond((now) => {
    if (!document.hidden) {
      if (document.title !== baseTitle && phase && phase.level < 5) document.title = baseTitle;
      return;
    }
    const diff = RELEASE - now;
    document.title = diff > 0 ? `${humanDuration(diff, 3)} · GTA VI` : 'GTA VI ist da!';
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
