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
        dayHeaderFormat={typeof window !== 'undefined' && window.innerWidth < 768
          ? { weekday: 'narrow', day: 'numeric' }
          : { weekday: 'long', day: 'numeric' }
        }
        buttonText={{
          today: "Aujourd'hui",
          month: 'Mois',
          week: 'Sem',
          day: 'Jour'
        }}
        windowResize={(arg) => {
           if (window.innerWidth < 768) {
             arg.view.calendar.setOption('aspectRatio', 0.8);
             arg.view.calendar.setOption('dayHeaderFormat', { weekday: 'narrow', day: 'numeric' });
             arg.view.calendar.setOption('headerToolbar', {
               left: 'prev,next',
               center: 'title',
               right: 'dayGridMonth,timeGridWeek,timeGridDay'
             });
           } else {
             arg.view.calendar.setOption('aspectRatio', 1.35);
             arg.view.calendar.setOption('dayHeaderFormat', { weekday: 'long', day: 'numeric' });
             arg.view.calendar.setOption('headerToolbar', {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
             });
           }
        }}
        eventContent={(eventInfo) => (
          <div
            className="px-2 py-0.5 rounded-lg shadow-sm w-full h-full overflow-hidden flex items-center"
            style={{
              backgroundColor: eventInfo.event.backgroundColor || '#3b82f6',
              borderLeft: '4px solid rgba(0,0,0,0.1)'
            }}
          >
            <div className="text-[10px] sm:text-xs font-medium leading-tight truncate text-white w-full text-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
              {eventInfo.event.title}
            </div>
          </div>
        )}
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
