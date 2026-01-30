import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { TableSkeleton } from './ui/Skeleton';
import { Calendar, Plus, Trash2, Edit2, X, Search, Clock, MapPin, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
  onView?: (date: Date) => void;
}

interface Appointment {
  id: number | string;
  subject: string;
  location: string;
  startTime: string;
  endTime: string;
  userId: string;
  user?: { name: string };
  notes?: string;
}

interface AppointmentResponse {
  appointments: Appointment[];
  total: number;
  hasMore: boolean;
}

export default function AppointmentManager({ isOpen, onClose, onEdit, onCreate, onView }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 20;

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { data, isLoading } = useQuery<AppointmentResponse>({
    queryKey: ['appointments', page, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        skip: (page * ITEMS_PER_PAGE).toString(),
        take: ITEMS_PER_PAGE.toString(),
        search: searchTerm,
      });
      const res = await fetch(`/api/appointments/list?${params}`);
      if (!res.ok) throw new Error('Erreur');
      return res.json();
    },
    enabled: isOpen,
    placeholderData: keepPreviousData,
  });

  const appointments = data?.appointments || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur suppression');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  // Filtrage déjà fait côté serveur
  const displayAppointments = appointments;

  return (
    <div className="fixed inset-0 bg-slate-900/20 z-50 overflow-y-auto p-2 sm:p-4 md:p-8 animate-in fade-in duration-200 pointer-events-none">
      <div className="flex min-h-full items-start justify-center py-4 sm:py-10">
        <div
          className={cn(
            "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:max-h-[90vh] transition-shadow pointer-events-auto overflow-hidden",
            isDragging ? "shadow-blue-500/20 shadow-2xl ring-2 ring-blue-500/20" : ""
          )}
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'auto'
          }}
        >

          {/* Header */}
          <div
            onMouseDown={handleMouseDown}
            className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center drag-handle cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-3 pointer-events-none">
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
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X size={20} />
            </Button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(0); // Reset page on search
                }}
                icon={<Search size={16} className="text-slate-400" />}
              />
            </div>
            {isAdmin && (
              <Button
                onClick={onCreate}
                className="gap-2"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Nouveau</span>
              </Button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
            {isLoading && !appointments.length ? (
              <TableSkeleton rows={5} />
            ) : displayAppointments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic">
                {searchTerm ? 'Aucun résultat' : 'Aucun rendez-vous planifié'}
                {!searchTerm && (
                  <div className="mt-4">
                    <button onClick={onCreate} className="text-blue-600 font-bold text-sm hover:underline">Créer le premier rendez-vous</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {displayAppointments.map(appt => (
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-rose-500/70" />
                          <span className="truncate max-w-[150px]">{appt.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserIcon size={12} className="text-blue-500/70" />
                          <span>{appt.user?.name || 'Non assigné'}</span>
                        </div>
                      </div>
                      {appt.notes && (
                        <div className="mt-3 p-2 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                          <p className="whitespace-pre-wrap">{appt.notes}</p>
                        </div>
                      )}
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
                        {onView && (
                          <button
                            onClick={() => onView(new Date(appt.startTime))}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors shadow-sm"
                            title="Voir sur le calendrier"
                          >
                            <Search size={16} />
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (window.confirm('Supprimer ce rendez-vous ?')) {
                              deleteMutation.mutate(String(appt.id));
                            }
                          }}
                          className="p-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shadow-sm"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    className="text-xs"
                  >
                    Précédent
                  </Button>
                  <span className="text-xs text-slate-500">
                    Page {page + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore || isLoading}
                    className="text-xs"
                  >
                    Suivant
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
