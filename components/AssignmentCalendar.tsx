'use client';

import { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import AssignmentModal from './AssignmentModal';
import AppointmentModal from './AppointmentModal';
import AppointmentManager from './AppointmentManager';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Heart, Calendar } from 'lucide-react';
import { getContrastColor, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  backgroundColor?: string;
}

export default function AssignmentCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isAppointmentManagerOpen, setIsAppointmentManagerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  // Seuil minimal pour considérer un mouvement comme un swipe (en pixels)
  const minSwipeDistance = 50;

  const fetchEvents = async () => {
    try {
      const [assignmentsRes, appointmentsRes] = await Promise.all([
        fetch('/api/assignments'),
        fetch('/api/appointments')
      ]);

      if (!assignmentsRes.ok || !appointmentsRes.ok) throw new Error('Erreur de chargement');

      const assignments = await assignmentsRes.json();
      const appointments = await appointmentsRes.json();

      setEvents([...assignments, ...appointments]);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'manage-appointments') {
      setIsAppointmentManagerOpen(true);
      router.replace('/');
    }
  }, [searchParams, router]);

  const handleDateClick = (arg: DateClickArg) => {
    if ((session?.user?.role as any) === 'VISITEUR') return;
    setSelectedDate(arg.date);
    setSelectedAssignmentId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    if ((session?.user?.role as any) === 'VISITEUR') return;
    const isAppointment = arg.event.extendedProps.type === 'APPOINTMENT';

    if (isAppointment) {
      setSelectedAppointmentId(arg.event.id);
      setIsAppointmentModalOpen(true);
    } else {
      setSelectedAssignmentId(arg.event.id);
      setIsModalOpen(true);
    }
  };

  const handleSave = () => {
    fetchEvents();
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
          // Swipe vers la gauche -> suivant
          calendarApi.next();
        } else {
          // Swipe vers la droite -> précédent
          calendarApi.prev();
        }
      }
    }
  };

  const handleEventChange = async (changeArg: any) => {
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
        if (response.status === 409 && !isAppointment) {
          if (window.confirm("Cet intervenant a déjà une intervention sur ce créneau. Forcer la superposition ?")) {
            const forceRes = await fetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...updateData, ignoreConflict: true }),
            });
            if (forceRes.ok) {
              toast.success("Intervention mise à jour (avec superposition)");
              fetchEvents();
              return;
            }
          }
        }
        const errorMsg = await response.text();
        toast.error(errorMsg || "Erreur lors de la mise à jour");
        changeArg.revert();
      } else {
        toast.success(isAppointment ? "Rendez-vous mis à jour" : "Intervention mise à jour");
        fetchEvents();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur réseau");
      changeArg.revert();
    }
  };

  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div
      className="bg-white dark:bg-slate-800 py-2 px-[3px] sm:py-4 sm:px-[11px] md:py-6 md:px-[19px] rounded-lg shadow-md transition-colors [&_.fc-toolbar-title]:text-[12px] [&_.fc-toolbar-title]:sm:text-xl [&_.fc-toolbar-title]:capitalize [&_.fc-button]:text-[9px] [&_.fc-button]:sm:text-xs [&_.fc-button]:px-1 [&_.fc-button]:sm:px-2 [&_.fc-header-toolbar]:flex-wrap sm:[&_.fc-header-toolbar]:grid sm:[&_.fc-header-toolbar]:grid-cols-3 [&_.fc-header-toolbar]:justify-center sm:[&_.fc-header-toolbar]:justify-between [&_.fc-toolbar-chunk]:flex [&_.fc-toolbar-chunk]:items-center [&_.fc-toolbar-chunk]:gap-1 [&_.fc-header-toolbar]:gap-1 sm:[&_.fc-header-toolbar]:gap-4 [&_.fc-toolbar-chunk:nth-child(2)]:justify-center [&_.fc-toolbar-chunk:last-child]:justify-end [&_.fc-daygrid-day-frame]:!justify-start [&_.fc-daygrid-event-harness]:!mb-[-1px] overflow-hidden [&_.fc-todayCircle-button]:!rounded-full [&_.fc-todayCircle-button]:!w-7 [&_.fc-todayCircle-button]:!h-7 sm:[&_.fc-todayCircle-button]:!w-8 sm:[&_.fc-todayCircle-button]:!h-8 [&_.fc-todayCircle-button]:!p-0 [&_.fc-todayCircle-button]:!flex [&_.fc-todayCircle-button]:!items-center [&_.fc-todayCircle-button]:!justify-center [&_.fc-todayCircle-button]:!bg-blue-600 [&_.fc-todayCircle-button]:!border-none [&_.fc-todayCircle-button]:!text-white [&_.fc-todayCircle-button]:!font-normal [&_.fc-todayCircle-button]:!text-[11px] [&_.fc-todayCircle-button]:!shadow-lg [&_.fc-todayCircle-button]:hover:!bg-blue-700 [&_.fc-todayCircle-button]:!transition-transform [&_.fc-todayCircle-button]:active:!scale-95"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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
          const isCancelled = status === 'CANCELLED';
          const isPast = eventInfo.event.end && new Date(eventInfo.event.end) < new Date();
          const isCompleted = (status === 'COMPLETED' || isPast) && !isCancelled;
          const bgColor = eventInfo.event.backgroundColor || '#3b82f6';

          const textColor = getContrastColor(bgColor);
          const isDayView = eventInfo.view.type === 'timeGridDay';
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

          return (
            <div
              className={`px-1 py-0.5 rounded-md w-full h-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
                (isPast || status === 'COMPLETED')
                  ? `opacity-40 ${isCancelled ? 'bg-hatched-pattern' : ''}`
                  : isCancelled
                    ? 'opacity-100 bg-hatched-pattern'
                    : 'opacity-100'
              }`}
              style={{
                backgroundColor: bgColor,
              }}
            >
              <div
                className={`text-center font-normal leading-tight ${
                  isDayView && isMobile ? 'text-[14px]' : 'text-[9px] sm:text-[12px]'
                }`}
                style={{ color: textColor }}
              >
                {eventInfo.event.title}
              </div>
            </div>
          );
        }}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        selectedDate={selectedDate}
        assignmentId={selectedAssignmentId}
      />
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setSelectedAppointmentId(null);
        }}
        onSave={() => {
          handleSave();
          setSelectedAppointmentId(null);
        }}
        selectedDate={selectedDate}
        appointmentId={selectedAppointmentId}
      />
      <AppointmentManager
        isOpen={isAppointmentManagerOpen}
        onClose={() => setIsAppointmentManagerOpen(false)}
        onEdit={(id) => {
          setSelectedAppointmentId(id);
          setIsAppointmentManagerOpen(false);
          setIsAppointmentModalOpen(true);
        }}
        onCreate={() => {
          setSelectedAppointmentId(null);
          setSelectedDate(new Date());
          setIsAppointmentManagerOpen(false);
          setIsAppointmentModalOpen(true);
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
