/**
 * Tagesbriefing im Hero: ein eigener Text für jeden der letzten 36 Tage,
 * stundengenau am letzten Tag. Vergangene Briefings lassen sich nachlesen,
 * kommende bleiben bis zu ihrem Tag gesperrt.
 */
import { clock } from '../core/clock';
import { DAY_TYPE_LABEL, calendarCounts, dayType, holidayOf, isSchoolDay, isWeekend } from '../core/calendar';
import { dative, humanDuration, num, pad, splitDuration } from '../core/format';
import { BRIEFING_DAYS, briefingAt, briefingDate, briefingForDay, nextBriefingAt } from '../core/intervals';
import { HOLIDAYS, PRELOAD, RELEASE, RELEASE_CIVIL, TZ } from '../core/timeline';
import { CivilDate, civilAddDays, civilCompare, civilDiff, civilEquals, civilFromMs, civilWeekday } from '../core/tz';
import { TYPE_COLOR } from '../modules/calendarViz';
import { h, setText } from '../ui/dom';
import { icon } from '../ui/icons';
import { bindTip } from '../ui/tooltip';

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** „Ferientag 3 von 14“, „Schultag 5 von 18“, „Wochenende 2 von 5“ */
function dayIndexLabel(today: CivilDate): string | null {
  const hol = HOLIDAYS.find((x) => civilCompare(today, x.start) >= 0 && civilCompare(today, x.end) <= 0);
  if (hol) return `Ferientag ${civilDiff(hol.start, today) + 1} von ${civilDiff(hol.start, hol.end) + 1}`;
  const first = briefingDate(BRIEFING_DAYS);
  const last = civilAddDays(RELEASE_CIVIL, -1);
  if (civilCompare(today, first) < 0 || civilCompare(today, last) > 0) return null;
  if (isSchoolDay(today)) {
    let idx = 0;
    let total = 0;
    for (let c = first; civilCompare(c, last) <= 0; c = civilAddDays(c, 1)) {
      if (!isSchoolDay(c)) continue;
      total++;
      if (civilCompare(c, today) <= 0) idx++;
    }
    return `Schultag ${idx} von ${total}`;
  }
  if (isWeekend(today)) {
    let idx = 0;
    let total = 0;
    for (let c = first; civilCompare(c, last) <= 0; c = civilAddDays(c, 1)) {
      if (civilWeekday(c) !== 6 && !(civilEquals(c, first) && civilWeekday(c) === 0)) continue;
      total++;
      if (civilCompare(c, today) <= 0 || (civilWeekday(today) === 0 && civilDiff(c, today) === 1)) idx++;
    }
    return `Wochenende ${Math.max(1, idx)} von ${total}`;
  }
  return null;
}

