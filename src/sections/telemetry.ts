import { calendarCounts } from '../core/calendar';
import { clock } from '../core/clock';
import { num } from '../core/format';
import { RELEASE } from '../core/timeline';
import { countdownCalendar, hourBudget, timeSpiral, waitWeeks } from '../modules/calendarViz';
import { dstModule, historicScale, unitConverter, weekdaysModule, worldClock } from '../modules/compare';
import { compressedTime, numberMystic, numberSystems, zeno } from '../modules/math';
import { clockwork, hourglass, startPoints, unitCascade } from '../modules/progress';
import { cosmosModule, moonModule, planetsModule, sunModule } from '../modules/science';
import { bay } from '../ui/bay';
import { h } from '../ui/dom';

export function telemetrySection(): HTMLElement {
  const cal = calendarCounts(clock.now());
  const days = Math.max(0, Math.ceil((RELEASE - clock.now()) / 86_400_000));
  return bay({
    id: 'telemetrie',
    index: 2,
    eyebrow: '21 Instrumente · live',
    script: 'Mission',
    title: 'Telemetrie',
    tone: 'magenta',
    lead: `Dieselbe Wartezeit, 21 Perspektiven: von Millisekunden über Mondphasen bis zur Relativitätstheorie. Aktuell ${num(days)} Tage, ${num(cal.schoolDays)} davon Schultage.`,
    body: h(
      'div.grid',
      unitCascade(),
      startPoints(),
      clockwork(),
      compressedTime(),
      countdownCalendar(),
      hourglass(),
      numberMystic(),
      waitWeeks(),
      hourBudget(),
      timeSpiral(),
      weekdaysModule(),
      numberSystems(),
      unitConverter(),
      zeno(),
      moonModule(),
      sunModule(),
      cosmosModule(),
      historicScale(),
      planetsModule(),
      worldClock(),
      dstModule(),
    ),
  });
}
