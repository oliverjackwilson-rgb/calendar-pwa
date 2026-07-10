import { useEffect, useRef, useState } from 'react';
import {
  createEvent,
  deleteEvent,
  deleteOccurrence,
  updateEvent,
  useCategories,
  type EventInput,
  type EventOccurrence,
  type RecurrenceRule,
} from '../db';
import { RecurrencePicker } from './RecurrencePicker';
import { isNotificationSupported } from '../notifications/permission';

const REMINDER_OPTIONS: { value: string; label: string; minutes: number | null }[] = [
  { value: 'none', label: 'No reminder', minutes: null },
  { value: '0', label: 'At time of event', minutes: 0 },
  { value: '5', label: '5 minutes before', minutes: 5 },
  { value: '15', label: '15 minutes before', minutes: 15 },
  { value: '30', label: '30 minutes before', minutes: 30 },
  { value: '60', label: '1 hour before', minutes: 60 },
  { value: '1440', label: '1 day before', minutes: 1440 },
];

export type EventEditTarget =
  | { mode: 'create'; date: string }
  | { mode: 'edit'; occurrence: EventOccurrence };

type EventEditSheetProps = {
  target: EventEditTarget;
  onClose: () => void;
};

type FormState = {
  title: string;
  date: string;
  allDay: boolean;
  start: string;
  end: string;
  categoryId: string;
  notes: string;
  recurrence: RecurrenceRule | null;
  reminderMinutesBefore: number | null;
};

function initialFormState(target: EventEditTarget): FormState {
  if (target.mode === 'edit') {
    const event = target.occurrence;
    return {
      title: event.title,
      date: event.date,
      allDay: event.allDay,
      start: event.start ?? '09:00',
      end: event.end ?? '10:00',
      categoryId: event.categoryId,
      notes: event.notes,
      recurrence: event.recurrence,
      reminderMinutesBefore: event.reminderMinutesBefore ?? null,
    };
  }
  return {
    title: '',
    date: target.date,
    allDay: false,
    start: '09:00',
    end: '10:00',
    categoryId: '',
    notes: '',
    recurrence: null,
    reminderMinutesBefore: null,
  };
}

