'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User as UserIcon, Heart, Info, MapPin } from 'lucide-react';
import { format, addDays, subDays, startOfDay, endOfDay, isSameDay, differenceInMinutes, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTitle } from '@/components/TitleContext';
import { getContrastColor, cn } from '@/lib/utils';
import EventModal from '@/components/EventModal';

interface Worker {
  id: string;
  name: string;
  color: string;
  role: string;
}

interface PlanningEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  userId: string;
  type: 'ASSIGNMENT' | 'APPOINTMENT';
  backgroundColor: string;
  patientName?: string;
  workerName?: string;
  location?: string;
  status?: string;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h to 20h
const SLOT_HEIGHT = 80; // pixels per hour (h-20 in tailwind approx)
const START_HOUR = 8;

export default function TeamPlanningPage() {
  const { setTitle } = useTitle();
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<'ASSIGNMENT' | 'APPOINTMENT'>('ASSIGNMENT');

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    setTitle("Planning Équipe");
    fetchData();
  }, [selectedDate, setTitle]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, assignmentsRes, appointmentsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/assignments'),
        fetch('/api/appointments')
      ]);

      if (usersRes.ok && assignmentsRes.ok && appointmentsRes.ok) {
        const allUsers: Worker[] = await usersRes.json();
        const allAssignments = await assignmentsRes.json();
        const allAppointments = await appointmentsRes.json();

        // Filtrer les intervenants (ADMIN ou USER, pas de VISITEUR ni le compte 'admin' principal)
        const activeWorkers = allUsers.filter(u => u.role !== 'VISITEUR' && u.name !== 'admin');
        setWorkers(activeWorkers);

        // Combine and filter events for selected date
        const combined = [...allAssignments, ...allAppointments]
          .filter(e => isSameDay(parseISO(e.start), selectedDate))
          .map(e => ({
            id: e.id,
            title: e.title,
            startTime: e.start,
            endTime: e.end,
            userId: e.extendedProps?.userId,
            type: e.extendedProps?.type,
            backgroundColor: e.backgroundColor,
            patientName: e.extendedProps?.patientName || e.patientName,
            workerName: e.extendedProps?.workerName,
            location: e.extendedProps?.location,
            status: e.extendedProps?.status
          }));

        setEvents(combined);
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventStyle = (event: PlanningEvent) => {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);

    const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const durationMinutes = differenceInMinutes(end, start);

    const top = (startMinutes / 60) * SLOT_HEIGHT;
    const height = (durationMinutes / 60) * SLOT_HEIGHT;

    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: event.backgroundColor,
      color: getContrastColor(event.backgroundColor)
    };
  };

  const isVisitor = (session?.user?.role as any) === 'VISITEUR';

  if (isVisitor) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="p-4 bg-amber-100 text-amber-600 rounded-full">
          <Info size={48} />
        </div>
        <h2 className="text-xl font-bold">Accès non autorisé</h2>
        <p className="text-slate-500">Les comptes Visiteur ne peuvent pas consulter le planning d'équipe.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Header & Date Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 gap-3 sm:gap-6 sticky top-0 z-30">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="p-2 sm:p-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/20 flex-shrink-0">
            <CalendarIcon className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight truncate leading-tight">Planning Équipe</h1>
            <p className="text-xs sm:text-base text-slate-500 font-medium capitalize truncate">
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })} <span className="hidden sm:inline">{format(selectedDate, 'yyyy')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 bg-slate-50 dark:bg-slate-800/50 p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="rounded-lg sm:rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm h-8 w-8 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSelectedDate(new Date())}
            className="text-[10px] sm:text-xs font-black uppercase px-3 py-1.5 sm:px-6 sm:py-5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-700 shadow-sm border-none flex-1 sm:flex-none justify-center h-8 sm:h-auto"
          >
            Aujourd'hui
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="rounded-lg sm:rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm h-8 w-8 sm:h-10 sm:w-10"
          >
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Chargement du planning...</p>
        </div>
      ) : (
        <>
          {/* Desktop View: Timeline Grid */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <div style={{ minWidth: `${Math.max(800, workers.length * 180)}px` }}>

                {/* Grid Header: Workers */}
                <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(180px,1fr))] border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-20 backdrop-blur-md">
                  <div className="h-20 flex items-center justify-center border-r border-slate-100 dark:border-slate-800">
                    <Clock size={20} className="text-slate-400" />
                  </div>
                  {workers.map(worker => (
                    <div key={worker.id} className="h-20 flex flex-col items-center justify-center p-3 border-r border-slate-100 last:border-r-0 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: worker.color }} />
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[140px] tracking-tight">{worker.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grid Body: Hours & Events */}
                <div className="relative grid grid-cols-[100px_repeat(auto-fit,minmax(180px,1fr))]">

                  {/* Time Column */}
                  <div className="flex flex-col bg-slate-50/30 dark:bg-slate-900/20 border-r border-slate-100 dark:border-slate-800">
                    {HOURS.map(hour => (
                      <div key={hour} className="h-20 flex items-start justify-center pt-3 text-[11px] font-black text-slate-400 dark:text-slate-500 border-b border-slate-100/50 dark:border-slate-800/50">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Worker Columns */}
                  {workers.map(worker => {
                    const workerEvents = events.filter(e => e.userId === worker.id);

                    return (
                      <div key={worker.id} className="relative border-r border-slate-100 last:border-r-0 dark:border-slate-800 group">
                        {HOURS.map(hour => (
                          <div key={hour} className="h-20 border-b border-slate-100/50 dark:border-slate-800/50 group-hover:bg-slate-50/30 dark:group-hover:bg-slate-800/10 transition-colors" />
                        ))}

                        {/* Event Cards */}
                        {workerEvents.map(event => {
                          const style = getEventStyle(event);
                          const isCancelled = event.status === 'CANCELLED';
                          const start = parseISO(event.startTime);
                          const end = parseISO(event.endTime);
                          const durationMin = differenceInMinutes(end, start);
                          const durationStr = durationMin >= 60
                            ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? (durationMin % 60).toString().padStart(2, '0') : ''}`
                            : `${durationMin}min`;

                          return (
                            <div
                              key={event.id}
                              onClick={() => {
                                setSelectedEventId(event.id);
                                setSelectedEventType(event.type);
                                setIsModalOpen(true);
                              }}
                              className={cn(
                                "absolute left-2 right-2 rounded-xl shadow-md overflow-hidden transition-all active:scale-95 z-10 cursor-pointer hover:brightness-110 hover:shadow-lg border border-white/20",
                                isCancelled && "bg-hatched-pattern opacity-60 grayscale-[0.5]"
                              )}
                              style={style}
                            >
                              <div className="flex flex-col items-center justify-center p-1 text-center h-full gap-0.5">
                                <div className="font-black text-[12px] sm:text-[14px] leading-tight w-full line-clamp-1 px-1">
                                  {event.workerName || event.title}
                                </div>
                                {event.patientName && (
                                  <div className="font-extrabold text-[11px] sm:text-[13px] leading-tight w-full line-clamp-1 px-1 uppercase opacity-90">
                                    {event.patientName}
                                  </div>
                                )}
                                <div className="bg-black/10 rounded-lg font-black text-[10px] sm:text-xs px-2 py-0.5 mt-0.5 whitespace-nowrap">
                                  {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile View: Horizontal Timeline */}
          <div className="md:hidden flex flex-col gap-4 pb-20">
            {workers.map(worker => {
              const workerEvents = events.filter(e => e.userId === worker.id);

              return (
                <div key={worker.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
                  {/* Worker Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm" style={{ backgroundColor: worker.color, color: getContrastColor(worker.color) }}>
                      {worker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{worker.name}</h3>
                    </div>
                  </div>

                  {/* Timeline Track */}
                  <div className="relative h-16 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                    {/* Hour Markers */}
                    <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
                      {/* Simple makers for 8h, 12h, 16h, 20h to avoid clutter */}
                      {[8, 12, 16, 20].map(h => (
                        <div key={h} className="h-full border-l border-slate-200 dark:border-slate-700/50 text-[10px] text-slate-400 pt-1 pl-1">
                          {h}h
                        </div>
                      ))}
                    </div>

                    {/* Events */}
                    {workerEvents.map(event => {
                      const start = parseISO(event.startTime);
                      const end = parseISO(event.endTime);

                      const startHour = start.getHours();
                      const startMenu = start.getMinutes();

                      // Calculate position percentages based on 8:00 to 20:00 (12 hours)
                      const totalMinutesInDay = 12 * 60; // 8h to 20h
                      const startMinutesFrom8 = (startHour - 8) * 60 + startMenu;
                      const durationMinutes = differenceInMinutes(end, start);

                      const leftPercent = Math.max(0, Math.min(100, (startMinutesFrom8 / totalMinutesInDay) * 100));
                      const widthPercent = Math.max(0, Math.min(100 - leftPercent, (durationMinutes / totalMinutesInDay) * 100));
                      const isCancelled = event.status === 'CANCELLED';

                      return (
                        <div
                          key={event.id}
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setSelectedEventType(event.type);
                            setIsModalOpen(true);
                          }}
                          className={cn(
                            "absolute top-4 bottom-1 rounded-md shadow-sm border border-white/20 z-10 cursor-pointer active:scale-95 transition-transform flex items-center justify-center overflow-hidden",
                            isCancelled && "opacity-60 grayscale"
                          )}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: event.backgroundColor,
                            color: getContrastColor(event.backgroundColor)
                          }}
                        >
                          {/* Minimalism for mobile timeline: just icon or very short text */}
                          <div className="text-[10px] font-bold truncate px-1 text-center leading-none">
                            {event.patientName ? event.patientName.split(' ')[0] : (event.title || 'RDV')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
            {/* Show message if no workers found or no events (if filtering enabled) */}
            {workers.length === 0 && (
              <div className="text-center py-10 text-slate-400">Aucun intervenant trouvé</div>
            )}
          </div>
        </>
      )}

      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEventId(null);
        }}
        onSave={() => {
          fetchData();
        }}
        selectedDate={selectedDate}
        eventId={selectedEventId}
        eventType={selectedEventType}
      />
    </div>
  );
}
