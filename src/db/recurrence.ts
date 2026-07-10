import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  format,
  isAfter,
  parseISO,
  startOfWeek,
} from 'date-fns';
import type { EventRecord } from './schema';

function toIso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function inRange(dateIso: string, startIso: string, endIso: string): boolean {
  // ISO yyyy-MM-dd strings sort lexicographically in date order, so a plain
  // string comparison is enough — no need to parse back into Dates.
  return dateIso >= startIso && dateIso <= endIso;
}

/**
 * The UI never lets interval drop below 1, but imported/corrupted data
 * could contain 0, a negative number, or NaN. Without this guard those
 * values make the monthly loop below non-terminating (addMonths(anchor, 0)
 * never advances) — this clamp is what stands between a bad import and a
 * frozen tab.
 */
function safeInterval(interval: number): number {
  if (!Number.isFinite(interval)) return 1;
  return Math.max(1, Math.floor(interval));
}

/**
 * Expands an event's recurrence rule into concrete occurrence dates that
 * fall within [rangeStartISO, rangeEndISO], applying any exceptions
 * ("delete this occurrence only"). Non-recurring events just check whether
 * their single date falls in range.
 *
 * Occurrences are never stored — this function is the one place that turns
 * a rule + anchor date into actual dates, and it's called fresh on every
 * query.
 */
export function expandEventOccurrences(
  event: EventRecord,
  rangeStartISO: string,
  rangeEndISO: string
): string[] {
  const exceptions = new Set(event.exceptions);
  const anchorISO = event.date;

  if (!event.recurrence) {
    if (inRange(anchorISO, rangeStartISO, rangeEndISO) && !exceptions.has(anchorISO)) {
      return [anchorISO];
    }
    return [];
  }

  // The series can't produce anything before its own first occurrence.
  if (rangeEndISO < anchorISO) {
    return [];
  }

  const rule = event.recurrence;
  const anchor = parseISO(anchorISO);
  const rangeEnd = parseISO(rangeEndISO);
  const occurrences: string[] = [];

  if (rule.type === 'daily') {
    const interval = safeInterval(rule.interval);
    const searchStartISO = rangeStartISO > anchorISO ? rangeStartISO : anchorISO;
    const searchStart = parseISO(searchStartISO);
    // Jump close to the range instead of walking from the anchor one day at
    // a time, then align back down to a multiple of the interval.
    const rawOffset = Math.max(0, differenceInCalendarDays(searchStart, anchor));
    const alignedOffset = rawOffset - (rawOffset % interval);

    for (
      let d = addDays(anchor, alignedOffset);
      !isAfter(d, rangeEnd);
      d = addDays(d, interval)
    ) {
      const iso = toIso(d);
      if (iso >= rangeStartISO && !exceptions.has(iso)) {
        occurrences.push(iso);
      }
    }
  } else if (rule.type === 'weekly') {
    const interval = safeInterval(rule.interval);
    const weekAnchor = startOfWeek(anchor, { weekStartsOn: 1 }); // Monday of the anchor's week
    const totalWeeks = Math.max(
      0,
      differenceInCalendarWeeks(rangeEnd, weekAnchor, { weekStartsOn: 1 })
    );
    const weekdays = [...rule.weekdays].sort((a, b) => a - b);

    for (let week = 0; week <= totalWeeks; week++) {
      if (week % interval !== 0) continue;

      for (const isoWeekday of weekdays) {
        const occurrence = addDays(weekAnchor, week * 7 + (isoWeekday - 1));
        const iso = toIso(occurrence);
        // A week can contain days before the series' own start (e.g. the
        // rule includes Monday but the event first happens on Thursday) —
        // those don't count as occurrences.
        if (iso < anchorISO) continue;
        if (inRange(iso, rangeStartISO, rangeEndISO) && !exceptions.has(iso)) {
          occurrences.push(iso);
        }
      }
    }
  } else if (rule.type === 'monthly') {
    const interval = safeInterval(rule.interval);
    for (let k = 0; ; k++) {
      const occurrence = addMonths(anchor, k * interval);
      if (isAfter(occurrence, rangeEnd)) break;
      const iso = toIso(occurrence);
      if (inRange(iso, rangeStartISO, rangeEndISO) && !exceptions.has(iso)) {
        occurrences.push(iso);
      }
    }
  }

  occurrences.sort();
  return occurrences;
}
