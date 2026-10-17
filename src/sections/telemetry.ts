import { calendarCounts } from '../core/calendar';
import { clock } from '../core/clock';
import { num } from '../core/format';
import { RELEASE } from '../core/timeline';
import { countdownCalendar, waitWeeks } from '../modules/calendarViz';
import { historicScale, unitConverter } from '../modules/compare';
import { numberMystic, numberSystems } from '../modules/math';
import { unitCascade } from '../modules/progress';
import { bay } from '../ui/bay';
import { h } from '../ui/dom';

export function telemetrySection(): HTMLElement {
  const cal = calendarCounts(clock.now());
  const days = Math.max(0, Math.ceil((RELEASE - clock.now()) / 86_400_000));
  return bay({
    id: 'telemetrie',
    index: 5,
    eyebrow: '7 Instrumente · live',
    script: 'Mission',
    title: 'Telemetrie',
    tone: 'magenta',
    lead: `Die Restzeit aus sieben weiteren Blickwinkeln: Kalender, Wochen, Zahlen und Vergleiche. Aktuell ${num(days)} Tage, ${num(cal.schoolDays)} davon Schultage.`,
    body: h(
      'div.grid',
      countdownCalendar(),
      numberMystic(),
      unitCascade(),
      numberSystems(),
      unitConverter(),
      historicScale(),
      waitWeeks(),
    ),
  });
}
