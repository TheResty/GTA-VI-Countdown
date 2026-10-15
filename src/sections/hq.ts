/**
 * Bay 07 – Gamification-HQ: Daily Check-in, Serien, Respekt, Achievements,
 * Cheat-Terminal, Fahndungsstufe und Eskalationsplan.
 */
import { on } from '../core/bus';
import { fmtDate, fmtDateTime, humanDuration, num, plural } from '../core/format';
import {
  checkIn,
  checkedInToday,
  checkinDays,
  currentStreak,
  getCheckins,
  getProfile,
  getState,
  isUnlocked,
  respect,
  respectLevel,
  visitsToday,
  wantedLevel,
} from '../core/game';
import { TZ } from '../core/timeline';
import { civilAddDays, civilFromMs, civilKey } from '../core/tz';
import { ACHIEVEMENTS } from '../data/achievements';
import { bay } from '../ui/bay';
import { h, setText } from '../ui/dom';
import { icon } from '../ui/icons';
import { panel } from '../ui/panel';

/* ------------------------------------------------------------------ */
/* G-01 Daily Check-in                                                 */
/* ------------------------------------------------------------------ */
function checkinPanel(): HTMLElement {
  const btn = h<HTMLButtonElement>('button.checkin__btn', { type: 'button' });
  const streak = h('b.checkin__streak');
  const best = h('b');
  const total = h('b');
  const strip = h('div.checkin__strip', { role: 'img' });
  const comment = h('p.checkin__comment');

  const render = () => {
    const done = checkedInToday();
    btn.disabled = done;
    btn.replaceChildren(icon(done ? 'check' : 'radar', 22), h('span', done ? 'Heute eingecheckt' : 'Jetzt einchecken'));
    btn.classList.toggle('is-done', done);
    const st = currentStreak();
    setText(streak, num(st));
    setText(best, num(Math.max(getCheckins().best, st)));
    setText(total, num(getCheckins().days.length));
    const set = checkinDays();
    const today = civilFromMs(Date.now(), TZ);
    const cells: HTMLElement[] = [];
    for (let i = 34; i >= 0; i--) {
      const c = civilAddDays(today, -i);
      const k = civilKey(c);
      cells.push(h(`span.checkin__cell${set.has(k) ? '.is-on' : ''}${i === 0 ? '.is-today' : ''}`, { title: `${c.d}.${c.m}.${c.y}${set.has(k) ? ' – eingecheckt' : ''}` }));
    }
    strip.replaceChildren(...cells);
    strip.setAttribute('aria-label', `Check-ins der letzten 35 Tage: ${cells.filter((c) => c.classList.contains('is-on')).length}`);
    setText(
      comment,
      st === 0
        ? 'Noch keine Serie. Ein Klick, und du bist dabei.'
        : st < 3
          ? 'Guter Anfang. Morgen wieder? Die Palmen zählen auf dich.'
          : st < 7
            ? `${st} Tage am Stück. Das ist mehr Disziplin, als die meisten bei Hausaufgaben zeigen.`
            : st < 14
              ? `${st}-Tage-Serie. Rockstar sollte dich als Qualitätssicherung einstellen.`
              : `${st} Tage! Wenn Warten eine Sportart wäre, hättest du Kaderstatus.`,
    );
  };
  btn.addEventListener('click', () => {
    const r = checkIn();
    if (r.ok) render();
  });
  render();
  on('game-changed', render);
  setInterval(render, 60_000);

  return panel({
    id: 'checkin',
    code: 'G-01',
    title: 'Daily Check-in',
    kicker: 'Einmal pro Tag melden. Jede Serie bringt Respekt.',
    tone: 'mint',
    body: h(
      'div.checkin',
      btn,
      h('div.checkin__stats', h('div', h('span.checkin__streakline', h('span.flame', icon('flame', 20)), streak), h('small', 'Tage Serie')), h('div', best, h('small', 'Rekord')), h('div', total, h('small', 'Check-ins'))),
      h('p.subhead', 'Letzte 35 Tage'),
      strip,
      comment,
    ),
  });
}

