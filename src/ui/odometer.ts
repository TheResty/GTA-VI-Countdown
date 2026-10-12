/**
 * Rollende Ziffern: jede Stelle ist ein vertikaler Streifen 0–9 (+ zweite 0),
 * der per CSS-Transform verschoben wird. Beim Herunterzählen (0 → 9) rollt
 * die Stelle sauber „rückwärts“ statt durch alle Ziffern zu wirbeln.
 */
import { h } from './dom';

class Digit {
  el: HTMLElement;
  private strip: HTMLElement;
  private value = -1;

  constructor() {
    this.strip = h('span.odo__strip', ...Array.from({ length: 11 }, (_, i) => h('span.odo__n', String(i % 10))));
    this.el = h('span.odo__digit', { 'aria-hidden': 'true' }, this.strip);
  }

  set(v: number, animate: boolean): void {
    if (v === this.value) return;
    const prev = this.value;
    this.value = v;
    if (!animate || prev < 0) {
      this.strip.style.transition = 'none';
      this.strip.style.transform = `translateY(${-(v / 11) * 100}%)`;
      void this.strip.offsetHeight;
      this.strip.style.transition = '';
      return;
    }
    if (prev === 0 && v === 9) {
      // Rückwärts-Überlauf: unsichtbar auf die zweite 0 springen, dann auf 9 rollen
      this.strip.style.transition = 'none';
      this.strip.style.transform = `translateY(${-(10 / 11) * 100}%)`;
      void this.strip.offsetHeight;
      this.strip.style.transition = '';
    } else if (prev === 9 && v === 0) {
      // Vorwärts-Überlauf (Hochzählen nach Release)
      this.strip.style.transform = `translateY(${-(10 / 11) * 100}%)`;
      const strip = this.strip;
      setTimeout(() => {
        if (this.value !== 0) return;
        strip.style.transition = 'none';
        strip.style.transform = 'translateY(0%)';
        void strip.offsetHeight;
        strip.style.transition = '';
      }, 420);
      return;
    }
    this.strip.style.transform = `translateY(${-(v / 11) * 100}%)`;
  }
}

export class Odometer {
  el: HTMLElement;
  private digits: Digit[] = [];
  private minDigits: number;
  private label: HTMLElement;

  constructor(minDigits = 2, cls = '') {
    this.minDigits = minDigits;
    this.label = h('span.sr-only');
    this.el = h(`span.odo${cls ? '.' + cls : ''}`, this.label);
    for (let i = 0; i < minDigits; i++) this.addDigit();
  }

  private addDigit(): void {
    const d = new Digit();
    this.digits.unshift(d);
    this.el.insertBefore(d.el, this.el.children[1] ?? null);
  }

  private removeDigit(): void {
    const d = this.digits.shift();
    d?.el.remove();
  }

  set(value: number, animate = true): void {
    const v = Math.max(0, Math.floor(value));
    const str = String(v).padStart(this.minDigits, '0');
    while (this.digits.length < str.length) this.addDigit();
    while (this.digits.length > str.length && this.digits.length > this.minDigits) this.removeDigit();
    for (let i = 0; i < str.length; i++) this.digits[i].set(Number(str[i]), animate);
    this.label.textContent = String(v);
  }
}
