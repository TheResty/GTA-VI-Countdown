import { on } from '../core/bus';
import { h } from './dom';
import { icon } from './icons';

let stack: HTMLElement | null = null;

export function initToasts(): void {
  stack = h('div.toast-stack', { role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(stack);
  on('toast', (t) => showToast(t.title, t.text, t.tone, t.icon));
}

export function showToast(title: string, text?: string, tone: 'info' | 'good' | 'alert' | 'gold' = 'info', iconName = 'bolt'): void {
  if (!stack) return;
  const el = h(
    `div.toast.toast--${tone}`,
    h('span.toast__icon', icon(iconName, 22)),
    h('div.toast__body', h('strong.toast__title', title), text ? h('span.toast__text', text) : null),
  );
  stack.appendChild(el);
  while (stack.children.length > 4) stack.firstElementChild?.remove();
  requestAnimationFrame(() => el.classList.add('is-in'));
  const remove = () => {
    el.classList.remove('is-in');
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 450);
  };
  el.addEventListener('click', remove);
  setTimeout(remove, tone === 'gold' ? 6500 : 5000);
}
