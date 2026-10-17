/**
 * Bay 01 – Intel-Zentrale: kompakte Lage zu GTA VI.
 * Top-Meldung, Termine mit Live-Countdown, Trailer-Rhythmus und ein einklappbarer
 * Feed mit Spoiler-Schutz für Leaks.
 */
import { on } from '../core/bus';
import { clock } from '../core/clock';
import { dative, fmtDate, humanDuration, num, pad, relative, splitDuration } from '../core/format';
import { unlock } from '../core/game';
import { BREAKING_MS, FeedItem, NEWS_KIND_COLOR, NEWS_KIND_LABEL, feed, lastSeen, latestOfficial, markSeen, setSpoilerShield, spoilerShield, unseenCount } from '../core/intel';
import { ANCHORS, RELEASE, TZ } from '../core/timeline';
import { civilDiff, civilFromMs, civilWeekday, parseLocal } from '../core/tz';
import { NEWS_UPDATED, UPCOMING } from '../data/news';
import { bay } from '../ui/bay';
import { h, setText, watchVisibility } from '../ui/dom';
import { icon } from '../ui/icons';
import { registerModule } from '../ui/panel';

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const COLLAPSED = 4;
type Filter = 'all' | 'official' | 'leak';

/** Nav-Badge „Intel“ mit Zahl ungelesener Meldungen */
function updateNavBadge(now: number): void {
  const n = unseenCount(now);
  document.querySelectorAll<HTMLElement>('.hud__link[data-target="intel"]').forEach((a) => {
    if (n > 0) a.dataset.badge = String(n);
    else delete a.dataset.badge;
  });
}

