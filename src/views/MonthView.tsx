import { useMemo, useRef } from 'react';
import { useCategories, useEventsForRange } from '../db';
import { groupOccurrencesByDate } from '../lib/eventGrouping';
import {
  addMonthsTo,
  formatDayNumber,
  getMonthGridDays,
  isSameMonthAs,
  isTodayDate,
  toIsoDate,
} from '../lib/dates';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_DOTS = 4;
const SWIPE_THRESHOLD_PX = 50;

type MonthViewProps = {
  viewDate: Date;
  onChangeMonth: (date: Date) => void;
  onSelectDay: (date: Date) => void;
};

export function MonthView({ viewDate, onChangeMonth, onSelectDay }: MonthViewProps) {
  const days = useMemo(() => getMonthGridDays(viewDate), [viewDate]);
  const rangeStartISO = toIsoDate(days[0]);
  const rangeEndISO = toIsoDate(days[days.length - 1]);

  const occurrences = useEventsForRange(rangeStartISO, rangeEndISO);
  const categories = useCategories();

  const occurrencesByDate = useMemo(() => groupOccurrencesByDate(occurrences), [occurrences]);
  const categoryColour = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) map.set(category.id, category.colour);
    return map;
  }, [categories]);

  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (delta > SWIPE_THRESHOLD_PX) onChangeMonth(addMonthsTo(viewDate, -1));
    else if (delta < -SWIPE_THRESHOLD_PX) onChangeMonth(addMonthsTo(viewDate, 1));
  }

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid grid-cols-7 border-b border-gray-200 text-center text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const iso = toIsoDate(day);
          const dayOccurrences = occurrencesByDate.get(iso) ?? [];
          const dots = dayOccurrences.slice(0, MAX_DOTS);
          const overflow = dayOccurrences.length - dots.length;
          const inMonth = isSameMonthAs(day, viewDate);
          const today = isTodayDate(day);

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`flex min-h-11 flex-col items-center gap-1 border-b border-r border-gray-100 py-1 dark:border-gray-900 ${
                inMonth ? '' : 'text-gray-300 dark:text-gray-700'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                  today ? 'bg-indigo-600 text-white' : ''
                }`}
              >
                {formatDayNumber(day)}
              </span>
              <span className="flex h-2 items-center gap-0.5">
                {dots.map((occurrence) => (
                  <span
                    key={occurrence.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: categoryColour.get(occurrence.categoryId) ?? '#9ca3af' }}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] leading-none text-gray-500 dark:text-gray-400">
                    +{overflow}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
