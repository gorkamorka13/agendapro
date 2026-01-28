import { useState, useEffect, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Role, AssignmentStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Clock, Calendar, User as UserIcon, MapPin, Trash2, Save, X, Info, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate: Date | null;
  appointmentId: string | null;
}

export default function AppointmentModal({ isOpen, onClose, onSave, selectedDate, appointmentId }: Props) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Queries
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
    enabled: isOpen
  });

  const { data: appointmentData } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => fetch(`/api/appointments/${appointmentId}`).then(res => res.json()),
    enabled: !!appointmentId && isOpen
  });

  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [userId, setUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>(AssignmentStatus.PLANNED);

  // States for Date and Hours
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState('1h 00m');

  // Calculate if the appointment is in the past
  const getIsPast = () => {
    if (!date || !endTime) return false;
    const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);
    return endObj < new Date();
  };

  const isEditing = appointmentId !== null;
  const isPast = getIsPast();
  const isCancelled = status === 'CANCELLED';
  const isCompleted = (status === 'COMPLETED' || (isEditing && isPast)) && !isCancelled;
  const isAdmin = session?.user?.role === 'ADMIN';
  const isOwner = isEditing && session?.user?.id === userId;

  // Permission logic:
  const hasPermission = isAdmin || !isEditing || (isOwner && !isCompleted && !isCancelled);

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const resetForm = () => {
    setSubject('');
    setLocation('');
    setUserId('');
    setNotes('');
    setStatus(AssignmentStatus.PLANNED);
    setDate(formatLocalDate(selectedDate || new Date()));
    setStartTime('09:00');
    setEndTime('10:00');
  };

  useEffect(() => {
    if (appointmentData && isEditing && isOpen) {
        setSubject(appointmentData.subject);
        setLocation(appointmentData.location);
        setUserId(appointmentData.userId);
        setNotes(appointmentData.notes || '');
        setStatus(appointmentData.status);

        const start = new Date(appointmentData.startTime);
        const end = new Date(appointmentData.endTime);

        setDate(formatLocalDate(start));
        setStartTime(start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace('H', ':').replace('h', ':'));
        setEndTime(end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace('H', ':').replace('h', ':'));
    } else if (!isEditing) {
        resetForm();
    }
  }, [appointmentData, isEditing, isOpen]);

  useEffect(() => {
    if (startTime && endTime) {
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60;
      setDuration(`${Math.floor(diff / 60)}h ${(diff % 60).toString().padStart(2, '0')}m`);
    }
  }, [startTime, endTime]);

  const mutation = useMutation({
    mutationFn: async ({ data, method, url }: { data: any, method: string, url: string }) => {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || "Erreur lors de l'enregistrement");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(isEditing ? "Rendez-vous mis à jour" : "Rendez-vous créé");
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = async (e: FormEvent) => {
    if (e) e.preventDefault();
    if (mutation.isPending) return;

    const startObj = new Date(`${date}T${startTime.replace('h', ':')}:00`);
    const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);
    if (endObj < startObj) endObj.setDate(endObj.getDate() + 1);

    const url = isEditing ? `/api/appointments/${appointmentId}` : '/api/appointments';
    const method = isEditing ? 'PUT' : 'POST';

    mutation.mutate({
      url,
      method,
      data: {
        subject,
        location,
        userId,
        startTime: startObj.toISOString(),
        endTime: endObj.toISOString(),
        notes,
        status
      }
    });
  };

  const handleActionMutation = useMutation({
    mutationFn: async ({ url, method }: { url: string, method: string }) => {
      const response = await fetch(url, { method });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      return response.status === 204 ? null : response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      const actionMap: Record<string, string> = {
        'complete': 'validé',
        'cancel': 'annulé',
        'replan': 'replannifié',
        'DELETE': 'supprimé'
      };
      const action = variables.method === 'DELETE' ? 'DELETE' : variables.url.split('/').pop() || '';
      toast.success(`Rendez-vous ${actionMap[action] || 'mis à jour'}`);
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.message}`);
    }
  });

  const handleValidate = () => {
    if (!isEditing || handleActionMutation.isPending) return;
    if (window.confirm("Voulez-vous marquer ce rendez-vous comme RÉALISÉ ?")) {
      handleActionMutation.mutate({ url: `/api/appointments/${appointmentId}/complete`, method: 'PATCH' });
    }
  };

  const handleCancel = () => {
    if (!isEditing || handleActionMutation.isPending) return;
    if (window.confirm("Voulez-vous ANNULER ce rendez-vous ?")) {
      handleActionMutation.mutate({ url: `/api/appointments/${appointmentId}/cancel`, method: 'PATCH' });
    }
  };

  const handleReplan = () => {
    if (!isEditing || handleActionMutation.isPending) return;
    if (window.confirm("Voulez-vous REPLANNIFIER ce rendez-vous ?")) {
      handleActionMutation.mutate({ url: `/api/appointments/${appointmentId}/replan`, method: 'PATCH' });
    }
  };

  const handleDelete = () => {
    if (isEditing && window.confirm('Supprimer ce rendez-vous ?')) {
      handleActionMutation.mutate({ url: `/api/appointments/${appointmentId}`, method: 'DELETE' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
      <div className="flex min-h-full items-start justify-center py-10">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col">
        <div className="bg-slate-50 dark:bg-slate-900/50 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
                  {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                </h2>
                {isEditing && (
                    <Badge variant={isCancelled ? 'amber' : (isCompleted ? 'emerald' : 'blue')}>
                        {isCancelled ? 'Annulé' : (isCompleted ? 'Réalisé' : 'Planifié')}
                    </Badge>
                )}
            </div>
            <p className="text-slate-500 dark:text-slate-400/80 text-xs sm:text-sm font-medium mt-0.5">
                {isCancelled ? 'Ce rendez-vous a été annulé.' : (isCompleted ? (isAdmin ? 'Réalisé (Modifiable par l\'Admin)' : 'Réalisé et non modifiable.') : 'Gestion des activités hors-interventions')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={20} className="sm:w-6 sm:h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] md:max-h-none custom-scrollbar">
          {isCancelled && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-3 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-medium">
              <X size={16} className="text-amber-500" /> Ce rendez-vous est annulé.
            </div>
          )}

          <Input
            label="Objet du rendez-vous"
            icon={<Info size={12} className="text-blue-500" />}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            disabled={(!isAdmin && isCompleted)}
            placeholder="Rendezvous medecin, visite..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Lieu"
              icon={<MapPin size={12} className="text-rose-500" />}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              disabled={(!isAdmin && isCompleted)}
              placeholder="Ex: Bureau, Domicile..."
            />
            <Select
              label="Intervenant"
              icon={<UserIcon size={12} className="text-blue-500" />}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              disabled={(!isAdmin && isCompleted)}
            >
              <option value="">Sélectionner...</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </Select>
          </div>

          <Input
            label="Date"
            icon={<Calendar size={12} className="text-indigo-500" />}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={!hasPermission}
            className="font-bold"
          />

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Début</label>
                <input type="time" step="1800" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={!hasPermission} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold dark:text-slate-100" />
              </div>
              <Clock size={20} className="mt-6 text-slate-300" />
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Fin</label>
                <input type="time" step="1800" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={!hasPermission} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold dark:text-slate-100" />
              </div>
            </div>
            <div className="text-center pt-2 border-t border-slate-200/50 dark:border-slate-700">
              <span className="text-[10px] font-black text-slate-400 uppercase mr-2">Durée :</span>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">{duration}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={(!isAdmin && isCompleted)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-700 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* 1. Mise à jour / Enregistrer */}
            {isAdmin && (
              <Button
                type="submit"
                isLoading={mutation.isPending}
                className="w-full sm:flex-1 text-[10px] sm:text-xs px-2 font-black uppercase order-1"
              >
                {isEditing ? (
                  <>
                    <Save size={14} />
                    <span>Mise à jour</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Créer</span>
                  </>
                )}
              </Button>
            )}

            {/* 2. Valider & Supprimer (si admin + modification) */}
            {isEditing && isAdmin && (
              <>
                {((!isCompleted && !isCancelled) || (isCancelled && isPast)) && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleValidate}
                    isLoading={handleActionMutation.isPending}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-[10px] sm:text-xs px-2 font-black uppercase order-2"
                  >
                    <CheckCircle size={14} /> Valider
                  </Button>
                )}
                {isCancelled && !isPast && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleReplan}
                    isLoading={handleActionMutation.isPending}
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-[10px] sm:text-xs px-2 font-black uppercase order-2"
                  >
                    <Calendar size={14} /> Replan
                  </Button>
                )}
                {!isCancelled && (
                  <Button
                    type="button"
                    variant="amber"
                    onClick={handleCancel}
                    isLoading={handleActionMutation.isPending}
                    className="w-full sm:flex-1 text-[10px] sm:text-xs px-2 font-black uppercase order-3"
                  >
                    <X size={14} /> Annuler
                  </Button>
                )}
                <Button
                    type="button"
                    variant="danger"
                    onClick={handleDelete}
                    isLoading={handleActionMutation.isPending}
                    className="w-full sm:flex-1 text-[10px] sm:text-xs px-2 font-black uppercase order-4"
                >
                    <Trash2 size={14} /> Supprimer
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
