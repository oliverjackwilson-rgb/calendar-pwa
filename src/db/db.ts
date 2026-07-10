import Dexie, { type EntityTable } from 'dexie';
import type { AppSettings, Category, EventRecord } from './schema';

/** The six default categories from CLAUDE.md, seeded on first run. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'uni', label: 'Uni', colour: '#4f46e5', sortOrder: 0 },
  { id: 'pharmacy', label: 'Pharmacy', colour: '#059669', sortOrder: 1 },
  { id: 'sainsburys', label: "Sainsbury's", colour: '#ea580c', sortOrder: 2 },
  { id: 'reselling', label: 'Reselling', colour: '#0891b2', sortOrder: 3 },
  { id: 'tanks', label: 'Tanks', colour: '#7c3aed', sortOrder: 4 },
  { id: 'personal', label: 'Personal', colour: '#db2777', sortOrder: 5 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  defaultView: 'month',
};

class CalendarDatabase extends Dexie {
  events!: EntityTable<EventRecord, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('calendar-pwa');

    this.version(1).stores({
      events: 'id, date, categoryId',
      categories: 'id, sortOrder',
    });

    this.version(2)
      .stores({
        events: 'id, date, categoryId',
        categories: 'id, sortOrder',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        // Older records predate the reminder feature — make the field
        // explicit rather than leaving it silently undefined at runtime.
        await tx
          .table('events')
          .toCollection()
          .modify((event: Partial<EventRecord>) => {
            if (event.reminderMinutesBefore === undefined) {
              event.reminderMinutesBefore = null;
            }
          });
        await tx.table('settings').put(DEFAULT_SETTINGS);
      });

    // Runs once, only when the database is created for the first time.
    this.on('populate', () => {
      this.categories.bulkAdd(DEFAULT_CATEGORIES);
      this.settings.add(DEFAULT_SETTINGS);
    });
  }
}

export const db = new CalendarDatabase();