export function briefingCard(): { el: HTMLElement; update(now: number): void } {
  const tag = h('span.brief__tag');
  const next = h('span.brief__next');
  const back = h('button.brief__back', { type: 'button', hidden: true }, icon('reset', 14), 'Zurück zu heute');
  const title = h('h2.brief__title');
  const text = h('p.brief__text');
  const facts = h('ul.brief__facts');
  const strip = h('div.brief__strip', { role: 'list', 'aria-label': 'Briefings der letzten 36 Tage' });
  const stripNote = h('p.brief__note', 'Vergangene Briefings antippen zum Nachlesen – kommende bleiben geheim.');
  const el = h(
    'article.brief',
    { 'aria-live': 'polite' },
    h('header.brief__head', tag, h('span.brief__head-r', next, back)),
    title,
    text,
    facts,
    strip,
    stripNote,
  );

  let archive: number | null = null;
  let lastKey = '';
  let lastStripKey = '';

  back.addEventListener('click', () => {
    archive = null;
    lastKey = '';
  });

  function renderStrip(now: number) {
    // In der Zeitmaschine zählt für das Archiv die echte Zeit – kommende Briefings bleiben zu
    const today = civilFromMs(Math.min(now, Date.now()), TZ);
    const key = `${today.y}-${today.m}-${today.d}-${archive}`;
    if (key === lastStripKey) return;
    lastStripKey = key;
    const cells: HTMLElement[] = [];
    for (let d = BRIEFING_DAYS; d >= 1; d--) {
      const c = briefingDate(d);
      const cmp = civilCompare(c, today);
      const state = cmp < 0 ? 'past' : cmp === 0 ? 'today' : 'future';
      const type = dayType(c);
      const cell = h(
        `button.brief__cell.is-${state}${archive === d ? '.is-open' : ''}`,
        {
          type: 'button',
          role: 'listitem',
          disabled: state === 'future',
          style: { '--c': TYPE_COLOR[type] },
          'aria-label': `${WD[civilWeekday(c)]} ${c.d}.${c.m}. – ${state === 'future' ? 'gesperrt' : 'Briefing lesen'}`,
          onclick: () => {
            archive = state === 'today' ? null : d;
            lastKey = '';
            lastStripKey = '';
          },
        },
        state === 'future' ? icon('lock', 10) : h('span', String(c.d)),
      );
      bindTip(cell, () => ({
        title: `${WD[civilWeekday(c)]} ${c.d}.${c.m}. · ${DAY_TYPE_LABEL[type]}`,
        lines: [state === 'future' ? `Briefing ${BRIEFING_DAYS + 1 - d} – noch gesperrt` : state === 'today' ? 'Heutiges Briefing' : `Briefing ${BRIEFING_DAYS + 1 - d} nachlesen`],
      }));
      cells.push(cell);
    }
    strip.replaceChildren(...cells);
  }

  function update(now: number) {
    const diff = RELEASE - now;
    const view = archive !== null ? briefingForDay(archive) : briefingAt(now);
    const simDay = civilFromMs(now, TZ);
    const locked = archive === null && clock.simulated && civilCompare(simDay, civilFromMs(Date.now(), TZ)) > 0;
    const key = `${view.key}-${view.text}-${locked}`;
    if (key !== lastKey) {
      lastKey = key;
      if (locked) {
        setText(tag, `Zeitmaschine · ${view.tag}`);
        setText(title, 'Streng geheim');
        setText(
          text,
          `Dieses Briefing öffnet sich erst am ${WD[civilWeekday(simDay)]} ${simDay.d}.${simDay.m}. – in echter Zeit. Die Zeitmaschine zeigt dir die Inszenierung, die Texte bleiben eine Überraschung.`,
        );
      } else {
        setText(tag, archive !== null ? `Archiv · ${view.tag}` : view.tag);
        setText(title, view.title);
        setText(text, view.text);
      }
      el.classList.toggle('is-locked', locked);
      el.classList.toggle('is-archive', archive !== null);
      el.classList.toggle('is-final', view.d === 1 && archive === null);
    }
    back.hidden = archive === null;

    // Countdown bis zum nächsten Briefing
    const nb = nextBriefingAt(now);
    next.hidden = archive !== null || !nb;
    if (nb) {
      const p = splitDuration(nb - now);
      setText(next, `Nächstes Briefing in ${pad(p.hours + p.days * 24)}:${pad(p.minutes)}:${pad(p.seconds)}`);
    }

    // Fakten
    const today = civilFromMs(now, TZ);
    const cal = calendarCounts(now);
    const items: [string, string][] = [];
    const idx = dayIndexLabel(today);
    if (idx) items.push(['calendar', idx]);
    else if (holidayOf(today) === null && diff > 0) items.push(['calendar', DAY_TYPE_LABEL[dayType(today)]]);
    if (diff > 0) {
      items.push(['moon', `${num(cal.nights)}× schlafen`]);
      items.push(['book', `${num(cal.schoolDaysRemaining)} Schultage`]);
      items.push(['download', PRELOAD > now ? `Preload in ${dative(humanDuration(PRELOAD - now, 2))}` : 'Preload läuft']);
    }
    const factKey = items.map((i) => i[1]).join('|');
    if (facts.dataset.key !== factKey) {
      facts.dataset.key = factKey;
      facts.replaceChildren(...items.map(([ic, t]) => h('li.chip', icon(ic, 15), h('span', t))));
    }
    facts.hidden = diff <= 0;
    strip.hidden = diff <= 0 || civilDiff(today, RELEASE_CIVIL) > BRIEFING_DAYS;
    stripNote.hidden = strip.hidden;
    if (!strip.hidden) renderStrip(now);
  }

  return { el, update };
}
