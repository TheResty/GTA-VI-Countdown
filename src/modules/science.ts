/**
 * Sonnenaufgänge bis zum Release (NOAA-Näherung für deinen Standort).
 */
import { sunTimes } from '../core/astro';
import { fmtDate, humanDuration, num } from '../core/format';
import { onSettings, settings } from '../core/settings';
import { LAST_WAIT_DAY, RELEASE, TZ } from '../core/timeline';
import { civilAddDays, civilCompare, civilFromMs, civilKey, zonedParts } from '../core/tz';
import { h, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';
import { bindTip } from '../ui/tooltip';

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
