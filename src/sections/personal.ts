/**
 * Bay 04 – Persönliche Zeitstatistiken.
 */
import { CONFIG } from '../config';
import { calendarCounts, isSchoolDay } from '../core/calendar';
import { clock } from '../core/clock';
import { compact, longDuration, num, pct, plural } from '../core/format';
import { unlock } from '../core/game';
import { onSettings, settings, Settings, updateSettings } from '../core/settings';
import { ANCHORS, LAST_WAIT_DAY, RELEASE, TZ } from '../core/timeline';
import { DAY_MS, HOUR_MS, civilAddDays, civilCompare, civilFromMs, parseLocal, zonedToUtc } from '../core/tz';
import { bay } from '../ui/bay';
import { h, s, setText } from '../ui/dom';
import { icon } from '../ui/icons';
import { panel, refreshAll, registerModule } from '../ui/panel';
import { bindTip } from '../ui/tooltip';

/** Zählt tägliche Ereignisse zu festen Uhrzeiten zwischen jetzt und Release. */
function countDaily(now: number, times: number[], pred?: (c: { y: number; m: number; d: number }) => boolean): number {
  let n = 0;
  let c = civilFromMs(now, TZ);
  while (civilCompare(c, LAST_WAIT_DAY) <= 0) {
    if (!pred || pred(c)) {
      for (const t of times) {
        const hh = Math.floor(t);
        const mm = Math.round((t - hh) * 60);
        const at = zonedToUtc(c.y, c.m, c.d, hh, mm, 0, TZ);
        if (at > now && at < RELEASE) n++;
      }
    }
    c = civilAddDays(c, 1);
  }
  return n;
}

function mealTimes(n: number): number[] {
  if (n <= 1) return [13];
  if (n === 2) return [8, 18.5];
  if (n === 3) return [7, 13, 19];
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(7 + (i * 13) / (n - 1));
  return out;
}

function sleepMs(now: number, st: Settings): number {
  // Schlaf im Zeitraum (jetzt, Release) nach Schlafenszeit + Dauer
  const [bh, bm] = CONFIG.assumptions.bedtime.split(':').map(Number);
  let total = 0;
  let c = civilAddDays(civilFromMs(now, TZ), -1);
  while (civilCompare(c, LAST_WAIT_DAY) <= 0) {
    const start = zonedToUtc(c.y, c.m, c.d, bh, bm, 0, TZ);
    const end = start + st.sleepHours * HOUR_MS;
    const a = Math.max(start, now);
    const b = Math.min(end, RELEASE);
    if (b > a) total += b - a;
    c = civilAddDays(c, 1);
  }
  return total;
}

