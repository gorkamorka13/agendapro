'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Patient, Role, AssignmentStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Clock, Calendar, User as UserIcon, Heart, Trash2, Save, X, CheckCircle, MapPin, Info, Repeat } from 'lucide-react';
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
  eventId: string | null;
  eventType: 'ASSIGNMENT' | 'APPOINTMENT';
}

export default function EventModal({ isOpen, onClose, onSave, selectedDate, eventId, eventType: initialEventType }: Props) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Type selection (disabled when editing)
  const [eventType, setEventType] = useState<'ASSIGNMENT' | 'APPOINTMENT'>(initialEventType);

  // Queries for users and patients
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
    enabled: isOpen
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: () => fetch('/api/patients').then(res => res.json()),
    enabled: isOpen && eventType === 'ASSIGNMENT'
  });

  // Query for event data if editing
  const { data: eventData } = useQuery({
    queryKey: [eventType === 'ASSIGNMENT' ? 'assignment' : 'appointment', eventId],
    queryFn: () => {
      const endpoint = eventType === 'ASSIGNMENT' ? 'assignments' : 'appointments';
      return fetch(`/api/${endpoint}/${eventId}`).then(res => res.json());
    },
    enabled: !!eventId && isOpen
  });

  // Common fields
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>(AssignmentStatus.PLANNED);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState('1h 00m');

  // Assignment-specific fields
  const [patientId, setPatientId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);

  // Appointment-specific fields
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const isEditing = eventId !== null;
  const isAdmin = session?.user?.role === 'ADMIN';

  const getIsPast = () => {
    if (!date || !endTime) return false;
    const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);
    return endObj < new Date();
  };

  const isPast = getIsPast();
  const isCancelled = status === 'CANCELLED';
  const isCompleted = (status === 'COMPLETED' || (isEditing && isPast)) && !isCancelled;
  const isOwner = isEditing && session?.user?.id === userId;
  const hasPermission = isAdmin || !isEditing || (isOwner && !isCompleted && !isCancelled);

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const resetForm = () => {
    setUserId(session?.user?.id || '');
    setStatus(AssignmentStatus.PLANNED);
    setPatientId('');
    setSubject('');
    setLocation('');
    setNotes('');
    setShowOverlapWarning(false);
    setIsRecurring(false);
    setFrequency('WEEKLY');
    setRecurringEndDate('');
    if (selectedDate) {
      setDate(formatLocalDate(selectedDate));
      setStartTime('09:00');
      setEndTime('10:00');
    }
  };

  // Auto-select single patient for assignments
  useEffect(() => {
    if (eventType === 'ASSIGNMENT' && patients.length === 1 && !isEditing && !patientId) {
      setPatientId(patients[0].id.toString());
    }
  }, [patients, isEditing, patientId, eventType]);

  // Load event data when editing
  useEffect(() => {
    if (eventData && isEditing && isOpen) {
      setUserId(eventData.userId);
      setStatus(eventData.status);

      const start = new Date(eventData.startTime);
      const end = new Date(eventData.endTime);

      setDate(formatLocalDate(start));
      setStartTime(start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace('H', ':').replace('h', ':'));
      setEndTime(end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace('H', ':').replace('h', ':'));

      if (eventType === 'ASSIGNMENT') {
        setPatientId(eventData.patientId.toString());
        setIsRecurring(eventData.isRecurring || false);
      } else {
        setSubject(eventData.subject);
        setLocation(eventData.location);
        setNotes(eventData.notes || '');
      }
    } else if (!isEditing) {
      resetForm();
    }
  }, [eventData, isEditing, isOpen, eventType]);

  // Update event type when prop changes
  useEffect(() => {
    if (isOpen) {
      setEventType(initialEventType);
    }
  }, [initialEventType, isOpen]);

  // Calculate duration
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
        if (response.status === 409 && eventType === 'ASSIGNMENT') throw { status: 409 };
        const msg = await response.text();
        throw new Error(msg || "Erreur lors de l'enregistrement");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      const eventLabel = eventType === 'ASSIGNMENT' ? 'Intervention' : 'Rendez-vous';
      toast.success(isEditing ? `${eventLabel} mis(e) à jour` : `${eventLabel} créé(e)`);
      onSave();
      onClose();
    },
    onError: (error: any) => {
      if (error.status === 409) {
        setShowOverlapWarning(true);
      } else {
        toast.error(error.message);
      }
    }
  });

  const handleSubmit = async (e: FormEvent, ignoreConflict = false) => {
    if (e) e.preventDefault();
    if (mutation.isPending && !ignoreConflict) return;

    const startObj = new Date(`${date}T${startTime.replace('h', ':')}:00`);
    const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);
    if (endObj < startObj) endObj.setDate(endObj.getDate() + 1);

    // Business Rule Validation for Non-Admins (Assignments only)
    if (!isAdmin && eventType === 'ASSIGNMENT') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateObj = new Date(date);
      selectedDateObj.setHours(0, 0, 0, 0);

      if (selectedDateObj < today) {
        toast.error("Vous ne pouvez pas créer d'intervention dans le passé.");
        return;
      }

      if (userId !== session?.user?.id) {
        toast.error("Vous ne pouvez créer d'interventions que pour vous-même.");
        return;
      }
    }

    const endpoint = eventType === 'ASSIGNMENT' ? 'assignments' : 'appointments';
    const url = isEditing ? `/api/${endpoint}/${eventId}` : `/api/${endpoint}`;
    const method = isEditing ? 'PUT' : 'POST';

    const baseData: any = {
      userId,
      startTime: startObj.toISOString(),
      endTime: endObj.toISOString(),
      status
    };

    if (eventType === 'ASSIGNMENT') {
      baseData.patientId = patientId;
      baseData.ignoreConflict = ignoreConflict;
      if (!isEditing) {
        baseData.isRecurring = isRecurring;
        baseData.frequency = isRecurring ? frequency : undefined;
        baseData.recurringEndDate = (isRecurring && recurringEndDate) ? new Date(recurringEndDate).toISOString() : undefined;
      }
    } else {
      baseData.subject = subject;
      baseData.location = location;
      baseData.notes = notes;
    }

    mutation.mutate({ url, method, data: baseData });
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
        'complete': eventType === 'ASSIGNMENT' ? 'validée' : 'validé',
        'cancel': eventType === 'ASSIGNMENT' ? 'annulée' : 'annulé',
        'replan': eventType === 'ASSIGNMENT' ? 'replannifiée' : 'replannifié',
        'DELETE': eventType === 'ASSIGNMENT' ? 'supprimée' : 'supprimé'
      };
      const action = variables.method === 'DELETE' ? 'DELETE' : variables.url.split('/').pop() || '';
      const eventLabel = eventType === 'ASSIGNMENT' ? 'Intervention' : 'Rendez-vous';
      toast.success(`${eventLabel} ${actionMap[action] || 'mis(e) à jour'}`);
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.message}`);
    }
  });

  const handleValidate = () => {
    if (!isEditing || handleActionMutation.isPending) return;
    const confirmMsg = eventType === 'ASSIGNMENT'
      ? "Voulez-vous marquer cette intervention comme RÉALISÉE ?"
      : "Voulez-vous marquer ce rendez-vous comme RÉALISÉ ?";
    if (window.confirm(confirmMsg)) {
      const endpoint = eventType === 'ASSIGNMENT' ? 'assignments' : 'appointments';
      handleActionMutation.mutate({ url: `/api/${endpoint}/${eventId}/complete`, method: 'PATCH' });
    }
  };

  const handleCancel = () => {
    if (!isEditing || handleActionMutation.isPending) return;
    const confirmMsg = eventType === 'ASSIGNMENT'
      ? "Voulez-vous ANNULER cette intervention ? Elle sera hachurée dans le calendrier."
      : "Voulez-vous ANNULER ce rendez-vous ?";
    if (window.confirm(confirmMsg)) {
      const endpoint = eventType === 'ASSIGNMENT' ? 'assignments' : 'appointments';
      handleActionMutation.mutate({ url: `/api/${endpoint}/${eventId}/cancel`, method: 'PATCH' });
    }
  };

  const handleReplan = () => {
    if (!isEditing || handleActionMutation.isPending) return;
    const confirmMsg = eventType === 'ASSIGNMENT'
      ? "Voulez-vous REPLANNIFIER cette intervention ? Elle redeviendra active dans le calendrier."
      : "Voulez-vous REPLANNIFIER ce rendez-vous ?";
    if (window.confirm(confirmMsg)) {
      const endpoint = eventType === 'ASSIGNMENT' ? 'assignments' : 'appointments';
      handleActionMutation.mutate({ url: `/api/${endpoint}/${eventId}/replan`, method: 'PATCH' });
    }
  };

  const handleDelete = () => {
    if (!isEditing || handleActionMutation.isPending) return;
    const confirmMsg = eventType === 'ASSIGNMENT'
      ? 'Supprimer cette affectation ?'
      : 'Supprimer ce rendez-vous ?';
    if (window.confirm(confirmMsg)) {
      const endpoint = eventType === 'ASSIGNMENT' ? 'assignments' : 'appointments';
      handleActionMutation.mutate({ url: `/api/${endpoint}/${eventId}`, method: 'DELETE' });
    }
  };

  if (!isOpen) return null;

  const modalTitle = isEditing
    ? (eventType === 'ASSIGNMENT' ? "Modifier l'intervention" : 'Modifier le rendez-vous')
    : 'Nouvel événement';

  const modalSubtitle = isCancelled
    ? (eventType === 'ASSIGNMENT' ? 'Cette intervention a été annulée.' : 'Ce rendez-vous a été annulé.')
    : isCompleted
      ? (isAdmin ? 'Réalisé (Modifiable par l\'Admin)' : 'Réalisé et non modifiable.')
      : (eventType === 'ASSIGNMENT' ? 'Détails de l\'affectation' : 'Gestion des activités hors-interventions');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-2 sm:p-4 md:p-8 animate-in fade-in duration-200">
      <div className="flex min-h-full items-start justify-center py-4 sm:py-10">
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {modalTitle}
                </h2>
                {isEditing && (
                  <Badge variant={isCancelled ? 'amber' : (isCompleted ? 'emerald' : 'blue')}>
                    {isCancelled ? 'Annulé(e)' : (isCompleted ? 'Réalisé(e)' : 'Planifié(e)')}
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
                {modalSubtitle}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X size={20} className="sm:w-6 sm:h-6" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] md:max-h-none custom-scrollbar">
            {/* Type Selector (only when creating) */}
            {!isEditing && (
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEventType('ASSIGNMENT')}
                  disabled={!isAdmin && eventType === 'APPOINTMENT'}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all",
                    eventType === 'ASSIGNMENT'
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Heart size={16} />
                    <span>Intervention</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setEventType('APPOINTMENT')}
                  disabled={!isAdmin}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all",
                    eventType === 'APPOINTMENT'
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
                    !isAdmin && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Calendar size={16} />
                    <span>Rendez-vous</span>
                  </div>
                </button>
              </div>
            )}

            {isCompleted && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                <CheckCircle size={16} className="text-emerald-500" /> {eventType === 'ASSIGNMENT' ? 'Intervention terminée.' : 'Rendez-vous terminé.'}
              </div>
            )}

            {isCancelled && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-3 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-medium">
                <X size={16} className="text-amber-500" /> {eventType === 'ASSIGNMENT' ? 'Cette intervention est annulée.' : 'Ce rendez-vous est annulé.'}
              </div>
            )}

            {/* Appointment-specific fields */}
            {eventType === 'APPOINTMENT' && (
              <Input
                label="Objet du rendez-vous"
                icon={<Info size={12} className="text-blue-500" />}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={(!isAdmin && isCompleted)}
                placeholder="Rendez-vous médecin, visite..."
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Assignment-specific: Patient */}
              {eventType === 'ASSIGNMENT' && (
                <Select
                  label="Patient"
                  icon={<Heart size={12} className="text-rose-500" />}
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  disabled={(!isAdmin && isCompleted) || showOverlapWarning}
                >
                  <option value="">Sélectionner...</option>
                  {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}
                </Select>
              )}

              {/* Appointment-specific: Location */}
              {eventType === 'APPOINTMENT' && (
                <Input
                  label="Lieu"
                  icon={<MapPin size={12} className="text-rose-500" />}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  disabled={(!isAdmin && isCompleted)}
                  placeholder="Ex: Bureau, Domicile..."
                />
              )}

              <Select
                label="Intervenant"
                icon={<UserIcon size={12} className="text-blue-500" />}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={(!isAdmin && isCompleted) || showOverlapWarning}
              >
                <option value="">Sélectionner...</option>
                {users
                  .filter(user => user.role !== Role.VISITEUR && user.name !== 'admin')
                  .map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </Select>
            </div>

            <Input
              label="Date"
              icon={<Calendar size={12} className="text-indigo-500" />}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={!isAdmin && eventType === 'ASSIGNMENT' ? formatLocalDate(new Date()) : undefined}
              disabled={!hasPermission || showOverlapWarning}
              className="font-bold"
            />

            {/* Recurrence (Assignment only, creation only) */}
            {!isEditing && eventType === 'ASSIGNMENT' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Répéter cette intervention
                  </label>
                </div>

                {isRecurring && (
                  <Card variant="flat" className="bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Fréquence"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as any)}
                        icon={<Clock size={12} className="text-blue-500" />}
                      >
                        <option value="DAILY">Quotidienne</option>
                        <option value="WEEKLY">Hebdomadaire</option>
                        <option value="MONTHLY">Mensuelle</option>
                      </Select>

                      <Input
                        label="Répéter jusqu'au"
                        type="date"
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        required={isRecurring}
                        min={date}
                        icon={<Calendar size={12} className="text-blue-500" />}
                      />
                    </div>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Une intervention sera créée chaque {frequency === 'DAILY' ? 'jour' : frequency === 'WEEKLY' ? 'semaine' : 'mois'} jusqu'à la date de fin.
                    </p>
                  </Card>
                )}
              </div>
            )}

            {/* Time selection */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Début</label>
                  <input type="time" step="1800" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={!hasPermission || showOverlapWarning} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold dark:text-slate-100" />
                </div>
                <Clock size={20} className="mt-6 text-slate-300" />
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Fin</label>
                  <input type="time" step="1800" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={!hasPermission || showOverlapWarning} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold dark:text-slate-100" />
                </div>
              </div>
              <div className="text-center pt-2 border-t border-slate-200/50 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase mr-2">Durée :</span>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black">{duration}</span>
              </div>
            </div>

            {/* Appointment notes */}
            {eventType === 'APPOINTMENT' && (
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
            )}

            {/* Overlap warning (Assignment only) */}
            {showOverlapWarning && eventType === 'ASSIGNMENT' && (
              <Card variant="flat" className="bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <X size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-900 dark:text-amber-200 text-sm font-black leading-tight">Attention : Superposition d'activité</p>
                    <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">Cet intervenant a déjà une intervention prévue sur ce créneau. Souhaitez-vous quand même enregistrer ?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="amber"
                    onClick={() => handleSubmit(null as any, true)}
                    className="flex-1 uppercase text-xs"
                  >
                    Oui, chevaucher
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowOverlapWarning(false)}
                    className="flex-1 uppercase text-xs bg-white dark:bg-slate-800 text-amber-600 border-amber-200"
                  >
                    Non, ajuster
                  </Button>
                </div>
              </Card>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* Save/Create button */}
              {hasPermission && !showOverlapWarning && (
                <Button
                  type="submit"
                  isLoading={mutation.isPending}
                  className="w-full sm:flex-1 text-[9px] sm:text-xs px-2 font-black uppercase order-1"
                >
                  <Save size={14} />
                  <span>{isEditing ? 'Mise à jour' : 'Créer'}</span>
                </Button>
              )}

              {/* Action buttons for editing */}
              {isEditing && (isAdmin || isOwner) && (
                <>
                  {((!isCompleted && !isCancelled) || (isCancelled && isPast)) && !showOverlapWarning && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleValidate}
                      isLoading={handleActionMutation.isPending}
                      className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-[9px] sm:text-xs px-2 font-black uppercase order-2"
                    >
                      <CheckCircle size={14} /> Valider
                    </Button>
                  )}
                  {isCancelled && !isPast && !showOverlapWarning && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleReplan}
                      isLoading={handleActionMutation.isPending}
                      className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-[9px] sm:text-xs px-2 font-black uppercase order-2"
                    >
                      <Calendar size={14} /> Replan
                    </Button>
                  )}
                  {isAdmin && status !== 'CANCELLED' && !showOverlapWarning && (
                    <Button
                      type="button"
                      variant="amber"
                      onClick={handleCancel}
                      isLoading={handleActionMutation.isPending}
                      className="w-full sm:flex-1 text-[9px] sm:text-xs px-2 font-black uppercase order-3"
                    >
                      <X size={14} /> Annuler
                    </Button>
                  )}
                  {(isAdmin || !isCompleted) && !showOverlapWarning && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDelete}
                      isLoading={handleActionMutation.isPending}
                      className={cn("w-full sm:flex-1 text-[9px] sm:text-xs px-2 font-black uppercase", isAdmin ? 'order-4' : 'order-3')}
                    >
                      <Trash2 size={14} /> Supprimer
                    </Button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
