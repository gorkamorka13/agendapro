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
    setSelectedDate(arg.date);
    setSelectedAssignmentId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
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

  return (
    <div
      className="bg-white dark:bg-slate-800 py-2 px-[6px] sm:py-4 sm:px-[14px] md:py-6 md:px-[22px] rounded-lg shadow-md transition-colors [&_.fc-toolbar-title]:text-[12px] [&_.fc-toolbar-title]:sm:text-xl [&_.fc-toolbar-title]:capitalize [&_.fc-button]:text-[10px] [&_.fc-button]:sm:text-xs [&_.fc-button]:px-1.5 [&_.fc-button]:sm:px-2 [&_.fc-header-toolbar]:flex-wrap [&_.fc-header-toolbar]:justify-center [&_.fc-header-toolbar]:gap-2 [&_.fc-daygrid-day-frame]:!justify-start [&_.fc-daygrid-event-harness]:!mb-[1px] overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        displayEventTime={false}
        height={typeof window !== 'undefined' && window.innerWidth < 768 ? '85vh' : 'auto'}
        contentHeight={typeof window !== 'undefined' && window.innerWidth < 768 ? '85vh' : 'auto'}
        aspectRatio={typeof window !== 'undefined' && window.innerWidth < 400 ? 0.55 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.7 : 1.35)}
        headerToolbar={typeof window !== 'undefined' && window.innerWidth < 640 ? {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        } : {
          left: 'prev,next today',
          center: 'title',
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
            dayHeaderFormat: { weekday: 'short', day: 'numeric' }
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
             center: 'title',
             right: 'dayGridMonth,timeGridWeek,timeGridDay'
           } : {
             left: 'prev,next today',
             center: 'title',
             right: 'dayGridMonth,timeGridWeek,timeGridDay'
           });

           if (isMobile) {
             arg.view.calendar.setOption('titleFormat', {
               month: 'short',
               year: 'numeric'
             });
           }
        }}
        eventContent={(eventInfo) => {
          const status = eventInfo.event.extendedProps.status;
          const isCancelled = status === 'CANCELLED';
          const isPast = eventInfo.event.end && new Date(eventInfo.event.end) < new Date();
          const isCompleted = (status === 'COMPLETED' || isPast) && !isCancelled;
          const bgColor = eventInfo.event.backgroundColor || '#3b82f6';

          // Fonction pour déterminer si le texte doit être noir ou blanc selon le contraste
          const getContrastColor = (hexcolor: string) => {
            if (!hexcolor || hexcolor === 'transparent') return 'white';
            const r = parseInt(hexcolor.substring(1, 3), 16);
            const g = parseInt(hexcolor.substring(3, 5), 16);
            const b = parseInt(hexcolor.substring(5, 7), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128) ? 'black' : 'white';
          };

          const textColor = getContrastColor(bgColor);
          const isDayView = eventInfo.view.type === 'timeGridDay';
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

          return (
            <div
              className={`px-0.5 py-0.5 rounded-md shadow-sm w-full h-full overflow-hidden flex items-center gap-0.5 border-l-2 transition-all duration-300 ${
                isCompleted
                  ? 'opacity-100 ring-1 ring-white/30 scale-[1.02]'
                  : isCancelled
                    ? 'opacity-100 bg-hatched-pattern'
                    : 'opacity-40 border-dashed border-white/40'
              }`}
              style={{
                backgroundColor: bgColor,
                borderColor: 'rgba(0,0,0,0.1)'
              }}
            >
              <div
                className={`flex-1 font-black leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${
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
      />
    </div>
  );
}
