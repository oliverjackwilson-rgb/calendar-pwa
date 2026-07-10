import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { getEventOccurrencesForRange } from './events';
import type { Category, EventOccurrence } from './schema';

/**
 * Live-updating list of event occurrences in [startISO, endISO]. Recomputes
 * automatically whenever the underlying events change. Returns `undefined`
 * while the first query is still loading.
 */
export function useEventsForRange(
  startISO: string,
  endISO: string
): EventOccurrence[] | undefined {
  return useLiveQuery(
    () => getEventOccurrencesForRange(startISO, endISO),
    [startISO, endISO]
  );
}

/** Live-updating list of categories, ordered by sortOrder. */
export function useCategories(): Category[] | undefined {
  return useLiveQuery(() => db.categories.orderBy('sortOrder').toArray(), []);
}
