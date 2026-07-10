import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from './db';
import type { AppSettings } from './schema';

/** Live-updating app settings. Returns `undefined` while the first query is still loading. */
export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => db.settings.get('app'), []);
}

export async function updateSettings(changes: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
  const current = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...current, ...changes });
}
