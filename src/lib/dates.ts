import {
  addDays,
  addMinutes,
  addMonths,
  format,
  getISODay,
  isSameMonth,
  isToday,
  isTomorrow,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/** e.g. "July 2026" */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

/** UK display format, e.g. "10/07/2026" */
export function formatUkDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

/** ISO date string (YYYY-MM-DD) as used for storage */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parses a stored ISO date string (YYYY-MM-DD) back into a Date. */
export function parseIsoDate(iso: string): Date {
  return parseISO(iso);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function addDaysToIso(iso: string, amount: number): string {
  return toIsoDate(addDays(parseIsoDate(iso), amount));
}

export function addMonthsTo(date: Date, amount: number): Date {
  return addMonths(date, amount);
}

export function isTodayDate(date: Date): boolean {
  return isToday(date);
}

export function isTomorrowDate(date: Date): boolean {
  return isTomorrow(date);
}

export function isSameMonthAs(a: Date, b: Date): boolean {
  return isSameMonth(a, b);
}

/** ISO weekday of a stored date string: 1 = Monday ... 7 = Sunday. */
export function isoWeekdayOf(iso: string): number {
  return getISODay(parseIsoDate(iso));
}

/** 42 days (6 full weeks), Monday-start, covering the month containing `monthDate`. */
export function getMonthGridDays(monthDate: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** The 7 days (Monday-start) of the week containing `date`. */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Day-of-month number, e.g. "9" */
export function formatDayNumber(date: Date): string {
  return format(date, 'd');
}

/** Short weekday label, e.g. "Mon" */
export function formatWeekdayShort(date: Date): string {
  return format(date, 'EEE');
}

/** e.g. "Thursday 9 July" */
export function formatDayHeading(date: Date): string {
  return format(date, 'EEEE d MMMM');
}

/** "Today" / "Tomorrow" / e.g. "Monday 13 Jul" */
export function formatAgendaHeading(date: Date): string {
  if (isTodayDate(date)) return 'Today';
  if (isTomorrowDate(date)) return 'Tomorrow';
  return format(date, 'EEEE d MMM');
}

/** e.g. "6–12 Jul 2026", crossing months/years as needed. */
export function formatWeekRange(date: Date): string {
  const days = getWeekDays(date);
  const start = days[0];
  const end = days[6];

  if (isSameMonth(start, end)) {
    return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  }
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

/** Current time as "HH:mm", for the Day view's "now" divider. */
export function nowTimeLabel(): string {
  return format(new Date(), 'HH:mm');
}

/** Combines a stored ISO date and "HH:mm" time into one Date. */
export function combineDateAndTime(dateISO: string, time: string): Date {
  return parseISO(`${dateISO}T${time}`);
}

export function addMinutesTo(date: Date, amount: number): Date {
  return addMinutes(date, amount);
}
