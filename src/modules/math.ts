/**
 * Mathematische Module: Zahlensysteme, Zahlenmystik, komprimierte Zeit
 * und Zenons Paradoxon.
 */
import { fmtDateTime, humanDuration, num, pad } from '../core/format';
import { MILESTONES } from '../core/milestones';
import { ANCHORS, RELEASE } from '../core/timeline';
import { DAY_MS } from '../core/tz';
import { h, s, setAttr, setText } from '../ui/dom';
import { panel, registerModule } from '../ui/panel';

/* ------------------------------------------------------------------ */
/* Hilfsfunktionen                                                     */
/* ------------------------------------------------------------------ */
export function toRoman(n: number): string {
  if (n <= 0) return 'nulla';
  if (n >= 4000) return '—';
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [v, sym] of map) while (n >= v) {
    out += sym;
    n -= v;
  }
  return out;
}

export function factorize(n: number): number[] {
  const f: number[] = [];
  let x = n;
  for (let p = 2; p * p <= x; p++) {
    while (x % p === 0) {
      f.push(p);
      x /= p;
    }
  }
  if (x > 1) f.push(x);
  return f;
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let p = 3; p * p <= n; p += 2) if (n % p === 0) return false;
  return true;
}

function digitSum(n: number): number {
  return String(n)
    .split('')
    .reduce((a, b) => a + Number(b), 0);
}

function isPalindrome(n: number): boolean {
  const s = String(n);
  return s === s.split('').reverse().join('');
}

function groupBits(bin: string): string {
  return bin.replace(/\B(?=(\d{4})+(?!\d))/g, ' ');
}

