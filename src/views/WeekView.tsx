import { useMemo } from 'react';
import { EventListItem } from '../components/EventListItem';
import { type EventOccurrence, useCategories, useEventsForRange } from '../db';
import { groupOccurrencesByDate, sortOccurrencesByTime } from '../lib/eventGrouping';
import { formatDayNumber, formatWeekdayShort, getWeekDays, isTodayDate, toIsoDate } from '../lib/dates';

type WeekViewProps = {
  viewDate: Date;
  onSelectEvent: (occurrence: EventOccurrence) => void;
};

export function WeekView({ viewDate, onSelectEvent }: WeekViewProps) {
  const days = useMemo(() => getWeekDays(viewDate), [viewDate]);
  const rangeStartISO = toIsoDate(days[0]);
  const rangeEndISO = toIsoDate(days[6]);

  const occurrences = useEventsForRange(rangeStartISO, rangeEndISO);
  const categories = useCategories();

  const occurrencesByDate = useMemo(() => groupOccurrencesByDate(occurrences), [occurrences]);
  const categoryColour = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) map.set(category.id, category.colour);
    return map;
  }, [categories]);

  return (
    <div className="flex flex-1 flex-col divide-y divide-gray-100 dark:divide-gray-900">
      {days.map((day) => {
        const iso = toIsoDate(day);
        const dayOccurrences = [...(occurrencesByDate.get(iso) ?? [])].sort(sortOccurrencesByTime);
        const today = isTodayDate(day);

        return (
          <section key={iso} className={today ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}>
            <h2 className="sticky top-0 flex items-center gap-2 bg-inherit px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  today ? 'bg-indigo-600 text-xs text-white' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {formatDayNumber(day)}
              </span>
              <span>{formatWeekdayShort(day)}</span>
            </h2>
            {dayOccurrences.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-gray-400 dark:text-gray-600">No events</p>
            ) : (
              <ul className="pb-2">
                {dayOccurrences.map((occurrence) => (
                  <EventListItem
                    key={occurrence.id + occurrence.occurrenceDate}
                    occurrence={occurrence}
                    categoryColour={categoryColour.get(occurrence.categoryId)}
                    onClick={() => onSelectEvent(occurrence)}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
