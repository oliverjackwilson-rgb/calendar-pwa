import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { BottomNav, type Tab } from './components/BottomNav';
import { EventEditSheet, type EventEditTarget } from './components/EventEditSheet';
import { FloatingActionButton } from './components/FloatingActionButton';
import { InstallHint } from './components/InstallHint';
import { UpdateToast } from './components/UpdateToast';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { DayView } from './views/DayView';
import { AgendaView } from './views/AgendaView';
import { SettingsView } from './views/SettingsView';
import { useSettings, type EventOccurrence } from './db';
import { useReminderScheduler } from './notifications/useReminderScheduler';
import { formatDayHeading, formatMonthYear, formatWeekRange, todayIso, toIsoDate } from './lib/dates';

function App() {
  const [tab, setTab] = useState<Tab>('month');
  const [viewDate, setViewDate] = useState(() => new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EventEditTarget | null>(null);

  useReminderScheduler();

  const settings = useSettings();
  const appliedDefaultView = useRef(false);
  useEffect(() => {
    if (settings && !appliedDefaultView.current) {
      setTab(settings.defaultView);
      appliedDefaultView.current = true;
    }
  }, [settings]);

  function goToDay(date: Date) {
    setViewDate(date);
    setTab('day');
  }

  function openCreateSheet(dateISO: string) {
    setEditTarget({ mode: 'create', date: dateISO });
  }

  function openEditSheet(occurrence: EventOccurrence) {
    setEditTarget({ mode: 'edit', occurrence });
  }

  const title = settingsOpen
    ? 'Settings'
    : tab === 'month'
      ? formatMonthYear(viewDate)
      : tab === 'week'
        ? formatWeekRange(viewDate)
        : tab === 'day'
          ? formatDayHeading(viewDate)
          : 'Agenda';

  const fabDateISO = tab === 'agenda' ? todayIso() : toIsoDate(viewDate);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-950">
      <Header title={title} onSettingsClick={() => setSettingsOpen(true)} />
      <InstallHint />
      <main className="relative flex flex-1 flex-col overflow-y-auto">
        {settingsOpen ? (
          <SettingsView onBack={() => setSettingsOpen(false)} />
        ) : (
          <>
            {tab === 'month' && (
              <MonthView viewDate={viewDate} onChangeMonth={setViewDate} onSelectDay={goToDay} />
            )}
            {tab === 'week' && <WeekView viewDate={viewDate} onSelectEvent={openEditSheet} />}
            {tab === 'day' && (
              <DayView viewDate={viewDate} onSelectEvent={openEditSheet} onCreate={openCreateSheet} />
            )}
            {tab === 'agenda' && (
              <AgendaView onSelectEvent={openEditSheet} onCreate={openCreateSheet} />
            )}
            <FloatingActionButton onClick={() => openCreateSheet(fabDateISO)} />
          </>
        )}
      </main>
      {!settingsOpen && <BottomNav active={tab} onChange={setTab} />}
      {editTarget && <EventEditSheet target={editTarget} onClose={() => setEditTarget(null)} />}
      <UpdateToast />
    </div>
  );
}

export default App;
