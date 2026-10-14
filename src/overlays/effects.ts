/**
 * Easter Egg: Der Konami-Code schaltet für 15 Sekunden den Neon-Overdrive frei.
 */
import { emit } from '../core/bus';
import { unlock } from '../core/game';

function temporaryClass(cls: string, ms: number): void {
  const root = document.documentElement;
  root.classList.add(cls);
  window.setTimeout(() => root.classList.remove(cls), ms);
}

export function initKonami(): void {
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let idx = 0;
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[idx]) {
      idx++;
      if (idx === konami.length) {
        idx = 0;
        unlock('konami');
        temporaryClass('overdrive', 15_000);
        emit('toast', { title: 'Konami-Code!', text: 'Neon-Overdrive für 15 Sekunden.', tone: 'gold', icon: 'gamepad' });
      }
    } else idx = key === konami[0] ? 1 : 0;
  });
}
