'use client';

import { useState, useEffect, FormEvent } from 'react';
import { User, Patient, Role, AssignmentStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Clock, Calendar, User as UserIcon, Heart, Trash2, Save, X, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate: Date | null;
  assignmentId: string | null;
}

export default function AssignmentModal({ isOpen, onClose, onSave, selectedDate, assignmentId }: Props) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [userId, setUserId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>(AssignmentStatus.PLANNED);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);

  // States for Date and Hours
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState('1h 00m');

  // Calculate if the assignment is in the past
  const getIsPast = () => {
    if (!date || !endTime) return false;
    const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);
    return endObj < new Date();
  };

  const isEditing = assignmentId !== null;
  const isPast = getIsPast();
  const isCancelled = status === 'CANCELLED';
  const isCompleted = (status === 'COMPLETED' || (isEditing && isPast)) && !isCancelled;
  const isAdmin = session?.user?.role === 'ADMIN';
  const isOwner = isEditing && session?.user?.id === userId;

  // Permission logic:
  // - Admins can do anything
  // - Creation is allowed for everyone (initial userId will be set to self)
  // - Modification is allowed only for owners if not completed
  const hasPermission = isAdmin || !isEditing || (isOwner && !isCompleted && !isCancelled);

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const resetForm = () => {
    setUserId(session?.user?.id || '');
    setPatientId('');
    setStatus(AssignmentStatus.PLANNED);
    setShowOverlapWarning(false);
    if (selectedDate) {
      setDate(formatLocalDate(selectedDate));
      setStartTime('09:00');
      setEndTime('10:00');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, patientsRes] = await Promise.all([fetch('/api/users'), fetch('/api/patients')]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (patientsRes.ok) {
          const fetchedPatients = await patientsRes.json();
          setPatients(fetchedPatients);
          if (fetchedPatients.length === 1 && !isEditing) {
            setPatientId(fetchedPatients[0].id.toString());
          }
        }
      } catch (error) {
        console.error("Erreur données initiales:", error);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && isOpen) {
      const fetchAssignmentData = async () => {
        try {
          const response = await fetch(`/api/assignments/${assignmentId}`);
          if (response.ok) {
            const data = await response.json();
            setUserId(data.userId);
            setPatientId(data.patientId.toString());
            setStatus(data.status);



            const start = new Date(data.startTime);
            const end = new Date(data.endTime);

            setDate(formatLocalDate(start));
            setStartTime(start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace('H', ':').replace('h', ':'));
            setEndTime(end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace('H', ':').replace('h', ':'));
          } else {
            onClose();
          }
        } catch (error) {
          console.error("Erreur chargement intervention:", error);
          onClose();
        }
      };
      fetchAssignmentData();
    } else {
      resetForm();
    }
  }, [assignmentId, isOpen]);

  useEffect(() => {
    if (startTime && endTime) {
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60;
      setDuration(`${Math.floor(diff / 60)}h ${(diff % 60).toString().padStart(2, '0')}m`);
    }
  }, [startTime, endTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent, ignoreConflict = false) => {
    if (e) e.preventDefault();
    if (isSubmitting && !ignoreConflict) return;
    setIsSubmitting(true);
    try {
      const startObj = new Date(`${date}T${startTime.replace('h', ':')}:00`);
      const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);
      if (endObj < startObj) endObj.setDate(endObj.getDate() + 1);

      // Business Rule Validation for Non-Admins
      if (!isAdmin) {
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

      const url = isEditing ? `/api/assignments/${assignmentId}` : '/api/assignments';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          patientId,
          startTime: startObj.toISOString(),
          endTime: endObj.toISOString(),
          ignoreConflict
        }),
      });

      if (response.ok) {
        toast.success(isEditing ? "Intervention mise à jour" : "Intervention créée");
        onSave();
        onClose();
      } else if (response.status === 409) {
          setShowOverlapWarning(true);
      } else {
        const msg = await response.text();
        toast.error(msg || "Erreur lors de l'enregistrement");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (!isEditing || isSubmitting) return;
    if (window.confirm("Voulez-vous marquer cette intervention comme RÉALISÉE ?")) {
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/complete`, { method: 'PATCH' });
        if (response.ok) {
          toast.success("Intervention validée");
          onSave();
          onClose();
        } else {
          const err = await response.text();
          toast.error(`Erreur : ${err}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = async () => {
    if (!isEditing || isSubmitting) return;
    if (window.confirm("Voulez-vous ANNULER cette intervention ? Elle sera hachurée dans le calendrier.")) {
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/cancel`, { method: 'PATCH' });
        if (response.ok) {
          toast.success("Intervention annulée");
          onSave();
          onClose();
        } else {
          const err = await response.text();
          toast.error(`Erreur : ${err}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleReplan = async () => {
    if (!isEditing || isSubmitting) return;
    if (window.confirm("Voulez-vous REPLANNIFIER cette intervention ? Elle redeviendra active dans le calendrier.")) {
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/replan`, { method: 'PATCH' });
        if (response.ok) {
          toast.success("Intervention replannifiée");
          onSave();
          onClose();
        } else {
          const err = await response.text();
          toast.error(`Erreur : ${err}`);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (isEditing && window.confirm('Supprimer cette affectation ?')) {
      const response = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success("Intervention supprimée");
        onSave();
        onClose();
      } else {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {isEditing ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
              </h2>
              {isEditing && (
                <Badge variant={isCancelled ? 'amber' : (isCompleted ? 'emerald' : 'blue')}>
                  {isCancelled ? 'Annulée' : (isCompleted ? 'Réalisée' : 'Planifiée')}
                </Badge>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              {isCancelled ? 'Cette intervention a été annulée.' : (isCompleted ? 'Réalisée et non modifiable.' : 'Détails de l\'affectation')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={20} className="sm:w-6 sm:h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {isCompleted && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <CheckCircle size={16} className="text-emerald-500" /> Intervention terminée.
            </div>
          )}

          {isCancelled && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-3 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-medium">
              <X size={16} className="text-amber-500" /> Cette intervention est annulée.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Select
              label="Intervenant"
              icon={<UserIcon size={12} className="text-blue-500" />}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              disabled={!isAdmin || isCompleted || showOverlapWarning}
            >
              <option value="">Sélectionner...</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </Select>

            <Select
              label="Patient"
              icon={<Heart size={12} className="text-rose-500" />}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              disabled={(isCompleted && !isAdmin) || showOverlapWarning}
            >
              <option value="">Sélectionner...</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}
            </Select>
          </div>
          <Input
            label="Date"
            icon={<Calendar size={12} className="text-indigo-500" />}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            min={!isAdmin ? formatLocalDate(new Date()) : undefined}
            disabled={!hasPermission || showOverlapWarning}
            className="font-bold"
          />
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

          {showOverlapWarning && (
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

          <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* 1. Mise à jour / Créer */}
            {hasPermission && !showOverlapWarning && (
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full sm:flex-1 text-[9px] sm:text-xs px-2 font-black uppercase order-1"
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

            {/* 2. Valider & Supprimer (si admin/proprio + modification) */}
            {isEditing && (isAdmin || isOwner) && (
              <>
                {((!isCompleted && !isCancelled) || (isCancelled && isPast)) && !showOverlapWarning && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleValidate}
                    isLoading={isSubmitting}
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
                    isLoading={isSubmitting}
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
                    isLoading={isSubmitting}
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
                    isLoading={isSubmitting}
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
  );
}
