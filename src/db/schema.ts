/**
 * Recurrence rules are stored once on the parent event and expanded into
 * individual occurrence dates at query time (see recurrence.ts) — there is
 * no one-row-per-occurrence in the database.
 *
 * `weekdays` and any other day-of-week values use the ISO weekday numbering
 * (1 = Monday ... 7 = Sunday) to match the app's Monday-first week convention.
 */
export type RecurrenceRule =
  | { type: 'daily'; interval: number }
  | { type: 'weekly'; interval: number; weekdays: number[] }
  | { type: 'monthly'; interval: number };

export type Category = {
  id: string;
  label: string;
  /** hex colour, e.g. "#4f46e5" */
  colour: string;
  sortOrder: number;
};

export type ViewName = 'month' | 'week' | 'day' | 'agenda';

export type AppSettings = {
  id: 'app';
  defaultView: ViewName;
};

export type EventRecord = {
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) of the first/original occurrence */
  date: string;
  /** HH:mm, or null for an all-day event */
  start: string | null;
  end: string | null;
  allDay: boolean;
  categoryId: string;
  notes: string;
  recurrence: RecurrenceRule | null;
  /** ISO dates of occurrences removed via "delete this occurrence only" */
  exceptions: string[];
  /** Minutes before the event to fire a local notification, or null for no reminder. */
  reminderMinutesBefore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type EventInput = Omit<
  EventRecord,
  'id' | 'createdAt' | 'updatedAt' | 'exceptions'
>;

/** A single expanded occurrence of an event, ready to render on a given date. */
export type EventOccurrence = EventRecord & {
  occurrenceDate: string;
};
