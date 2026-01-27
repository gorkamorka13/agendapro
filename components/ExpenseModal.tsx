'use client';

import { useState, useEffect } from 'react';
import { X, Euro, Calendar, FileText, Save, User as UserIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  expense?: any;
}

export default function ExpenseModal({ isOpen, onClose, onSave, expense }: Props) {
  const [users, setUsers] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [motif, setMotif] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) setUsers(await res.json());
      } catch (e) {
        console.error("Erreur chargement utilisateurs:", e);
      }
    };
    if (isOpen) fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    if (expense) {
      setUserId(expense.userId || '');
      setMotif(expense.motif);
      setAmount(expense.amount.toString());
      setDate(new Date(expense.date).toISOString().split('T')[0]);
    } else {
      setUserId('');
      setMotif('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [expense, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Veuillez sélectionner un bénéficiaire");
      return;
    }
    setIsSubmitting(true);
    try {
      const url = expense ? `/api/expenses/${expense.id}` : '/api/expenses';
      const method = expense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif, amount, date, userId }),
      });

      if (response.ok) {
        toast.success(expense ? "Dépense mise à jour" : "Dépense enregistrée");
        onSave();
        onClose();
      } else {
        const errorText = await response.text();
        toast.error("Erreur lors de l'enregistrement: " + errorText);
      }
    } catch (error) {
      console.error("Erreur soumission dépense:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
      <div className="flex min-h-full items-start justify-center py-10">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Gestion du fonctionnement</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={24} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <Select
            label="Bénéficiaire (Intervenant / Admin)"
            icon={<UserIcon size={12} className="text-blue-500" />}
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Sélectionner un bénéficiaire...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>

          <Input
            label="Motif de la dépense"
            icon={<FileText size={12} className="text-blue-500" />}
            type="text"
            required
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="ex: Essence, Fournitures, Loyer..."
          />

          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Montant (€)"
              icon={<Euro size={12} className="text-emerald-500" />}
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Date"
              icon={<Calendar size={12} className="text-indigo-500" />}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1 order-1 text-xs uppercase"
            >
              <Save size={18} />
              {expense ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 order-2 text-xs"
            >
              <X size={18} /> Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
