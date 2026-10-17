/**
 * Neon-Sanduhr: hochauflösend gezeichnetes Glas mit glühendem Sand.
 * Die Sandmenge oben entspricht exakt dem Anteil der verbleibenden Wartezeit seit
 * dem Startpunkt, unten wächst ein Kegel. Dazwischen fällt ein Strom aus einzelnen
 * Körnern, die beim Aufprall spritzen. Glanzlichter wandern über das Glas, der Sand
 * funkelt, und die Uhr kippt leicht mit dem Mauszeiger. Antippen schüttelt sie.
 */
import { num } from '../core/format';
import { fitCanvas } from '../ui/dom';

export interface SandGlass {
  el: HTMLCanvasElement;
  setFraction(remaining: number): void;
  reset(remaining: number): void;
  step(): void;
  draw(): void;
}

/* Geometrie in Einheiten der Kolbenhöhe (Hals → Deckel = 1) ------------- */
const R_N = 0.66; // größte halbe Breite
const NECK_N = 0.03; // halbe Halsbreite
const CAP_N = 0.1; // Dicke der Deckplatten
const REPOSE = 0.48; // Kegelhöhe relativ zur halben Basisbreite
const PILE_EXP = 1.15;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** halbe Innenbreite bei u (0 = Hals, 1 = Deckel) */
const wN = (u: number) => NECK_N + (R_N - NECK_N) * Math.pow(Math.sin(Math.min(1, u * 1.12) * Math.PI * 0.5), 1.15) * (1 - 0.12 * smooth(0.85, 1, u));

/* Flächentabellen ------------------------------------------------------ */
const N = 400;
const topArea = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) topArea[i] = topArea[i - 1] + (2 * wN((i - 0.5) / N)) / N;
const SAND = topArea[N] * 0.58;

function invTop(a: number): number {
  if (a <= 0) return 0;
  let lo = 0;
  let hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (topArea[mid] < a) lo = mid;
    else hi = mid;
  }
  const f = (a - topArea[lo]) / Math.max(1e-9, topArea[hi] - topArea[lo]);
  return (lo + f) / N;
}

/** Breite im unteren Kolben bei Höhe z über dem Boden (0 = Boden, 1 = Hals) */
const wB = (z: number) => wN(1 - z);
const peakFor = (L: number) => Math.min(REPOSE * wB(L), 0.94 - L);

function pileArea(L: number): number {
  const M = 240;
  const wL = wB(L);
  const peak = peakFor(L);
  let a = 0;
  for (let k = 0; k < M; k++) {
    const z = (k + 0.5) / M;
    if (z <= L) a += (2 * wB(z)) / M;
    else if (z < L + peak) {
      const half = wL * (1 - Math.pow((z - L) / peak, 1 / PILE_EXP));
      a += (2 * Math.min(wB(z), half)) / M;
    }
  }
  return a;
}
const PT = 180;
const PILE_MAX_L = 0.82;
const pileTab = Float64Array.from({ length: PT + 1 }, (_, i) => pileArea((i / PT) * PILE_MAX_L));

interface Pile {
  /** Füllhöhe des flachen Teils */
  L: number;
  /** halbe Basisbreite des Kegels */
  base: number;
  peak: number;
}

function solvePile(a: number): Pile | null {
  if (a <= 1e-6) return null;
  if (a < pileTab[0]) {
    const k = Math.sqrt(a / pileTab[0]);
    return { L: 0, base: wB(0) * k, peak: peakFor(0) * k };
  }
  let i = 0;
  while (i < PT && pileTab[i + 1] < a) i++;
  const f = i >= PT ? 0 : (a - pileTab[i]) / Math.max(1e-9, pileTab[i + 1] - pileTab[i]);
  const L = ((i + f) / PT) * PILE_MAX_L;
  return { L, base: wB(L), peak: peakFor(L) };
}

/* Partikel ------------------------------------------------------------- */
interface Grain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: 'fall' | 'splash' | 'drain' | 'dust';
  hue: number;
}

