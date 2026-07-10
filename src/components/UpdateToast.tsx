import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * registerType is 'prompt' (see vite.config.ts) — a new service worker
 * installs in the background but waits for the user to confirm before
 * taking over, so a deploy never silently swaps the app out from under
 * whatever the user is doing.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="safe-bottom fixed inset-x-4 bottom-20 z-50 flex items-center justify-between gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-gray-800">
      <span>Update available</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="min-h-11 rounded-full bg-indigo-600 px-3 font-medium active:bg-indigo-700"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss"
          className="flex min-h-11 min-w-11 items-center justify-center text-gray-400"
        >
          ×
        </button>
      </div>
    </div>
  );
}
