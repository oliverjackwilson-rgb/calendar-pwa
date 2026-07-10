import { useEffect, useRef } from 'react';
import { useEventsForRange } from '../db';
import { addDaysToIso, addMinutesTo, combineDateAndTime, todayIso } from '../lib/dates';
import { getPermissionState } from './permission';

const CHECK_INTERVAL_MS = 20_000;
const LOOKAHEAD_DAYS = 2;

/**
 * Best-effort, foreground-only reminders: this only fires while the app is
 * open in a tab. There is no Push API + server here, so on Android a closed
 * or fully backgrounded PWA will not receive reminders — see the
 * "Notifications" section in Settings for the full explanation shown to
 * the user.
 */
export function useReminderScheduler(): void {
  const startISO = todayIso();
  const endISO = addDaysToIso(startISO, LOOKAHEAD_DAYS);
  const occurrences = useEventsForRange(startISO, endISO);
  const firedKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!occurrences) return;

    function checkDue() {
      if (getPermissionState() !== 'granted') return;
      const now = Date.now();

      for (const occurrence of occurrences ?? []) {
        if (occurrence.reminderMinutesBefore === null) continue;

        const key = `${occurrence.id}:${occurrence.occurrenceDate}`;
        if (firedKeys.current.has(key)) continue;

        const eventTime = combineDateAndTime(
          occurrence.occurrenceDate,
          occurrence.allDay ? '09:00' : (occurrence.start ?? '09:00')
        );
        const reminderTime = addMinutesTo(eventTime, -occurrence.reminderMinutesBefore);
        const msUntilDue = reminderTime.getTime() - now;

        if (msUntilDue > 0) continue; // not due yet

        // Fire only if we're within a few check cycles of the due time —
        // anything older (e.g. the tab was closed when it was due) is
        // stale and would just be confusing noise if surfaced now.
        if (msUntilDue > -CHECK_INTERVAL_MS * 3) {
          new Notification(occurrence.title, {
            body: occurrence.allDay ? 'All day' : `At ${occurrence.start ?? ''}`,
            tag: key,
          });
        }
        firedKeys.current.add(key);
      }
    }

    checkDue();
    const interval = setInterval(checkDue, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [occurrences]);
}
