'use client';

import { useQuery } from '@tanstack/react-query';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, User, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PatientHistoryListProps {
  patientId: number;
}

export default function PatientHistoryList({ patientId }: PatientHistoryListProps) {
  const { data: assignments = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['patient-assignments', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/assignments`);
      if (!res.ok) throw new Error('Erreur chargement historique');
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-10 text-slate-500">Chargement de l'historique...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Impossible de charger l'historique.</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
        <Calendar className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Aucune intervention</h3>
        <p className="text-sm text-slate-500 mt-1">Ce patient n'a pas encore d'historique enregistré.</p>
      </div>
    );
  }

  const formatDuration = (start: string, end: string) => {
    const mins = differenceInMinutes(new Date(end), new Date(start));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? `${h}h` : ''}${m > 0 ? (m < 10 ? `0${m}` : m) : h > 0 ? '00' : '0'}`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="emerald" className="flex items-center gap-1"><CheckCircle2 size={12} /> Réalisée</Badge>;
      case 'CANCELLED':
        return <Badge variant="amber" className="flex items-center gap-1"><XCircle size={12} /> Annulée</Badge>;
      default:
        return <Badge variant="blue">Planifiée</Badge>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Intervenant</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Horaires & Durée</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Calendar size={14} className="text-slate-400" />
                    {format(new Date(assignment.startTime), 'EEEE d MMMM yyyy', { locale: fr })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <User size={14} className="text-slate-400" />
                    {assignment.user?.name || 'Inconnu'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {format(new Date(assignment.startTime), 'HH:mm')} - {format(new Date(assignment.endTime), 'HH:mm')}
                    </span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold ml-2">
                      {formatDuration(assignment.startTime, assignment.endTime)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {statusBadge(assignment.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
