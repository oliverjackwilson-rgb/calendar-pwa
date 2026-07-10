import type { EventOccurrence } from '../db';

export function groupOccurrencesByDate(
  occurrences: EventOccurrence[] | undefined
): Map<string, EventOccurrence[]> {
  const map = new Map<string, EventOccurrence[]>();
  for (const occurrence of occurrences ?? []) {
    const list = map.get(occurrence.occurrenceDate) ?? [];
    list.push(occurrence);
    map.set(occurrence.occurrenceDate, list);
  }
  return map;
}

/** All-day events first, then timed events in start-time order. */
export function sortOccurrencesByTime(a: EventOccurrence, b: EventOccurrence): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (a.start ?? '').localeCompare(b.start ?? '');
}
