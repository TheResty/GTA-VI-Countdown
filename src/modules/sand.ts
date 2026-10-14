/**
 * Physikalische Sanduhr: Zellulärer Sand rieselt Korn für Korn durch den Hals.
 * Die Sandmenge oben entspricht exakt dem Anteil der verbleibenden Wartezeit seit
 * dem Startpunkt. Damit der Strom nie abreißt, wird gefallener Sand unsichtbar nach
 * oben zurückgelegt, solange unten mehr liegt, als es der Fortschritt erlaubt.
 */

const GW = 72;
const GH = 128;
const MID = GH / 2;
const PALETTE = [
  [255, 210, 63],
  [255, 176, 72],
  [255, 138, 61],
  [255, 96, 110],
  [255, 46, 151],
  [255, 120, 190],
];

export interface SandGlass {
  el: HTMLCanvasElement;
  setFraction(remaining: number): void;
  reset(remaining: number): void;
  step(): void;
  draw(): void;
}

export function createSandGlass(): SandGlass {
  const canvas = document.createElement('canvas');
  canvas.className = 'sand';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Sanduhr der Wartezeit');
  const ctx = canvas.getContext('2d')!;
  const off = document.createElement('canvas');
  off.width = GW;
  off.height = GH;
  const octx = off.getContext('2d')!;
  const img = octx.createImageData(GW, GH);

  // Form der Sanduhr: halbe Breite je Zeile
  const half = new Float32Array(GH);
  for (let y = 0; y < GH; y++) {
    const t = Math.abs(y + 0.5 - MID) / (MID - 3);
    if (t > 1) {
      half[y] = 0;
      continue;
    }
    const bulb = Math.pow(Math.sin(Math.min(1, t * 1.08) * Math.PI * 0.5), 0.9);
    half[y] = 0.9 + (GW / 2 - 3) * bulb;
  }
  const inside = (x: number, y: number) => y >= 0 && y < GH && Math.abs(x + 0.5 - GW / 2) <= half[y];

  const grid = new Uint8Array(GW * GH); // 0 = leer, sonst Farbindex + 1
  let capacityTop = 0;
  for (let y = 0; y < MID; y++) for (let x = 0; x < GW; x++) if (inside(x, y)) capacityTop++;
  const TOTAL = Math.floor(capacityTop * 0.72);
  let remaining = 1;
  let colorCursor = 0;

  const idx = (x: number, y: number) => y * GW + x;

  function fillRegion(count: number, fromY: number, toY: number, dir: 1 | -1): void {
    // Füllt Zellen zeilenweise von unten (bzw. vom Hals her) auf
    let placed = 0;
    for (let y = fromY; dir > 0 ? y < toY : y > toY; y += dir) {
      for (let x = 0; x < GW && placed < count; x++) {
        if (inside(x, y) && !grid[idx(x, y)]) {
          grid[idx(x, y)] = 1 + (Math.floor((y / GH) * PALETTE.length * 2 + Math.random() * 1.5) % PALETTE.length);
          placed++;
        }
      }
      if (placed >= count) break;
    }
  }

  function reset(rem: number): void {
    remaining = rem;
    grid.fill(0);
    const top = Math.round(TOTAL * rem);
    fillRegion(TOTAL - top, GH - 1, MID, -1);
    // oben: von der Hals-Seite aus nach oben füllen
    fillRegion(top, MID - 1, -1, -1);
  }

  function countBottom(): number {
    let n = 0;
    for (let i = MID * GW; i < grid.length; i++) if (grid[i]) n++;
    return n;
  }

  function step(): void {
    // Von unten nach oben, Richtung pro Zeile abwechselnd
    for (let y = GH - 2; y >= 0; y--) {
      const ltr = (y & 1) === 0;
      for (let k = 0; k < GW; k++) {
        const x = ltr ? k : GW - 1 - k;
        const i = idx(x, y);
        const g = grid[i];
        if (!g) continue;
        const below = idx(x, y + 1);
        if (inside(x, y + 1) && !grid[below]) {
          grid[below] = g;
          grid[i] = 0;
          continue;
        }
        const d = Math.random() < 0.5 ? -1 : 1;
        let moved = false;
        for (const dx of [d, -d]) {
          const nx = x + dx;
          if (nx >= 0 && nx < GW && inside(nx, y + 1) && !grid[idx(nx, y + 1)] && !grid[idx(nx, y)]) {
            grid[idx(nx, y + 1)] = g;
            grid[i] = 0;
            moved = true;
            break;
          }
        }
        // Liegt das Korn direkt auf dem Glas (steile Wand am Hals), rutscht es zur Mitte
        if (!moved && y < MID && !inside(x, y + 1)) {
          const nx = x + (x + 0.5 < GW / 2 ? 1 : -1);
          if (inside(nx, y) && !grid[idx(nx, y)]) {
            grid[idx(nx, y)] = g;
            grid[i] = 0;
          }
        }
      }
    }
    // Gleichgewicht: unten darf nur so viel liegen, wie Zeit vergangen ist
    const target = TOTAL - Math.round(TOTAL * remaining);
    let excess = countBottom() - target;
    for (let n = 0; n < 4 && excess > 0; n++, excess--) {
      // ein ruhendes Korn von der Oberfläche unten entfernen …
      for (let tries = 0; tries < 30; tries++) {
        const x = Math.floor(Math.random() * GW);
        let y = MID + 2;
        while (y < GH && !grid[idx(x, y)]) y++;
        if (y >= GH - 1 || y <= MID + 2) continue;
        if (!grid[idx(x, y + 1)] && inside(x, y + 1)) continue;
        grid[idx(x, y)] = 0;
        break;
      }
      // … und oben auf die Oberfläche legen
      for (let tries = 0; tries < 30; tries++) {
        const x = Math.floor(GW / 2 + (Math.random() - 0.5) * GW * 0.8);
        let y = 0;
        while (y < MID - 1 && (!inside(x, y) || !grid[idx(x, y)])) y++;
        const ty = y - 1;
        if (ty < 0 || !inside(x, ty) || grid[idx(x, ty)]) continue;
        colorCursor = (colorCursor + 1) % (PALETTE.length * 40);
        grid[idx(x, ty)] = 1 + Math.floor(colorCursor / 40);
        break;
      }
    }
  }

  function draw(): void {
    const data = img.data;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const i = idx(x, y);
        const o = i * 4;
        const g = grid[i];
        if (g) {
          const c = PALETTE[g - 1];
          const shade = 0.85 + ((x * 7 + y * 13) % 5) * 0.04;
          data[o] = c[0] * shade;
          data[o + 1] = c[1] * shade;
          data[o + 2] = c[2] * shade;
          data[o + 3] = 255;
        } else if (inside(x, y)) {
          data[o] = 40;
          data[o + 1] = 16;
          data[o + 2] = 70;
          data[o + 3] = 60;
        } else data[o + 3] = 0;
      }
    }
    octx.putImageData(img, 0, 0);

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(10, rect.width);
    const hgt = Math.max(10, rect.height);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const scale = Math.min((w - 20) / GW, (hgt - 20) / GH);
    const ox = (w - GW * scale) / 2;
    const oy = (hgt - GH * scale) / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.shadowColor = 'rgba(255,138,61,0.55)';
    ctx.shadowBlur = 18;
    ctx.drawImage(off, ox, oy, GW * scale, GH * scale);
    ctx.shadowBlur = 0;
    // Glas
    ctx.strokeStyle = 'rgba(245,236,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = 0; y <= GH; y++) {
      const hw = half[Math.min(GH - 1, y)];
      const px = ox + (GW / 2 + hw + 0.6) * scale;
      const py = oy + y * scale;
      if (y === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.moveTo(ox + (GW / 2 - half[0] - 0.6) * scale, oy);
    for (let y = 0; y <= GH; y++) {
      const hw = half[Math.min(GH - 1, y)];
      ctx.lineTo(ox + (GW / 2 - hw - 0.6) * scale, oy + y * scale);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(245,236,255,0.85)';
    ctx.fillRect(ox - 6, oy - 4, GW * scale + 12, 4);
    ctx.fillRect(ox - 6, oy + GH * scale, GW * scale + 12, 4);
  }

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