const sourceLinks = (n: FeedItem) =>
  n.sources.flatMap((s, i) => [i ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer nofollow' }, s.label)]);

export function intelSection(): HTMLElement {
  /* Top-Meldung ------------------------------------------------------- */
  const bTag = h('span.intel__live');
  const bWhen = h('time.intel__when');
  const bTitle = h('h3.intel__title');
  const bAgo = h('p.intel__ago');
  const bText = h('p.intel__lead');
  const bFacts = h('ul.intel__facts');
  const bSrc = h('p.intel__src');
  const bCta = h('a.btn.btn--pink.intel__cta', { href: 'https://www.rockstargames.com/VI', target: '_blank', rel: 'noopener noreferrer' }, icon('play', 16), 'Ansehen');
  const top = h('section.intel__top', h('header.intel__bhead', bTag, bWhen), bTitle, bAgo, bText, bFacts, h('footer.intel__bfoot', bCta, bSrc));

  /* Termine ----------------------------------------------------------- */
  const upItems = UPCOMING.map((u) => ({ ...u, ms: parseLocal(u.at, TZ), count: h('b.up__count') }));
  const upcoming = h(
    'section.intel__box',
    h('h4.intel__h', icon('calendar', 14), 'Termine'),
    h(
      'ul.up',
      upItems.map((u) =>
        h('li.up__item', { title: `${u.title} – ${u.note}` }, h('span.up__date', fmtDate(u.ms, 'dateShort'), h('span.up__time', ` · ${fmtDate(u.ms, 'time')}`)), h('span.up__title', u.title), u.count),
      ),
    ),
  );

  /* Trailer-Rhythmus -------------------------------------------------- */
  const marks = [
    { label: 'Trailer 1', at: ANCHORS.trailer1 },
    { label: 'Trailer 2', at: ANCHORS.trailer2 },
    { label: 'Launch', at: ANCHORS.launchTrailer },
    { label: 'Release', at: RELEASE },
  ];
  const gaps = marks.slice(1).map((m, i) => ({ label: `${marks[i].label} → ${m.label}`, days: civilDiff(civilFromMs(marks[i].at, TZ), civilFromMs(m.at, TZ)) }));
  const maxDays = Math.max(...gaps.map((g) => g.days));
  const rhythm = h(
    'section.intel__box',
    h('h4.intel__h', icon('play', 14), 'Trailer-Rhythmus'),
    h(
      'ol.rhythm',
      gaps.map((g, i) =>
        h(
          `li.rhythm__row${i === gaps.length - 1 ? '.is-last' : ''}`,
          h('span.rhythm__label', g.label),
          h('span.rhythm__track', h('span.rhythm__fill', { style: { width: `${Math.max(2, (g.days / maxDays) * 100)}%` } })),
          h('b.rhythm__val', `${num(g.days)} T`),
        ),
      ),
    ),
    h('p.intel__caption', `Fast derselbe Abstand zwischen den Trailern – und vom Launch-Trailer bis zum Release genau ${gaps[2].days % 7 === 0 ? `${gaps[2].days / 7} Wochen` : `${gaps[2].days} Tage`}.`),
  );

  /* Feed ------------------------------------------------------------- */
  let filter: Filter = 'all';
  let expanded = false;
  const revealed = new Set<string>();
  const sessionSeen = lastSeen();
  const seg = h(
    'div.seg.seg--small.intel__seg',
    { role: 'tablist', 'aria-label': 'Meldungen filtern' },
    (
      [
        ['all', 'Alle'],
        ['official', 'Offiziell'],
        ['leak', 'Leaks'],
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
  const shieldBtn = h<HTMLButtonElement>('button.intel__shield', { type: 'button' });
  shieldBtn.addEventListener('click', () => setSpoilerShield(!spoilerShield()));
  const list = h('ol.intel__feed');
  const moreBtn = h<HTMLButtonElement>('button.intel__more', { type: 'button' });
  moreBtn.addEventListener('click', () => {
    expanded = !expanded;
    renderFeed(clock.now());
  });
  const updated = parseLocal(NEWS_UPDATED, TZ);
  const feedBox = h(
    'section.intel__feedbox',
    h('header.intel__feedhead', h('h4.intel__h', icon('radar', 14), 'Meldungen'), h('div.intel__tools', seg, shieldBtn)),
    list,
    moreBtn,
    h('p.intel__note', `Stand ${fmtDate(updated, 'dateShort')}, ${fmtDate(updated, 'time')} Uhr · Leaks sind unbestätigt – angebliche „Build-Downloads“ sind oft Schadsoftware.`),
  );

  function itemEl(n: FeedItem, now: number): HTMLElement {
    const c = civilFromMs(n.at, TZ);
    const hidden = n.spoiler && spoilerShield() && !revealed.has(n.id);
    const isNew = n.at > sessionSeen;
    const text = h('p.intel__text', n.text);
    const body = hidden
      ? h(
          'div.intel__spoiler',
          text,
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
            icon('eye', 14),
            'Spoiler aufdecken',
          ),
        )
      : text;
    const det = h<HTMLDetailsElement>(
      'details.intel__item',
      { style: { '--c': NEWS_KIND_COLOR[n.kind] } },
      h(
        'summary.intel__sum',
        h('span.intel__d', h('b', `${c.d}.${c.m}.`), h('small', n.approx ? `${WD[civilWeekday(c)]} · ca.` : n.timed ? `${WD[civilWeekday(c)]} ${fmtDate(n.at, 'time')}` : WD[civilWeekday(c)])),
        h('span.intel__st', h('span.intel__meta', h('span.intel__chip', NEWS_KIND_LABEL[n.kind]), isNew ? h('span.intel__new', 'Neu') : null, h('span.intel__rel', relative(n.at, now))), h('span.intel__ititle', n.title)),
        icon('plus', 14, 'icon intel__chev'),
      ),
      h('div.intel__body', body, n.sources.length ? h('p.intel__src', 'Quellen: ', ...sourceLinks(n)) : null),
    );
    if (openIds.has(n.id)) det.open = true;
    det.addEventListener('toggle', () => (det.open ? openIds.add(n.id) : openIds.delete(n.id)));
    return det;
  }
  const openIds = new Set<string>();

  function renderFeed(now: number) {
    const topId = latestOfficial(now)?.id;
    const items = feed(now).filter(
      (n) => n.id !== topId && (filter === 'all' || (filter === 'leak' ? n.kind === 'leak' : n.kind !== 'leak')),
    );
    const shown = expanded ? items : items.slice(0, COLLAPSED);
    list.replaceChildren(...(shown.length ? shown.map((n) => h('li', itemEl(n, now))) : [h('li.intel__empty', 'Keine Meldungen in dieser Ansicht.')]));
    moreBtn.hidden = items.length <= COLLAPSED;
    moreBtn.replaceChildren(icon(expanded ? 'close' : 'plus', 14), expanded ? 'Weniger anzeigen' : `Alle ${items.length} Meldungen`);
    shieldBtn.setAttribute('aria-pressed', String(spoilerShield()));
    shieldBtn.setAttribute('aria-label', spoilerShield() ? 'Spoiler-Schutz ist an – ausschalten' : 'Spoiler-Schutz ist aus – einschalten');
    shieldBtn.title = shieldBtn.getAttribute('aria-label') ?? '';
    shieldBtn.replaceChildren(icon(spoilerShield() ? 'lock' : 'eye', 14), h('span', spoilerShield() ? 'Spoiler-Schutz' : 'Spoiler sichtbar'));
  }

  /* Top-Meldung aktualisieren --------------------------------------- */
  let lastTopKey = '';
  function renderTop(now: number) {
    const n = latestOfficial(now);
    if (!n) return;
    const isBreaking = now - n.at < BREAKING_MS;
    const key = `${n.id}-${isBreaking}`;
    if (key !== lastTopKey) {
      lastTopKey = key;
      top.classList.toggle('is-breaking', isBreaking);
      top.style.setProperty('--c', NEWS_KIND_COLOR[n.kind]);
      bTag.replaceChildren(h('span.dot'), isBreaking ? 'Eilmeldung' : `Zuletzt offiziell · ${NEWS_KIND_LABEL[n.kind]}`);
      setText(bWhen, `${fmtDate(n.at, 'weekdayShort')} ${fmtDate(n.at, 'dateShort')}${n.timed ? `, ${fmtDate(n.at, 'time')} Uhr` : ''}`);
      setText(bTitle, n.title);
      setText(bText, n.text);
      bFacts.replaceChildren(...n.facts.map((f) => h('li', f)));
      bFacts.hidden = !n.facts.length;
      bSrc.replaceChildren(...sourceLinks(n));
      bCta.hidden = n.kind !== 'trailer';
    }
    setText(bAgo, `vor ${dative(humanDuration(now - n.at, 2))}`);
  }

  const feature = h('article.feature.feature--intel#mod-intel', h('div.intel__head', top, h('div.intel__side', upcoming, rhythm)), feedBox);

  let seenTimer = 0;
  watchVisibility(
    feedBox,
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
      renderTop(now);
      for (const u of upItems) {
        const d = u.ms - now;
        if (d <= 0) setText(u.count, u.id === 'release' ? 'Jetzt!' : 'läuft');
        else {
          const p = splitDuration(d);
          setText(u.count, `${p.days ? `${p.days} T ` : ''}${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`);
        }
      }
      const m = Math.floor(now / 60_000);
      if (m !== lastMinute) {
        lastMinute = m;
        renderFeed(now);
        updateNavBadge(now);
      }
    },
    refresh(now) {
      lastTopKey = '';
      renderTop(now);
      renderFeed(now);
    },
  });
  window.setTimeout(() => updateNavBadge(clock.now()), 0);

  return bay({
    id: 'intel',
    index: 1,
    eyebrow: 'Intel · News-Radar',
    script: 'Breaking',
    title: 'Intel-Zentrale',
    tone: 'ocean',
    compact: true,
    lead: 'Offizielles, Berichte und Leaks bis zum Release – kompakt und mit Spoiler-Schutz.',
    body: feature,
  });
}
