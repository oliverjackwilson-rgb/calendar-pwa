import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { EventListItem } from '../components/EventListItem';
import { type EventOccurrence, useCategories, useEventsForRange } from '../db';
import { groupOccurrencesByDate, sortOccurrencesByTime } from '../lib/eventGrouping';
import { addDaysToIso, formatAgendaHeading, parseIsoDate, todayIso } from '../lib/dates';

const AGENDA_DAYS = 30;

type AgendaViewProps = {
  onSelectEvent: (occurrence: EventOccurrence) => void;
  onCreate: (dateISO: string) => void;
};

export function AgendaView({ onSelectEvent, onCreate }: AgendaViewProps) {
  const [query, setQuery] = useState('');
  const startISO = todayIso();
  const endISO = addDaysToIso(startISO, AGENDA_DAYS - 1);

  const occurrences = useEventsForRange(startISO, endISO);
  const categories = useCategories();

  const trimmedQuery = query.trim().toLowerCase();
  const filteredOccurrences = useMemo(() => {
    if (!occurrences) return occurrences;
    if (!trimmedQuery) return occurrences;
    return occurrences.filter(
      (occurrence) =>
        occurrence.title.toLowerCase().includes(trimmedQuery) ||
        occurrence.notes.toLowerCase().includes(trimmedQuery)
    );
  }, [occurrences, trimmedQuery]);

  const occurrencesByDate = useMemo(
    () => groupOccurrencesByDate(filteredOccurrences),
    [filteredOccurrences]
  );
  const categoryColour = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) map.set(category.id, category.colour);
    return map;
  }, [categories]);

  const activeDates = useMemo(() => [...occurrencesByDate.keys()].sort(), [occurrencesByDate]);
  const isEmpty = filteredOccurrences !== undefined && activeDates.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-3 pb-1">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or notes"
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-base dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {isEmpty ? (
        <EmptyState
          message={trimmedQuery ? `No events match "${query.trim()}"` : 'Nothing coming up in the next 30 days'}
          actionLabel={trimmedQuery ? 'Clear search' : 'Add event'}
          onAction={() => (trimmedQuery ? setQuery('') : onCreate(startISO))}
        />
      ) : (
        <ul className="flex-1 divide-y divide-gray-100 dark:divide-gray-900">
          {activeDates.map((dateISO) => {
            const dayOccurrences = [...(occurrencesByDate.get(dateISO) ?? [])].sort(sortOccurrencesByTime);

            return (
              <li key={dateISO}>
                <h2 className="px-4 pt-3 pb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {formatAgendaHeading(parseIsoDate(dateISO))}
                </h2>
                <ul>
                  {dayOccurrences.map((occurrence) => (
                    <EventListItem
                      key={occurrence.id + occurrence.occurrenceDate}
                      occurrence={occurrence}
                      categoryColour={categoryColour.get(occurrence.categoryId)}
                      onClick={() => onSelectEvent(occurrence)}
                    />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
