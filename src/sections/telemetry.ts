import { calendarCounts } from '../core/calendar';
import { clock } from '../core/clock';
import { num } from '../core/format';
import { RELEASE } from '../core/timeline';
import { countdownCalendar, hourBudget, waitWeeks } from '../modules/calendarViz';
import { historicScale, unitConverter } from '../modules/compare';
import { numberMystic, numberSystems } from '../modules/math';
import { unitCascade } from '../modules/progress';
import { sunModule } from '../modules/science';
import { bay } from '../ui/bay';
import { h } from '../ui/dom';

export function telemetrySection(): HTMLElement {
  const cal = calendarCounts(clock.now());
  const days = Math.max(0, Math.ceil((RELEASE - clock.now()) / 86_400_000));
  return bay({
    id: 'telemetrie',
    index: 4,
    eyebrow: '9 Instrumente · live',
    script: 'Mission',
    title: 'Telemetrie',
    tone: 'magenta',
    lead: `Die Restzeit aus neun weiteren Blickwinkeln: Kalender, Stunden, Wochen, Zahlen und Vergleiche. Aktuell ${num(days)} Tage, ${num(cal.schoolDays)} davon Schultage.`,
    body: h(
      'div.grid',
      countdownCalendar(),
      numberMystic(),
      unitCascade(),
      hourBudget(),
      unitConverter(),
      waitWeeks(),
      historicScale(),
      sunModule(),
      numberSystems(),
    ),
  });
}
