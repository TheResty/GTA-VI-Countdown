/**
 * Cheat-Effekte & Easter Eggs. Cheats funktionieren per Tastatur überall auf
 * der Seite oder über das Cheat-Terminal im HQ.
 */
import { emit } from '../core/bus';
import { addMoney, addWanted, clearWanted, registerCheat, unlock } from '../core/game';
import { CHEATS } from '../data/achievements';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';

let fx: HTMLElement;

function layer(): HTMLElement {
  if (!fx) {
    fx = h('div.fx-layer', { 'aria-hidden': 'true' });
    document.body.appendChild(fx);
  }
  return fx;
}

function reduced(): boolean {
  return document.documentElement.classList.contains('reduce-motion');
}

function temporaryClass(cls: string, ms: number): void {
  const root = document.documentElement;
  root.classList.add(cls);
  window.setTimeout(() => root.classList.remove(cls), ms);
}

function floatText(text: string, cls: string): void {
  const el = h(`div.fx-float.${cls}`, text);
  layer().appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function healthBar(): void {
  const fill = h('span.fx-health__fill');
  const el = h('div.fx-health', h('span.fx-health__label', 'GESUNDHEIT'), h('span.fx-health__track', fill));
  layer().appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.transform = 'scaleX(1)')));
  setTimeout(() => el.classList.add('is-out'), 2600);
  setTimeout(() => el.remove(), 3200);
}

function tank(): void {
  const el = h(
    'div.fx-tank',
    h('div.fx-tank__body', h('span.fx-tank__turret'), h('span.fx-tank__barrel'), h('span.fx-tank__tracks')),
  );
  layer().appendChild(el);
  setTimeout(() => el.remove(), 7000);
}

function explosion(): void {
  if (!reduced()) temporaryClass('shake', 700);
  const canvas = h<HTMLCanvasElement>('canvas.fx-canvas');
  layer().appendChild(canvas);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const colors = ['#ffd23f', '#ff8a3d', '#ff2e97', '#ffffff', '#ff3b5c'];
  const parts = Array.from({ length: 180 }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 2 + Math.random() * 11;
    return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: colors[(Math.random() * colors.length) | 0], r: 1.5 + Math.random() * 3.5 };
  });
  let frame = 0;
  const step = () => {
    frame++;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (frame < 8) {
      ctx.fillStyle = `rgba(255, 220, 160, ${0.5 - frame * 0.06})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.985;
      p.life -= 0.012;
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (frame < 100) requestAnimationFrame(step);
    else canvas.remove();
  };
  requestAnimationFrame(step);
}

function palmRain(): void {
  const n = reduced() ? 8 : 28;
  for (let i = 0; i < n; i++) {
    const el = h('span.fx-palm', { style: { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 1.8}s`, animationDuration: `${3 + Math.random() * 3}s`, '--rot': `${Math.random() * 720 - 360}deg` } }, icon('palm', 28 + Math.random() * 26));
    layer().appendChild(el);
    setTimeout(() => el.remove(), 7000);
  }
}

function wasted(): void {
  const el = h('div.fx-wasted', h('span', 'wasted'), h('small', 'Du kannst nicht mehr warten? Verständlich. Respawn in 3 … 2 … 1'));
  layer().appendChild(el);
  temporaryClass('is-wasted', 4200);
  setTimeout(() => el.classList.add('is-out'), 3600);
  setTimeout(() => el.remove(), 4300);
}

const EFFECTS: Record<string, () => string> = {
  HESOYAM: () => {
    addMoney(250_000);
    floatText('+ $250.000', 'is-money');
    healthBar();
    return '+250.000 $ und volle Gesundheit. Ausgeben kannst du es leider erst ab dem 19.11.';
  },
  ASPIRINE: () => {
    healthBar();
    return 'Kopfschmerzen vom vielen Warten geheilt.';
  },
  PANZER: () => {
    tank();
    addWanted(2);
    return 'Panzer geliefert. Die Polizei hat es bemerkt (+2 Sterne).';
  },
  BIGBANG: () => {
    explosion();
    addWanted(1);
    return 'Alles in der Nähe explodiert. Außer der Wartezeit.';
  },
  LEAVEMEALONE: () => {
    clearWanted();
    return 'Fahndungsstufe gelöscht. Die Polizei schaut weg.';
  },
  LIFEISPASSINGMEBY: () => {
    temporaryClass('timewarp', 9000);
    return 'Zeitraffer aktiviert – rein optisch. Der Countdown bleibt ehrlich.';
  },
  LEONIDA: () => {
    palmRain();
    return 'Willkommen in Leonida. Es regnet Palmen.';
  },
  VICECITY: () => {
    temporaryClass('vhs', 20_000);
    return 'Zurück ins Jahr 1986. VHS-Modus für 20 Sekunden.';
  },
  WASTED: () => {
    wasted();
    return 'Wasted. Respawn erfolgt automatisch.';
  },
};

/** Führt einen Cheat aus. Gibt die Effekt-Beschreibung zurück oder null. */
export function tryCheat(code: string): string | null {
  const fn = EFFECTS[code];
  if (!fn) return null;
  const isNew = registerCheat(code);
  const msg = fn();
  emit('toast', { title: `Cheat aktiviert: ${code}`, text: isNew ? `${msg} · Neu entdeckt!` : msg, tone: 'good', icon: 'key' });
  return msg;
}

/** Tastatur-Listener für Cheats und Konami-Code. */
export function initCheatKeys(): void {
  let buffer = '';
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kIdx = 0;
  const maxLen = Math.max(...CHEATS.map((c) => c.code.length));
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    // Konami
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[kIdx]) {
      kIdx++;
      if (kIdx === konami.length) {
        kIdx = 0;
        unlock('konami');
        temporaryClass('overdrive', 15_000);
        emit('toast', { title: 'Konami-Code!', text: 'Neon-Overdrive für 15 Sekunden.', tone: 'gold', icon: 'gamepad' });
      }
    } else kIdx = key === konami[0] ? 1 : 0;
    // Cheats
    if (e.key.length !== 1 || !/[a-z]/i.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    buffer = (buffer + e.key.toUpperCase()).slice(-maxLen);
    for (const c of CHEATS) {
      if (buffer.endsWith(c.code)) {
        buffer = '';
        tryCheat(c.code);
        break;
      }
    }
  });
}
