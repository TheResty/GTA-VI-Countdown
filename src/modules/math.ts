/**
 * Mathematische Module: Zahlensysteme und Zahlenmystik.
 */
import { fmtDateTime, humanDuration, num } from '../core/format';
import { milestones } from '../core/milestones';
import { RELEASE } from '../core/timeline';
import { DAY_MS } from '../core/tz';
import { h, setText } from '../ui/dom';
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
      const nm = milestones().find((m) => m.kind === 'seconds' && m.at > now);
      setText(nextNice, nm ? `${nm.label} – ${nm.detail}` : '–');
    },
  });
  return el;
}
