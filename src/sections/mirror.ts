/**
 * Zeitspiegel: Welcher Zeitpunkt in der Vergangenheit ist genauso weit
 * entfernt wie das Ziel in der Zukunft? Spiegelpunkt = 2 · jetzt − Ziel.
 */
import { CONFIG } from '../config';
import { sunTimes } from '../core/astro';
import { countDaysBetween } from '../core/calendar';
import { getStart } from '../core/startpoint';
import { on } from '../core/bus';
import { clock } from '../core/clock';
import { fmtDate, fmtDateTime, humanDuration, longDuration, num, pad } from '../core/format';
import { unlock } from '../core/game';
import { settings } from '../core/settings';
import { ANCHORS, EXAMS_END, PRELOAD, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, civilFromMs, dayOfYear, parseLocal, zonedParts } from '../core/tz';
import { HISTORY } from '../data/history';
import { bay } from '../ui/bay';
import { h, setText } from '../ui/dom';
import { bindTip } from '../ui/tooltip';
import { registerModule } from '../ui/panel';

interface Target {
  id: string;
  label: string;
  at: number;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function mirrorSection(): HTMLElement {
  const targets: Target[] = [
    { id: 'release', label: 'GTA VI Release', at: RELEASE },
    { id: 'preload', label: 'Preload', at: PRELOAD },
    { id: 'exams', label: 'Klausurende', at: EXAMS_END },
    ...CONFIG.events
      .filter((e) => ['weihnachten', 'silvester'].includes(e.id))
      .map((e) => ({ id: e.id, label: e.title, at: parseLocal(e.date, TZ) })),
  ];
  let target = targets[0];

  const chips = h(
    'div.seg',
    { role: 'tablist', 'aria-label': 'Spiegelziel' },
    targets.map((t, i) =>
      h(
        'button.seg__btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(i === 0),
          onclick: (e: Event) => {
            target = t;
            chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget)));
            if (t.id !== 'release') unlock('mirror');
            update(clock.now());
          },
        },
        t.label,
      ),
    ),
  );

  const mirrorDay = h('span.mirror__weekday');
  const mirrorDate = h('span.mirror__date');
  const mirrorTime = h('span.mirror__time');
  const mirrorLead = h('p.mirror__lead');
  const distance = h('span');

  // Achse: Spiegelpunkt — Jetzt — Ziel (HTML, damit nichts verzerrt)
  const axisTicks = h('div.maxis__ticks');
  const labelMirror = h('span.maxis__label.maxis__label--l');
  const labelTarget = h('span.maxis__label.maxis__label--r');
  const axis = h(
    'div.maxis',
    { role: 'img', 'aria-label': 'Spiegelachse zwischen Vergangenheit, Jetzt und Ziel' },
    h('span.maxis__line'),
    axisTicks,
    h('span.maxis__pulse.maxis__pulse--l'),
    h('span.maxis__pulse.maxis__pulse--r'),
    h('span.maxis__node.maxis__node--past'),
    h('span.maxis__node.maxis__node--now'),
    h('span.maxis__node.maxis__node--future'),
    h('span.maxis__label.maxis__label--now', 'Jetzt'),
    labelMirror,
    labelTarget,
  );
  const axisLabelMirror = h('span.axis-caption__l');
  const axisLabelTarget = h('span.axis-caption__r');

  const factThen = h('dd');
  const factMoon = h('dd');
  const factSun = h('dd');
  const factYear = h('dd');
  const factBetween = h('dd');
  const factSpeed = h('dd');

  const pairsList = h('ul.pairs');

  const feature = h(
    'article.feature.feature--mirror#mod-zeitspiegel',
    h(
      'div.mirror',
      h(
        'div.mirror__main',
        h('p.mirror__kicker', 'Der Spiegelpunkt liegt genauso weit zurück, wie ', h('b', distance), ' in der Zukunft liegt:'),
        h('div.mirror__stamp', mirrorDay, mirrorDate, mirrorTime),
        mirrorLead,
        chips,
      ),
      h(
        'div.mirror__axis',
        axis,
        h('div.axis-caption', axisLabelMirror, h('span.axis-caption__m', 'Spiegelachse'), axisLabelTarget),
      ),
      h(
        'dl.facts',
        h('div.fact', h('dt', 'Damals'), factThen),
        h('div.fact', h('dt', 'Wochenenden damals'), factMoon),
        h('div.fact', h('dt', 'Sonnenaufgang damals'), factSun),
        h('div.fact', h('dt', 'Position im Jahr'), factYear),
        h('div.fact', h('dt', 'Dazwischen passiert'), factBetween),
        h('div.fact', h('dt', 'Spiegel-Tempo'), factSpeed),
      ),
    ),
    h('div.pairs-wrap', h('h3.subhead', 'Spiegel der Geschichte – wohin zeigen vergangene GTA-Momente, gespiegelt an heute?'), pairsList),
  );

  function update(now: number) {
    const diff = target.at - now;
    const mirror = now - diff;
    const parts = zonedParts(mirror, TZ);
    setText(mirrorDay, WEEKDAYS[parts.weekday]);
    setText(mirrorDate, fmtDate(mirror, 'dateLong'));
    setText(mirrorTime, `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)} Uhr`);
    setText(distance, target.label);
    if (diff <= 0) {
      setText(mirrorLead, `${target.label} liegt bereits hinter dir – der Spiegel zeigt jetzt in die Zukunft: ${fmtDateTime(mirror)}.`);
    } else {
      setText(
        mirrorLead,
        `Von diesem Moment bis heute ist genau so viel Zeit vergangen, wie noch bis ${target.label} vergehen muss: ${humanDuration(diff, 3)}. Der Spiegelpunkt rückt dabei jede Sekunde um zwei Sekunden auf heute zu.`,
      );
    }
    setText(axisLabelMirror, fmtDate(mirror, 'date'));
    setText(axisLabelTarget, fmtDate(target.at, 'date'));
    setText(labelMirror, `− ${humanDuration(Math.abs(diff), 1)}`);
    setText(labelTarget, `+ ${humanDuration(Math.abs(diff), 1)}`);

    const thenRemaining = target.at - mirror;
    setText(factThen, `Damals waren es noch ${humanDuration(thenRemaining, 2)} bis ${target.label} – doppelt so viel wie heute.`);
    const targetDay = civilFromMs(target.at, TZ);
    const sundays = (from: number) => countDaysBetween(civilFromMs(from, TZ), targetDay, (c) => new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay() === 0);
    setText(factMoon, `Vom Spiegelpunkt bis ${target.label} lagen ${sundays(mirror)} Wochenenden. Heute sind es nur noch ${sundays(now)}.`);
    const loc = settings().location;
    const st = sunTimes(civilFromMs(mirror, TZ), loc.lat, loc.lon);
    setText(factSun, st.sunrise ? `${fmtDate(st.sunrise, 'time')} Uhr in ${loc.name} (Tageslicht: ${humanDuration(st.dayLength, 2)})` : '–');
    const doy = dayOfYear(civilFromMs(mirror, TZ));
    setText(factYear, `Tag ${doy} des Jahres ${parts.y} · KW ${isoWeek(mirror)}`);

    const between = HISTORY.filter((e) => {
      const t = parseLocal(e.date, TZ);
      return t > Math.min(mirror, now) && t <= Math.max(mirror, now);
    });
    setText(
      factBetween,
      between.length
        ? `${between.length} Ereignis${between.length === 1 ? '' : 'se'} der GTA-Historie: ${between.map((e) => e.title).join(', ')}.`
        : 'Kein Eintrag der GTA-Historie – nur sehr viel Warten.',
    );
    setText(factSpeed, diff > 0 ? 'Der Spiegelpunkt läuft doppelt so schnell wie die Uhr: 2 Sekunden pro Sekunde, bis er beim Ziel mit dem Jetzt zusammenfällt.' : 'Ziel erreicht – Spiegel und Gegenwart sind sich begegnet.');

    // Ereignis-Ticks zwischen Spiegel und Ziel
    const span = Math.abs(target.at - mirror) || 1;
    const lo = Math.min(mirror, target.at);
    axisTicks.replaceChildren(
      ...HISTORY.map((e) => ({ e, t: parseLocal(e.date, TZ) }))
        .filter(({ t }) => t >= lo && t <= lo + span)
        .map(({ e, t }) => {
          const tick = h('span.maxis__tick', { style: { left: `${4 + ((t - lo) / span) * 92}%` }, tabindex: '0', 'aria-label': e.title });
          bindTip(tick, () => ({ title: e.title, lines: [fmtDate(t, 'date')] }));
          return tick;
        }),
    );
  }

  function renderPairs(now: number) {
    const st = getStart();
    const anchors: [string, number][] = [
      ...(['gta5', 'confirmed', 'leak', 'trailer1', 'trailer2', 'delay2', 'preorders'].includes(st.id) ? [] : [[`Dein Startpunkt: ${st.label}`, st.at] as [string, number]]),
      ['GTA V Release', ANCHORS.gta5],
      ['GTA VI offiziell bestätigt', ANCHORS.gta6Confirmed],
      ['Der große Leak', ANCHORS.leak],
      ['Trailer 1', ANCHORS.trailer1],
      ['Trailer 2', ANCHORS.trailer2],
      ['Zweite Verschiebung', ANCHORS.delay2],
      ['Vorbestellungsstart', ANCHORS.preorders],
    ];
    pairsList.replaceChildren(
      ...anchors.map(([label, t]) => {
        const ago = now - t;
        const mirrored = now + ago;
        return h(
          'li.pair',
          h('span.pair__label', label),
          h('span.pair__ago', `vor ${longDuration(ago)}`),
          h('span.pair__arrow', { 'aria-hidden': 'true' }, '⟷'),
          h('span.pair__mirror', fmtDate(mirrored, 'dateLong')),
          h('span.pair__note', mirrored > RELEASE ? `${num((mirrored - RELEASE) / DAY_MS, 0)} Tage nach dem Release` : `${num((RELEASE - mirrored) / DAY_MS, 0)} Tage vor dem Release`),
        );
      }),
    );
  }

  on('startpoint', () => renderPairs(clock.now()));
  registerModule({
    el: feature,
    second: (now) => {
      update(now);
      if (zonedParts(now, TZ).second === 0 || !pairsList.childElementCount) renderPairs(now);
    },
    refresh: (now) => {
      update(now);
      renderPairs(now);
    },
  });

  return bay({
    id: 'zeitspiegel',
    index: 3,
    eyebrow: 'Zentrales Instrument',
    script: 'Zeit',
    title: 'Zeitspiegel',
    tone: 'ocean',
    lead: 'Spiegelt das Ziel an der Gegenwart: Der Spiegelpunkt liegt genau so weit in der Vergangenheit wie der Release in der Zukunft. Je näher GTA VI kommt, desto näher rückt auch der Spiegelpunkt an heute heran.',
    body: feature,
  });
}

function isoWeek(ms: number): number {
  const c = civilFromMs(ms, TZ);
  const d = new Date(Date.UTC(c.y, c.m - 1, c.d));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}

export { isoWeek };
