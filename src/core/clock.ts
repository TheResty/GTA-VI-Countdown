/**
 * Zentrale Uhr. Alle Module beziehen „jetzt“ ausschließlich von hier.
 * Unterstützt eine Simulation (Zeitmaschine) mit Versatz und Zeitraffer,
 * damit sich Eskalationsstufen und die Release-Feier vorab ansehen lassen.
 */

type FrameListener = (now: number) => void;
type SecondListener = (now: number) => void;

interface Simulation {
  anchorReal: number;
  anchorSim: number;
  speed: number;
}

class Clock {
  private sim: Simulation | null = null;
  private frameListeners = new Set<FrameListener>();
  private secondListeners = new Set<SecondListener>();
  private simListeners = new Set<() => void>();
  private lastSecond = -1;
  private running = false;

  now(): number {
    const real = Date.now();
    if (!this.sim) return real;
    return this.sim.anchorSim + (real - this.sim.anchorReal) * this.sim.speed;
  }

  get simulated(): boolean {
    return this.sim !== null;
  }

  get speed(): number {
    return this.sim?.speed ?? 1;
  }

  /** Springt zu einem simulierten Zeitpunkt (optional mit Zeitraffer). */
  simulate(targetMs: number, speed = 1): void {
    this.sim = { anchorReal: Date.now(), anchorSim: targetMs, speed };
    this.lastSecond = -1;
    this.emitSim();
    this.tick(true);
  }

  setSpeed(speed: number): void {
    const current = this.now();
    if (speed === 1 && this.sim && Math.abs(current - Date.now()) < 1000) {
      this.reset();
      return;
    }
    this.sim = { anchorReal: Date.now(), anchorSim: current, speed };
    this.emitSim();
  }

  reset(): void {
    this.sim = null;
    this.lastSecond = -1;
    this.emitSim();
    this.tick(true);
  }

  onFrame(fn: FrameListener): () => void {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  onSecond(fn: SecondListener): () => void {
    this.secondListeners.add(fn);
    return () => this.secondListeners.delete(fn);
  }

  onSimulationChange(fn: () => void): () => void {
    this.simListeners.add(fn);
    return () => this.simListeners.delete(fn);
  }

  private emitSim(): void {
    this.simListeners.forEach((fn) => fn());
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      this.tick(false);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // Fallback, falls requestAnimationFrame gedrosselt wird (Hintergrund-Tab):
    // so bleiben Sekunden-Ereignisse (z. B. Release-Erkennung) zuverlässig.
    setInterval(() => {
      if (document.hidden) this.tick(false, true);
    }, 1000);
  }

  private tick(force: boolean, secondsOnly = false): void {
    const now = this.now();
    if (!secondsOnly) this.frameListeners.forEach((fn) => fn(now));
    const sec = Math.floor(now / 1000);
    if (force || sec !== this.lastSecond) {
      this.lastSecond = sec;
      this.secondListeners.forEach((fn) => fn(now));
    }
  }
}

export const clock = new Clock();
