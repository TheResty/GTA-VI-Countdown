/**
 * Einheiten-Kaskade: dieselbe Restzeit in sechs Auflösungen.
 */
import { num } from '../core/format';
import { RELEASE } from '../core/timeline';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../core/tz';
import { h, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';

/* ------------------------------------------------------------------ */
/* T-01 Einheiten-Kaskade                                             */
/* ------------------------------------------------------------------ */
export function unitCascade(): HTMLElement {
  const rows = [
    { key: 'weeks', label: 'Wochen', div: 7 * DAY_MS, dec: 6 },
    { key: 'days', label: 'Tage', div: DAY_MS, dec: 5 },
    { key: 'hours', label: 'Stunden', div: HOUR_MS, dec: 3 },
    { key: 'minutes', label: 'Minuten', div: MINUTE_MS, dec: 1 },
    { key: 'seconds', label: 'Sekunden', div: 1000, dec: 0 },
    { key: 'ms', label: 'Millisekunden', div: 1, dec: 0 },
  ].map((r) => ({ ...r, value: h('span.cascade__value') }));

  const el = panel({
    id: 'kaskade',
    code: 'T-01',
    title: 'Einheiten-Kaskade',
    kicker: 'Dieselbe Restzeit in sechs Auflösungen – live.',
    tone: 'cyan',
    body: h('dl.cascade', rows.map((r) => h(`div.cascade__row.cascade__row--${r.key}`, h('dt', r.label), h('dd', r.value)))),
  });

  registerModule({
    el,
    frame(now) {
      const rem = Math.max(0, RELEASE - now);
      for (const r of rows) {
        const v = r.dec === 0 ? Math.floor(rem / r.div) : rem / r.div;
        setText(r.value, num(v, r.dec, r.dec));
      }
    },
    second(now) {
      this.frame!(now);
    },
  });
  return el;
}
