/**
 * Einstellungs-Schublade: persönliche Daten, Standort, Darstellung, Reset.
 */
import { emit } from '../core/bus';
import { unlock } from '../core/game';
import { LOCATIONS, resetSettings, settings, updateSettings } from '../core/settings';
import { clearAll, storageAvailable } from '../core/store';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { refreshAll } from '../ui/panel';

export function initSettings(): () => void {
  const callsign = h<HTMLInputElement>('input.input#set-callsign', { type: 'text', maxLength: 24, autocomplete: 'nickname' });
  const birth = h<HTMLInputElement>('input.input#set-birth', { type: 'date', max: '2026-11-18' });
  const school = h<HTMLInputElement>('input.input#set-school', { type: 'date', max: '2026-11-18' });
  const loc = h<HTMLSelectElement>(
    'select.input#set-location',
    LOCATIONS.map((l) => h('option', { value: l.name }, l.name)),
  );
  const toggle3d = h<HTMLInputElement>('input#set-3d', { type: 'checkbox' });
  const toggleMotion = h<HTMLInputElement>('input#set-motion', { type: 'checkbox' });
  const resetBtn = h<HTMLButtonElement>('button.btn.btn--danger', { type: 'button' }, icon('trash', 18), 'Alle Daten löschen');
  const resetConfirm = h('div.confirm', { hidden: true });
  const storageInfo = h('p.drawer__info');

  const sync = () => {
    const s = settings();
    callsign.value = s.callsign;
    birth.value = s.birthDate ?? '';
    school.value = s.schoolStartDate ?? '';
    loc.value = LOCATIONS.some((l) => l.name === s.location.name) ? s.location.name : LOCATIONS[0].name;
    toggle3d.checked = s.enable3d;
    toggleMotion.checked = s.reduceMotion;
    storageInfo.textContent = storageAvailable()
      ? 'Alle Daten liegen ausschließlich in diesem Browser (localStorage). Kein Konto, kein Server.'
      : 'Der Browser-Speicher ist hier blockiert – Einstellungen gelten nur bis zum Neuladen.';
  };

  callsign.addEventListener('change', () => {
    updateSettings({ callsign: callsign.value.trim() || 'Spieler' });
    refreshAll();
  });
  birth.addEventListener('change', () => {
    updateSettings({ birthDate: birth.value || null });
    if (birth.value) unlock('configured');
    refreshAll();
  });
  school.addEventListener('change', () => {
    updateSettings({ schoolStartDate: school.value || null });
    refreshAll();
  });
  loc.addEventListener('change', () => {
    const l = LOCATIONS.find((x) => x.name === loc.value);
    if (l) updateSettings({ location: { ...l } });
    refreshAll();
  });
  toggle3d.addEventListener('change', () => updateSettings({ enable3d: toggle3d.checked }));
  toggleMotion.addEventListener('change', () => {
    updateSettings({ reduceMotion: toggleMotion.checked });
    document.documentElement.classList.toggle('reduce-motion', toggleMotion.checked);
  });

  resetBtn.addEventListener('click', () => {
    resetConfirm.hidden = false;
    resetConfirm.replaceChildren(
      h('p', 'Wirklich alles löschen? Check-ins, Serien, Achievements, eigene Countdowns und Einstellungen sind danach weg.'),
      h(
        'div.confirm__row',
        h('button.btn.btn--danger', {
          type: 'button',
          onclick: () => {
            clearAll();
            resetSettings();
            location.reload();
          },
        }, 'Ja, alles löschen'),
        h('button.btn.btn--ghost', { type: 'button', onclick: () => (resetConfirm.hidden = true) }, 'Abbrechen'),
      ),
    );
  });

  const closeBtn = h('button.drawer__close', { type: 'button', 'aria-label': 'Einstellungen schließen' }, icon('close', 20));
  const drawer = h(
    'aside.drawer',
    { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'drawer-title', hidden: true },
    h('div.drawer__backdrop'),
    h(
      'div.drawer__panel',
      h('header.drawer__head', h('h2#drawer-title', 'Einstellungen'), closeBtn),
      h(
        'div.drawer__body',
        h('section.drawer__group', h('h3', 'Persönlich'), h('label.field', h('span', 'Rufname'), callsign), h('label.field', h('span', 'Geburtsdatum'), birth), h('label.field', h('span', 'Einschulung'), school)),
        h('section.drawer__group', h('h3', 'Standort für Sonnenaufgänge'), h('label.field', h('span', 'Stadt'), loc)),
        h(
          'section.drawer__group',
          h('h3', 'Darstellung'),
          h('label.switch', toggle3d, h('span.switch__ui'), h('span', '3D-Szenen (Hero & Zeittunnel)')),
          h('label.switch', toggleMotion, h('span.switch__ui'), h('span', 'Bewegung reduzieren')),
        ),
        h(
          'section.drawer__group',
          h('h3', 'Annahmen'),
          h('p.drawer__info', 'Schlaf, Mahlzeiten, Training, Puls und Schulstunden stellst du direkt im Bereich „Persönlich“ ein.'),
          h('a.btn.btn--ghost', { href: '#mod-annahmen', onclick: () => close() }, icon('settings', 18), 'Zu den Annahmen'),
        ),
        h('section.drawer__group', h('h3', 'Daten'), storageInfo, resetBtn, resetConfirm),
      ),
    ),
  );
  document.body.appendChild(drawer);

  let lastFocus: HTMLElement | null = null;
  function open(): void {
    sync();
    lastFocus = document.activeElement as HTMLElement;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    callsign.focus({ preventScroll: true });
  }
  function close(): void {
    drawer.classList.remove('is-open');
    setTimeout(() => (drawer.hidden = true), 250);
    lastFocus?.focus?.({ preventScroll: true });
  }
  closeBtn.addEventListener('click', close);
  drawer.querySelector('.drawer__backdrop')!.addEventListener('click', close);
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  document.addEventListener('open-settings', open);
  emit('game-changed', undefined);
  return open;
}
