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

          return (
            <div
              className={`px-1.5 py-0.5 rounded-md shadow-sm w-full h-full overflow-hidden flex items-center gap-1 border-l-4 transition-all ${
                isCompleted
                  ? 'opacity-100 ring-1 ring-white/20'
                  : isCancelled
                    ? 'opacity-30 grayscale'
                    : 'opacity-50 border-dashed border-white/30'
              }`}
              style={{
                backgroundColor: eventInfo.event.backgroundColor || '#3b82f6',
                borderColor: 'rgba(0,0,0,0.1)'
              }}
            >
              <div className={`flex-1 text-[9px] sm:text-[10px] font-bold leading-tight truncate text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] ${isCancelled ? 'line-through' : ''}`}>
                {eventInfo.event.title}
              </div>
              {isCompleted && (
                <div className="flex-shrink-0 text-white drop-shadow-md">
                   <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
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
