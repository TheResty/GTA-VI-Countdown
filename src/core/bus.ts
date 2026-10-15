/** Kleiner, typisierter Event-Bus für modulübergreifende Ereignisse. */
import type { Phase } from './phases';
import type { Milestone } from './milestones';
import type { StartPoint } from './startpoint';

export interface BusEvents {
  phase: { phase: Phase; previous: Phase | null };
  milestone: { milestone: Milestone; live: boolean };
  achievement: { id: string };
  checkin: { day: string; streak: number };
  toast: { title: string; text?: string; tone?: 'info' | 'good' | 'alert' | 'gold'; icon?: string };
  'game-changed': void;
  'custom-countdowns': void;
  intel: void;
  celebrate: { replay: boolean };
  startpoint: StartPoint;
}

type Handler<T> = (payload: T) => void;

const handlers = new Map<keyof BusEvents, Set<Handler<unknown>>>();

export function on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event)!.add(fn as Handler<unknown>);
  return () => handlers.get(event)?.delete(fn as Handler<unknown>);
}

export function emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
  handlers.get(event)?.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error(`[bus] Fehler in Handler für ${String(event)}`, err);
    }
  });
}
