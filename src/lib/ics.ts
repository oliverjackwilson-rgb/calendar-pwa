import type { Category, EventRecord, RecurrenceRule } from '../db';
import { addDaysToIso } from './dates';

const ISO_WEEKDAY_TO_ICS = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

function toIcsDate(iso: string): string {
  return iso.replaceAll('-', '');
}

function toIcsDateTime(iso: string, time: string): string {
  return `${toIcsDate(iso)}T${time.replace(':', '')}00`;
}

function toIcsUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Escapes text per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline). */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Folds a content line to 75 octets as recommended by RFC 5545 §3.1. */
function foldLine(line: string): string {
  const MAX = 75;
  if (line.length <= MAX) return line;

  let result = line.slice(0, MAX);
  let rest = line.slice(MAX);
  while (rest.length > 0) {
    result += '\r\n ' + rest.slice(0, MAX - 1);
    rest = rest.slice(MAX - 1);
  }
  return result;
}

function buildRRule(rule: RecurrenceRule | null): string | null {
  if (!rule) return null;
  if (rule.type === 'daily') return `FREQ=DAILY;INTERVAL=${rule.interval}`;
  if (rule.type === 'monthly') return `FREQ=MONTHLY;INTERVAL=${rule.interval}`;
  const days = rule.weekdays.map((d) => ISO_WEEKDAY_TO_ICS[d]).join(',');
  return `FREQ=WEEKLY;INTERVAL=${rule.interval};BYDAY=${days}`;
}

/**
 * Builds an RFC 5545 .ics calendar. Recurrence rules are exported as native
 * RRULE/EXDATE lines rather than expanded into individual events, so Google
 * Calendar (and anything else compliant) understands them as a real series.
 */
export function buildIcsCalendar(events: EventRecord[], categories: Category[]): string {
  const categoryLabelById = new Map(categories.map((c) => [c.id, c.label]));
  const stamp = toIcsUtcStamp(new Date());

  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Calendar PWA//EN', 'CALSCALE:GREGORIAN'];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@calendar-pwa`);
    lines.push(`DTSTAMP:${stamp}`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(addDaysToIso(event.date, 1))}`);
    } else {
      const start = event.start ?? '00:00';
      lines.push(`DTSTART:${toIcsDateTime(event.date, start)}`);
      lines.push(`DTEND:${toIcsDateTime(event.date, event.end ?? start)}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.notes) lines.push(`DESCRIPTION:${escapeIcsText(event.notes)}`);

    const categoryLabel = categoryLabelById.get(event.categoryId);
    if (categoryLabel) lines.push(`CATEGORIES:${escapeIcsText(categoryLabel)}`);

    const rrule = buildRRule(event.recurrence);
    if (rrule) lines.push(`RRULE:${rrule}`);

    for (const exceptionDate of event.exceptions) {
      lines.push(
        event.allDay
          ? `EXDATE;VALUE=DATE:${toIcsDate(exceptionDate)}`
          : `EXDATE:${toIcsDateTime(exceptionDate, event.start ?? '00:00')}`
      );
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
}
