import type { ViewName } from '../db';

export type Tab = ViewName;

const TABS: { id: Tab; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

type BottomNavProps = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="safe-bottom flex border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center py-2 text-sm font-medium ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