/* ------------------------------------------------------------------ */
/* P-01 Kalender-Zähler                                                */
/* ------------------------------------------------------------------ */
function calendarTiles(): HTMLElement {
  const defs = [
    { key: 'weekends', label: 'Wochenenden', icon: 'palm', tone: 'pink' },
    { key: 'fridays', label: 'Freitage', icon: 'star', tone: 'sun' },
    { key: 'saturdays', label: 'Samstage', icon: 'sun', tone: 'orange' },
    { key: 'sundays', label: 'Sonntage', icon: 'moon', tone: 'violet' },
    { key: 'schoolDaysRemaining', label: 'Schultage (Mo–Fr)', icon: 'book', tone: 'cyan' },
    { key: 'lessons', label: 'Schulstunden', icon: 'clock', tone: 'cyan' },
    { key: 'holidayDays', label: 'Ferientage', icon: 'palm', tone: 'orange' },
    { key: 'mondays', label: 'Montage', icon: 'bolt', tone: 'mint' },
  ].map((d) => ({ ...d, value: h('b.tile__value') }));
  const comment = h('p.tiles__comment');
  const el = panel({
    id: 'kalenderzaehler',
    code: 'P-01',
    title: 'Was noch vor dir liegt',
    kicker: 'Gezählt ab heute bis zum letzten Tag vor dem Release. Schultage zählen nur, solange der Unterricht noch nicht vorbei ist.',
    tone: 'pink',
    span: 2,
    body: h(
      'div',
      h('ul.tiles', defs.map((d) => h(`li.tile.tone-${d.tone}`, h('span.tile__icon', icon(d.icon, 20)), d.value, h('span.tile__label', d.label)))),
      comment,
    ),
    note: ' ',
  });
  registerModule({
    el,
    second(now) {
      const cal = calendarCounts(now);
      const st = settings();
      const vals: Record<string, number> = { ...cal, lessons: cal.schoolDaysRemaining * st.lessonsPerDay } as unknown as Record<string, number>;
      for (const d of defs) setText(d.value, num(vals[d.key] ?? 0));
      setText(
        comment,
        RELEASE <= now
          ? 'Alles geschafft. Jeder einzelne dieser Tage.'
          : cal.holidayDays > 0
            ? `Noch ${plural(cal.holidayDays, 'Ferientag', 'Ferientage')} genießen – danach trennen dich ${plural(cal.schoolDays, 'Schultag', 'Schultage')} von GTA VI.`
            : `${plural(cal.schoolDaysRemaining, 'Schultag', 'Schultage')}, ${plural(cal.weekends, 'Wochenende', 'Wochenenden')}. Mehr ist es nicht mehr.`,
      );
      const noteEl = el.querySelector('.panel__note');
      if (noteEl) setText(noteEl, `Ferien laut Konfiguration: ${CONFIG.school.holidays.map((x) => `${x.name} bis ${x.end.split('-').reverse().join('.')}`).join(', ')}. Annahme: ${st.lessonsPerDay} Unterrichtsstunden pro Schultag.`);
    },
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* P-02 Körper & Alltag                                                */
/* ------------------------------------------------------------------ */
function bodyCounters(): HTMLElement {
  const rows = [
    { key: 'heart', label: 'Herzschläge', icon: 'heart', live: true },
    { key: 'breath', label: 'Atemzüge', icon: 'radar', live: true },
    { key: 'sleep', label: 'Stunden Schlaf', icon: 'moon' },
    { key: 'cycles', label: 'Schlafzyklen', icon: 'moon' },
    { key: 'meals', label: 'Mahlzeiten', icon: 'star' },
    { key: 'training', label: 'Trainingseinheiten', icon: 'flame' },
    { key: 'steps', label: 'Schritte', icon: 'map' },
    { key: 'water', label: 'Liter Wasser', icon: 'radar' },
    { key: 'teeth', label: 'Mal Zähneputzen', icon: 'check' },
    { key: 'unlocks', label: 'Handy-Entsperrungen', icon: 'eye' },
    { key: 'hair', label: 'mm Haarwachstum', icon: 'user' },
    { key: 'nails', label: 'mm Fingernägel', icon: 'user' },
  ].map((r) => ({ ...r, value: h('b') }));
  const el = panel({
    id: 'koerper',
    code: 'P-02',
    title: 'Dein Körper wartet mit',
    kicker: 'Was du bis zum Release noch erledigst – geschätzt mit den Annahmen nebenan.',
    tone: 'mint',
    span: 2,
    body: h('ul.counters', rows.map((r) => h(`li.counter${r.live ? '.is-live' : ''}`, h('span.counter__icon', icon(r.icon, 18)), r.value, h('span.counter__label', r.label)))),
    note: 'Schätzungen: Atemfrequenz 15/min, Haare ≈ 0,35 mm/Tag, Nägel ≈ 0,1 mm/Tag, 2 l Wasser/Tag, 80 Entsperrungen/Tag, Zähneputzen 07:00 & 22:00 Uhr. Puls, Schlaf, Mahlzeiten, Training und Schritte nach deinen Annahmen.',
  });
  let slowKey = '';
  const slow: Record<string, number> = {};
  registerModule({
    el,
    frame(now) {
      const st = settings();
      const rem = Math.max(0, RELEASE - now);
      const min = rem / 60_000;
      const set = (k: string, v: string) => setText(rows.find((r) => r.key === k)!.value, v);
      set('heart', num(Math.floor(min * st.restingHeartRate)));
      set('breath', num(Math.floor(min * CONFIG.assumptions.breathsPerMinute)));
      const key = `${Math.floor(now / 60_000)}-${JSON.stringify(st)}`;
      if (key !== slowKey) {
        slowKey = key;
        const sl = sleepMs(now, st);
        slow.sleep = sl / HOUR_MS;
        slow.cycles = sl / (CONFIG.assumptions.sleepCycleMinutes * 60_000);
        slow.meals = countDaily(now, mealTimes(st.mealsPerDay));
        slow.training = Math.round((rem / (7 * DAY_MS)) * st.trainingsPerWeek);
        slow.steps = (rem / DAY_MS) * st.stepsPerDay;
        slow.water = (rem / DAY_MS) * CONFIG.assumptions.waterLitersPerDay;
        slow.teeth = countDaily(now, [7, 22]);
        slow.unlocks = (rem / DAY_MS) * CONFIG.assumptions.phoneUnlocksPerDay;
        slow.hair = (rem / DAY_MS) * 0.35;
        slow.nails = (rem / DAY_MS) * 0.1;
        set('sleep', num(slow.sleep, 0));
        set('cycles', num(slow.cycles, 0));
        set('meals', num(slow.meals));
        set('training', num(slow.training));
        set('steps', compact(slow.steps, 1));
        set('water', num(slow.water, 0));
        set('teeth', num(slow.teeth));
        set('unlocks', num(slow.unlocks, 0));
        set('hair', num(slow.hair, 1, 1));
        set('nails', num(slow.nails, 1, 1));
      }
    },
    refresh() {
      slowKey = '';
    },
  });
  onSettings(() => (slowKey = ''));
  return el;
}

/* ------------------------------------------------------------------ */
/* P-03 Annahmen                                                       */
/* ------------------------------------------------------------------ */
function assumptionsPanel(): HTMLElement {
  const sliders: { key: keyof Settings; label: string; min: number; max: number; step: number; unit: string }[] = [
    { key: 'sleepHours', label: 'Schlaf pro Nacht', min: 4, max: 12, step: 0.5, unit: 'Std.' },
    { key: 'mealsPerDay', label: 'Mahlzeiten pro Tag', min: 1, max: 6, step: 1, unit: '' },
    { key: 'trainingsPerWeek', label: 'Trainings pro Woche', min: 0, max: 14, step: 1, unit: '' },
    { key: 'restingHeartRate', label: 'Ruhepuls', min: 40, max: 110, step: 1, unit: 'bpm' },
    { key: 'lessonsPerDay', label: 'Schulstunden pro Tag', min: 1, max: 12, step: 1, unit: '' },
    { key: 'stepsPerDay', label: 'Schritte pro Tag', min: 1000, max: 25000, step: 500, unit: '' },
  ];
  const controls = sliders.map((sd) => {
    const out = h('output', { for: `as-${sd.key}` });
    const input = h<HTMLInputElement>('input.range', {
      id: `as-${sd.key}`,
      type: 'range',
      min: String(sd.min),
      max: String(sd.max),
      step: String(sd.step),
      value: String(settings()[sd.key]),
    });
    const sync = () => setText(out, `${num(Number(input.value), sd.step < 1 ? 1 : 0)}${sd.unit ? ' ' + sd.unit : ''}`);
    input.addEventListener('input', () => {
      sync();
      updateSettings({ [sd.key]: Number(input.value) } as Partial<Settings>);
    });
    sync();
    return { sd, input, sync, row: h('label.assume', h('span.assume__label', sd.label), input, out) };
  });
  onSettings((st) => controls.forEach((c) => {
    if (document.activeElement !== c.input) {
      c.input.value = String(st[c.sd.key]);
      c.sync();
    }
  }));
  return panel({
    id: 'annahmen',
    code: 'P-03',
    title: 'Annahmen',
    kicker: 'Alle Schätzungen auf dieser Seite basieren auf diesen Werten. Verschieben – alles rechnet sofort neu.',
    tone: 'sun',
    body: h('div.assumptions', controls.map((c) => c.row)),
    note: 'Gespeichert in deinem Browser. Standardwerte stehen zentral in src/config.ts.',
  });
}

/* ------------------------------------------------------------------ */
/* P-04 Lebensabschnitte                                               */
/* ------------------------------------------------------------------ */
function lifePanel(): HTMLElement {
  const body = h('div.life');
  const el = panel({
    id: 'leben',
    code: 'P-04',
    title: 'Dein Leben im Vergleich',
    kicker: 'Die Wartezeit, gemessen an deinem eigenen Leben.',
    tone: 'violet',
    span: 2,
    tall: true,
    body,
  });

  const form = () => {
    const input = h<HTMLInputElement>('input.input#life-birth', { type: 'date', max: '2026-11-18', required: true });
    const school = h<HTMLInputElement>('input.input#life-school', { type: 'date', max: '2026-11-18' });
    const f = h(
      'form.life__form',
      h('p', 'Trag dein Geburtsdatum ein, um zu sehen, welchen Anteil deines Lebens du schon auf GTA VI wartest. Die Daten bleiben in deinem Browser.'),
      h('label.field', h('span', 'Geburtsdatum'), input),
      h('label.field', h('span', 'Einschulung (optional)'), school),
      h('button.btn.btn--pink', { type: 'submit' }, icon('user', 18), 'Lebens-Statistik berechnen'),
    );
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input.value) return;
      updateSettings({ birthDate: input.value, schoolStartDate: school.value || settings().schoolStartDate });
      unlock('configured');
      refreshAll();
    });
    return f;
  };

  let builtKey = '';
  const build = (now: number) => {
    const st = settings();
    const key = `${st.birthDate}-${st.schoolStartDate}-${Math.floor(now / 3_600_000)}`;
    if (key === builtKey) return;
    builtKey = key;
    if (!st.birthDate) {
      body.replaceChildren(form());
      return;
    }
    const birth = parseLocal(st.birthDate, TZ);
    if (birth >= now) {
      body.replaceChildren(h('p', 'Das Geburtsdatum liegt in der Zukunft. Bitte in den Einstellungen korrigieren.'), form());
      return;
    }
    const life = now - birth;
    const ageAtRelease = RELEASE - birth;
    const ageAtGta5 = ANCHORS.gta5 - birth;
    const waitT1 = Math.max(0, Math.min(now, RELEASE) - ANCHORS.trailer1);
    const waitConfirmed = Math.max(0, Math.min(now, RELEASE) - ANCHORS.gta6Confirmed);
    const rem = Math.max(0, RELEASE - now);
    const facts: [string, string][] = [
      ['Bei Release bist du', `${longDuration(ageAtRelease)} alt (${num(Math.floor(ageAtRelease / DAY_MS))} Tage)`],
      [
        'Beim Release von GTA V',
        ageAtGta5 > 0 ? `warst du ${longDuration(ageAtGta5)} alt` : `warst du noch nicht geboren – GTA V ist ${longDuration(-ageAtGta5)} älter als du`,
      ],
      ['Gewartet seit Trailer 1', `${pct(waitT1 / life, 2)} deines bisherigen Lebens`],
      ['Gewartet seit der Bestätigung 2022', `${pct(waitConfirmed / life, 2)} deines bisherigen Lebens`],
      ['Die Restzeit entspricht', `${pct(rem / life, 3)} deines Lebens – so lang wie deine ersten ${num(Math.ceil(rem / DAY_MS))} Lebenstage`],
    ];
    if (st.schoolStartDate) {
      const school = parseLocal(st.schoolStartDate, TZ);
      if (school < now) {
        const sl = now - school;
        facts.push(['Seit deiner Einschulung', `${longDuration(sl)} – davon ${pct(Math.max(0, now - Math.max(school, ANCHORS.gta5)) / sl, 1)} in der Wartezeit seit GTA V`]);
      }
    }
    // Leben in Wochen
    const weeksLived = Math.floor(life / (7 * DAY_MS));
    const totalWeeks = Math.ceil(ageAtRelease / (7 * DAY_MS)) + 1;
    const cols = 52;
    const rows = Math.ceil(totalWeeks / cols);
    const wGta5 = Math.floor((ANCHORS.gta5 - birth) / (7 * DAY_MS));
    const wConf = Math.floor((ANCHORS.gta6Confirmed - birth) / (7 * DAY_MS));
    const wT1 = Math.floor((ANCHORS.trailer1 - birth) / (7 * DAY_MS));
    const cells: SVGElement[] = [];
    for (let i = 0; i < totalWeeks; i++) {
      const cls = i > weeksLived ? 'is-future' : i >= wT1 ? 'is-t1' : i >= wConf ? 'is-conf' : i >= wGta5 ? 'is-gta5' : 'is-before';
      cells.push(s(`rect.lw.${cls}${i === weeksLived ? '.is-now' : ''}`, { x: String((i % cols) * 9), y: String(Math.floor(i / cols) * 9), width: '7', height: '7', rx: '1.5' }));
    }
    const grid = s('svg.lifeweeks', { viewBox: `0 0 ${cols * 9} ${rows * 9}`, role: 'img', 'aria-label': 'Dein Leben in Wochen' }, cells);
    bindTip(grid, () => ({ title: 'Dein Leben in Wochen', lines: [`${num(weeksLived)} Wochen gelebt`, `Release in Lebenswoche ${num(totalWeeks - 1)}`] }));
    body.replaceChildren(
      h('dl.kv.kv--life', facts.map(([k, v]) => h('div', h('dt', k), h('dd', v)))),
      h('h4.subhead', 'Dein Leben in Wochen – eine Zeile pro Lebensjahr'),
      h('div.lifeweeks-wrap', grid),
      h(
        'ul.legend.legend--row',
        h('li', h('span.legend__swatch.lw-before'), 'vor GTA V'),
        h('li', h('span.legend__swatch.lw-gta5'), 'GTA-V-Ära'),
        h('li', h('span.legend__swatch.lw-conf'), 'seit Bestätigung'),
        h('li', h('span.legend__swatch.lw-t1'), 'seit Trailer 1'),
        h('li', h('span.legend__swatch.lw-future'), 'bis Release'),
      ),
      h('p.life__edit', 'Daten ändern: ', h('button.linklike', { type: 'button', onclick: () => document.dispatchEvent(new CustomEvent('open-settings')) }, 'Einstellungen öffnen')),
    );
  };
  registerModule({ el, second: build, refresh: (now) => ((builtKey = ''), build(now)) });
  onSettings(() => ((builtKey = ''), build(clock.now())));
  return el;
}

