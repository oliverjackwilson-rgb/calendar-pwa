import { describe, expect, it } from 'vitest';
import { expandEventOccurrences } from './recurrence';
import type { EventRecord } from './schema';

function baseEvent(overrides: Partial<EventRecord>): EventRecord {
  return {
    id: 'evt-1',
    title: 'Test event',
    date: '2026-07-09',
    start: null,
    end: null,
    allDay: true,
    categoryId: 'uni',
    notes: '',
    recurrence: null,
    exceptions: [],
    reminderMinutesBefore: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('expandEventOccurrences', () => {
  it('returns the single date for a non-recurring event that falls in range', () => {
    const event = baseEvent({ date: '2026-07-09', recurrence: null });
    expect(expandEventOccurrences(event, '2026-07-01', '2026-07-31')).toEqual([
      '2026-07-09',
    ]);
    expect(expandEventOccurrences(event, '2026-08-01', '2026-08-31')).toEqual([]);
  });

  it('expands a weekly rule with multiple weekdays ("every Mon+Thu")', () => {
    // Anchor is Thursday 9 July 2026. Weekdays are ISO: 1 = Mon, 4 = Thu.
    const event = baseEvent({
      date: '2026-07-09',
      recurrence: { type: 'weekly', interval: 1, weekdays: [1, 4] },
    });

    const result = expandEventOccurrences(event, '2026-07-06', '2026-07-27');

    // The Monday in the anchor's own week (7 July) is excluded because it
    // falls before the series actually starts (9 July).
    expect(result).toEqual([
      '2026-07-09',
      '2026-07-13',
      '2026-07-16',
      '2026-07-20',
      '2026-07-23',
      '2026-07-27',
    ]);
  });

  it('expands an every-2-weeks rule, skipping the off weeks', () => {
    const event = baseEvent({
      date: '2026-07-06', // Monday
      recurrence: { type: 'weekly', interval: 2, weekdays: [1] },
    });

    const result = expandEventOccurrences(event, '2026-07-06', '2026-08-17');

    expect(result).toEqual(['2026-07-06', '2026-07-20', '2026-08-03', '2026-08-17']);
  });

  it('handles monthly recurrence across month-end boundaries', () => {
    // 31 Jan has no equivalent in February — date-fns clamps to the last
    // day of the target month (29 Feb in a leap year, then back to 31/30).
    const event = baseEvent({
      date: '2024-01-31',
      recurrence: { type: 'monthly', interval: 1 },
    });

    const result = expandEventOccurrences(event, '2024-01-01', '2024-04-30');

    expect(result).toEqual(['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']);
  });

  it('excludes dates listed in exceptions ("delete this occurrence only")', () => {
    const event = baseEvent({
      date: '2026-07-06', // Monday
      recurrence: { type: 'weekly', interval: 1, weekdays: [1] },
      exceptions: ['2026-07-13'],
    });

    const result = expandEventOccurrences(event, '2026-07-06', '2026-07-27');

    expect(result).toEqual(['2026-07-06', '2026-07-20', '2026-07-27']);
  });

  it('carries a weekly rule across a calendar year boundary', () => {
    const event = baseEvent({
      date: '2026-12-28', // Monday
      recurrence: { type: 'weekly', interval: 1, weekdays: [1] },
    });

    const result = expandEventOccurrences(event, '2026-12-28', '2027-01-11');

    expect(result).toEqual(['2026-12-28', '2027-01-04', '2027-01-11']);
  });

  it('carries a monthly rule across a calendar year boundary, clamping Feb in a non-leap year', () => {
    const event = baseEvent({
      date: '2026-12-31',
      recurrence: { type: 'monthly', interval: 1 },
    });

    const result = expandEventOccurrences(event, '2026-12-01', '2027-02-28');

    expect(result).toEqual(['2026-12-31', '2027-01-31', '2027-02-28']);
  });

  it('treats a non-positive interval as 1 instead of hanging (corrupted/imported data safety)', () => {
    const monthly = baseEvent({
      date: '2026-01-15',
      recurrence: { type: 'monthly', interval: 0 },
    });
    expect(expandEventOccurrences(monthly, '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);

    const daily = baseEvent({
      date: '2026-01-01',
      recurrence: { type: 'daily', interval: 0 },
    });
    expect(expandEventOccurrences(daily, '2026-01-01', '2026-01-05')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
    ]);
  });
});
