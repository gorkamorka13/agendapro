'use client';

import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core'; // <--- CORRECTION: Importer depuis @fullcalendar/core
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction'; // DateClickArg reste ici
import AssignmentModal from './AssignmentModal';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/assignments');
      if (!response.ok) throw new Error('Erreur de chargement');
      const data = await response.json();
      setEvents(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const handleDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.date);
    setSelectedAssignmentId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    setSelectedAssignmentId(arg.event.id);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    fetchAssignments();
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-2 sm:p-4 md:p-6 rounded-lg shadow-md transition-colors">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        displayEventTime={false}
        height="auto"
        contentHeight="auto"
        aspectRatio={typeof window !== 'undefined' && window.innerWidth < 400 ? 0.65 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.8 : 1.35)}
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

           arg.view.calendar.setOption('headerToolbar', isMobile ? {
             left: 'prev,next',
             center: 'title',
             right: 'dayGridMonth,timeGridWeek,timeGridDay'
           } : {
             left: 'prev,next today',
             center: 'title',
             right: 'dayGridMonth,timeGridWeek,timeGridDay'
           });
        }}
        eventContent={(eventInfo) => {
          const status = eventInfo.event.extendedProps.status;
          const isCompleted = status === 'COMPLETED';
          const isCancelled = status === 'CANCELLED';
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
              className={`px-1 sm:px-1.5 py-0.5 rounded-md shadow-sm w-full h-full overflow-hidden flex items-center gap-1 border-l-4 transition-all duration-300 ${
                isCompleted
                  ? 'opacity-100 ring-1 ring-white/30 scale-[1.02]'
                  : isCancelled
                    ? 'opacity-20 grayscale'
                    : 'opacity-40 border-dashed border-white/40'
              }`}
              style={{
                backgroundColor: bgColor,
                borderColor: 'rgba(0,0,0,0.1)'
              }}
            >
              <div
                className={`flex-1 font-black leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${isCancelled ? 'line-through' : ''} ${
                  isDayView && isMobile ? 'text-[14px]' : 'text-[10px] sm:text-[12px]'
                }`}
                style={{ color: textColor }}
              >
                {eventInfo.event.title}
              </div>
              {isCompleted && (
                <div className="flex-shrink-0 drop-shadow-md" style={{ color: textColor }}>
                   <svg className={`${isDayView && isMobile ? 'w-4 h-4' : 'w-3 h-3 sm:w-4 sm:h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                   </svg>
                </div>
              )}
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
    </div>
  );
}
