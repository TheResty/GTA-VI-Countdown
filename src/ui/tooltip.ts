/** Ein globaler Tooltip für Diagramme (Maus, Touch und Tastaturfokus). */
import { h } from './dom';

let tip: HTMLElement | null = null;

function ensure(): HTMLElement {
  if (!tip) {
    tip = h('div.tooltip', { role: 'tooltip', hidden: true });
    document.body.appendChild(tip);
  }
  return tip;
}

export function showTip(x: number, y: number, title: string, lines: string[] = []): void {
  const t = ensure();
  t.replaceChildren(h('strong', title), ...lines.map((l) => h('span', l)));
  t.hidden = false;
  const pad = 12;
  const r = t.getBoundingClientRect();
  let left = x + pad;
  let top = y + pad;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
  if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
  t.style.left = `${Math.max(8, left)}px`;
  t.style.top = `${Math.max(8, top)}px`;
}

export function hideTip(): void {
  if (tip) tip.hidden = true;
}

/** Verbindet ein Element mit dem Tooltip (Hover, Fokus, Tippen). */
export function bindTip(el: Element, content: () => { title: string; lines?: string[] }): void {
  const show = (x: number, y: number) => {
    const c = content();
    showTip(x, y, c.title, c.lines);
  };
  el.addEventListener('pointerenter', (e) => show((e as PointerEvent).clientX, (e as PointerEvent).clientY));
  el.addEventListener('pointermove', (e) => show((e as PointerEvent).clientX, (e as PointerEvent).clientY));
  el.addEventListener('pointerleave', hideTip);
  el.addEventListener('focus', () => {
    const r = el.getBoundingClientRect();
    show(r.left + r.width / 2, r.top);
  });
  el.addEventListener('blur', hideTip);
}

window.addEventListener('scroll', hideTip, { passive: true });
