/**
 * Bay 08 – Zeitmaschine: Vorschau aller Eskalationsstufen, der finalen
 * 24 Stunden und der Release-Feier per Simulation (mit Zeitraffer).
 */
import { clock } from '../core/clock';
import { fmtDateTime, humanDuration } from '../core/format';
import { unlock } from '../core/game';
import { phaseFor } from '../core/phases';
import { EXAMS_END, PRELOAD, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, HOUR_MS, parseLocal } from '../core/tz';
import { bay } from '../ui/bay';
import { h, setText } from '../ui/dom';
import { icon } from '../ui/icons';

export function timeMachineSection(): HTMLElement {
  const presets: [string, () => number, number?][] = [
    ['T-30 Tage', () => RELEASE - 30 * DAY_MS + 8000],
    ['T-14 Tage', () => RELEASE - 14 * DAY_MS + 8000],
    ['Preload (T-7)', () => PRELOAD + 5000],
    ['T-3 Tage', () => RELEASE - 3 * DAY_MS + 8000],
    ['Letzte 24 Std.', () => RELEASE - DAY_MS + 8000],
    ['Letzte Stunde', () => RELEASE - HOUR_MS + 6000],
    ['Letzte Minute', () => RELEASE - 75_000],
    ['T-15 Sek.', () => RELEASE - 15_000],
    ['Release-Tag', () => RELEASE + 2 * HOUR_MS],
    ['Klausuren vorbei', () => EXAMS_END + HOUR_MS],
  ];
  const speeds: [string, number][] = [
    ['1×', 1],
    ['60× (1 Min./s)', 60],
    ['3.600× (1 Std./s)', 3600],
    ['86.400× (1 Tag/s)', 86400],
  ];
  const status = h('p.tm__status');
  const simTime = h('b.tm__time');
  const phaseEl = h('span.tm__phase');
  const custom = h<HTMLInputElement>('input.input#tm-custom', { type: 'datetime-local', step: '1' });

  const go = (target: number, speed = 1) => {
    clock.simulate(target, speed);
    unlock('time_traveler');
    document.getElementById('start')?.scrollIntoView({ behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' });
  };

  const presetBtns = h(
    'div.tm__presets',
    presets.map(([label, fn]) => h('button.chip-btn', { type: 'button', onclick: () => go(fn()) }, label)),
  );
  const speedBtns = h(
    'div.tm__speeds',
    speeds.map(([label, v]) =>
      h('button.chip-btn', {
        type: 'button',
        dataset: { speed: String(v) },
        onclick: () => {
          if (!clock.simulated && v === 1) return;
          clock.setSpeed(v);
          if (v !== 1) unlock('time_traveler');
          sync();
        },
      }, label),
    ),
  );
  const customForm = h(
    'form.tm__custom',
    h('label.field', h('span', 'Eigener Zeitpunkt (deutsche Zeit)'), custom),
    h('button.btn.btn--ghost', { type: 'submit' }, icon('clock', 18), 'Hinspringen'),
  );
  customForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!custom.value) return;
    try {
      go(parseLocal(custom.value, TZ));
    } catch {
      /* ungültige Eingabe ignorieren */
    }
  });
  const resetBtn = h('button.btn.btn--pink', { type: 'button', onclick: () => clock.reset() }, icon('reset', 18), 'Zurück zur Echtzeit');

  const sync = () => {
    const sim = clock.simulated;
    speedBtns.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === clock.speed)));
    resetBtn.hidden = !sim;
    setText(
      status,
      sim
        ? `Simulation aktiv (${clock.speed === 1 ? 'Echtzeit-Tempo' : `${clock.speed.toLocaleString('de-DE')}-facher Zeitraffer`}). Achievements für Countdown-Phasen werden in der Simulation nicht vergeben.`
        : 'Echtzeit. Wähle eine Stufe, um zu sehen, wie sich das Command Center verändert.',
    );
  };
  clock.onSimulationChange(sync);
  clock.onSecond((now) => {
    setText(simTime, fmtDateTime(now, true));
    const diff = RELEASE - now;
    setText(phaseEl, `${phaseFor(diff).code} · ${diff > 0 ? `noch ${humanDuration(diff, 3)}` : `seit ${humanDuration(-diff, 2)} erschienen`}`);
  });
  sync();

  const body = h(
    'article.feature.feature--tm#mod-zeitmaschine',
    h('div.tm__display', h('span.tm__label', 'Bordzeit'), simTime, phaseEl, status, resetBtn),
    h('div.tm__controls', h('h3.subhead', 'Sprung zu'), presetBtns, h('h3.subhead', 'Zeitraffer'), speedBtns, customForm),
  );

  return bay({
    id: 'zeitmaschine',
    index: 8,
    eyebrow: 'Simulation',
    script: 'Delorean',
    title: 'Zeitmaschine',
    tone: 'night',
    lead: 'Vorschau auf alles, was noch kommt: die Eskalationsstufen, die Inszenierung der letzten 24 Stunden, den Vollbild-Countdown und die Release-Feier. Die echte Zeit läuft im Hintergrund weiter.',
    body,
  });
}
