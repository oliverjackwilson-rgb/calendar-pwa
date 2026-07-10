type HeaderProps = {
  title: string;
  onSettingsClick: () => void;
};

export function Header({ title, onSettingsClick }: HeaderProps) {
  return (
    <header className="safe-top relative flex items-center justify-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      <button
        type="button"
        onClick={onSettingsClick}
        aria-label="Settings"
        className="absolute right-2 flex min-h-11 min-w-11 items-center justify-center text-xl text-gray-500 dark:text-gray-400"
      >
        ⚙
      </button>
    </header>
  );
}