/* ------------------------------------------------------------------ */
/* P-05 Freizeit-Rechner                                               */
/* ------------------------------------------------------------------ */
function freeTimePanel(): HTMLElement {
  const freeEl = h('b.big-stat');
  const list = h('ul.freetime');
  const el = panel({
    id: 'freizeit',
    code: 'P-05',
    title: 'Freizeit-Bilanz',
    kicker: 'Nach Abzug von Schlaf und Unterricht bleibt dir bis zum Release noch so viel freie Zeit:',
    tone: 'orange',
    body: h('div', h('p.stat-line', freeEl), list),
    note: 'Freizeit = Restzeit − Schlaf (Einstellungen) − Unterricht an Schultagen. Serienstaffel ≈ 8 Std. (Annahme), GTA-V-Story ≈ 32 Std.',
  });
  let lastKey = '';
  registerModule({
    el,
    second(now) {
      const st = settings();
      const key = `${Math.floor(now / 60_000)}-${JSON.stringify(st)}`;
      if (key === lastKey) return;
      lastKey = key;
      const rem = Math.max(0, RELEASE - now);
      const sleep = sleepMs(now, st);
      // Unterrichtszeit
      const [sh, sm] = CONFIG.school.dayStart.split(':').map(Number);
      const [eh, em] = CONFIG.school.dayEnd.split(':').map(Number);
      let school = 0;
      let c = civilFromMs(now, TZ);
      while (civilCompare(c, LAST_WAIT_DAY) <= 0) {
        if (isSchoolDay(c)) {
          const a = Math.max(now, zonedToUtc(c.y, c.m, c.d, sh, sm, 0, TZ));
          const b = Math.min(RELEASE, zonedToUtc(c.y, c.m, c.d, eh, em, 0, TZ));
          if (b > a) school += b - a;
        }
        c = civilAddDays(c, 1);
      }
      const free = Math.max(0, rem - sleep - school);
      setText(freeEl, `${num(free / HOUR_MS, 0)} Stunden`);
      const items: [string, number][] = [
        ['Mal Trailer 1 in Dauerschleife', free / 91_000],
        ['GTA-V-Storydurchläufe', free / (32 * HOUR_MS)],
        ['Serienstaffeln', free / (8 * HOUR_MS)],
        ['Herr-der-Ringe-Marathons (Extended)', free / (686 * 60_000)],
        ['Prozent der Restzeit sind Freizeit', (free / Math.max(1, rem)) * 100],
      ];
      list.replaceChildren(...items.map(([l, v]) => h('li', h('b', num(v, v < 10 ? 1 : 0, v < 10 ? 1 : 0)), h('span', l))));
    },
    refresh() {
      lastKey = '';
    },
  });
  return el;
}

export function personalSection(): HTMLElement {
  return bay({
    id: 'persoenlich',
    index: 5,
    eyebrow: 'Persönliche Zeitstatistiken',
    script: 'Du',
    title: 'Deine Wartezeit',
    tone: 'sunset',
    lead: 'Die Restzeit, übersetzt in Wochenenden, Schultage, Herzschläge und Lebensjahre. Alle Schätzungen sind gekennzeichnet und lassen sich anpassen.',
    body: h('div.grid', calendarTiles(), assumptionsPanel(), bodyCounters(), lifePanel(), freeTimePanel()),
  });
}

