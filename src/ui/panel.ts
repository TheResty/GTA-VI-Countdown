import { clock } from '../core/clock';
import { Child, h, watchVisibility } from './dom';

export type Tone = 'pink' | 'cyan' | 'orange' | 'violet' | 'sun' | 'mint';

export interface PanelOptions {
  id: string;
  code: string;
  title: string;
  kicker?: string;
  span?: 1 | 2 | 3 | 4;
  tall?: boolean;
  tone?: Tone;
  note?: Child;
  body: Child;
  actions?: Child;
}

export function panel(o: PanelOptions): HTMLElement {
  return h(
    `article.panel.tone-${o.tone ?? 'pink'}.span-${o.span ?? 1}${o.tall ? '.tall' : ''}`,
    { id: `mod-${o.id}`, 'aria-labelledby': `mod-${o.id}-title` },
    h(
      'header.panel__head',
      h('span.panel__code', o.code),
      h('h3.panel__title', { id: `mod-${o.id}-title` }, o.title),
      o.actions ? h('div.panel__actions', o.actions) : null,
      h('span.panel__led', { 'aria-hidden': 'true' }),
    ),
    o.kicker ? h('p.panel__kicker', o.kicker) : null,
    h('div.panel__body', o.body),
    o.note ? h('footer.panel__note', o.note) : null,
  );
}

/* ------------------------------------------------------------------ */
/* Modul-Registry: Aktualisiert nur sichtbare Module                   */
/* ------------------------------------------------------------------ */

export interface ModuleInstance {
  el: HTMLElement;
  /** einmal pro Sekunde (nur wenn sichtbar) */
  second?(now: number): void;
  /** jeden Frame (nur wenn sichtbar) */
  frame?(now: number): void;
  /** Wird aufgerufen, wenn Einstellungen sich ändern */
  refresh?(now: number): void;
  /** Sichtbarkeit wechselt */
  visibility?(visible: boolean): void;
}

interface Entry {
  mod: ModuleInstance;
  visible: boolean;
}

const entries: Entry[] = [];
let wired = false;

function wire(): void {
  if (wired) return;
  wired = true;
  clock.onSecond((now) => {
    for (const e of entries) if (e.visible && e.mod.second) safe(() => e.mod.second!(now));
  });
  clock.onFrame((now) => {
    for (const e of entries) if (e.visible && e.mod.frame) safe(() => e.mod.frame!(now));
  });
}

function safe(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error('[modul]', err);
  }
}

export function registerModule(mod: ModuleInstance): ModuleInstance {
  wire();
  const entry: Entry = { mod, visible: false };
  entries.push(entry);
  // Erste Befüllung sofort, damit die Seite auch ohne Scrollen vollständig ist
  const paint = () => {
    const now = clock.now();
    safe(() => mod.second?.(now));
    safe(() => mod.frame?.(now));
  };
  paint();
  watchVisibility(mod.el, (visible) => {
    if (visible === entry.visible) return;
    entry.visible = visible;
    safe(() => mod.visibility?.(visible));
    if (visible) paint();
  });
  return mod;
}

export function refreshAll(): void {
  const now = clock.now();
  for (const e of entries) {
    safe(() => (e.mod.refresh ? e.mod.refresh(now) : e.mod.second?.(now)));
  }
}
