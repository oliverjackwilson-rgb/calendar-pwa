import { useState } from 'react';
import { CategoryManager } from '../components/CategoryManager';
import {
  commitImport,
  DEFAULT_SETTINGS,
  exportBackup,
  exportEventsAsIcs,
  parseBackupPayload,
  summarizeImport,
  updateSettings,
  useSettings,
  type BackupPayload,
  type ImportSummary,
  type ViewName,
} from '../db';
import { getPermissionState, requestNotificationPermission } from '../notifications/permission';

type SettingsViewProps = {
  onBack: () => void;
};

const VIEW_OPTIONS: { id: ViewName; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

export function SettingsView({ onBack }: SettingsViewProps) {
  const settings = useSettings() ?? DEFAULT_SETTINGS;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Default view on open</h2>
          <div className="flex gap-2">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => updateSettings({ defaultView: option.id }).catch(console.error)}
                className={`min-h-11 flex-1 rounded-full text-sm font-medium ${
                  settings.defaultView === option.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <CategoryManager />
        </section>

        <section>
          <NotificationsSection />
        </section>

        <section>
          <DataSection />
        </section>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="safe-bottom min-h-11 border-t border-gray-100 px-4 text-sm font-medium text-indigo-600 dark:border-gray-900 dark:text-indigo-400"
      >
        ← Back
      </button>
    </div>
  );
}

function NotificationsSection() {
  const [permission, setPermission] = useState(getPermissionState());

  async function handleEnable() {
    const result = await requestNotificationPermission();
    setPermission(result);
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notifications</h2>

      {permission === 'unsupported' ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This browser doesn't support notifications, so event reminders aren't available here.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Reminders only fire while this app is open in a tab. There's no server behind this app
            — on Android, a closed or fully backgrounded app won't reliably deliver a reminder.
            Reliable background delivery needs Push notifications and a server, which this app
            deliberately doesn't have (it's fully offline and local-only).
          </p>
          {permission === 'granted' && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Reminders enabled</p>
          )}
          {permission === 'denied' && (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Blocked — enable notifications for this site in your browser settings to use
              reminders.
            </p>
          )}
          {permission === 'default' && (
            <button
              type="button"
              onClick={handleEnable}
              className="min-h-11 self-start rounded-full bg-indigo-600 px-4 text-sm font-medium text-white"
            >
              Enable reminders
            </button>
          )}
        </>
      )}
    </div>
  );
}

type ImportState =
  | { phase: 'idle' }
  | { phase: 'error'; message: string }
  | { phase: 'confirm'; payload: BackupPayload; summary: ImportSummary }
  | { phase: 'done'; summary: ImportSummary };

function DataSection() {
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' });

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseBackupPayload(text);
      if (!result.ok) {
        setImportState({ phase: 'error', message: result.error });
        return;
      }
      const summary = await summarizeImport(result.payload);
      setImportState({ phase: 'confirm', payload: result.payload, summary });
    } catch (error) {
      console.error(error);
      setImportState({ phase: 'error', message: 'Could not read that file.' });
    }
  }

  async function handleConfirmImport() {
    if (importState.phase !== 'confirm') return;
    const { payload, summary } = importState;
    try {
      await commitImport(payload);
      setImportState({ phase: 'done', summary });
    } catch (error) {
      console.error(error);
      setImportState({
        phase: 'error',
        message: 'Something went wrong while importing — no changes were made.',
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Data</h2>

      <button
        type="button"
        onClick={() => exportBackup().catch(console.error)}
        className="min-h-11 rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        Export backup (JSON)
      </button>

      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        Import backup (JSON)
        <input type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />
      </label>

      <button
        type="button"
        onClick={() => exportEventsAsIcs().catch(console.error)}
        className="min-h-11 rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        Export events (.ics for Google Calendar)
      </button>

      {importState.phase === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{importState.message}</p>
      )}

      {importState.phase === 'confirm' && (
        <div className="flex flex-col gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-900 dark:bg-indigo-950">
          <p className="text-indigo-900 dark:text-indigo-100">
            This backup has {importState.summary.newEvents} new and {importState.summary.updatedEvents}{' '}
            updated events, {importState.summary.newCategories} new and{' '}
            {importState.summary.updatedCategories} updated categories. Existing data not in this
            file is left untouched. Continue?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmImport}
              className="min-h-11 flex-1 rounded-full bg-indigo-600 text-sm font-medium text-white"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => setImportState({ phase: 'idle' })}
              className="min-h-11 flex-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {importState.phase === 'done' && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          Imported {importState.summary.newEvents + importState.summary.updatedEvents} events and{' '}
          {importState.summary.newCategories + importState.summary.updatedCategories} categories.
        </p>
      )}
    </div>
  );
}
