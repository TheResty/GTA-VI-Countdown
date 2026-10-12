/**
 * Wissenschaftliche Module: Mondphasen, Sonnenlicht, kosmische Perspektive,
 * Planetentage & Relativität.
 */
import { moonEvents, moonState, sunTimes } from '../core/astro';
import { compact, fmtDate, fmtDateTime, humanDuration, num } from '../core/format';
import { onSettings, settings } from '../core/settings';
import { LAST_WAIT_DAY, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, HOUR_MS, civilAddDays, civilCompare, civilFromMs, civilKey, zonedParts } from '../core/tz';
import { COSMOS, PLANET_DAYS } from '../data/comparisons';
import { h, s, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';
import { bindTip } from '../ui/tooltip';

/* ------------------------------------------------------------------ */
/* Mond-Grafik                                                         */
/* ------------------------------------------------------------------ */
export function moonSvg(phase: number, size = 120): SVGSVGElement {
  // Terminator als Ellipse: rx = r · |cos(2π·phase)|
  const r = size / 2 - 4;
  const c = size / 2;
  const k = Math.cos(phase * 2 * Math.PI);
  const waxing = phase < 0.5;
  const rx = Math.abs(k) * r;
  // Helle Seite: zunehmend rechts, abnehmend links
  const sweepOuter = waxing ? 1 : 0;
  const sweepInner = k > 0 ? (waxing ? 0 : 1) : waxing ? 1 : 0;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${sweepOuter} ${c} ${c + r} A ${rx} ${r} 0 0 ${sweepInner} ${c} ${c - r} Z`;
  return s<SVGSVGElement>(
    'svg.moon',
    { viewBox: `0 0 ${size} ${size}`, width: String(size), height: String(size), role: 'img', 'aria-label': 'Mondphase' },
    s('circle.moon__dark', { cx: String(c), cy: String(c), r: String(r) }),
    s('path.moon__lit', { d }),
  );
}

/* ------------------------------------------------------------------ */
/* T-13 Mondphasen                                                     */
/* ------------------------------------------------------------------ */
export function moonModule(): HTMLElement {
  const nowWrap = h('div.moon-now');
  const relWrap = h('div.moon-now');
  const list = h('ul.moon-list');
  const headline = h('p.moon__headline');
  const el = panel({
    id: 'mond',
    code: 'T-13',
    title: 'Mondphasen bis Release',
    kicker: 'Wie oft sich der Mond noch verwandeln muss.',
    tone: 'violet',
    body: h('div', headline, h('div.moon-pair', nowWrap, relWrap), list),
    note: 'Neu- und Vollmond nach Jean Meeus, „Astronomical Algorithms“ – Genauigkeit wenige Minuten.',
  });
  let lastKey = '';
  registerModule({
    el,
    second(now) {
      const key = String(Math.floor(now / (15 * 60_000)));
      if (key === lastKey) return;
      lastKey = key;
      const ms = moonState(now);
      const mr = moonState(RELEASE);
      nowWrap.replaceChildren(moonSvg(ms.phase, 96), h('p', h('b', 'Heute'), h('span', `${ms.name} · ${num(ms.illumination * 100)} %`)));
      relWrap.replaceChildren(moonSvg(mr.phase, 96), h('p', h('b', 'Release-Nacht'), h('span', `${mr.name} · ${num(mr.illumination * 100)} %`)));
      const evs = now < RELEASE ? moonEvents(now, RELEASE) : [];
      const fulls = evs.filter((e) => e.type === 'full').length;
      const news = evs.length - fulls;
      setText(
        headline,
        now < RELEASE
          ? `Noch ${fulls} Vollmond${fulls === 1 ? '' : 'e'} und ${news} Neumond${news === 1 ? '' : 'e'} bis GTA VI.`
          : 'GTA VI ist erschienen – der Mond darf jetzt machen, was er will.',
      );
      list.replaceChildren(
        ...evs.map((e) =>
          h(
            `li.moon-list__item.is-${e.type}`,
            h('span.moon-list__icon', { 'aria-hidden': 'true' }),
            h('span', e.type === 'full' ? 'Vollmond' : 'Neumond'),
            h('time', fmtDateTime(e.at)),
          ),
        ),
      );
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-14 Sonnenlicht                                                    */
/* ------------------------------------------------------------------ */
export function sunModule(): HTMLElement {
  const count = h('b.big-stat');
  const daylight = h('b');
  const first = h('dd');
  const last = h('dd');
  const loss = h('dd');
  const chart = h('div.daylight');
  const el = panel({
    id: 'sonne',
    code: 'T-14',
    title: 'Sonnenaufgänge',
    kicker: '',
    tone: 'orange',
    body: h(
      'div',
      h('p.stat-line', count, h('span', ' Sonnenaufgänge noch bis GTA VI')),
      h('p.stat-sub', 'Zusammen ', daylight, ' Tageslicht – die Tage werden kürzer, die Vorfreude länger.'),
      chart,
      h('dl.kv', h('div', h('dt', 'Nächster Sonnenaufgang'), first), h('div', h('dt', 'Letzter vor Release'), last), h('div', h('dt', 'Tageslänge bis dahin'), loss)),
    ),
    note: 'Berechnet nach NOAA-Näherung für deinen Standort (Einstellungen), Genauigkeit ± 2 Minuten.',
  });
  const kicker = el.querySelector('.panel__kicker') ?? el.querySelector('.panel__head')!;

  let lastKey = '';
  const update = (now: number) => {
    const loc = settings().location;
    const key = `${Math.floor(now / 60_000)}-${loc.name}`;
    if (key === lastKey) return;
    lastKey = key;
    if (kicker.classList.contains('panel__kicker')) kicker.textContent = `Für ${loc.name} – echte Sonnenauf- und -untergänge bis zum Release.`;
    const today = civilFromMs(now, TZ);
    const days: { key: string; rise: number; set: number; len: number }[] = [];
    let n = 0;
    let total = 0;
    let c = civilAddDays(today, -1);
    while (civilCompare(c, civilAddDays(LAST_WAIT_DAY, 1)) <= 0) {
      const st = sunTimes(c, loc.lat, loc.lon);
      if (st.sunrise && st.sunset) {
        if (st.sunrise > now && st.sunrise < RELEASE) n++;
        const from = Math.max(now, st.sunrise);
        const to = Math.min(RELEASE, st.sunset);
        if (to > from) total += to - from;
        if (civilCompare(c, today) >= 0 && civilCompare(c, LAST_WAIT_DAY) <= 0) days.push({ key: civilKey(c), rise: st.sunrise, set: st.sunset, len: st.dayLength });
      }
      c = civilAddDays(c, 1);
    }
    setText(count, num(n));
    setText(daylight, humanDuration(total, 2));
    const next = days.find((d) => d.rise > now);
    setText(first, next ? `${fmtDate(next.rise, 'weekdayShort')} ${fmtDate(next.rise, 'dateShort')}, ${fmtDate(next.rise, 'time')} Uhr` : '–');
    const lastD = days[days.length - 1];
    setText(last, lastD ? `${fmtDate(lastD.rise, 'dateShort')}, ${fmtDate(lastD.rise, 'time')} Uhr` : '–');
    if (days.length > 1) {
      const diffMin = (days[0].len - lastD.len) / 60_000;
      setText(loss, `${humanDuration(days[0].len, 2)} → ${humanDuration(lastD.len, 2)} (−${num(diffMin)} Min.)`);
    } else setText(loss, '–');

    // Tageslicht-Balken: von Sonnenaufgang bis -untergang auf einer 24-h-Skala
    chart.replaceChildren(
      h('div.daylight__axis', ['00', '06', '12', '18', '24'].map((x) => h('span', x))),
      ...days.map((d) => {
        const rp = zonedParts(d.rise, TZ);
        const sp = zonedParts(d.set, TZ);
        const a = (rp.hour + rp.minute / 60) / 24;
        const b = (sp.hour + sp.minute / 60) / 24;
        const bar = h('div.daylight__row', h('span.daylight__bar', { style: { left: `${a * 100}%`, width: `${(b - a) * 100}%` } }));
        bindTip(bar, () => ({
          title: fmtDate(d.rise, 'full'),
          lines: [`Aufgang ${fmtDate(d.rise, 'time')} · Untergang ${fmtDate(d.set, 'time')}`, `Tageslicht: ${humanDuration(d.len, 2)}`],
        }));
        return bar;
      }),
    );
  };
  registerModule({ el, second: update, refresh: (now) => ((lastKey = ''), update(now)) });
  onSettings(() => (lastKey = ''));
  return el;
}

/* ------------------------------------------------------------------ */
/* T-15 Kosmische Perspektive                                          */
/* ------------------------------------------------------------------ */
export function cosmosModule(): HTMLElement {
  const rows = {
    orbit: h('b'),
    light: h('b'),
    iss: h('b'),
    rot: h('b'),
    sun: h('b'),
    moon: h('b'),
    atlantic: h('b'),
  };
  const el = panel({
    id: 'kosmos',
    code: 'T-15',
    title: 'Kosmische Perspektive',
    kicker: 'Was das Universum in der Restzeit erledigt, während du wartest.',
    tone: 'cyan',
    body: h(
      'ul.cosmos',
      h('li', rows.orbit, h('span', 'km legt die Erde auf ihrer Bahn um die Sonne zurück')),
      h('li', rows.light, h('span', 'Mal könnte Licht zur Sonne und zurück reisen')),
      h('li', rows.iss, h('span', 'Mal umrundet die ISS die Erde')),
      h('li', rows.rot, h('span', 'Mal dreht sich die Erde um sich selbst (siderisch)')),
      h('li', rows.sun, h('span', 'Tonnen Masse wandelt die Sonne durch Kernfusion in Energie um')),
      h('li', rows.moon, h('span', 'entfernt sich der Mond von der Erde')),
      h('li', rows.atlantic, h('span', 'breiter wird der Atlantik zwischen dir und Vice City')),
    ),
    note: 'Bonus: Die Raumsonde Voyager 1 erreicht etwa im November 2026 erstmals eine Entfernung von einem Lichttag zur Erde – fast zeitgleich mit GTA VI.',
  });
  registerModule({
    el,
    frame(now) {
      const rem = Math.max(0, RELEASE - now);
      const sec = rem / 1000;
      setText(rows.orbit, num(sec * COSMOS.earthOrbitSpeed, 0));
      setText(rows.light, num(sec / ((2 * COSMOS.au) / COSMOS.c), 1, 1));
      setText(rows.iss, num(rem / COSMOS.issPeriod, 2, 2));
      setText(rows.rot, num(rem / COSMOS.siderealDay, 3, 3));
      setText(rows.sun, compact(sec * COSMOS.sunMassLossPerSecond, 2));
      const years = rem / (365.25 * DAY_MS);
      setText(rows.moon, `${num(years * COSMOS.moonRecessionPerYear * 10, 3, 3)} mm`);
      setText(rows.atlantic, `${num(years * COSMOS.atlanticWideningPerYear * 10, 3, 3)} mm`);
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-16 Planetentage & Relativität                                     */
/* ------------------------------------------------------------------ */
export function planetsModule(): HTMLElement {
  const rows = PLANET_DAYS.map((p) => ({ ...p, value: h('b'), bar: h('span.bar__fill') }));
  const speedDay = h('b');
  const speedHour = h('b');
  const speedMin = h('b');
  const el = panel({
    id: 'planeten',
    code: 'T-16',
    title: 'Planetentage & Relativität',
    kicker: 'Die Restzeit in Sonnentagen anderer Planeten – und wie schnell du fliegen müsstest, damit sie sich kürzer anfühlt.',
    tone: 'violet',
    span: 2,
    body: h(
      'div.planets',
      h(
        'ul.planet-list',
        rows.map((r) => {
          const li = h('li', h('span.planet-list__name', r.name), h('span.bar', h('span.bar__track', r.bar)), r.value);
          bindTip(li, () => ({ title: r.name, lines: [r.note] }));
          return li;
        }),
      ),
      h(
        'div.relativity',
        h('h4.subhead', 'Zeitdilatation'),
        h('p', 'Damit für dich nur noch ', h('b', '1 Tag'), ' vergeht, müsstest du mit ', speedDay, ' der Lichtgeschwindigkeit reisen.'),
        h('p', 'Für ', h('b', '1 Stunde'), ': ', speedHour, '.'),
        h('p', 'Für ', h('b', '1 Minute'), ': ', speedMin, '.'),
        h('p.relativity__fine', 'Spezielle Relativitätstheorie: γ = Restzeit ÷ gefühlte Zeit, v = c · √(1 − 1/γ²). Beschleunigung und Bremsen nicht eingerechnet, Snacks ebenfalls nicht.'),
      ),
    ),
  });
  const vFor = (rem: number, felt: number) => {
    const g = rem / felt;
    if (g <= 1) return 'beliebiger Geschwindigkeit';
    const beta = Math.sqrt(1 - 1 / (g * g));
    const nines = Math.max(2, Math.min(12, Math.ceil(-Math.log10(1 - beta)) + 2));
    return `${num(beta * 100, nines, nines)} %`;
  };
  registerModule({
    el,
    second(now) {
      const rem = Math.max(0, RELEASE - now);
      const max = Math.max(...rows.map((r) => rem / r.ms));
      for (const r of rows) {
        const v = rem / r.ms;
        setText(r.value, num(v, v < 10 ? 3 : 1, v < 10 ? 3 : 1));
        r.bar.style.transform = `scaleX(${Math.max(0.004, v / max)})`;
      }
      setText(speedDay, vFor(rem, DAY_MS));
      setText(speedHour, vFor(rem, HOUR_MS));
      setText(speedMin, vFor(rem, 60_000));
    },
  });
  return el;
}
