import { useState, useEffect, FormEvent } from 'react';
import { User, Role, AssignmentStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Clock, Calendar, User as UserIcon, MapPin, Trash2, Save, X, Info, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate: Date | null;
  appointmentId: string | null;
}

export default function AppointmentModal({ isOpen, onClose, onSave, selectedDate, appointmentId }: Props) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);

  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [userId, setUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>(AssignmentStatus.PLANNED);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Date and Hours
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [duration, setDuration] = useState('1h 00m');

  const isEditing = appointmentId !== null;
  const isAdmin = session?.user?.role === 'ADMIN';
  const isCompleted = status === 'COMPLETED';

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
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) setUsers(await res.json());
      } catch (error) {
        console.error("Erreur chargement utilisateurs:", error);
      }
    };
    if (isOpen) fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && isOpen) {
      const fetchAppointmentData = async () => {
        try {
          const response = await fetch(`/api/appointments/${appointmentId}`);
          if (response.ok) {
            const data = await response.json();
            setSubject(data.subject);
            setLocation(data.location);
            setUserId(data.userId);
            setNotes(data.notes || '');
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
          console.error("Erreur chargement rendez-vous:", error);
          onClose();
        }
      };
      fetchAppointmentData();
    } else {
      resetForm();
    }
  }, [appointmentId, isOpen]);

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

  const handleSubmit = async (e: FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const startObj = new Date(`${date}T${startTime.replace('h', ':')}:00`);
      const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);
      if (endObj < startObj) endObj.setDate(endObj.getDate() + 1);

      const url = isEditing ? `/api/appointments/${appointmentId}` : '/api/appointments';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          location,
          userId,
          startTime: startObj.toISOString(),
          endTime: endObj.toISOString(),
          notes,
          status
        }),
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const msg = await response.text();
        alert(msg || "Erreur lors de l'enregistrement");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (window.confirm("Voulez-vous marquer ce rendez-vous comme RÉALISÉ ?")) {
      setStatus(AssignmentStatus.COMPLETED);
      // Wait for state update is tricky in async handler, better to pass manually or use effect,
      // but here we can just update local and call submit, but submit uses state.
      // Better approach: Call API directly or force status in submit logic.
      // Let's call a specialized update or just reuse logic with forced status.

      // Creating a separate scope implementation for clarity:
      setIsSubmitting(true);
      try {
        const startObj = new Date(`${date}T${startTime.replace('h', ':')}:00`);
        const endObj = new Date(`${date}T${endTime.replace('h', ':')}:00`);

        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject,
              location,
              userId,
              startTime: startObj.toISOString(),
              endTime: endObj.toISOString(),
              notes,
              status: 'COMPLETED'
            }),
        });

        if (response.ok) {
            onSave();
            onClose();
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (isEditing && window.confirm('Supprimer ce rendez-vous ?')) {
      const response = await fetch(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
      if (response.ok) {
        onSave();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="bg-amber-50 dark:bg-amber-500/10 px-4 sm:px-8 py-4 sm:py-6 border-b border-amber-100 dark:border-amber-500/20 flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-400 tracking-tight flex items-center gap-2">
                <Calendar size={24} />
                {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
                </h2>
                {isEditing && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                        {isCompleted ? 'Réalisé' : 'Planifié'}
                    </span>
                )}
            </div>
            <p className="text-amber-700/60 dark:text-amber-400/60 text-xs sm:text-sm font-medium mt-0.5">
              Gestion des activités hors-interventions
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-full transition-colors text-amber-600">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          {isCompleted && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <CheckCircle size={16} className="text-emerald-500" /> Rendez-vous effectué.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
              <Info size={12} className="text-amber-500" /> Objet du rendez-vous
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={isCompleted && !isAdmin}
              placeholder="Rendezvous medecin, visite..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                <MapPin size={12} className="text-rose-500" /> Lieu
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                disabled={isCompleted && !isAdmin}
                placeholder="Ex: Bureau, Domicile..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                <UserIcon size={12} className="text-blue-500" /> Intervenant
              </label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required disabled={isCompleted && !isAdmin} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-700 dark:text-slate-200">
                <option value="">Sélectionner...</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
              <Calendar size={12} className="text-indigo-500" /> Date
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isCompleted && !isAdmin} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-200" />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Début</label>
                <input type="time" step="1800" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={isCompleted && !isAdmin} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold dark:text-slate-100" />
              </div>
              <Clock size={20} className="mt-6 text-slate-300" />
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Fin</label>
                <input type="time" step="1800" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={isCompleted && !isAdmin} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold dark:text-slate-100" />
              </div>
            </div>
            <div className="text-center pt-2 border-t border-slate-200/50 dark:border-slate-700">
              <span className="text-[10px] font-black text-slate-400 uppercase mr-2">Durée :</span>
              <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-black">{duration}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-700 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            {isEditing && isAdmin && (
              <>
                {!isCompleted && (
                  <button type="button" onClick={handleValidate} disabled={isSubmitting} className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-500/20">Valider</button>
                )}
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors ${!isCompleted ? '' : 'col-span-1'}`}
                >
                    Supprimer
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex items-center justify-center px-4 py-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors ${!isEditing || (isCompleted && !isAdmin) ? 'col-span-2' : ''}`}
            >
              Fermer
            </button>

            {(!isCompleted || isAdmin) && (
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 hover:from-amber-700 hover:to-amber-800 transition-all ${!isEditing ? 'col-span-2' : ''}`}
              >
                <Save size={16} /> {isEditing ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