function scrollFieldIntoView(event: React.FocusEvent<HTMLElement>) {
  event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

export function EventEditSheet({ target, onClose }: EventEditSheetProps) {
  const categories = useCategories();
  const [form, setForm] = useState<FormState>(() => initialFormState(target));
  const [titleError, setTitleError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // A synchronous (non-state) guard against double-submission: two rapid
  // taps on Save can both land as separate 'submit' events before React
  // re-renders and removes the sheet, which would otherwise create two
  // events. A ref flips immediately, with no render-cycle delay.
  const hasSubmitted = useRef(false);

  const isEdit = target.mode === 'edit';
  const isRecurring = isEdit && target.mode === 'edit' && target.occurrence.recurrence !== null;

  useEffect(() => {
    if (target.mode === 'create' && !form.categoryId && categories && categories.length > 0) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }));
    }
  }, [categories, target.mode, form.categoryId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (hasSubmitted.current) return;

    const title = form.title.trim();
    if (!title) {
      setTitleError(true);
      return;
    }
    if (!form.categoryId) {
      // Categories are still loading (a near-instant IndexedDB read) —
      // nothing to submit yet, but a moment later a retry will work fine.
      return;
    }

    hasSubmitted.current = true;

    const input: EventInput = {
      title,
      date: form.date,
      allDay: form.allDay,
      start: form.allDay ? null : form.start || null,
      end: form.allDay ? null : form.end || null,
      categoryId: form.categoryId,
      notes: form.notes,
      reminderMinutesBefore: form.reminderMinutesBefore,
      recurrence: form.recurrence,
    };

    // Optimistic UI: close the sheet immediately, let the write finish in the
    // background — useLiveQuery picks up the change as soon as it lands.
    if (target.mode === 'edit') {
      updateEvent(target.occurrence.id, input).catch(console.error);
    } else {
      createEvent(input).catch(console.error);
    }
    onClose();
  }

  function handleDeleteOccurrence() {
    if (target.mode !== 'edit') return;
    deleteOccurrence(target.occurrence.id, target.occurrence.occurrenceDate).catch(console.error);
    onClose();
  }

  function handleDeleteSeries() {
    if (target.mode !== 'edit') return;
    deleteEvent(target.occurrence.id).catch(console.error);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative flex max-h-[90vh] flex-col rounded-t-2xl bg-white dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Edit event' : 'New event'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-11 min-w-11 items-center justify-center text-xl text-gray-500 dark:text-gray-400"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="event-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Title
              </label>
              <input
                id="event-title"
                type="text"
                value={form.title}
                onFocus={scrollFieldIntoView}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  setTitleError(false);
                }}
                className="min-h-11 rounded-lg border border-gray-300 px-3 text-base dark:border-gray-700 dark:bg-gray-900"
                placeholder="Event title"
              />
              {titleError && <p className="text-sm text-red-600">Title is required</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="event-date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Date{isRecurring ? ' (series start)' : ''}
              </label>
              <input
                id="event-date"
                type="date"
                value={form.date}
                onFocus={scrollFieldIntoView}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="min-h-11 rounded-lg border border-gray-300 px-3 text-base dark:border-gray-700 dark:bg-gray-900"
              />
            </div>

            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                className="h-6 w-6"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All day</span>
            </label>

            {!form.allDay && (
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="event-start" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start
                  </label>
                  <input
                    id="event-start"
                    type="time"
                    value={form.start}
                    onFocus={scrollFieldIntoView}
                    onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                    className="min-h-11 rounded-lg border border-gray-300 px-3 text-base dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="event-end" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    End
                  </label>
                  <input
                    id="event-end"
                    type="time"
                    value={form.end}
                    onFocus={scrollFieldIntoView}
                    onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                    className="min-h-11 rounded-lg border border-gray-300 px-3 text-base dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</span>
              <div className="flex flex-wrap gap-2">
                {(categories ?? []).map((category) => {
                  const selected = form.categoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, categoryId: category.id }))}
                      style={{
                        backgroundColor: selected ? category.colour : undefined,
                        borderColor: category.colour,
                      }}
                      className={`min-h-11 rounded-full border px-3 text-sm ${
                        selected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isNotificationSupported() ? (
              <div className="flex flex-col gap-1">
                <label htmlFor="event-reminder" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reminder
                </label>
                <select
                  id="event-reminder"
                  value={form.reminderMinutesBefore === null ? 'none' : String(form.reminderMinutesBefore)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({
                      ...f,
                      reminderMinutesBefore: value === 'none' ? null : Number(value),
                    }));
                  }}
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base dark:border-gray-700 dark:bg-gray-900"
                >
                  {REMINDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-600">
                Reminders aren't supported in this browser.
              </p>
            )}

            <RecurrencePicker
              value={form.recurrence}
              anchorDateISO={form.date}
              onChange={(recurrence) => setForm((f) => ({ ...f, recurrence }))}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="event-notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              <textarea
                id="event-notes"
                value={form.notes}
                onFocus={scrollFieldIntoView}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>

          <div className="safe-bottom flex flex-col gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-900">
            {!confirmingDelete ? (
              <>
                <button
                  type="submit"
                  className="min-h-11 rounded-full bg-indigo-600 text-sm font-medium text-white active:bg-indigo-700"
                >
                  Save
                </button>
                {isEdit && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="min-h-11 text-sm font-medium text-red-600"
                  >
                    Delete
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">Delete this event?</p>
                {isRecurring ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteOccurrence}
                      className="min-h-11 rounded-full border border-red-600 text-sm font-medium text-red-600"
                    >
                      Delete this occurrence
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSeries}
                      className="min-h-11 rounded-full bg-red-600 text-sm font-medium text-white"
                    >
                      Delete entire series
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteSeries}
                    className="min-h-11 rounded-full bg-red-600 text-sm font-medium text-white"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="min-h-11 text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
