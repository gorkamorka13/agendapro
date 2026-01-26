import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit2, X, Search, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
}

interface Appointment {
  id: number | string;
  subject: string;
  location: string;
  startTime: string;
  endTime: string;
  userId: string;
  user?: { name: string };
}

export default function AppointmentManager({ isOpen, onClose, onEdit, onCreate }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/appointments/list');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchAppointments();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = appointments.filter(a =>
    a.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Calendar size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        Gestion Rendez-vous
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {appointments.length} rendez-vous enregistrés
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
            </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-4">
            <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium dark:text-slate-200"
                />
            </div>
            {isAdmin && (
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> <span className="hidden sm:inline">Nouveau</span>
                </button>
            )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">
                    {searchTerm ? 'Aucun résultat' : 'Aucun rendez-vous planifié'}
                    {!searchTerm && (
                        <div className="mt-4">
                             <button onClick={onCreate} className="text-blue-600 font-bold text-sm hover:underline">Créer le premier rendez-vous</button>
                        </div>
                    )}
                </div>
            ) : (
                filtered.map(appt => (
                    <div key={appt.id} className="group p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl transition-all shadow-sm hover:shadow-md flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-[10px] font-bold uppercase tracking-wide">
                                    {format(new Date(appt.startTime), 'dd MMM yyyy', { locale: fr })}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                    <Clock size={10} />
                                    {format(new Date(appt.startTime), 'HH:mm')} - {format(new Date(appt.endTime), 'HH:mm')}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{appt.subject}</h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1"><MapPin size={12} /> <span className="truncate max-w-[150px]">{appt.location}</span></div>
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex items-center gap-2 ml-4">
                                <button
                                    onClick={() => onEdit(String(appt.id))}
                                    className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors shadow-sm"
                                    title="Modifier"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}
