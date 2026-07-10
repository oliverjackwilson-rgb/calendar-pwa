import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'calendar-pwa:installHintDismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Shown from first visit until dismissed. On Android Chrome we can capture
 * the native install prompt and trigger it directly. iOS Safari has no
 * beforeinstallprompt at all — and its install flow (Share icon → Add to
 * Home Screen) is different enough from desktop/Android's menu-based flow
 * that showing the wrong instructions is actively confusing, so it gets its
 * own copy rather than a generic fallback.
 */
export function InstallHint() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      dismiss();
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (!installEvent) {
      dismiss();
      return;
    }
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    dismiss();
  }

  if (dismissed || isRunningStandalone()) return null;

  return (
    <div className="mx-3 mt-3 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
      <span className="flex-1">
        {installEvent
          ? 'Add Calendar to your Home Screen for quick, full-screen, offline access.'
          : isIos()
            ? 'For quick, full-screen, offline access: open this in Safari, tap the Share icon, then "Add to Home Screen".'
            : 'For quick, full-screen, offline access, add Calendar to your Home Screen from your browser menu (⋮ → Add to Home Screen).'}
      </span>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {installEvent && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="min-h-11 rounded-full bg-indigo-600 px-3 text-xs font-medium text-white active:bg-indigo-700"
          >
            Add to Home Screen
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 px-2 text-xs font-medium text-indigo-500 dark:text-indigo-300"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
