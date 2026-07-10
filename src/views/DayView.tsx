import { Fragment, useMemo } from 'react';
import { EmptyState } from '../components/EmptyState';
import { EventListItem } from '../components/EventListItem';
import { type EventOccurrence, useCategories, useEventsForRange } from '../db';
import { isTodayDate, nowTimeLabel, toIsoDate } from '../lib/dates';

type DayViewProps = {
  viewDate: Date;
  onSelectEvent: (occurrence: EventOccurrence) => void;
  onCreate: (dateISO: string) => void;
};

export function DayView({ viewDate, onSelectEvent, onCreate }: DayViewProps) {
  const iso = toIsoDate(viewDate);
  const occurrences = useEventsForRange(iso, iso);
  const categories = useCategories();

  const categoryColour = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) map.set(category.id, category.colour);
    return map;
  }, [categories]);

  const allDayEvents = useMemo(
    () => (occurrences ?? []).filter((occurrence) => occurrence.allDay),
    [occurrences]
  );
  const timedEvents = useMemo(
    () =>
      (occurrences ?? [])
        .filter((occurrence) => !occurrence.allDay)
        .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')),
    [occurrences]
  );

  const today = isTodayDate(viewDate);
  const nowLabel = nowTimeLabel();
  const nowIndex = today ? timedEvents.findIndex((o) => (o.start ?? '') > nowLabel) : -1;
  const nowGoesAtEnd = today && nowIndex === -1;

  if (occurrences !== undefined && occurrences.length === 0) {
    return <EmptyState message="No events today" actionLabel="Add event" onAction={() => onCreate(iso)} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      {allDayEvents.length > 0 && (
        <ul className="border-b border-gray-100 dark:border-gray-900">
          {allDayEvents.map((occurrence) => (
            <EventListItem
              key={occurrence.id + occurrence.occurrenceDate}
              occurrence={occurrence}
              categoryColour={categoryColour.get(occurrence.categoryId)}
              onClick={() => onSelectEvent(occurrence)}
            />
          ))}
        </ul>
      )}
      <ul className="flex-1">
        {timedEvents.map((occurrence, index) => (
          <Fragment key={occurrence.id + occurrence.occurrenceDate}>
            {today && index === nowIndex && <NowDivider label={nowLabel} />}
            <EventListItem
              occurrence={occurrence}
              categoryColour={categoryColour.get(occurrence.categoryId)}
              onClick={() => onSelectEvent(occurrence)}
            />
          </Fragment>
        ))}
        {nowGoesAtEnd && <NowDivider label={nowLabel} />}
      </ul>
    </div>
  );
}

function NowDivider({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 px-4 py-1" aria-hidden="true">
      <span className="h-px flex-1 bg-red-400" />
      <span className="text-xs font-medium text-red-500">{label}</span>
      <span className="h-px flex-1 bg-red-400" />
    </li>
  );
}