/* ------------------------------------------------------------------ */
/* G-02 Respekt & Statistik                                            */
/* ------------------------------------------------------------------ */
function respectPanel(): HTMLElement {
  const level = h('b.respect__level');
  const title = h('span.respect__title');
  const fill = h('span.bar__fill');
  const points = h('span.respect__points');
  const stats = { visits: h('dd'), today: h('dd'), time: h('dd'), first: h('dd') };
  const render = () => {
    const p = respect();
    const lv = respectLevel(p);
    setText(level, `Level ${lv.level}`);
    setText(title, lv.title);
    fill.style.transform = `scaleX(${lv.progress})`;
    setText(points, `${num(p)} Respekt${lv.progress < 1 ? ` · nächstes Level bei ${num(lv.next)}` : ' · Maximum'}`);
    const pr = getProfile();
    setText(stats.visits, num(pr.visits));
    setText(stats.today, num(visitsToday()));
    setText(stats.time, humanDuration(pr.activeSeconds * 1000, 2));
    setText(stats.first, fmtDateTime(pr.firstVisit));
  };
  render();
  on('game-changed', render);
  on('achievement', render);
  setInterval(render, 15_000);
  return panel({
    id: 'respekt',
    code: 'G-02',
    title: 'Respekt',
    kicker: 'Wie in San Andreas: Respekt verdienst du dir durch Präsenz.',
    tone: 'sun',
    body: h(
      'div.respect',
      h('div.respect__head', level, title),
      h('span.bar.bar--thick', h('span.bar__track', fill)),
      points,
      h(
        'dl.kv',
        h('div', h('dt', 'Besuche insgesamt'), stats.visits),
        h('div', h('dt', 'Besuche heute'), stats.today),
        h('div', h('dt', 'Zeit im Command Center'), stats.time),
        h('div', h('dt', 'Erster Besuch'), stats.first),
      ),
    ),
    note: 'Respekt: Check-in = 5, Achievements je nach Schwierigkeit 10–150.',
  });
}

/* ------------------------------------------------------------------ */
/* G-03 Achievements                                                   */
/* ------------------------------------------------------------------ */
function achievementsPanel(): HTMLElement {
  const grid = h('div.ach-groups');
  const count = h('span.ach-count');
  const groups = Array.from(new Set(ACHIEVEMENTS.map((a) => a.group)));
  const openState = new Map<string, boolean>(groups.map((g, i) => [g, window.innerWidth >= 760 || i === 0]));
  const render = () => {
    const st = getState();
    let n = 0;
    grid.replaceChildren(
      ...groups.map((g) => {
        const list = ACHIEVEMENTS.filter((a) => a.group === g);
        const done = list.filter((a) => isUnlocked(a.id)).length;
        n += done;
        const det = h<HTMLDetailsElement>(
          'details.ach-group',
          { open: openState.get(g) },
          h('summary', h('span', g), h('span.ach-group__count', `${done} / ${list.length}`)),
          h(
            'ul.achievements',
            list.map((a) => {
              const un = isUnlocked(a.id);
              const hidden = a.secret && !un;
              return h(
                `li.ach${un ? '.is-unlocked' : ''}${hidden ? '.is-secret' : ''}`,
                h('span.ach__icon', icon(un ? a.icon : hidden ? 'lock' : a.icon, 22)),
                h('div.ach__text', h('b', hidden ? 'Geheimes Achievement' : a.title), h('span', hidden ? 'Wird verraten, sobald du es findest.' : a.description), un ? h('small', `${fmtDate(st.achievements[a.id], 'date')} · +${a.respect}`) : h('small', `+${a.respect} Respekt`)),
              );
            }),
          ),
        );
        det.addEventListener('toggle', () => openState.set(g, det.open));
        return det;
      }),
    );
    setText(count, `${n} / ${ACHIEVEMENTS.length}`);
  };
  render();
  on('achievement', render);
  return panel({
    id: 'achievements',
    code: 'G-03',
    title: 'Achievements',
    actions: count,
    kicker: 'Manche gibt es nur zu bestimmten Uhrzeiten, manche nur in bestimmten Phasen des Countdowns – und manche sind geheim.',
    tone: 'pink',
    span: 4,
    body: grid,
  });
}

