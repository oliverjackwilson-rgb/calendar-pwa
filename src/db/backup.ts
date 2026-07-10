import { db } from './db';
import { downloadTextFile } from '../lib/download';
import { buildIcsCalendar } from '../lib/ics';
import { todayIso } from '../lib/dates';
import type { AppSettings, Category, EventRecord, RecurrenceRule } from './schema';

const SUPPORTED_SCHEMA_VERSION = 1;

export type BackupPayload = {
  schemaVersion: number;
  exportedAt: string;
  events: EventRecord[];
  categories: Category[];
  settings?: AppSettings;
};

export type ImportSummary = {
  newEvents: number;
  updatedEvents: number;
  newCategories: number;
  updatedCategories: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const HEX_COLOUR_RE = /^#[0-9a-fA-F]{6}$/;
const VIEW_NAMES = new Set(['month', 'week', 'day', 'agenda']);

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isValidRecurrenceRule(value: unknown): value is RecurrenceRule | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const rule = value as Record<string, unknown>;
  if (rule.type === 'daily' || rule.type === 'monthly') {
    return isPositiveInteger(rule.interval);
  }
  if (rule.type === 'weekly') {
    return (
      isPositiveInteger(rule.interval) &&
      Array.isArray(rule.weekdays) &&
      rule.weekdays.length > 0 &&
      rule.weekdays.every((d) => typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7)
    );
  }
  return false;
}

function isValidCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) return false;
  const { id, label, colour, sortOrder } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    typeof label === 'string' &&
    typeof colour === 'string' &&
    HEX_COLOUR_RE.test(colour) &&
    typeof sortOrder === 'number' &&
    Number.isFinite(sortOrder)
  );
}

function isValidEvent(value: unknown): value is EventRecord {
  if (typeof value !== 'object' || value === null) return false;
  const {
    id,
    title,
    date,
    start,
    end,
    allDay,
    categoryId,
    notes,
    recurrence,
    exceptions,
    reminderMinutesBefore,
    createdAt,
    updatedAt,
  } = value as Record<string, unknown>;

  if (typeof id !== 'string' || id.length === 0) return false;
  if (typeof title !== 'string') return false;
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  if (!(start === null || (typeof start === 'string' && TIME_RE.test(start)))) return false;
  if (!(end === null || (typeof end === 'string' && TIME_RE.test(end)))) return false;
  if (typeof allDay !== 'boolean') return false;
  if (typeof categoryId !== 'string') return false;
  if (typeof notes !== 'string') return false;
  if (!isValidRecurrenceRule(recurrence)) return false;
  if (!Array.isArray(exceptions) || !exceptions.every((x) => typeof x === 'string')) return false;
  if (!(reminderMinutesBefore === null || typeof reminderMinutesBefore === 'number')) return false;
  if (typeof createdAt !== 'string') return false;
  if (typeof updatedAt !== 'string') return false;

  return true;
}

function isValidSettings(value: unknown): value is AppSettings {
  if (typeof value !== 'object' || value === null) return false;
  const { id, defaultView } = value as Record<string, unknown>;
  return id === 'app' && typeof defaultView === 'string' && VIEW_NAMES.has(defaultView);
}

export type ParseResult = { ok: true; payload: BackupPayload } | { ok: false; error: string };

/** Parses and thoroughly validates a backup file's contents before anything touches the database. */
export function parseBackupPayload(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "This file isn't valid JSON — it may be corrupted or not a backup file." };
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: "This doesn't look like a Calendar backup file." };
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.schemaVersion !== 'number') {
    return { ok: false, error: "This doesn't look like a Calendar backup file (missing schema version)." };
  }
  if (payload.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup was created by a newer version of the app and can’t be imported here.',
    };
  }
  if (typeof payload.exportedAt !== 'string') {
    return { ok: false, error: 'This backup file is missing its export date.' };
  }
  if (!Array.isArray(payload.events) || !payload.events.every(isValidEvent)) {
    return { ok: false, error: 'One or more events in this file are malformed — nothing was imported.' };
  }
  if (!Array.isArray(payload.categories) || !payload.categories.every(isValidCategory)) {
    return { ok: false, error: 'One or more categories in this file are malformed — nothing was imported.' };
  }
  if (payload.settings !== undefined && !isValidSettings(payload.settings)) {
    return { ok: false, error: 'The settings section of this file is malformed — nothing was imported.' };
  }

  return {
    ok: true,
    payload: {
      schemaVersion: payload.schemaVersion,
      exportedAt: payload.exportedAt,
      events: payload.events as EventRecord[],
      categories: payload.categories as Category[],
      settings: payload.settings as AppSettings | undefined,
    },
  };
}

export async function exportBackup(): Promise<void> {
  const [events, categories, settings] = await Promise.all([
    db.events.toArray(),
    db.categories.toArray(),
    db.settings.get('app'),
  ]);

  const payload: BackupPayload = {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    events,
    categories,
    settings,
  };

  downloadTextFile(
    `calendar-backup-${todayIso()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export async function exportEventsAsIcs(): Promise<void> {
  const [events, categories] = await Promise.all([db.events.toArray(), db.categories.toArray()]);
  downloadTextFile(
    `calendar-export-${todayIso()}.ics`,
    buildIcsCalendar(events, categories),
    'text/calendar'
  );
}

/** Counts, without writing anything, how many records will be added vs. overwritten. */
export async function summarizeImport(payload: BackupPayload): Promise<ImportSummary> {
  const [existingEventIds, existingCategoryIds] = await Promise.all([
    db.events.toCollection().primaryKeys(),
    db.categories.toCollection().primaryKeys(),
  ]);
  const eventIdSet = new Set(existingEventIds as string[]);
  const categoryIdSet = new Set(existingCategoryIds as string[]);

  let newEvents = 0;
  let updatedEvents = 0;
  for (const event of payload.events) {
    if (eventIdSet.has(event.id)) updatedEvents++;
    else newEvents++;
  }

  let newCategories = 0;
  let updatedCategories = 0;
  for (const category of payload.categories) {
    if (categoryIdSet.has(category.id)) updatedCategories++;
    else newCategories++;
  }

  return { newEvents, updatedEvents, newCategories, updatedCategories };
}

/**
 * Upserts every record by id inside one transaction, so a mid-import failure
 * can't leave the database half-merged. Existing records not present in the
 * file are left untouched — this merges into current data, it never wipes it.
 */
export async function commitImport(payload: BackupPayload): Promise<void> {
  await db.transaction('rw', db.events, db.categories, db.settings, async () => {
    await db.events.bulkPut(payload.events);
    await db.categories.bulkPut(payload.categories);
    if (payload.settings) {
      await db.settings.put(payload.settings);
    }
  });
}