/* ------------------------------------------------------------------ */
/* T-09 Zahlensysteme                                                  */
/* ------------------------------------------------------------------ */
export function numberSystems(): HTMLElement {
  const rows = {
    bin: h('code'),
    oct: h('code'),
    hex: h('code'),
    roman: h('code'),
    sci: h('code'),
    planck: h('code'),
  };
  const el = panel({
    id: 'zahlensysteme',
    code: 'T-09',
    title: 'Zahlensysteme',
    kicker: 'Die verbleibenden Sekunden, übersetzt für Computer, Römer und Physiker.',
    tone: 'mint',
    body: h(
      'dl.numsys',
      h('div', h('dt', 'Binär'), h('dd', rows.bin)),
      h('div', h('dt', 'Oktal'), h('dd', rows.oct)),
      h('div', h('dt', 'Hexadezimal'), h('dd', rows.hex)),
      h('div', h('dt', 'Römisch (Tage · Std.)'), h('dd', rows.roman)),
      h('div', h('dt', 'Wissenschaftlich'), h('dd', rows.sci)),
      h('div', h('dt', 'Planck-Zeiten'), h('dd', rows.planck)),
    ),
    note: 'Planck-Zeit ≈ 5,391 × 10⁻⁴⁴ Sekunden – die kleinste physikalisch sinnvolle Zeiteinheit.',
  });
  registerModule({
    el,
    second(now) {
      const rem = Math.max(0, RELEASE - now);
      const sec = Math.floor(rem / 1000);
      setText(rows.bin, groupBits(sec.toString(2)));
      setText(rows.oct, sec.toString(8));
      setText(rows.hex, `0x${sec.toString(16).toUpperCase()}`);
      setText(rows.roman, `${toRoman(Math.floor(rem / DAY_MS))} · ${toRoman(Math.floor((rem % DAY_MS) / 3_600_000))}`);
      const exp = sec > 0 ? Math.floor(Math.log10(sec)) : 0;
      setText(rows.sci, `${num(sec / 10 ** exp, 4, 4)} × 10^${exp} s`);
      const pl = rem / 1000 / 5.391247e-44;
      const pe = Math.floor(Math.log10(Math.max(1, pl)));
      setText(rows.planck, `${num(pl / 10 ** pe, 3, 3)} × 10^${pe}`);
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-10 Zahlenmystik                                                   */
/* ------------------------------------------------------------------ */
export function numberMystic(): HTMLElement {
  const big = h('div.mystic__num');
  const tags = h('ul.mystic__tags');
  const factors = h('p.mystic__factors');
  const nextPrime = h('dd');
  const nextRep = h('dd');
  const nextNice = h('dd');
  const el = panel({
    id: 'zahlenmystik',
    code: 'T-10',
    title: 'Zahlenmystik',
    kicker: 'Jede Sekunde eine neue Zahl. Manche davon sind besonders.',
    tone: 'sun',
    body: h(
      'div.mystic',
      big,
      tags,
      factors,
      h(
        'dl.kv',
        h('div', h('dt', 'Nächste Primzahl-Sekunde'), nextPrime),
        h('div', h('dt', 'Nächste Schnapszahl'), nextRep),
        h('div', h('dt', 'Nächste Sekunden-Marke'), nextNice),
      ),
    ),
  });

  function prevPrime(n: number): number {
    let x = n - 1;
    while (x > 1 && !isPrime(x)) x--;
    return x;
  }
  function prevRepdigit(n: number): number {
    const len = String(n).length;
    let best = 0;
    for (let l = len; l >= 1 && !best; l--) {
      for (let d = 9; d >= 1; d--) {
        const v = Number(String(d).repeat(l));
        if (v < n) {
          best = v;
          break;
        }
      }
    }
    return best;
  }

  registerModule({
    el,
    second(now) {
      const sec = Math.max(0, Math.floor((RELEASE - now) / 1000));
      setText(big, num(sec));
      const t: string[] = [];
      if (isPrime(sec)) t.push('Primzahl!');
      if (isPalindrome(sec)) t.push('Palindrom!');
      if (Number.isInteger(Math.sqrt(sec))) t.push('Quadratzahl!');
      t.push(sec % 2 === 0 ? 'gerade' : 'ungerade');
      t.push(`Quersumme ${digitSum(sec)}`);
      if (sec % 1337 === 0 && sec > 0) t.push('durch 1337 teilbar');
      tags.replaceChildren(...t.map((x) => h(`li${x.endsWith('!') ? '.is-hot' : ''}`, x)));
      const f = sec > 1 ? factorize(sec) : [];
      setText(factors, f.length > 1 ? `= ${f.join(' × ')}` : f.length === 1 ? 'Unteilbar. Wie deine Vorfreude.' : '');
      if (sec > 2) {
        const p = prevPrime(sec);
        setText(nextPrime, `${num(p)} in ${humanDuration((sec - p) * 1000, 2)}`);
        const r = prevRepdigit(sec);
        setText(nextRep, r ? `${num(r)} am ${fmtDateTime(RELEASE - r * 1000, true)}` : '–');
      }
      const nm = MILESTONES.find((m) => m.kind === 'seconds' && m.at > now);
      setText(nextNice, nm ? `${nm.label} – ${nm.detail}` : '–');
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-11 Komprimierte Zeit                                              */
/* ------------------------------------------------------------------ */
export function compressedTime(): HTMLElement {
  const handH = s('line.face__hand.face__hand--h', { x1: '60', y1: '60', x2: '60', y2: '30' });
  const handM = s('line.face__hand.face__hand--m', { x1: '60', y1: '60', x2: '60', y2: '18' });
  const handS = s('line.face__hand.face__hand--s', { x1: '60', y1: '66', x2: '60', y2: '14' });
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return s('line.face__tick', {
      x1: String(60 + Math.sin(a) * 46),
      y1: String(60 - Math.cos(a) * 46),
      x2: String(60 + Math.sin(a) * 52),
      y2: String(60 - Math.cos(a) * 52),
    });
  });
  const face = s(
    'svg.face',
    { viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Die Wartezeit als ein einziger Tag' },
    s('circle.face__rim', { cx: '60', cy: '60', r: '56' }),
    ticks,
    handH,
    handM,
    handS,
    s('circle.face__pin', { cx: '60', cy: '60', r: '3' }),
  );
  const time = h('b.compress__time');
  const asYear = h('dd');
  const asMatch = h('dd');
  const asLesson = h('dd');
  const asMovie = h('dd');
  const el = panel({
    id: 'komprimiert',
    code: 'T-11',
    title: 'Komprimierte Zeit',
    kicker: 'Die gesamte Wartezeit seit Trailer 1, gestaucht auf einen einzigen Tag.',
    tone: 'orange',
    body: h(
      'div.compress',
      h('div.compress__clock', face, h('p', 'Auf der Wartetag-Uhr ist es', time)),
      h(
        'dl.kv',
        h('div', h('dt', 'Als Kalenderjahr'), asYear),
        h('div', h('dt', 'Als Fußballspiel'), asMatch),
        h('div', h('dt', 'Als Schulstunde'), asLesson),
        h('div', h('dt', 'Als 2-Stunden-Film'), asMovie),
      ),
    ),
    note: 'Startpunkt: Trailer 1 (05.12.2023, 00:00 Uhr MEZ), Ziel: Release. 00:00 Uhr = Trailer 1, 24:00 Uhr = GTA VI.',
  });
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  registerModule({
    el,
    frame(now) {
      const f = Math.min(1, Math.max(0, (now - ANCHORS.trailer1) / (RELEASE - ANCHORS.trailer1)));
      const daySec = f * 86400;
      const hh = Math.floor(daySec / 3600);
      const mm = Math.floor((daySec % 3600) / 60);
      const ss = daySec % 60;
      setText(time, `${pad(hh)}:${pad(mm)}:${pad(ss)} Uhr`);
      const rot = (deg: number, el: SVGElement) => setAttr(el, 'transform', `rotate(${deg} 60 60)`);
      rot((daySec / 43200) * 360, handH);
      rot(((daySec % 3600) / 3600) * 360, handM);
      rot((ss / 60) * 360, handS);
    },
    second(now) {
      const f = Math.min(1, Math.max(0, (now - ANCHORS.trailer1) / (RELEASE - ANCHORS.trailer1)));
      const doy = f * 365;
      const d = new Date(Date.UTC(2025, 0, 1) + Math.min(364.999, doy) * DAY_MS);
      setText(asYear, `${d.getUTCDate()}. ${months[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} Uhr`);
      const minute = f * 90;
      setText(asMatch, minute >= 90 ? 'Abpfiff!' : `${Math.floor(minute) + 1}. Minute`);
      const lm = f * 45;
      setText(asLesson, `Minute ${Math.floor(lm)}:${pad((lm % 1) * 60)} von 45`);
      const mv = f * 120;
      setText(asMovie, mv >= 118 ? 'Abspann läuft' : `${Math.floor(mv)} Min. – ${mv > 100 ? 'das Finale beginnt' : mv > 60 ? 'der Plot zieht an' : 'noch Einleitung'}`);
      if (this.frame) this.frame(now);
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* T-12 Zenons Paradoxon                                               */
/* ------------------------------------------------------------------ */
export function zeno(): HTMLElement {
  const list = h('ol.zeno');
  const count = h('b');
  const W = 360;
  const axis = s('g');
  const marker = s('circle.zeno__now', { cx: '0', cy: '34', r: '6' });
  const svg = s('svg.zeno__axis', { viewBox: `0 0 ${W} 64`, role: 'img', 'aria-label': 'Logarithmische Restzeit-Achse' }, axis, marker);
  const ticks: [number, string][] = [
    [1000, '1 s'],
    [60_000, '1 min'],
    [3_600_000, '1 h'],
    [DAY_MS, '1 Tag'],
    [365 * DAY_MS, '1 Jahr'],
  ];
  const maxMs = 365 * DAY_MS;
  const xOf = (ms: number) => 16 + (Math.log10(Math.max(1000, ms) / 1000) / Math.log10(maxMs / 1000)) * (W - 40);
  axis.append(
    s('line.zeno__line', { x1: '16', x2: String(W - 24), y1: '34', y2: '34' }),
    ...ticks.flatMap(([ms, l]) => [
      s('line.zeno__tick', { x1: String(xOf(ms)), x2: String(xOf(ms)), y1: '28', y2: '40' }),
      s('text.zeno__label', { x: String(xOf(ms)), y: '58', 'text-anchor': 'middle' }, l),
    ]),
  );
  const el = panel({
    id: 'zenon',
    code: 'T-12',
    title: 'Zenons Paradoxon',
    kicker: 'Achilles holt die Schildkröte nie ein? Die Restzeit halbiert sich immer wieder – und kommt trotzdem an.',
    tone: 'cyan',
    body: h('div', svg, h('p.zeno__count', 'Halbierungen bis zur letzten Sekunde: ', count), list),
    note: 'Logarithmische Achse: Jede Halbierung ist auf ihr gleich lang – deshalb fühlt sich das Ende nie näher an.',
  });
  let lastKey = '';
  registerModule({
    el,
    second(now) {
      const rem = Math.max(0, RELEASE - now);
      setAttr(marker, 'cx', String(xOf(rem)));
      const n = rem > 1000 ? Math.floor(Math.log2(rem / 1000)) : 0;
      setText(count, num(n));
      const key = `${n}-${Math.floor(now / 60_000)}`;
      if (key === lastKey) return;
      lastKey = key;
      const items: HTMLElement[] = [];
      for (let k = 1; k <= 6 && rem / 2 ** k > 1000; k++) {
        const at = RELEASE - rem / 2 ** k;
        items.push(
          h(
            'li',
            h('span.zeno__frac', `1/${2 ** k}`),
            h('span', fmtDateTime(at)),
            h('span.zeno__rest', `Rest: ${humanDuration(rem / 2 ** k, 2)}`),
          ),
        );
      }
      list.replaceChildren(...items);
    },
  });
  return el;
}