/* ------------------------------------------------------------------ */
/* G-06 Besuchs-Log & Fahndung                                         */
/* ------------------------------------------------------------------ */
function visitLog(): HTMLElement {
  const days = h('div.vlog__bars.vlog__bars--days', { role: 'img' });
  const hours = h('div.vlog__bars.vlog__bars--hours', { role: 'img' });
  const wanted = h('div.wanted-box');
  const fav = h('p.vlog__fav');
  const render = () => {
    const pr = getProfile();
    const today = civilFromMs(Date.now(), TZ);
    const dayVals: { label: string; v: number; today: boolean }[] = [];
    for (let i = 20; i >= 0; i--) {
      const c = civilAddDays(today, -i);
      dayVals.push({ label: `${c.d}.${c.m}.`, v: pr.visitsByDay[civilKey(c)] ?? 0, today: i === 0 });
    }
    const maxD = Math.max(1, ...dayVals.map((d) => d.v));
    days.replaceChildren(
      ...dayVals.map((d) => h(`span.vlog__bar${d.today ? '.is-today' : ''}`, { style: { '--h': String(d.v / maxD) }, title: `${d.label}: ${d.v} Besuche` }, h('i'))),
    );
    days.setAttribute('aria-label', `Besuche der letzten 21 Tage: ${dayVals.reduce((a, b) => a + b.v, 0)}`);
    const hv = pr.visitsByHour ?? [];
    const maxH = Math.max(1, ...hv);
    hours.replaceChildren(...Array.from({ length: 24 }, (_, i) => h('span.vlog__bar', { style: { '--h': String((hv[i] ?? 0) / maxH) }, title: `${String(i).padStart(2, '0')} Uhr: ${hv[i] ?? 0} Besuche` }, h('i'))));
    hours.setAttribute('aria-label', 'Besuche nach Uhrzeit');
    const best = hv.indexOf(Math.max(...hv));
    setText(
      fav,
      hv.some((x) => x > 0)
        ? `Deine Lieblingszeit fürs Countdown-Checken: ${String(best).padStart(2, '0')}–${String((best + 1) % 24).padStart(2, '0')} Uhr.`
        : 'Noch keine Daten.',
    );
    const lvl = wantedLevel();
    wanted.replaceChildren(
      h('span.wanted-box__stars', Array.from({ length: 5 }, (_, i) => icon('star', 20, `icon star${i < lvl ? ' is-on' : ''}`))),
      h(
        'p',
        lvl === 0
          ? `Fahndungsstufe 0. Besuche heute: ${visitsToday()}. Ab 5 Besuchen am Tag wird die Polizei von Leonida aufmerksam.`
          : `Fahndungsstufe ${lvl}! ${plural(visitsToday(), 'Besuch', 'Besuche')} heute – das fällt auf. Um Mitternacht verliert die Polizei das Interesse.`,
      ),
    );
  };
  render();
  on('game-changed', render);
  setInterval(render, 60_000);
  return panel({
    id: 'besuche',
    code: 'G-06',
    title: 'Besuchs-Log & Fahndung',
    kicker: 'Wie oft du hier vorbeischaust – und ob die Polizei von Leonida das schon bemerkt hat.',
    tone: 'violet',
    span: 2,
    body: h(
      'div.vlog',
      h('p.subhead', 'Besuche pro Tag · letzte 21 Tage'),
      days,
      h('div.vlog__axis', h('span', 'vor 20 Tagen'), h('span', 'heute')),
      h('p.subhead', 'Besuche nach Uhrzeit'),
      hours,
      h('div.vlog__axis', h('span', '00'), h('span', '06'), h('span', '12'), h('span', '18'), h('span', '23')),
      fav,
      wanted,
    ),
    note: 'Gezählt werden Seitenaufrufe in diesem Browser.',
  });
}

export function hqSection(): HTMLElement {
  return bay({
    id: 'hq',
    index: 8,
    eyebrow: 'Gamification',
    script: 'Safehouse',
    title: 'HQ',
    tone: 'magenta',
    lead: 'Check-ins, Serien, Respekt und Achievements. Alles wird lokal in deinem Browser gespeichert – kein Konto nötig.',
    body: h('div.grid', checkinPanel(), respectPanel(), visitLog(), achievementsPanel()),
  });
}

