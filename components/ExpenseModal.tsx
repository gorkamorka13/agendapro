'use client';

import { useState, useEffect } from 'react';
import { X, Euro, Calendar, FileText, Save, User as UserIcon } from 'lucide-react';

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
      alert("Veuillez sélectionner un bénéficiaire");
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
        onSave();
        onClose();
      } else {
        const errorText = await response.text();
        alert("Erreur lors de l'enregistrement: " + errorText);
      }
    } catch (error) {
      console.error("Erreur soumission dépense:", error);
      alert("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Gestion du fonctionnement</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
              <UserIcon size={12} className="text-blue-500" /> Bénéficiaire (Intervenant / Admin)
            </label>
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
            >
              <option value="">Sélectionner un bénéficiaire...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
              <FileText size={12} className="text-blue-500" /> Motif de la dépense
            </label>
            <input
              type="text"
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
              placeholder="ex: Essence, Fournitures, Loyer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                <Euro size={12} className="text-emerald-500" /> Montant (€)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                <Calendar size={12} className="text-indigo-500" /> Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black shadow-lg shadow-blue-200 dark:shadow-none transition flex items-center gap-2"
            >
              <Save size={18} />
              {expense ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
