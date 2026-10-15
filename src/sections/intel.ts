/**
 * Bay 01 – Intel-Zentrale: Eilmeldung, Trailer-Rhythmus, kommende Termine,
 * News-Feed mit Spoiler-Schutz für Leaks, Newsflut-Barometer und eigene Meldungen.
 */
import { on } from '../core/bus';
import { clock } from '../core/clock';
import { fmtDate, humanDuration, num, pad, plural, relative, splitDuration } from '../core/format';
import { unlock } from '../core/game';
import {
  BREAKING_MS,
  FeedItem,
  NEWS_KIND_COLOR,
  NEWS_KIND_LABEL,
  addOwn,
  breaking,
  feed,
  isHttpUrl,
  lastSeen,
  latestOfficial,
  markSeen,
  removeOwn,
  setSpoilerShield,
  spoilerShield,
  unseenCount,
} from '../core/intel';
import { ANCHORS, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, civilAddDays, civilCompare, civilDiff, civilFromMs, civilWeekday, parseLocal, startOfCivilDay } from '../core/tz';
import { NEWS_UPDATED, NewsKind, UPCOMING } from '../data/news';
import { bay } from '../ui/bay';
import { h, setText, watchVisibility } from '../ui/dom';
import { icon } from '../ui/icons';
import { registerModule } from '../ui/panel';
import { bindTip } from '../ui/tooltip';

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
type Filter = 'all' | 'official' | 'leak' | 'own';

const dayKey = (ms: number) => {
  const c = civilFromMs(ms, TZ);
  return `${c.y}-${c.m}-${c.d}`;
};

/** Nav-Badge „Intel“ mit Zahl ungelesener Meldungen */
function updateNavBadge(now: number): void {
  const n = unseenCount(now);
  document.querySelectorAll<HTMLElement>('.hud__link[data-target="intel"]').forEach((a) => {
    if (n > 0) a.dataset.badge = String(n);
    else delete a.dataset.badge;
  });
}

