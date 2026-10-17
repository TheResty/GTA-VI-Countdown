/**
 * Bay 03 – Zeittunnel (3D): Flug durch die verbleibenden Tage bis zum Release-Portal.
 * Jeder Ring ist ein Tag, jedes Segment eine Stunde. Ringe lassen sich anklicken.
 */
import { CONFIG } from '../config';
import { DAY_TYPE_LABEL, dayType } from '../core/calendar';
import { clock } from '../core/clock';
import { dative, fmtDate, fmtDstChange, humanDuration, num, plural } from '../core/format';
import { unlock } from '../core/game';
import { HOUR_KIND_COLOR, HOUR_KIND_LABEL, HourKind, hourKind } from '../core/schedule';
import { onSettings, settings } from '../core/settings';
import { DST_CHANGES, LAST_WAIT_DAY, PRELOAD, RELEASE, TZ } from '../core/timeline';
import { CivilDate, DAY_MS, civilAddDays, civilCompare, civilFromMs, civilWeekday, parseLocal, startOfCivilDay } from '../core/tz';
import { TYPE_COLOR } from '../modules/calendarViz';
import { createTunnel, TunnelDay, TunnelGate, TunnelScene } from '../three/tunnel';
import { bay } from '../ui/bay';
import { h, setText, watchVisibility } from '../ui/dom';
import { icon } from '../ui/icons';
import { registerModule } from '../ui/panel';

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

interface DayInfo {
  civil: CivilDate;
  start: number;
  end: number;
  kinds: HourKind[];
}

