'use client';

import { useState, useEffect } from 'react';
import { useTitle } from '@/components/TitleContext';
import ExpenseModal from '@/components/ExpenseModal';
import { Plus, Edit2, Trash2, Euro, Calendar, FileText, User as UserIcon } from 'lucide-react';

export default function ExpensesPage() {
  const { setTitle } = useTitle();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) setExpenses(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    setTitle("Gestion des Dépenses");
  }, [setTitle]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Supprimer cette dépense ?')) {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchExpenses();
    }
  };

  const handleOpenModal = (expense?: any) => {
    setSelectedExpense(expense || null);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          {/* Titre supprimé pour homogénéité */}
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 text-sm font-black"
        >
          <Plus size={20} />
          <span>Nouvelle dépense</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
          < Euro size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Aucune dépense enregistrée.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <FileText size={24} />
                </div>
                <div className="flex gap-1 transition-opacity text-xs font-bold">
                    <button onClick={() => handleOpenModal(expense)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(expense.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors text-red-500 flex items-center gap-1">
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
                            <UserIcon size={10} />
                            {expense.user?.name || 'Système'}
                        </span>
                    </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white truncate">{expense.motif}</h3>
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">
                    <Calendar size={12} />
                    {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Montant de la dépense</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{expense.amount.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchExpenses}
        expense={selectedExpense}
      />
    </div>
  );
}