const COLORS = ['255,226,140', '255,196,90', '255,150,70', '255,96,120', '255,70,160'];

export function createSandGlass(): SandGlass {
  const canvas = document.createElement('canvas');
  canvas.className = 'sand';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Sanduhr der Wartezeit');

  // Körnung als wiederholbares Muster
  const noise = document.createElement('canvas');
  noise.width = noise.height = 160;
  const nctx = noise.getContext('2d')!;
  for (let i = 0; i < 2600; i++) {
    const light = Math.random() < 0.55;
    nctx.fillStyle = light ? `rgba(255,255,235,${0.08 + Math.random() * 0.32})` : `rgba(70,0,45,${0.12 + Math.random() * 0.28})`;
    const s = Math.random() < 0.85 ? 1 : 2;
    nctx.fillRect(Math.random() * 160, Math.random() * 160, s, s);
  }
  let pattern: CanvasPattern | null = null;

  const sparkles = Array.from({ length: 70 }, () => ({ x: Math.random() * 2 - 1, y: Math.random(), top: Math.random() < 0.35, phase: Math.random() * 6.28, speed: 0.6 + Math.random() * 1.6 }));
  const grains: Grain[] = [];
  let remaining = 1;
  let time = 0;
  let last = 0;
  let spawnAcc = 0;
  let shake = 0;

  // Momentaufnahme der Geometrie (von draw gesetzt, von step gelesen)
  const geo = { cx: 0, yN: 0, bh: 0, apexY: 0, pile: null as Pile | null, uTop: 0, dip: 0, ok: false };

  const surfaceBottomY = (x: number) => {
    const p = geo.pile;
    const yFloor = geo.yN + geo.bh;
    if (!p) return yFloor;
    const t = Math.min(1, Math.abs(x - geo.cx) / (p.base * geo.bh));
    return yFloor - (p.L + p.peak * Math.pow(1 - t, PILE_EXP)) * geo.bh;
  };

  function reset(rem: number): void {
    remaining = Math.max(0, Math.min(1, rem));
    grains.length = 0;
  }

  function flowing(): boolean {
    return remaining > 0.0004 && remaining < 0.9996;
  }

  function step(): void {
    const now = performance.now();
    const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0.016;
    last = now;
    time += dt;
    shake = Math.max(0, shake - dt * 2.2);
    if (!geo.ok) return;
    const g = geo.bh * 5.5; // Schwerkraft in px/s²

    if (flowing()) {
      spawnAcc += dt * 70;
      while (spawnAcc >= 1) {
        spawnAcc--;
        grains.push({ x: geo.cx + (Math.random() - 0.5) * NECK_N * geo.bh * 1.2, y: geo.yN + 2, vx: (Math.random() - 0.5) * 6, vy: geo.bh * (0.3 + Math.random() * 0.3), life: 0, max: 3, kind: 'fall', hue: (Math.random() * COLORS.length) | 0 });
      }
      // Körner rutschen oben in den Trichter
      if (geo.uTop > 0.03 && Math.random() < dt * 14) {
        const w = wN(geo.uTop) * geo.bh * 0.9;
        const x = geo.cx + (Math.random() * 2 - 1) * w;
        grains.push({ x, y: 0, vx: 0, vy: 0, life: 0, max: 1.4 + Math.random(), kind: 'drain', hue: (Math.random() * 3) | 0 });
      }
    }
    if (grains.filter((p) => p.kind === 'dust').length < 26 && Math.random() < dt * 8) {
      grains.push({ x: geo.cx + (Math.random() * 2 - 1) * geo.bh * 1.3, y: geo.yN + (Math.random() * 2 - 1) * geo.bh * 1.1, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 8, life: 0, max: 4 + Math.random() * 4, kind: 'dust', hue: (Math.random() * COLORS.length) | 0 });
    }

    for (let i = grains.length - 1; i >= 0; i--) {
      const p = grains[i];
      p.life += dt;
      if (p.kind === 'fall') {
        p.vy += g * dt;
        p.y += p.vy * dt;
        p.x += p.vx * dt * 0.2;
        const floor = surfaceBottomY(p.x);
        if (p.y >= floor) {
          if (Math.random() < 0.28) {
            const n = 1 + ((Math.random() * 2) | 0);
            for (let k = 0; k < n; k++) {
              grains.push({ x: p.x, y: floor - 1, vx: (Math.random() - 0.5) * geo.bh * 0.9, vy: -geo.bh * (0.25 + Math.random() * 0.5), life: 0, max: 0.9, kind: 'splash', hue: p.hue });
            }
          }
          grains.splice(i, 1);
          continue;
        }
      } else if (p.kind === 'splash') {
        p.vy += g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if ((p.vy > 0 && p.y >= surfaceBottomY(p.x)) || p.life > p.max) {
          grains.splice(i, 1);
          continue;
        }
      } else if (p.kind === 'drain') {
        // gleitet auf der Oberfläche zur Mitte und verschwindet im Hals
        const dx = geo.cx - p.x;
        p.x += dx * dt * 1.6;
        if (Math.abs(dx) < 1.5 || p.life > p.max) {
          grains.splice(i, 1);
          continue;
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life > p.max) {
          grains.splice(i, 1);
          continue;
        }
      }
    }
  }

  function glassPath(ctx: CanvasRenderingContext2D, cx: number, yN: number, bh: number, grow = 0): void {
    const S = 56;
    ctx.beginPath();
    for (let i = S; i >= 0; i--) {
      const u = i / S;
      ctx.lineTo(cx - wN(u) * bh - grow, yN - u * bh);
    }
    for (let i = 1; i <= S; i++) {
      const u = i / S;
      ctx.lineTo(cx - wN(u) * bh - grow, yN + u * bh);
    }
    for (let i = S; i >= 0; i--) {
      const u = i / S;
      ctx.lineTo(cx + wN(u) * bh + grow, yN + u * bh);
    }
    for (let i = 1; i <= S; i++) {
      const u = i / S;
      ctx.lineTo(cx + wN(u) * bh + grow, yN - u * bh);
    }
    ctx.closePath();
  }

  function sandFill(ctx: CanvasRenderingContext2D, y0: number, y1: number, glow: string): void {
    const grad = ctx.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, '#fff0b8');
    grad.addColorStop(0.18, '#ffd062');
    grad.addColorStop(0.55, '#ff8a3d');
    grad.addColorStop(1, '#ff2e97');
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 26;
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.clip();
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function draw(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 120) return;
    const { ctx, w: W, h: H } = fitCanvas(canvas);
    if (!pattern) pattern = ctx.createPattern(noise, 'repeat');
    ctx.clearRect(0, 0, W, H);

    const bh = Math.min((H * 0.88) / (2 + 2 * CAP_N), (W * 0.62) / (2 * R_N * 1.22));
    const cx = W / 2 + (shake > 0 ? Math.sin(time * 60) * shake * 5 : 0);
    const yN = H / 2;
    const capH = CAP_N * bh;
    const R = R_N * bh;
    const yTopCap = yN - bh;
    const yBotCap = yN + bh;
    geo.cx = cx;
    geo.yN = yN;
    geo.bh = bh;
    geo.ok = true;

    // Hintergrundglühen
    const pulse = 0.85 + 0.15 * Math.sin(time * 1.4);
    const bg = ctx.createRadialGradient(cx, yN + bh * 0.3, 0, cx, yN + bh * 0.3, bh * 1.6);
    bg.addColorStop(0, `rgba(255,96,110,${0.22 * pulse})`);
    bg.addColorStop(0.45, `rgba(155,107,255,${0.1 * pulse})`);
    bg.addColorStop(1, 'rgba(7,2,15,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Bodenreflexion
    const refl = ctx.createRadialGradient(cx, yBotCap + capH + 6, 0, cx, yBotCap + capH + 6, R * 1.6);
    refl.addColorStop(0, 'rgba(255,138,61,0.35)');
    refl.addColorStop(1, 'rgba(255,138,61,0)');
    ctx.fillStyle = refl;
    ctx.beginPath();
    ctx.ellipse(cx, yBotCap + capH + 6, R * 1.6, capH * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Staub im Raum
    for (const p of grains) {
      if (p.kind !== 'dust') continue;
      const a = Math.sin((p.life / p.max) * Math.PI) * 0.5;
      ctx.fillStyle = `rgba(${COLORS[p.hue]},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glasinneres
    glassPath(ctx, cx, yN, bh);
    const inner = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
    inner.addColorStop(0, 'rgba(25,240,255,0.07)');
    inner.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    inner.addColorStop(1, 'rgba(255,46,151,0.07)');
    ctx.fillStyle = inner;
    ctx.fill();

    const r = remaining;
    // Sand oben
    const uTop = invTop(r * SAND);
    geo.uTop = uTop;
    const dip = Math.min(uTop * bh * 0.6, bh * 0.16) * (flowing() ? 1 : 0.3);
    geo.dip = dip;
    const wTopPx = wN(uTop) * bh;
    const ySurf = (x: number) => yN - uTop * bh + dip * Math.exp(-Math.pow((x - cx) / (0.42 * wTopPx), 2));
    if (uTop > 0.002) {
      ctx.beginPath();
      const S = 40;
      for (let i = 0; i <= S; i++) {
        const u = (i / S) * uTop;
        ctx.lineTo(cx - wN(u) * bh, yN - u * bh);
      }
      for (let i = 0; i <= 48; i++) {
        const x = cx - wTopPx + (i / 48) * 2 * wTopPx;
        ctx.lineTo(x, Math.min(yN, ySurf(x)));
      }
      for (let i = S; i >= 0; i--) {
        const u = (i / S) * uTop;
        ctx.lineTo(cx + wN(u) * bh, yN - u * bh);
      }
      ctx.closePath();
      sandFill(ctx, yN - uTop * bh, yN, 'rgba(255,170,60,0.55)');
      // Funkeln oben
      ctx.save();
      ctx.clip();
      drawSparkles(ctx, cx, yN - uTop * bh, R, uTop * bh, true);
      ctx.restore();
      // Lichtkante der Oberfläche
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const x = cx - wTopPx + (i / 48) * 2 * wTopPx;
        ctx.lineTo(x, Math.min(yN, ySurf(x)));
      }
      ctx.strokeStyle = 'rgba(255,240,190,0.85)';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = 'rgba(255,210,63,0.9)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // Sand unten
    const pile = solvePile((1 - r) * SAND);
    geo.pile = pile;
    if (pile) {
      const yFloor = yBotCap;
      const basePx = pile.base * bh;
      ctx.beginPath();
      if (pile.L > 0) {
        const S = 40;
        for (let i = 0; i <= S; i++) {
          const z = (i / S) * pile.L;
          ctx.lineTo(cx - wB(z) * bh, yFloor - z * bh);
        }
      } else ctx.lineTo(cx - basePx, yFloor);
      for (let i = 0; i <= 60; i++) {
        const x = cx - basePx + (i / 60) * 2 * basePx;
        ctx.lineTo(x, surfaceBottomY(x));
      }
      if (pile.L > 0) {
        const S = 40;
        for (let i = S; i >= 0; i--) {
          const z = (i / S) * pile.L;
          ctx.lineTo(cx + wB(z) * bh, yFloor - z * bh);
        }
      } else ctx.lineTo(cx + basePx, yFloor);
      ctx.closePath();
      const apexY = yFloor - (pile.L + pile.peak) * bh;
      geo.apexY = apexY;
      sandFill(ctx, apexY, yFloor, 'rgba(255,90,120,0.55)');
      ctx.save();
      ctx.clip();
      drawSparkles(ctx, cx, apexY, R, yFloor - apexY, false);
      // Schatten am Rand für Tiefe
      const shade = ctx.createRadialGradient(cx, yFloor - (yFloor - apexY) * 0.4, R * 0.2, cx, yFloor - (yFloor - apexY) * 0.4, R * 1.05);
      shade.addColorStop(0, 'rgba(255,255,255,0.08)');
      shade.addColorStop(1, 'rgba(40,0,30,0.4)');
      ctx.fillStyle = shade;
      ctx.fillRect(cx - R, apexY - 2, 2 * R, yFloor - apexY + 4);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = cx - basePx + (i / 60) * 2 * basePx;
        ctx.lineTo(x, surfaceBottomY(x));
      }
      ctx.strokeStyle = 'rgba(255,236,200,0.8)';
      ctx.lineWidth = 1.3;
      ctx.shadowColor = 'rgba(255,138,61,0.9)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    } else geo.apexY = yBotCap;

    // Sandstrahl
    if (flowing()) {
      const topY = yN - 2;
      const botY = geo.apexY;
      const sg = ctx.createLinearGradient(0, topY, 0, botY);
      sg.addColorStop(0, 'rgba(255,230,150,0.95)');
      sg.addColorStop(1, 'rgba(255,120,90,0.65)');
      ctx.save();
      ctx.strokeStyle = sg;
      ctx.lineWidth = Math.max(1.2, NECK_N * bh * 0.9) * (0.85 + 0.15 * Math.sin(time * 40));
      ctx.shadowColor = 'rgba(255,190,90,0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx + Math.sin(time * 9) * 0.6, botY);
      ctx.stroke();
      ctx.restore();
    }

    // Körner
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of grains) {
      if (p.kind === 'fall') {
        ctx.strokeStyle = `rgba(${COLORS[p.hue]},0.9)`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - Math.min(10, p.vy * 0.012));
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (p.kind === 'splash') {
        ctx.fillStyle = `rgba(${COLORS[p.hue]},${1 - p.life / p.max})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'drain') {
        const y = Math.min(yN, ySurf(p.x));
        ctx.fillStyle = `rgba(${COLORS[p.hue]},${0.8 * Math.sin(Math.min(1, p.life / p.max) * Math.PI)})`;
        ctx.beginPath();
        ctx.arc(p.x, y - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Glas: Kontur mit Neon-Verlauf
    ctx.save();
    glassPath(ctx, cx, yN, bh, 1.5);
    const edge = ctx.createLinearGradient(0, yTopCap, 0, yBotCap);
    edge.addColorStop(0, 'rgba(255,255,255,0.75)');
    edge.addColorStop(0.45, 'rgba(25,240,255,0.7)');
    edge.addColorStop(1, 'rgba(255,46,151,0.75)');
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(25,240,255,0.55)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    // Glanzlichter auf dem Glas
    ctx.save();
    glassPath(ctx, cx, yN, bh);
    ctx.clip();
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const u = 0.22 + (i / 30) * 0.66;
        ctx.lineTo(cx - wN(u) * bh * 0.72, yN + dir * u * bh);
      }
      const hg = ctx.createLinearGradient(0, yN, 0, yN + dir * bh);
      hg.addColorStop(0, 'rgba(255,255,255,0)');
      hg.addColorStop(0.6, 'rgba(255,255,255,0.4)');
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = hg;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    // wandernder Glanz
    const sweep = ((time / 6) % 1) * 1.8 - 0.4;
    const gx = cx - R * 1.4 + sweep * R * 2.8;
    const glint = ctx.createLinearGradient(gx - R * 0.4, 0, gx + R * 0.4, 0);
    glint.addColorStop(0, 'rgba(255,255,255,0)');
    glint.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    glint.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.transform(1, 0, -0.35, 1, 0.35 * yN, 0); // schräger Streifen
    ctx.fillStyle = glint;
    ctx.fillRect(gx - R * 0.4, yTopCap, R * 0.8, bh * 2);
    ctx.restore();

    // Gestell: Säulen und Deckplatten
    const capW = R * 1.3;
    const rodX = R * 1.12;
    for (const sx of [-1, 1]) {
      const rg = ctx.createLinearGradient(cx + sx * rodX - 2, 0, cx + sx * rodX + 2, 0);
      rg.addColorStop(0, '#5a1f6e');
      rg.addColorStop(0.5, '#ffb3dc');
      rg.addColorStop(1, '#5a1f6e');
      ctx.save();
      ctx.fillStyle = rg;
      ctx.shadowColor = 'rgba(255,46,151,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillRect(cx + sx * rodX - 2, yTopCap, 4, bh * 2);
      ctx.restore();
    }
    const plate = (y: number, flip: boolean) => {
      const pg = ctx.createLinearGradient(0, y, 0, y + capH);
      pg.addColorStop(0, flip ? '#2a0b3d' : '#ffd23f');
      pg.addColorStop(0.35, '#ff5fa8');
      pg.addColorStop(1, flip ? '#ffd23f' : '#2a0b3d');
      ctx.save();
      ctx.fillStyle = pg;
      ctx.shadowColor = 'rgba(255,46,151,0.55)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(cx - capW, y, capW * 2, capH, capH * 0.45);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(cx - capW + capH * 0.5, flip ? y + capH - 2 : y + 1.5, capW * 2 - capH, 1);
    };
    plate(yTopCap - capH, false);
    plate(yBotCap, true);

    // Beschriftung (nur wenn Platz ist)
    const side = W / 2 - R * 1.3;
    if (side >= 70) {
      label(ctx, cx + capW + 10, yN - bh * 0.55, 'left', 'NOCH', `${num(r * 100, 3, 3)} %`, '#ffd23f', cx + wN(0.55) * bh + 4);
      label(ctx, cx - capW - 10, yN + bh * 0.55, 'right', 'GESCHAFFT', `${num((1 - r) * 100, 3, 3)} %`, '#ff5fa8', cx - wN(0.55) * bh - 4);
    }
  }

  function label(ctx: CanvasRenderingContext2D, x: number, y: number, align: 'left' | 'right', title: string, value: string, color: string, fromX: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(205,187,232,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.lineTo(x + (align === 'left' ? -4 : 4), y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = align;
    ctx.fillStyle = 'rgba(149,131,182,1)';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText(title, x, y - 6);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(value, x, y + 12);
    ctx.restore();
  }

  function drawSparkles(ctx: CanvasRenderingContext2D, cx: number, y0: number, R: number, h: number, top: boolean): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of sparkles) {
      if (s.top !== top) continue;
      const a = Math.pow(Math.max(0, Math.sin(time * s.speed + s.phase)), 12);
      if (a < 0.05) continue;
      const x = cx + s.x * R;
      const y = y0 + s.y * h;
      const len = 2.5 + a * 3;
      ctx.strokeStyle = `rgba(255,250,220,${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - len, y);
      ctx.lineTo(x + len, y);
      ctx.moveTo(x, y - len);
      ctx.lineTo(x, y + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Interaktion: Neigen und Schütteln ----------------------------------- */
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    canvas.style.transform = `perspective(900px) rotateY(${dx * 14}deg) rotateX(${-dy * 10}deg)`;
  });
  canvas.addEventListener('pointerleave', () => (canvas.style.transform = ''));
  canvas.addEventListener('click', () => {
    shake = 1;
    if (!geo.ok) return;
    for (let k = 0; k < 36; k++) {
      grains.push({ x: geo.cx + (Math.random() - 0.5) * 8, y: geo.apexY - 2, vx: (Math.random() - 0.5) * geo.bh * 1.6, vy: -geo.bh * (0.4 + Math.random() * 0.9), life: 0, max: 1.2, kind: 'splash', hue: (Math.random() * COLORS.length) | 0 });
    }
  });

  reset(1);
  return {
    el: canvas,
    setFraction(rem) {
      remaining = Math.max(0, Math.min(1, rem));
    },
    reset,
    step,
    draw,
  };
}