export function tunnelSection(): HTMLElement {
  const labelLayer = h('div.tunnel__labels', { 'aria-hidden': 'true' });
  const hudPos = h('b');
  const hudLeft = h('span');
  const hud = h('div.tunnel__hud', h('span.tunnel__hud-tag', 'Position'), hudPos, hudLeft);
  const detail = h('div.tunnel__detail', { hidden: true, role: 'dialog', 'aria-label': 'Tagesdetails' });
  const viewport = h('div.tunnel__viewport', labelLayer, hud, detail);
  const fallback = h('p.tunnel__fallback', { hidden: true }, '3D ist ausgeschaltet oder wird von diesem Gerät nicht unterstützt. Aktiviere 3D in den Einstellungen, um durch die verbleibenden Tage zu fliegen.');
  const slider = h<HTMLInputElement>('input.range#tunnel-range', { type: 'range', min: '0', max: '1', step: '0.01', value: '0', 'aria-label': 'Flugposition in Tagen' });
  const posLabel = h('output.tunnel__pos', { for: 'tunnel-range' });
  const apBtn = h<HTMLButtonElement>('button.chip-btn', { type: 'button', 'aria-pressed': 'true' }, icon('play', 14), 'Autopilot');
  const flyBtn = h('button.btn.btn--pink', { type: 'button' }, icon('rocket', 18), 'Zum Portal');
  const backBtn = h('button.btn.btn--ghost', { type: 'button' }, icon('reset', 18), 'Heute');
  const legend = h(
    'ul.legend.legend--row',
    (['sleep', 'school', 'free'] as HourKind[]).map((k) => h('li', h('span.legend__swatch', { style: { background: HOUR_KIND_COLOR[k] } }), HOUR_KIND_LABEL[k])),
    h('li', h('span.legend__swatch', { style: { background: TYPE_COLOR.holiday } }), 'Außenring: Art des Tages'),
    h('li', h('span.legend__swatch', { style: { background: '#ffd23f' } }), 'Release-Portal'),
  );

  const feature = h(
    'article.feature.feature--tunnel#mod-zeittunnel',
    viewport,
    fallback,
    h('div.tunnel__controls', h('label.tunnel__slider', h('span', 'Flugposition'), slider, posLabel), h('div.tunnel__buttons', apBtn, flyBtn, backBtn)),
    legend,
  );

  let scene: TunnelScene | null = null;
  let infos: DayInfo[] = [];

  const setAp = (on: boolean) => {
    apBtn.setAttribute('aria-pressed', String(on));
    apBtn.replaceChildren(icon(on ? 'pause' : 'play', 14), on ? 'Autopilot an' : 'Autopilot aus');
    scene?.setAutopilot(on);
  };

  const buildData = (now: number) => {
    if (!scene) return;
    const days: TunnelDay[] = [];
    infos = [];
    let c = civilFromMs(now, TZ);
    while (civilCompare(c, LAST_WAIT_DAY) <= 0) {
      const t = dayType(c);
      const start = startOfCivilDay(c, TZ);
      const end = startOfCivilDay(civilAddDays(c, 1), TZ);
      const kinds = Array.from({ length: 24 }, (_, hr) => hourKind(c, hr));
      infos.push({ civil: c, start, end, kinds });
      days.push({
        start,
        end,
        color: TYPE_COLOR[t],
        label: `${WD[civilWeekday(c)]} ${c.d}.${c.m}.`,
        sub: DAY_TYPE_LABEL[t],
        hourColors: kinds.map((k) => HOUR_KIND_COLOR[k]),
      });
      c = civilAddDays(c, 1);
    }
    const gates: TunnelGate[] = [];
    const schoolStart = CONFIG.events.find((e) => e.id === 'schulstart');
    if (schoolStart) {
      const at = parseLocal(schoolStart.date, TZ);
      if (at > now) gates.push({ at, label: 'Schulstart', color: '#19f0ff', kind: 'school' });
    }
    for (const d of DST_CHANGES) if (d.at > now && d.at < RELEASE) gates.push({ at: d.at, label: 'Zeitumstellung · +1 Std.', color: '#9b6bff', kind: 'dst' });
    if (PRELOAD > now) gates.push({ at: PRELOAD, label: 'Preload', color: '#ffd23f', kind: 'preload' });
    scene.setData(days, gates, RELEASE);
  };

  const maxDays = () => Math.max(0.01, (RELEASE - clock.now()) / DAY_MS - 0.35);

  const showDetail = (di: number, hour: number) => {
    const info = infos[di];
    if (!info) return;
    const t = dayType(info.civil);
    const counts = { sleep: 0, school: 0, free: 0 } as Record<HourKind, number>;
    info.kinds.forEach((k) => counts[k]++);
    const events: string[] = [];
    for (const e of CONFIG.events) {
      const at = parseLocal(e.date, TZ);
      if (at >= info.start && at < info.end) events.push(e.title);
    }
    for (const d of DST_CHANGES) if (d.at >= info.start && d.at < info.end) events.push(`Zeitumstellung (${fmtDstChange(d.at, d.before, d.after)})`);
    if (PRELOAD >= info.start && PRELOAD < info.end) events.push('Preload-Start');
    const now = clock.now();
    const rel = info.start > now ? `in ${dative(humanDuration(info.start - now, 2))}` : info.end > now ? 'heute' : 'vorbei';
    detail.replaceChildren(
      h('button.tunnel__detail-close', { type: 'button', 'aria-label': 'Schließen', onclick: () => (detail.hidden = true) }, icon('close', 16)),
      h('span.tunnel__detail-kind', { style: { '--c': TYPE_COLOR[t] } }, DAY_TYPE_LABEL[t]),
      h('h4', `${WD_LONG[civilWeekday(info.civil)]}, ${info.civil.d}.${info.civil.m}.`),
      h('p.tunnel__detail-rel', rel),
      h('p.tunnel__detail-hour', h('span.legend__swatch', { style: { background: HOUR_KIND_COLOR[info.kinds[hour]] } }), `${String(hour).padStart(2, '0')}–${String((hour + 1) % 24).padStart(2, '0')} Uhr: ${HOUR_KIND_LABEL[info.kinds[hour]]}`),
      h(
        'ul.tunnel__detail-split',
        (['sleep', 'school', 'free'] as HourKind[]).map((k) => h('li', h('b', `${counts[k]} h`), h('span', HOUR_KIND_LABEL[k]))),
      ),
      h('ul.tunnel__detail-events', { hidden: !events.length }, events.map((e) => h('li', e))),
    );
    detail.hidden = false;
    setAp(false);
    scene?.flyTo((info.end - now) / DAY_MS - 0.55, 1400);
  };

  slider.addEventListener('input', () => {
    setAp(false);
    scene?.setFlight(Number(slider.value));
  });
  apBtn.addEventListener('click', () => setAp(apBtn.getAttribute('aria-pressed') !== 'true'));
  flyBtn.addEventListener('click', () => {
    setAp(false);
    scene?.flyTo(maxDays(), settings().reduceMotion ? 1 : 6500);
  });
  backBtn.addEventListener('click', () => {
    setAp(false);
    scene?.flyTo(0, settings().reduceMotion ? 1 : 1500);
  });

  const setup = () => {
    const s = settings();
    if (s.enable3d && !scene) {
      scene = createTunnel(viewport, labelLayer);
      scene?.onPick(showDetail);
      buildData(clock.now());
      setAp(!s.reduceMotion);
    } else if (!s.enable3d && scene) {
      scene.dispose();
      scene = null;
    }
    scene?.setReducedMotion(s.reduceMotion);
    fallback.hidden = Boolean(scene);
    viewport.hidden = !scene;
  };
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
  onSettings(() => {
    if (!initialised) return;
    setup();
    buildData(clock.now());
  });

  let lastDay = '';
  registerModule({
    el: feature,
    second(now) {
      scene?.setNow(now);
      const key = fmtDate(now, 'date');
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
      setText(posLabel, f < 0.05 ? 'Jetzt' : `+${num(f, 1, 1)} Tage`);
      setText(hudPos, f < 0.05 ? 'Jetzt' : `${fmtDate(at, 'weekdayShort')} ${fmtDate(at, 'dateShort')}, ${fmtDate(at, 'time')} Uhr`);
      setText(hudLeft, `noch ${humanDuration(Math.max(0, RELEASE - at), 2)} bis zum Portal`);
      if (f >= md - 0.05) unlock('tunnel');
    },
  });

  const days = Math.max(0, Math.ceil((RELEASE - clock.now()) / DAY_MS));
  return bay({
    id: 'zeittunnel',
    index: 4,
    eyebrow: '3D · Raum = Zeit',
    script: 'Flug',
    title: 'Zeittunnel',
    tone: 'night',
    lead: `Jeder Ring ist ein Tag – sein Ende, genauer gesagt –, jedes leuchtende Segment eine Stunde: violett Schlaf, cyan Schule, pink Freizeit. Die aktuelle Stunde pulsiert, vergangene sind erloschen. ${plural(days, 'Ring', 'Ringe')} bis zum Portal. Tippe einen Ring an, um den Tag zu öffnen.`,
    body: feature,
  });
}
