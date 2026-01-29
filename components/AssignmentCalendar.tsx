'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import EventModal from './EventModal';
import AppointmentManager from './AppointmentManager';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Heart, Calendar, Clock, Repeat, Plus } from 'lucide-react';
import { getContrastColor, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { Settings2, Trash2, X, CheckCircle, Ban, Users, ArrowRightLeft, Database } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Select } from './ui/Select';
import { FullCalendarEvent, Role } from '@/types';

export default function AssignmentCalendar() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading, error: fetchError } = useQuery<FullCalendarEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const [assignmentsRes, appointmentsRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/appointments')
      ]);

      if (!assignmentsRes.ok || !appointmentsRes.ok) throw new Error('Erreur de chargement');

      const assignments = await assignmentsRes.json();
      const appointments = await appointmentsRes.json();

      return [...assignments, ...appointments];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });



  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAppointmentManagerOpen, setIsAppointmentManagerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<'ASSIGNMENT' | 'APPOINTMENT'>('ASSIGNMENT');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; visible: boolean }>({
    x: 0,
    y: 0,
    text: '',
    visible: false
  });

  // Selection mode for batch management
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Map<string, { id: string; type: 'ASSIGNMENT' | 'APPOINTMENT' }>>(new Map());
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');

  const { data: session } = useSession();
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Erreur chargement utilisateurs');
      return res.json();
    },
    enabled: session?.user?.role === 'ADMIN'
  });
  const searchParams = useSearchParams();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const minSwipeDistance = 50;

  useEffect(() => {
    if (fetchError) {
      toast.error("Erreur de chargement des événements");
    }
  }, [fetchError]);

  // Sync selection mode with URL only on mount or URL change, but allow local toggle
  useEffect(() => {
    if (searchParams.get('action') === 'manage-appointments') {
      setIsAppointmentManagerOpen(true);
      router.replace('/');
    }

    // Reset selection mode on mount/navigation to ensure it's off by default
    setIsSelectionMode(false);
    setSelectedEvents(new Map());
    setIsReassignOpen(false);
  }, [searchParams, router]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      const newValue = !prev;
      if (!newValue) {
        setSelectedEvents(new Map());
        setIsReassignOpen(false);
      }
      return newValue;
    });
  };

  const handleDateClick = (arg: DateClickArg) => {
    if ((session?.user?.role as Role) === 'VISITEUR') return;
    setSelectedDate(arg.date);
    setSelectedEventId(null);
    setSelectedEventType('ASSIGNMENT'); // Default to assignment
    setIsEventModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    if ((session?.user?.role as Role) === 'VISITEUR') return;

    // En mode sélection, on ouvre quand même la modale
    // (la checkbox gère sa propre sélection via stopPropagation)
    const isAppointment = arg.event.extendedProps.type === 'APPOINTMENT';

    setSelectedEventId(arg.event.id);
    setSelectedEventType(isAppointment ? 'APPOINTMENT' : 'ASSIGNMENT');
    setIsEventModalOpen(true);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;

    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        if (distanceX > 0) {
          calendarApi.next();
        } else {
          calendarApi.prev();
        }
      }
    }
  };

  const handleEventChange = async (changeArg: { event: any; revert: () => void }) => {
    const { event } = changeArg;
    const isAppointment = event.extendedProps.type === 'APPOINTMENT';
    const id = isAppointment ? event.id.replace('apt-', '') : event.id;
    const url = isAppointment ? `/api/appointments/${id}` : `/api/assignments/${id}`;

    const updateData: any = {
      startTime: event.start?.toISOString(),
      endTime: event.end?.toISOString(),
      userId: event.extendedProps.userId,
    };

    if (isAppointment) {
      updateData.subject = event.extendedProps.subject;
      updateData.location = event.extendedProps.location;
      updateData.notes = event.extendedProps.notes;
      updateData.status = event.extendedProps.status;
    } else {
      updateData.patientId = event.extendedProps.patientId;
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        if (response.status === 409 && !isAppointment) {
          if (window.confirm(`${errorMsg}\n\nSouhaitez-vous quand même forcer la superposition ?`)) {
            const forceRes = await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...updateData, ignoreConflict: true }),
            });
            if (forceRes.ok) {
              toast.success("Intervention mise à jour (avec superposition)");
              handleSave();
              return;
            }
          }
        }
        toast.error(errorMsg || "Erreur lors de la mise à jour");
        changeArg.revert();
      } else {
        toast.success(isAppointment ? "Rendez-vous mis à jour" : "Intervention mise à jour");
        handleSave();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur réseau");
      changeArg.revert();
    }
  };

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, targetUserId }: { action: 'delete' | 'cancel' | 'complete' | 'reassign'; targetUserId?: string }) => {
      const response = await fetch('/api/bulk/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUserId,
          items: Array.from(selectedEvents.values())
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Opération groupée réussie");
      setSelectedEvents(new Map());
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.message}`);
    }
  });

  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div
      className="bg-white dark:bg-slate-800 py-2 px-[3px] sm:py-4 sm:px-[11px] md:py-6 md:px-[19px] rounded-lg shadow-md transition-colors [&_.fc-toolbar-title]:text-[12px] [&_.fc-toolbar-title]:sm:text-xl [&_.fc-toolbar-title]:capitalize [&_.fc-button]:text-[9px] [&_.fc-button]:sm:text-xs [&_.fc-button]:px-1 [&_.fc-button]:sm:px-2 [&_.fc-header-toolbar]:flex-wrap sm:[&_.fc-header-toolbar]:grid sm:[&_.fc-header-toolbar]:grid-cols-3 [&_.fc-header-toolbar]:justify-center sm:[&_.fc-header-toolbar]:justify-between [&_.fc-toolbar-chunk]:flex [&_.fc-toolbar-chunk]:items-center [&_.fc-toolbar-chunk]:gap-1 [&_.fc-header-toolbar]:gap-1 sm:[&_.fc-header-toolbar]:gap-4 [&_.fc-toolbar-chunk:nth-child(2)]:justify-center [&_.fc-toolbar-chunk:last-child]:justify-end [&_.fc-daygrid-day-frame]:!justify-start [&_.fc-daygrid-event-harness]:!mb-[-1px] overflow-hidden [&_.fc-todayCircle-button]:!rounded-full [&_.fc-todayCircle-button]:!w-7 [&_.fc-todayCircle-button]:!h-7 sm:[&_.fc-todayCircle-button]:!w-8 sm:[&_.fc-todayCircle-button]:!h-8 [&_.fc-todayCircle-button]:!p-0 [&_.fc-todayCircle-button]:!flex [&_.fc-todayCircle-button]:!items-center [&_.fc-todayCircle-button]:!justify-center [&_.fc-todayCircle-button]:!bg-blue-600 [&_.fc-todayCircle-button]:!border-none [&_.fc-todayCircle-button]:!text-white [&_.fc-todayCircle-button]:!font-normal [&_.fc-todayCircle-button]:!text-[11px] [&_.fc-todayCircle-button]:!shadow-lg [&_.fc-todayCircle-button]:hover:!bg-blue-700 [&_.fc-todayCircle-button]:!transition-transform [&_.fc-todayCircle-button]:active:!scale-95"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <Calendar className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Planning</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Gérez vos interventions et rendez-vous</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/api/admin/backup', '_blank')}
                  className="gap-2 flex bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  title="Télécharger une sauvegarde de la base de données"
                >
                  <Database size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="inline">Sauvegarder BDD</span>
                </Button>

                <Button
                  variant={isSelectionMode ? "primary" : "outline"}
                  size="sm"
                  onClick={toggleSelectionMode}
                  className={cn(
                    "gap-2 transition-all",
                    isSelectionMode
                      ? "bg-slate-900 border-transparent text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                      : ""
                  )}
                >
                  {isSelectionMode ? (
                    <>
                      <X size={14} />
                      <span className="inline">Quitter</span>
                    </>
                  ) : (
                    <>
                      <Settings2 size={14} />
                      <span className="inline">Sélection</span>
                    </>
                  )}
                </Button>
              </>
            )}
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        editable={isAdmin}
        eventDrop={handleEventChange}
        eventResize={handleEventChange}
        initialView="dayGridMonth"
        displayEventTime={false}
        customButtons={{
          todayCircle: {
            text: new Date().getDate().toString(),
            click: () => {
              calendarRef.current?.getApi().today();
            }
          }
        }}
        height={typeof window !== 'undefined' && window.innerWidth < 768 ? '85vh' : 'auto'}
        contentHeight={typeof window !== 'undefined' && window.innerWidth < 768 ? '85vh' : 'auto'}
        aspectRatio={typeof window !== 'undefined' && window.innerWidth < 400 ? 0.55 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.7 : 1.35)}
        headerToolbar={typeof window !== 'undefined' && window.innerWidth < 640 ? {
          left: 'prev,next',
          center: 'title todayCircle',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        } : {
          left: 'prev,next',
          center: 'title todayCircle',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        allDaySlot={false}
        slotMinTime="08:00:00"
        events={events}
        locale="fr"
        firstDay={1}
        views={{
          dayGridMonth: {
            dayHeaderFormat: { weekday: typeof window !== 'undefined' && window.innerWidth < 768 ? 'narrow' : 'long' }
          },
          timeGridWeek: {
            dayHeaderFormat: { weekday: 'short', day: 'numeric' },
            titleFormat: typeof window !== 'undefined' && window.innerWidth < 768
              ? { day: '2-digit', month: '2-digit' }
              : { year: 'numeric', month: 'long', day: 'numeric' }
          },
          timeGridDay: {
            dayHeaderFormat: { weekday: 'long', day: 'numeric' }
          }
        }}
        buttonText={{
          today: "Aujourd'hui",
          month: 'Mois',
          week: 'Sem',
          day: 'Jour'
        }}
        windowResize={(arg) => {
           const isMobile = window.innerWidth < 768;
           arg.view.calendar.setOption('aspectRatio', isMobile ? 0.8 : 1.35);

           // Forcer le format d'en-tête selon la vue actuelle pour éviter les dates fixes
           if (arg.view.type === 'dayGridMonth') {
             arg.view.calendar.setOption('dayHeaderFormat', { weekday: isMobile ? 'narrow' : 'long' });
           } else {
             arg.view.calendar.setOption('dayHeaderFormat', { weekday: 'short', day: 'numeric' });
           }

           /* Mobile options */
            arg.view.calendar.setOption('headerToolbar', isMobile ? {
              left: 'prev,next',
              center: 'title todayCircle',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            } : {
              left: 'prev,next',
              center: 'title todayCircle',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            });

            if (isMobile) {
              arg.view.calendar.setOption('titleFormat',
                arg.view.type === 'timeGridWeek'
                  ? { day: '2-digit', month: '2-digit', year: 'numeric' }
                  : { month: 'short', year: 'numeric' }
              );
            } else {
              arg.view.calendar.setOption('titleFormat',
                arg.view.type === 'dayGridMonth'
                  ? { year: 'numeric', month: 'long' }
                  : { year: 'numeric', month: 'long', day: 'numeric' }
              );
            }
        }}
        eventContent={(eventInfo) => {
          const status = eventInfo.event.extendedProps.status;
          const isRecurring = eventInfo.event.extendedProps.isRecurring;
          const isCancelled = status === 'CANCELLED';
          const isPast = eventInfo.event.end && new Date(eventInfo.event.end) < new Date();
          const isCompleted = (status === 'COMPLETED' || isPast) && !isCancelled;
          const bgColor = eventInfo.event.backgroundColor || '#3b82f6';

          const textColor = getContrastColor(bgColor);
          const isDayView = eventInfo.view.type === 'timeGridDay';
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

          const startTime = eventInfo.event.start?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const endTime = eventInfo.event.end?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const timeRange = `${startTime} - ${endTime}`;

          const isSelected = selectedEvents.has(eventInfo.event.id);

          return (
            <div
              className={`px-1 py-0.5 rounded-md w-full h-full overflow-hidden flex items-center gap-1 transition-all duration-300 ${
                (isPast || status === 'COMPLETED')
                  ? `opacity-40 ${isCancelled ? 'bg-hatched-pattern' : ''}`
                  : isCancelled
                    ? 'opacity-100 bg-hatched-pattern'
                    : 'opacity-100'
              } ${isSelected ? 'ring-2 ring-white ring-inset' : ''}`}
              style={{
                backgroundColor: bgColor,
              }}
            >
              {isSelectionMode && (
                <div
                  onClick={(e) => {
                    e.stopPropagation(); // Empêche le clic de remonter à FullCalendar
                    const id = eventInfo.event.id;
                    const type = eventInfo.event.extendedProps.type;

                    setSelectedEvents(prev => {
                      const next = new Map(prev);
                      if (next.has(id)) {
                        next.delete(id);
                      } else {
                        next.set(id, { id, type });
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    "w-3.5 h-3.5 rounded-sm border-2 border-black/40 flex items-center justify-center shrink-0 shadow-sm cursor-pointer",
                    isSelected ? "bg-black" : "bg-white/40"
                  )}
                >
                  {isSelected && <CheckCircle size={11} strokeWidth={3} className="text-white" />}
                </div>
              )}
              <div
                className={`flex-1 text-center font-normal leading-tight ${
                  isDayView && isMobile ? 'text-[14px]' : 'text-[9px] sm:text-[12px]'
                }`}
                style={{ color: textColor }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{eventInfo.event.title}</span>
                </div>
              </div>
            </div>
          );
        }}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventMouseEnter={(arg: any) => {
          if (arg.view.type !== 'dayGridMonth') return;
          const startTime = arg.event.start?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const endTime = arg.event.end?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          setTooltip({
            x: arg.jsEvent.clientX,
            y: arg.jsEvent.clientY,
            text: `${startTime} - ${endTime}`,
            visible: true
          });
        }}
        eventMouseLeave={() => {
          setTooltip(prev => ({ ...prev, visible: false }));
        }}
      />

      {tooltip.visible && (
        <div
          className="fixed z-[9999] pointer-events-none bg-slate-900/90 dark:bg-slate-800/95 text-white px-3 py-1.5 rounded-xl border border-slate-700/50 shadow-2xl backdrop-blur-md text-xs font-black animate-in fade-in zoom-in duration-200"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y + 15
          }}
        >
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-blue-400" />
            {tooltip.text}
          </div>
        </div>
      )}


      {/* Bulk Action Bar */}
      {isSelectionMode && selectedEvents.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300 w-auto max-w-[95%]">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-2 flex flex-row items-center gap-2 overflow-x-auto no-scrollbar">

            {!isReassignOpen ? (
              <>
                <div className="flex items-center gap-1.5 px-2 border-r border-white/10 mr-1 shrink-0">
                  <Badge variant="blue" className="h-5 min-w-5 flex items-center justify-center rounded-full p-0 text-[10px] font-bold">
                    {selectedEvents.size}
                  </Badge>
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Sélection</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Valider les ${selectedEvents.size} éléments sélectionnés ?`)) {
                        bulkActionMutation.mutate({ action: 'complete' });
                      }
                    }}
                    disabled={bulkActionMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2.5 text-[9px] sm:text-[10px] font-black uppercase rounded-lg border-none"
                  >
                    <CheckCircle size={12} className="mr-1.5" /> <span className="hidden sm:inline">Valider</span>
                  </Button>

                  <Button
                    variant="amber"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Annuler les ${selectedEvents.size} éléments sélectionnés ?`)) {
                        bulkActionMutation.mutate({ action: 'cancel' });
                      }
                    }}
                    disabled={bulkActionMutation.isPending}
                    className="h-8 px-2.5 text-[9px] sm:text-[10px] font-black uppercase rounded-lg"
                  >
                    <Ban size={12} className="mr-1.5" /> <span className="hidden sm:inline">Annuler</span>
                  </Button>

                  <Button
                    onClick={() => setIsReassignOpen(true)}
                    disabled={bulkActionMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-2.5 text-[9px] sm:text-[10px] font-black uppercase rounded-lg border-none"
                  >
                    <ArrowRightLeft size={12} className="mr-1.5" /> <span className="hidden sm:inline">Réaffecter</span>
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`⚠️ Supprimer DEFINITIVEMENT les ${selectedEvents.size} éléments sélectionnés ?`)) {
                        bulkActionMutation.mutate({ action: 'delete' });
                      }
                    }}
                    disabled={bulkActionMutation.isPending}
                    className="h-8 px-2.5 text-[9px] sm:text-[10px] font-black uppercase rounded-lg"
                  >
                    <Trash2 size={12} className="mr-1.5" /> <span className="hidden sm:inline">Supprimer</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEvents(new Map())}
                    className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-lg"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-row items-center gap-2 animate-in fade-in duration-200">
                <span className="text-white text-[10px] font-bold uppercase whitespace-nowrap hidden sm:inline">
                  Pour {selectedEvents.size} :
                </span>
                <select
                  className="h-8 w-40 sm:w-48 rounded-lg bg-slate-800 border-white/20 text-white text-xs focus:ring-2 focus:ring-indigo-500"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                >
                  <option value="">Choisir...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => {
                       if (!targetUserId) {
                         toast.error("Veuillez sélectionner un intervenant");
                         return;
                       }
                       bulkActionMutation.mutate({ action: 'reassign', targetUserId });
                       setIsReassignOpen(false);
                       setTargetUserId('');
                    }}
                    disabled={bulkActionMutation.isPending || !targetUserId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3 text-[10px] font-black uppercase rounded-lg border-none"
                  >
                    OK
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsReassignOpen(false);
                      setTargetUserId('');
                    }}
                    className="text-slate-400 hover:text-white h-8 px-2"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEventId(null);
        }}
        onSave={handleSave}
        selectedDate={selectedDate}
        eventId={selectedEventId}
        eventType={selectedEventType}
      />
      <AppointmentManager
        isOpen={isAppointmentManagerOpen}
        onClose={() => setIsAppointmentManagerOpen(false)}
        onEdit={(id) => {
          setSelectedEventId(id);
          setIsAppointmentManagerOpen(false);
          setSelectedEventType('APPOINTMENT');
          setIsEventModalOpen(true);
        }}
        onCreate={() => {
          setSelectedEventId(null);
          setSelectedDate(new Date());
          setIsAppointmentManagerOpen(false);
          setSelectedEventType('APPOINTMENT');
          setIsEventModalOpen(true);
        }}
        onView={(date) => {
          const calendarApi = calendarRef.current?.getApi();
          if (calendarApi) {
            calendarApi.gotoDate(date);
            // On peut aussi changer de vue pour mieux voir le RDV
            if (calendarApi.view.type === 'dayGridMonth') {
              calendarApi.changeView('timeGridDay', date);
            }
          }
        }}
      />
    </div>
  );
}
