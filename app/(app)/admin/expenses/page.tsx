'use client';

import { useState, useEffect } from 'react';
import { useTitle } from '@/components/TitleContext';
import ExpenseModal from '@/components/ExpenseModal';
import ReceiptLightbox from '@/components/ReceiptLightbox';
import { Plus, Edit2, Trash2, Euro, Calendar, FileText, User as UserIcon, Image as ImageIcon, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const { setTitle } = useTitle();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'with' | 'without'>('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxMetadata, setLightboxMetadata] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleViewReceipt = (expense: any) => {
    if (expense.receiptUrl) {
      setLightboxImage(expense.receiptUrl);
      setLightboxMetadata({
        motif: expense.motif,
        amount: expense.amount,
        date: expense.date,
        userName: expense.user?.name
      });
    }
  };

  const handleDownloadReceipts = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/expenses/receipts/download');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `justificatifs_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Justificatifs téléchargés avec succès');
      } else {
        toast.error('Erreur lors du téléchargement');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (receiptFilter === 'with') return expense.receiptUrl;
    if (receiptFilter === 'without') return !expense.receiptUrl;
    return true;
  });

  const expensesWithReceipts = expenses.filter(e => e.receiptUrl).length;

  return (
    <div className="container mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setReceiptFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${receiptFilter === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tous ({expenses.length})
            </button>
            <button
              onClick={() => setReceiptFilter('with')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${receiptFilter === 'with' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Avec justificatif ({expensesWithReceipts})
            </button>
            <button
              onClick={() => setReceiptFilter('without')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${receiptFilter === 'without' ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sans ({expenses.length - expensesWithReceipts})
            </button>
          </div>

          {expensesWithReceipts > 0 && (
            <button
              onClick={handleDownloadReceipts}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition shadow-sm border border-purple-100 dark:border-purple-800 text-xs font-black disabled:opacity-50"
            >
              {isDownloading ? (
                <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>ZIP Justificatifs</span>
            </button>
          )}
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
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Filter size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Aucune dépense ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExpenses.map((expense) => (
            <div key={expense.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <FileText size={24} />
                  </div>
                  {expense.receiptUrl && (
                    <button
                      onClick={() => handleViewReceipt(expense)}
                      className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl hover:bg-purple-100 transition shadow-sm border border-purple-100 dark:border-purple-800"
                      title="Voir le justificatif"
                    >
                      <ImageIcon size={24} />
                    </button>
                  )}
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

      <ReceiptLightbox
        imageUrl={lightboxImage || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        metadata={lightboxMetadata}
      />
    </div>
  );
}