export function intelSection(): HTMLElement {
  /* Eilmeldung ------------------------------------------------------ */
  const bLive = h('span.intel__live', h('span.dot'), 'Eilmeldung');
  const bKind = h('span.intel__kind');
  const bWhen = h('time.intel__when-top');
  const bTitle = h('h3.intel__title');
  const bAgo = h('p.intel__ago');
  const bText = h('p.intel__lead');
  const bFacts = h('ul.intel__facts');
  const bSrc = h('p.intel__src');
  const bCta = h('a.btn.btn--pink', { href: 'https://www.rockstargames.com/VI', target: '_blank', rel: 'noopener noreferrer' }, icon('play', 18), 'Bei Rockstar ansehen');
  const breakingCard = h('section.intel__breaking', h('header.intel__bhead', bLive, bKind, bWhen), bTitle, bAgo, bText, bFacts, h('div.intel__cta', bCta, bSrc));

  /* Trailer-Rhythmus ------------------------------------------------- */
  const trailers = [
    { label: 'Trailer 1', at: ANCHORS.trailer1 },
    { label: 'Trailer 2', at: ANCHORS.trailer2 },
    { label: 'Launch-Trailer', at: ANCHORS.launchTrailer },
    { label: 'Release', at: RELEASE },
  ];
  const gaps = trailers.slice(1).map((t, i) => ({ from: trailers[i], to: t, ms: t.at - trailers[i].at, days: civilDiff(civilFromMs(trailers[i].at, TZ), civilFromMs(t.at, TZ)) }));
  const maxGap = Math.max(...gaps.map((g) => g.ms));
  const gapLeft = h('span');
  const rhythm = h(
    'section.intel__card.intel__rhythm',
    h('h4.intel__h', icon('play', 16), 'Trailer-Rhythmus'),
    h(
      'ol.rhythm',
      gaps.map((g, i) => {
        const last = i === gaps.length - 1;
        const fill = h('span.rhythm__fill', { style: { width: `${(g.ms / maxGap) * 100}%` } });
        return h(
          `li.rhythm__row${last ? '.is-last' : ''}`,
          h('span.rhythm__label', `${g.from.label} → ${g.to.label}`),
          h('span.rhythm__track', fill),
          h('b.rhythm__val', last ? humanDuration(g.ms, 2) : `${num(g.days)} Tage`),
        );
      }),
    ),
    h(
      'p.intel__caption',
      `Zwischen den großen Trailern lagen fast exakt gleich viele Tage – ${num(gaps[0].days)} und ${num(gaps[1].days)}. Vom Launch-Trailer bis zum Release sind es nur ${gaps[2].days % 7 === 0 ? `genau ${['null', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs'][gaps[2].days / 7] ?? num(gaps[2].days / 7)} Wochen` : `${num(gaps[2].days)} Tage`}. `,
      gapLeft,
    ),
  );

  /* Demnächst -------------------------------------------------------- */
  const upItems = UPCOMING.map((u) => ({ ...u, ms: parseLocal(u.at, TZ), count: h('b.up__count') }));
  const upcoming = h(
    'section.intel__card.intel__up',
    h('h4.intel__h', icon('calendar', 16), 'Demnächst'),
    h(
      'ul.up',
      upItems.map((u) =>
        h(
          'li.up__item',
          h('div.up__date', h('b', fmtDate(u.ms, 'dateShort')), h('small', `${fmtDate(u.ms, 'time')} Uhr`)),
          h('div.up__body', h('span.up__title', u.title), h('small', u.note)),
          u.count,
        ),
      ),
    ),
  );

  /* Feed ------------------------------------------------------------- */
  let filter: Filter = 'all';
  const revealed = new Set<string>();
  const sessionSeen = lastSeen();
  const seg = h(
    'div.seg.seg--small',
    { role: 'tablist', 'aria-label': 'Meldungen filtern' },
    (
      [
        ['all', 'Alle'],
        ['official', 'Offiziell'],
        ['leak', 'Leaks'],
        ['own', 'Eigene'],
      ] as [Filter, string][]
    ).map(([k, l]) =>
      h(
        'button.seg__btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(k === filter),
          dataset: { f: k },
          onclick: () => {
            filter = k;
            seg.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f === k)));
            renderFeed(clock.now());
          },
        },
        l,
      ),
    ),
  );
  const shieldBtn = h<HTMLButtonElement>('button.chip-btn.intel__shield', { type: 'button' });
  shieldBtn.addEventListener('click', () => setSpoilerShield(!spoilerShield()));
  const pulse = h('div.pulse', { role: 'img' });
  const pulseStats = h('p.pulse__stats');
  const list = h('ol.intel__feed');
  const feedWrap = h(
    'section.intel__card.intel__feedwrap',
    h('header.intel__feedhead', h('h4.intel__h', icon('radar', 16), 'Meldungen'), h('div.intel__tools', seg, shieldBtn)),
    h('div.pulse__wrap', h('span.pulse__label', 'Newsflut-Barometer'), pulse, pulseStats),
    list,
    h(
      'p.intel__note',
      `Kuratiert bis ${fmtDate(parseLocal(NEWS_UPDATED, TZ), 'date')}, ${fmtDate(parseLocal(NEWS_UPDATED, TZ), 'time')} Uhr. Leaks sind unbestätigt – angebliche „Build-Downloads“ sind laut Berichten oft Schadsoftware. Finger weg.`,
    ),
  );

  function itemEl(n: FeedItem, now: number): HTMLElement {
    const hidden = n.spoiler && spoilerShield() && !revealed.has(n.id);
    const isNew = !n.own && n.at > sessionSeen;
    const c = civilFromMs(n.at, TZ);
    const body = h('div.intel__text', h('p', n.text));
    const textBox = hidden
      ? h(
          'div.intel__spoiler',
          body,
          h(
            'button.intel__reveal',
            {
              type: 'button',
              onclick: () => {
                revealed.add(n.id);
                unlock('spoiler_peek');
                renderFeed(clock.now());
              },
            },
            icon('eye', 16),
            'Spoiler aufdecken',
          ),
        )
      : body;
    return h(
      `li.intel__item.kind-${n.kind}${isNew ? '.is-new' : ''}${n.own ? '.is-own' : ''}`,
      { style: { '--c': n.own ? '#ff2e97' : NEWS_KIND_COLOR[n.kind] } },
      h(
        'div.intel__date',
        h('b', `${c.d}.${c.m}.`),
        h('small', WD[civilWeekday(c)]),
        n.timed ? h('small', fmtDate(n.at, 'time')) : n.approx ? h('small', { title: 'Datum ungefähr' }, 'ca.') : null,
      ),
      h(
        'div.intel__ibody',
        h(
          'div.intel__meta',
          h('span.intel__chip', n.own ? `Eigene · ${NEWS_KIND_LABEL[n.kind]}` : NEWS_KIND_LABEL[n.kind]),
          isNew ? h('span.intel__new', 'Neu') : null,
          h('span.intel__rel', relative(n.at, now)),
        ),
        h('h5.intel__ititle', n.title),
        n.text ? textBox : null,
        n.facts.length ? h('ul.intel__facts.intel__facts--small', n.facts.map((f) => h('li', f))) : null,
        n.sources.length
          ? h(
              'p.intel__src',
              n.own ? null : 'Quellen: ',
              ...n.sources.flatMap((s, i) => [i ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer nofollow' }, s.label)]),
            )
          : null,
        n.own
          ? h(
              'button.intel__del',
              { type: 'button', 'aria-label': `Meldung „${n.title}“ löschen`, onclick: () => removeOwn(n.id) },
              icon('trash', 14),
              'Löschen',
            )
          : null,
      ),
    );
  }

  function renderFeed(now: number) {
    const all = feed(now);
    const items = all.filter((n) =>
      filter === 'all' ? true : filter === 'official' ? !n.own && (n.kind === 'official' || n.kind === 'trailer') : filter === 'leak' ? n.kind === 'leak' : n.own,
    );
    list.replaceChildren(
      ...(items.length
        ? items.map((n) => itemEl(n, now))
        : [h('li.intel__empty', filter === 'own' ? 'Noch keine eigenen Meldungen. Unten kannst du die erste erfassen.' : 'Keine Meldungen in dieser Ansicht.')]),
    );
    shieldBtn.setAttribute('aria-pressed', String(spoilerShield()));
    shieldBtn.replaceChildren(icon(spoilerShield() ? 'lock' : 'eye', 14), spoilerShield() ? 'Spoiler-Schutz an' : 'Spoiler-Schutz aus');
    renderPulse(now, all);
  }

  /* Newsflut-Barometer: jeder Tag seit August bis zum Release */
  const pulseStart = { y: 2026, m: 8, d: 1 };
  function renderPulse(now: number, all: FeedItem[]) {
    const counts = new Map<string, FeedItem[]>();
    for (const n of all) {
      const k = dayKey(n.at);
      counts.set(k, [...(counts.get(k) ?? []), n]);
    }
    const today = civilFromMs(now, TZ);
    const releaseDay = civilFromMs(RELEASE, TZ);
    const cells: HTMLElement[] = [];
    let newsDays = 0;
    let streak = 0;
    let streakOpen = true;
    for (let c = today; civilCompare(c, pulseStart) >= 0 && streakOpen; c = civilAddDays(c, -1)) {
      if (counts.has(`${c.y}-${c.m}-${c.d}`)) streak++;
      else if (civilCompare(c, today) < 0) streakOpen = false;
    }
    for (let c = pulseStart; civilCompare(c, releaseDay) <= 0; c = civilAddDays(c, 1)) {
      const k = `${c.y}-${c.m}-${c.d}`;
      const items = counts.get(k) ?? [];
      const cmp = civilCompare(c, today);
      if (items.length) newsDays++;
      const level = Math.min(3, items.length);
      const isRelease = civilCompare(c, releaseDay) === 0;
      const cell = h(`span.pulse__cell.l${level}${cmp === 0 ? '.is-today' : cmp > 0 ? '.is-future' : ''}${isRelease ? '.is-release' : ''}${c.d === 1 ? '.is-month' : ''}`, {
        style: items.length ? { '--c': items.some((i) => i.kind === 'trailer') ? '#19f0ff' : items.some((i) => i.kind === 'leak') ? '#9b6bff' : '#ffd23f' } : {},
      });
      bindTip(cell, () => ({
        title: `${WD[civilWeekday(c)]} ${c.d}.${c.m}.${isRelease ? ' · Release' : ''}`,
        lines: items.length ? items.map((i) => `${i.own ? 'Eigene: ' : ''}${i.title}`) : [cmp > 0 ? 'Noch offen' : 'Keine Meldung'],
      }));
      cells.push(cell);
    }
    pulse.replaceChildren(...cells);
    pulse.setAttribute('aria-label', `Meldungen pro Tag seit 1. August: ${newsDays} Tage mit Meldungen`);
    const daysLeft = Math.max(0, Math.round((startOfCivilDay(releaseDay, TZ) - startOfCivilDay(today, TZ)) / DAY_MS));
    setText(
      pulseStats,
      `${plural(all.filter((n) => n.at >= startOfCivilDay(pulseStart, TZ)).length, 'Meldung', 'Meldungen')} an ${plural(newsDays, 'Tag', 'Tagen')} · ${streak > 1 ? `Serie: ${streak} Tage am Stück` : streak === 1 ? 'Heute gab es News' : 'Heute noch nichts – trag es selbst ein'} · noch ${plural(daysLeft, 'Tag', 'Tage')} zu füllen`,
    );
  }

  /* Eigene Meldung ---------------------------------------------------- */
  const fTitle = h<HTMLInputElement>('input.input#intel-f-title', { type: 'text', maxLength: 120, required: true, placeholder: 'z. B. Neue Screenshots auf der Website' });
  const fKind = h<HTMLSelectElement>(
    'select.input#intel-f-kind',
    (Object.keys(NEWS_KIND_LABEL) as NewsKind[]).map((k) => h('option', { value: k }, NEWS_KIND_LABEL[k])),
  );
  fKind.value = 'official';
  const fAt = h<HTMLInputElement>('input.input#intel-f-at', { type: 'datetime-local' });
  const fUrl = h<HTMLInputElement>('input.input#intel-f-url', { type: 'url', placeholder: 'https://…', maxLength: 400 });
  const fText = h<HTMLTextAreaElement>('textarea.input#intel-f-text', { rows: 3, maxLength: 400, placeholder: 'Was genau ist passiert? (optional)' });
  const fErr = h('p.form-error', { hidden: true });
  const toLocalInput = (ms: number) => {
    const p = civilFromMs(ms, TZ);
    return `${p.y}-${pad(p.m)}-${pad(p.d)}T${fmtDate(ms, 'time')}`;
  };
  const form = h<HTMLFormElement>(
    'form.intel__form',
    h('label.field.intel__f-title', h('span', 'Schlagzeile'), fTitle),
    h('label.field', h('span', 'Art'), fKind),
    h('label.field', h('span', 'Zeitpunkt (deutsche Zeit)'), fAt),
    h('label.field.intel__f-url', h('span', 'Link (optional)'), fUrl),
    h('label.field.intel__f-text', h('span', 'Notiz (optional)'), fText),
    h('div.intel__f-actions', h('button.btn.btn--pink', { type: 'submit' }, icon('plus', 18), 'Meldung speichern'), fErr),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = fTitle.value.trim();
    const url = fUrl.value.trim();
    const fail = (msg: string) => {
      fErr.hidden = false;
      fErr.textContent = msg;
    };
    if (!title) return fail('Bitte eine Schlagzeile eintragen.');
    if (url && !isHttpUrl(url)) return fail('Der Link muss mit http:// oder https:// beginnen.');
    let at = clock.now();
    if (fAt.value) {
      try {
        at = parseLocal(fAt.value, TZ);
      } catch {
        return fail('Der Zeitpunkt konnte nicht gelesen werden.');
      }
    }
    if (at > clock.now() + 60_000) return fail('Meldungen aus der Zukunft gibt es erst nach dem Release.');
    fErr.hidden = true;
    addOwn({ at, kind: fKind.value as NewsKind, title, text: fText.value.trim(), url: url || undefined });
    unlock('intel_reporter');
    form.reset();
    fKind.value = 'official';
    fAt.value = toLocalInput(clock.now());
    filter = 'all';
    seg.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f === 'all')));
  });
  fAt.value = toLocalInput(clock.now());
  const addCard = h(
    'section.intel__card.intel__add',
    h('h4.intel__h', icon('plus', 16), 'Eigene Meldung erfassen'),
    h('p.intel__caption', 'Ab jetzt kommt quasi täglich was Neues. Halte es hier fest – gespeichert nur in deinem Browser, sichtbar im Feed und im Barometer.'),
    form,
  );

  const feature = h(
    'article.feature.feature--intel#mod-intel',
    h('div.intel__col.intel__col--main', breakingCard, feedWrap),
    h('div.intel__col.intel__col--side', rhythm, upcoming, addCard),
  );

  /* Logik ------------------------------------------------------------ */
  let lastBreakId = '';
  function renderBreaking(now: number) {
    const n = latestOfficial(now);
    if (!n) return;
    const isBreaking = now - n.at < BREAKING_MS;
    if (n.id + isBreaking !== lastBreakId) {
      lastBreakId = n.id + isBreaking;
      breakingCard.classList.toggle('is-breaking', isBreaking);
      bLive.replaceChildren(h('span.dot'), isBreaking ? 'Eilmeldung' : 'Letzte offizielle Meldung');
      setText(bKind, NEWS_KIND_LABEL[n.kind]);
      setText(bWhen, `${fmtDate(n.at, 'weekdayShort')} ${fmtDate(n.at, 'dateShort')}, ${fmtDate(n.at, 'time')} Uhr`);
      setText(bTitle, n.title);
      setText(bText, n.text);
      bFacts.replaceChildren(...n.facts.map((f) => h('li.chip', f)));
      bFacts.hidden = !n.facts.length;
      bSrc.replaceChildren('Quellen: ', ...n.sources.flatMap((s, i) => [i ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer nofollow' }, s.label)]));
    }
    const left = RELEASE - n.at;
    setText(bAgo, `vor ${humanDuration(now - n.at, 3)} · erschienen ${humanDuration(left, 2)} vor dem Release`);
  }

  let seenTimer = 0;
  watchVisibility(
    feedWrap,
    (v) => {
      window.clearTimeout(seenTimer);
      if (v) seenTimer = window.setTimeout(() => markSeen(clock.now()), 4000);
    },
    '0px',
  );

  on('intel', () => {
    renderFeed(clock.now());
    updateNavBadge(clock.now());
  });

  let lastMinute = -1;
  registerModule({
    el: feature,
    second(now) {
      renderBreaking(now);
      for (const u of upItems) {
        const d = u.ms - now;
        if (d <= 0) setText(u.count, u.id === 'release' ? 'Jetzt!' : 'läuft');
        else {
          const p = splitDuration(d);
          setText(u.count, `${p.days ? `${p.days} T ` : ''}${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`);
        }
      }
      const toRelease = RELEASE - now;
      setText(gapLeft, toRelease > 0 ? `Davon sind noch ${humanDuration(toRelease, 2)} übrig.` : 'Und jetzt ist es da.');
      const m = Math.floor(now / 60_000);
      if (m !== lastMinute) {
        lastMinute = m;
        renderFeed(now);
        updateNavBadge(now);
      }
    },
    refresh(now) {
      lastBreakId = '';
      renderBreaking(now);
      renderFeed(now);
    },
  });
  // Badge auch ohne sichtbare Sektion setzen
  window.setTimeout(() => updateNavBadge(clock.now()), 0);

  const b = breaking(clock.now());
  return bay({
    id: 'intel',
    index: 1,
    eyebrow: 'Intel · News-Radar',
    script: 'Breaking',
    title: 'Intel-Zentrale',
    tone: 'ocean',
    lead: b
      ? `${b.title} (${relative(b.at, clock.now())}). Ab jetzt kommt quasi täglich etwas Neues: offizielle Meldungen, Leaks mit Spoiler-Schutz und deine eigenen Einträge, alles an einem Ort.`
      : 'Offizielle Meldungen, Leaks mit Spoiler-Schutz und deine eigenen Einträge – alles, was bis zum Release über GTA VI bekannt wird, an einem Ort.',
    body: feature,
  });
}
