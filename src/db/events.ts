import { db } from './db';
import { expandEventOccurrences } from './recurrence';
import type { EventInput, EventOccurrence, EventRecord } from './schema';

function nowIso(): string {
  return new Date().toISOString();
}

export async function createEvent(input: EventInput): Promise<EventRecord> {
  const event: EventRecord = {
    ...input,
    id: crypto.randomUUID(),
    exceptions: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.events.add(event);
  return event;
}

export async function updateEvent(
  id: string,
  changes: Partial<Omit<EventRecord, 'id' | 'createdAt'>>
): Promise<void> {
  await db.events.update(id, { ...changes, updatedAt: nowIso() });
}

export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id);
}

/** Deletes a single occurrence of a recurring event, leaving the rest of the series intact. */
export async function deleteOccurrence(id: string, occurrenceDateISO: string): Promise<void> {
  const event = await db.events.get(id);
  if (!event) return;

  if (!event.recurrence) {
    await deleteEvent(id);
    return;
  }

  if (!event.exceptions.includes(occurrenceDateISO)) {
    await db.events.update(id, {
      exceptions: [...event.exceptions, occurrenceDateISO],
      updatedAt: nowIso(),
    });
  }
}

/** Expands every event's recurrence rule and returns the occurrences that fall in range, sorted by date. */
export async function getEventOccurrencesForRange(
  startISO: string,
  endISO: string
): Promise<EventOccurrence[]> {
  const events = await db.events.toArray();
  const occurrences: EventOccurrence[] = [];

  for (const event of events) {
    for (const occurrenceDate of expandEventOccurrences(event, startISO, endISO)) {
      occurrences.push({ ...event, occurrenceDate });
    }
  }

  occurrences.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
  return occurrences;
}
