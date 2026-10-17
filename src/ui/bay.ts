import { Child, h } from './dom';

export interface BayOptions {
  id: string;
  index: number;
  eyebrow: string;
  title: string;
  script?: string;
  lead?: Child;
  tone?: 'sunset' | 'ocean' | 'magenta' | 'night' | 'gold';
  /** Kleinerer Kopf und weniger Abstand */
  compact?: boolean;
  body: Child;
}

/** Ein „Bay“ ist ein Abschnitt des Command Centers mit eigenem Kopf und Raster. */
export function bay(o: BayOptions): HTMLElement {
  return h(
    `section.bay.bay--${o.tone ?? 'night'}${o.compact ? '.bay--compact' : ''}`,
    { id: o.id, 'aria-labelledby': `${o.id}-title` },
    h(
      'div.wrap',
      h(
        'header.bay__head',
        h('p.bay__eyebrow', h('span.bay__index', `Bay ${String(o.index).padStart(2, '0')}`), h('span', o.eyebrow)),
        h('h2.bay__title', { id: `${o.id}-title` }, o.script ? h('span.bay__script', o.script) : null, o.title),
        o.lead ? h('p.bay__lead', o.lead) : null,
      ),
      o.body,
    ),
  );
}
