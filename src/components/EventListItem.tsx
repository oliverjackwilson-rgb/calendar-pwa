import type { EventOccurrence } from '../db';

type EventListItemProps = {
  occurrence: EventOccurrence;
  categoryColour: string | undefined;
  onClick: () => void;
};

export function EventListItem({ occurrence, categoryColour, onClick }: EventListItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left active:bg-gray-50 dark:active:bg-gray-900"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColour ?? '#9ca3af' }}
        />
        <span className="w-14 shrink-0 text-xs text-gray-500 dark:text-gray-400">
          {occurrence.allDay ? 'All day' : (occurrence.start ?? '')}
        </span>
        <span className="truncate text-sm text-gray-900 dark:text-gray-100">
          {occurrence.title}
        </span>
      </button>
    </li>
  );
}
