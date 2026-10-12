/**
 * Mini-DOM-Helfer: h('div.klasse#id', { attrs }, kinder…)
 */

export type Child = Node | string | number | null | undefined | false | Child[];

type Props = Record<string, unknown> & {
  class?: string;
  style?: string | Partial<CSSStyleDeclaration> | Record<string, string>;
  dataset?: Record<string, string>;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function parseTag(tag: string): { name: string; id?: string; classes: string[] } {
  const parts = tag.split(/(?=[.#])/);
  const name = parts.shift() || 'div';
  const classes: string[] = [];
  let id: string | undefined;
  for (const p of parts) {
    if (p.startsWith('.')) classes.push(p.slice(1));
    else if (p.startsWith('#')) id = p.slice(1);
  }
  return { name, id, classes };
}

function applyProps(el: Element, props: Props | undefined): void {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') {
      String(value)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((c) => el.classList.add(c));
    } else if (key === 'style') {
      if (typeof value === 'string') el.setAttribute('style', value);
      else Object.entries(value as Record<string, string>).forEach(([k, v]) => {
        if (k.startsWith('--')) (el as HTMLElement).style.setProperty(k, v);
        else ((el as HTMLElement).style as unknown as Record<string, string>)[k] = v;
      });
    } else if (key === 'dataset') {
      Object.entries(value as Record<string, string>).forEach(([k, v]) => ((el as HTMLElement).dataset[k] = v));
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'text') {
      el.textContent = String(value);
    } else if (key === 'html') {
      el.innerHTML = String(value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (key in el && !(el instanceof SVGElement) && key !== 'list' && key !== 'type') {
      (el as unknown as Record<string, unknown>)[key] = value;
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function h<T extends HTMLElement = HTMLElement>(tag: string, props?: Props | Child, ...children: Child[]): T {
  const { name, id, classes } = parseTag(tag);
  const el = document.createElement(name);
  if (id) el.id = id;
  classes.forEach((c) => el.classList.add(c));
  if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props)) {
    applyProps(el, props as Props);
  } else if (props !== undefined) {
    children.unshift(props as Child);
  }
  append(el, children);
  return el as T;
}

export function s<T extends SVGElement = SVGElement>(tag: string, props?: Props | Child, ...children: Child[]): T {
  const { name, id, classes } = parseTag(tag);
  const el = document.createElementNS(SVG_NS, name);
  if (id) el.setAttribute('id', id);
  classes.forEach((c) => el.classList.add(c));
  if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props)) {
    applyProps(el, props as Props);
  } else if (props !== undefined) {
    children.unshift(props as Child);
  }
  append(el, children);
  return el as T;
}

/** Setzt Text nur, wenn er sich geändert hat (spart Layout-Arbeit). */
export function setText(el: Element | null | undefined, value: string): void {
  if (el && el.textContent !== value) el.textContent = value;
}

export function setAttr(el: Element | null | undefined, name: string, value: string): void {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Beobachtet Sichtbarkeit eines Elements (für teure Animationen). */
export function watchVisibility(el: Element, cb: (visible: boolean) => void, rootMargin = '120px'): void {
  if (!('IntersectionObserver' in window)) {
    cb(true);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) cb(e.isIntersecting);
    },
    { rootMargin },
  );
  io.observe(el);
}

export function prefersReducedMotion(): boolean {
  return document.documentElement.classList.contains('reduce-motion');
}

/** Canvas auf Geräte-Pixeldichte skalieren. Gibt Kontext + CSS-Maße zurück. */
export function fitCanvas(canvas: HTMLCanvasElement, maxDpr = 2): { ctx: CanvasRenderingContext2D; w: number; h: number; dpr: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.round(rect.width));
  const hgt = Math.max(1, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: hgt, dpr };
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
