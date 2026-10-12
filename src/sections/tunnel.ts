/**
 * Bay 03 – Zeittunnel (3D): Flug durch die verbleibenden Tage bis zum Release-Portal.
 */
import { DAY_TYPE_LABEL, dayType } from '../core/calendar';
import { clock } from '../core/clock';
import { fmtDate, num, plural } from '../core/format';
import { unlock } from '../core/game';
import { onSettings, settings } from '../core/settings';
import { RELEASE, RELEASE_CIVIL, TZ } from '../core/timeline';
import { DAY_MS, civilAddDays, civilCompare, civilFromMs, civilWeekday, startOfCivilDay } from '../core/tz';
import { TYPE_COLOR } from '../modules/calendarViz';
import { createTunnel, TunnelRing, TunnelScene } from '../three/tunnel';
import { bay } from '../ui/bay';
import { h, setText, watchVisibility } from '../ui/dom';
import { icon } from '../ui/icons';
import { registerModule } from '../ui/panel';

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function tunnelSection(): HTMLElement {
  const labelLayer = h('div.tunnel__labels', { 'aria-hidden': 'true' });
  const viewport = h('div.tunnel__viewport', labelLayer);
  const fallback = h('p.tunnel__fallback', { hidden: true }, '3D ist ausgeschaltet oder wird von diesem Gerät nicht unterstützt. Aktiviere 3D in den Einstellungen, um durch die verbleibenden Tage zu fliegen.');
  const slider = h<HTMLInputElement>('input.range#tunnel-range', { type: 'range', min: '0', max: '1', step: '0.01', value: '0', 'aria-label': 'Flugposition in Tagen' });
  const posLabel = h('output.tunnel__pos', { for: 'tunnel-range' });
  const flyBtn = h('button.btn.btn--pink', { type: 'button' }, icon('rocket', 18), 'Zum Release fliegen');
  const backBtn = h('button.btn.btn--ghost', { type: 'button' }, icon('reset', 18), 'Zurück zu heute');
  const legend = h(
    'ul.legend.legend--row',
    (['holiday', 'school', 'weekend', 'preload'] as const).map((t) => h('li', h('span.legend__swatch', { style: { background: TYPE_COLOR[t] } }), DAY_TYPE_LABEL[t])),
    h('li', h('span.legend__swatch', { style: { background: '#ffd23f' } }), 'Release-Portal'),
  );

  const feature = h(
    'article.feature.feature--tunnel#mod-zeittunnel',
    viewport,
    fallback,
    h('div.tunnel__controls', h('label.tunnel__slider', h('span', 'Flugposition'), slider, posLabel), h('div.tunnel__buttons', flyBtn, backBtn)),
    legend,
  );

  let scene: TunnelScene | null = null;
  let maxDays = 1;
  let flight = 0;
  let anim: number | null = null;

  const buildRings = (now: number) => {
    if (!scene) return;
    const rings: TunnelRing[] = [];
    let c = civilAddDays(civilFromMs(now, TZ), 1);
    while (civilCompare(c, RELEASE_CIVIL) < 0) {
      const t = dayType(c);
      const at = startOfCivilDay(c, TZ);
      rings.push({
        at,
        color: TYPE_COLOR[t],
        label: `${WD[civilWeekday(c)]} ${c.d}.${c.m}.`,
        sub: DAY_TYPE_LABEL[t],
        major: t === 'preload' || civilWeekday(c) === 1,
      });
      c = civilAddDays(c, 1);
    }
    scene.setRings(rings, RELEASE);
    maxDays = Math.max(0.01, (RELEASE - now) / DAY_MS);
    slider.max = String(maxDays.toFixed(2));
  };

  const setFlight = (d: number) => {
    flight = Math.max(0, Math.min(maxDays, d));
    scene?.setFlight(flight);
    slider.value = String(flight);
    const at = clock.now() + flight * DAY_MS;
    setText(posLabel, flight < 0.05 ? 'Heute' : `${fmtDate(at, 'weekdayShort')} ${fmtDate(at, 'dateShort')} · +${num(flight, 1, 1)} Tage`);
    if (flight >= maxDays - 0.05) unlock('tunnel');
  };

  slider.addEventListener('input', () => {
    if (anim) cancelAnimationFrame(anim);
    anim = null;
    setFlight(Number(slider.value));
  });

  const animateTo = (target: number, duration: number) => {
    if (anim) cancelAnimationFrame(anim);
    const from = flight;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setFlight(from + (target - from) * e);
      if (k < 1) anim = requestAnimationFrame(step);
      else anim = null;
    };
    anim = requestAnimationFrame(step);
  };
  flyBtn.addEventListener('click', () => animateTo(maxDays, settings().reduceMotion ? 1 : 7000));
  backBtn.addEventListener('click', () => animateTo(0, settings().reduceMotion ? 1 : 1500));

  const setup = () => {
    const s = settings();
    if (s.enable3d && !scene) {
      scene = createTunnel(viewport, labelLayer);
      buildRings(clock.now());
      setFlight(flight);
    } else if (!s.enable3d && scene) {
      scene.dispose();
      scene = null;
    }
    scene?.setReducedMotion(s.reduceMotion);
    fallback.hidden = Boolean(scene);
    viewport.hidden = !scene;
  };
  // 3D erst initialisieren, wenn der Bereich in die Nähe kommt
  let initialised = false;
  watchVisibility(
    feature,
    (v) => {
      if (v && !initialised) {
        initialised = true;
        setup();
      }
      scene?.setActive(v);
    },
    '300px',
  );
  onSettings(() => initialised && setup());

  let lastDay = '';
  registerModule({
    el: feature,
    second(now) {
      scene?.setNow(now);
      const key = fmtDate(now, 'date');
      if (key !== lastDay) {
        lastDay = key;
        buildRings(now);
      }
      maxDays = Math.max(0.01, (RELEASE - now) / DAY_MS);
    },
  });

  const days = Math.max(0, Math.ceil((RELEASE - clock.now()) / DAY_MS));
  return bay({
    id: 'zeittunnel',
    index: 3,
    eyebrow: '3D · Raum = Zeit',
    script: 'Flug',
    title: 'Zeittunnel',
    tone: 'night',
    lead: `Jeder Ring ist ein Tag, eingefärbt nach Ferien, Schule, Wochenende und Preload. ${plural(days, 'Ring', 'Ringe')} bis zum Portal – fliege mit dem Regler voraus und sieh, was vor dir liegt.`,
    body: feature,
  });
}
