/**
 * R-01: Jahre zwischen den GTA-Hauptteilen – die Lücke V → VI ist die längste der Seriengeschichte.
 */
import { fmtDate, longDuration, num } from '../core/format';
import { TZ } from '../core/timeline';
import { DAY_MS, parseLocal } from '../core/tz';
import { MAIN_GAMES } from '../data/history';
import { h, s, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';
import { bindTip } from '../ui/tooltip';

const YEAR = 365.2425 * DAY_MS;

/* ------------------------------------------------------------------ */
/* L-04 Release-Abstände                                               */
/* ------------------------------------------------------------------ */
export function gapsChart(): HTMLElement {
  const gaps = MAIN_GAMES.slice(1).map((g, i) => {
    const prev = MAIN_GAMES[i];
    const a = parseLocal(prev.release, TZ);
    const b = parseLocal(g.release, TZ);
    return { label: `${prev.short} → ${g.short}`, ms: b - a, approx: Boolean(prev.approx || g.approx), from: a, to: b, planned: Boolean(g.planned) };
  });
  const maxYears = 14;
  const W = 640;
  const rowH = 38;
  const left = 178;
  const H = gaps.length * rowH + 30;
  const xOf = (y: number) => left + (y / maxYears) * (W - left - 70);
  const nowMark = s('line.gap__now', { y1: '0', y2: '0' });
  const bars = gaps.map((g, i) => {
    const y = 10 + i * rowH;
    const years = g.ms / YEAR;
    const rect = s('rect.gap__bar', { x: String(left), y: String(y), height: '20', width: String(xOf(years) - left), rx: '4' });
    if (g.planned) rect.classList.add('is-planned');
    const grp = s(
      'g.gap',
      s('text.gap__label', { x: String(left - 10), y: String(y + 14), 'text-anchor': 'end' }, g.label),
      rect,
      s('text.gap__value', { x: String(xOf(years) + 8), y: String(y + 14) }, `${g.approx ? '≈ ' : ''}${num(years, 1, 1)} J.`),
    );
    bindTip(grp, () => ({ title: g.label, lines: [`${fmtDate(g.from, 'date')} → ${fmtDate(g.to, 'date')}${g.planned ? ' (geplant)' : ''}`, longDuration(g.ms)] }));
    return grp;
  });
  const ticks = [0, 2, 4, 6, 8, 10, 12, 14].map((y) => [
    s('line.gap__grid', { x1: String(xOf(y)), x2: String(xOf(y)), y1: '4', y2: String(H - 22) }),
    s('text.gap__tick', { x: String(xOf(y)), y: String(H - 6), 'text-anchor': 'middle' }, `${y} J.`),
  ]);
  const lastIdx = gaps.length - 1;
  const svg = s('svg.gaps', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Jahre zwischen den GTA-Hauptteilen' }, ticks, bars, nowMark);
  const caption = h('p.gaps__caption');
  const el = panel({
    id: 'abstaende',
    code: 'L-04',
    title: 'Abstände zwischen den Hauptteilen',
    kicker: 'Jahre von Release zu Release. Die letzte Lücke ist die längste der Seriengeschichte – mit großem Abstand.',
    tone: 'sun',
    span: 2,
    body: h('div', h('div.chart-scroll', svg), caption),
    note: '≈ GTA 1 und GTA 2 erschienen je nach Region an unterschiedlichen Tagen (Okt./Nov. 1997 bzw. Sept./Okt. 1999). Übrige Daten: Erstveröffentlichung.',
  });
  registerModule({
    el,
    second(now) {
      const g = gaps[lastIdx];
      const years = Math.min(g.ms, Math.max(0, now - g.from)) / YEAR;
      const x = xOf(years);
      const y = 10 + lastIdx * rowH;
      nowMark.setAttribute('x1', String(x));
      nowMark.setAttribute('x2', String(x));
      nowMark.setAttribute('y1', String(y - 4));
      nowMark.setAttribute('y2', String(y + 24));
      const sum3 = gaps.slice(1, 4).reduce((a, b) => a + b.ms, 0);
      setText(
        caption,
        `GTA V → VI: ${longDuration(g.ms)}. Zum Vergleich: GTA 2 → III → Vice City → San Andreas dauerte zusammen nur ${num(sum3 / YEAR, 1, 1)} Jahre. Bisher vergangen: ${num((now - g.from) / YEAR, 2, 2)} Jahre.`,
      );
    },
  });
  return el;
}
