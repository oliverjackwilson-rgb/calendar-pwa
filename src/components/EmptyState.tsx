type EmptyStateProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="min-h-11 rounded-full bg-indigo-600 px-4 text-sm font-medium text-white active:bg-indigo-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}
