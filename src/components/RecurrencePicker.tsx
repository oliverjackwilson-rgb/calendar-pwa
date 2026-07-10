import type { RecurrenceRule } from '../db';
import { isoWeekdayOf } from '../lib/dates';

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

const TYPE_OPTIONS: { id: RecurrenceType; label: string }[] = [
  { id: 'none', label: 'Does not repeat' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const WEEKDAY_OPTIONS: { iso: number; label: string; fullName: string }[] = [
  { iso: 1, label: 'Mo', fullName: 'Monday' },
  { iso: 2, label: 'Tu', fullName: 'Tuesday' },
  { iso: 3, label: 'We', fullName: 'Wednesday' },
  { iso: 4, label: 'Th', fullName: 'Thursday' },
  { iso: 5, label: 'Fr', fullName: 'Friday' },
  { iso: 6, label: 'Sa', fullName: 'Saturday' },
  { iso: 7, label: 'Su', fullName: 'Sunday' },
];

type RecurrencePickerProps = {
  value: RecurrenceRule | null;
  anchorDateISO: string;
  onChange: (rule: RecurrenceRule | null) => void;
};

export function RecurrencePicker({ value, anchorDateISO, onChange }: RecurrencePickerProps) {
  const type: RecurrenceType = value?.type ?? 'none';

  function setType(next: RecurrenceType) {
    if (next === 'none') {
      onChange(null);
    } else if (next === 'daily') {
      onChange({ type: 'daily', interval: 1 });
    } else if (next === 'weekly') {
      onChange({ type: 'weekly', interval: 1, weekdays: [isoWeekdayOf(anchorDateISO)] });
    } else {
      onChange({ type: 'monthly', interval: 1 });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat</span>
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setType(option.id)}
            className={`min-h-11 rounded-full px-3 text-sm ${
              type === option.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {value?.type === 'weekly' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-0.5">
            {WEEKDAY_OPTIONS.map((weekday) => {
              const selected = value.weekdays.includes(weekday.iso);
              return (
                <button
                  key={weekday.iso}
                  type="button"
                  aria-pressed={selected}
                  aria-label={weekday.fullName}
                  onClick={() => {
                    const weekdays = selected
                      ? value.weekdays.filter((d) => d !== weekday.iso)
                      : [...value.weekdays, weekday.iso];
                    if (weekdays.length === 0) return;
                    onChange({ ...value, weekdays });
                  }}
                  className={`h-11 w-11 shrink-0 rounded-full text-xs font-medium ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {weekday.label}
                </button>
              );
            })}
          </div>
          <IntervalStepper
            label="week(s)"
            value={value.interval}
            onChange={(interval) => onChange({ ...value, interval })}
          />
        </div>
      )}

      {value?.type === 'daily' && (
        <IntervalStepper
          label="day(s)"
          value={value.interval}
          onChange={(interval) => onChange({ ...value, interval })}
        />
      )}

      {value?.type === 'monthly' && (
        <IntervalStepper
          label="month(s)"
          value={value.interval}
          onChange={(interval) => onChange({ ...value, interval })}
        />
      )}
    </div>
  );
}

function IntervalStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <span>Every</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
      >
        −
      </button>
      <span className="w-6 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
      >
        +
      </button>
      <span>{label}</span>
    </div>
  );
}
