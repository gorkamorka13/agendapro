'use client';

import { useState, useEffect, FormEvent } from 'react';
import { User, Patient, Role } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Clock, Calendar, User as UserIcon, Heart, Trash2, Save, X } from 'lucide-react';

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

  // Nouveaux états pour séparer Date et Heures
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState('1h 00m');

  const isEditing = assignmentId !== null;
  const isAdmin = session?.user?.role === Role.ADMIN;
  const isOwner = isEditing && session?.user?.id === userId;
  const hasPermission = isAdmin || isOwner;

  const resetForm = () => {
    setUserId('');
    setPatientId('');
    if (selectedDate) {
      const d = new Date(selectedDate);
      setDate(d.toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, patientsRes] = await Promise.all([ fetch('/api/users'), fetch('/api/patients') ]);
      setUsers(await usersRes.json());
      setPatients(await patientsRes.json());
    };
    if (isOpen) {
        fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && isOpen) {
      const fetchAssignmentData = async () => {
        const response = await fetch(`/api/assignments/${assignmentId}`);
        if (response.ok) {
            const data = await response.json();
            setUserId(data.userId);
            setPatientId(data.patientId.toString());

            const start = new Date(data.startTime);
            const end = new Date(data.endTime);

            setDate(start.toISOString().split('T')[0]);
            setStartTime(start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h').replace('h', ':'));
            setEndTime(end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h').replace('h', ':'));
        } else {
            onClose();
        }
      };
      fetchAssignmentData();
    } else {
      resetForm();
    }
  }, [assignmentId, isOpen]);

  // Calcul de la durée en temps réel
  useEffect(() => {
    if (startTime && endTime) {
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);

      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60; // Gérer le passage à minuit si besoin

      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      setDuration(`${hours}h ${minutes.toString().padStart(2, '0')}m`);
    }
  }, [startTime, endTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Reconstruire les Date objects
    const startObj = new Date(`${date}T${startTime}:00`);
    const endObj = new Date(`${date}T${endTime}:00`);

    // Si l'heure de fin est avant l'heure de début, on assume le lendemain
    if (endObj < startObj) {
      endObj.setDate(endObj.getDate() + 1);
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
        endTime: endObj.toISOString()
      }),
    });

    if (response.ok) {
      onSave();
      onClose();
    } else if (response.status === 409) {
      const errorMsg = await response.text();
      alert(errorMsg);
    } else {
      alert(`Erreur lors de ${isEditing ? 'la mise à jour' : 'la création'}`);
    }
  };

  const handleDelete = async () => {
    if (isEditing && window.confirm('Êtes-vous sûr de vouloir supprimer cette affectation ?')) {
      const response = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      if (response.ok) {
        onSave();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors duration-300">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {isEditing ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">Détails de l'affectation</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Intervenant & Patient Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <UserIcon size={12} className="text-blue-500 sm:w-[14px]" /> Intervenant
              </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  disabled={!isAdmin}
                  className={`w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none font-medium text-slate-700 dark:text-slate-200 text-sm sm:text-base ${!isAdmin ? 'bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed opacity-75' : ''}`}
                >
                  <option value="">Sélectionner...</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Heart size={12} className="text-rose-500 sm:w-[14px]" /> Patient
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:focus:border-rose-400 transition-all outline-none font-medium text-slate-700 dark:text-slate-200 text-sm sm:text-base"
              >
                <option value="">Sélectionner...</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={12} className="text-indigo-500 sm:w-[14px]" /> Date de l'intervention
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={!hasPermission}
              className={`w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all outline-none font-bold text-slate-700 dark:text-slate-200 text-sm sm:text-base ${!hasPermission ? 'opacity-75 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Time Pickers & Duration Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Début</label>
                <input
                  type="time"
                  step="1800"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  disabled={!hasPermission}
                  className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 dark:focus:border-blue-400 outline-none font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 ${!hasPermission ? 'opacity-75 cursor-not-allowed' : ''}`}
                />
              </div>
              <div className="pt-5 sm:pt-6 text-slate-300 dark:text-slate-600">
                <Clock size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fin</label>
                <input
                  type="time"
                  step="1800"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  disabled={!hasPermission}
                  className={`w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 dark:focus:border-blue-400 outline-none font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 ${!hasPermission ? 'opacity-75 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Durée :</span>
              <span className="bg-blue-600 dark:bg-blue-500 text-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-black shadow-lg dark:shadow-none">{duration}</span>
            </div>
          </div>

          {/* Actions */}
          <div className={`grid ${isEditing && hasPermission ? 'grid-cols-3' : 'grid-cols-2'} gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800`}>
            {isEditing && hasPermission && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 text-[10px] sm:text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all"
              >
                <Trash2 size={14} />
                <span>Supprimer</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`flex items-center justify-center px-2 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] sm:text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all whitespace-nowrap ${!(isEditing && hasPermission) ? 'w-full' : ''}`}
            >
              Annuler
            </button>

            {hasPermission && (
              <button
                type="submit"
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all text-[10px] sm:text-xs font-black shadow-lg shadow-blue-500/30 dark:shadow-none whitespace-nowrap ${!(isEditing && hasPermission) ? 'w-full' : ''}`}
              >
                <Save size={14} />
                <span>Enregistrer</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
