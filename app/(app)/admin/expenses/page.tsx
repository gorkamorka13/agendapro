'use client';

import { useState, useEffect } from 'react';
import { useTitle } from '@/components/TitleContext';
import ExpenseModal from '@/components/ExpenseModal';
import ReceiptLightbox from '@/components/ReceiptLightbox';
import { Plus, Edit2, Trash2, Euro, Calendar, FileText, User as UserIcon, Image as ImageIcon, Download, Filter, Camera, Sparkles, Loader2, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeReceipt } from '@/lib/ocr';
import Tooltip from '@/components/Tooltip';

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
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [storageStats, setStorageStats] = useState<any>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        // Sort by recordingDate descending (newest first)
        const sortedData = data.sort((a: any, b: any) => new Date(b.recordingDate).getTime() - new Date(a.recordingDate).getTime());
        setExpenses(sortedData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const res = await fetch('/api/admin/storage');
      if (res.ok) {
        const data = await res.json();
        setStorageStats(data);
      }
    } catch (error) {
      console.error("Storage stats error:", error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchStorageStats();
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
        recordingDate: expense.recordingDate,
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

  const handleCardFileUpload = async (expenseId: number, file: File) => {
    setUploadingId(expenseId);

    try {
      // 1. Run OCR Analysis first
      const ocrResult = await analyzeReceipt(file);

      let finalAmount = null;
      let finalDate = null;
      let finalMotif = null;

      if (ocrResult.amount || ocrResult.date || ocrResult.merchant || ocrResult.tax || ocrResult.category) {
        const dateStr = ocrResult.date ? new Date(ocrResult.date).toLocaleDateString('fr-FR') : '?';
        const modelName = ocrResult.model?.includes('2.0') ? 'Gemini 2.0 Flash ✨' : 'Gemini 1.5 Flash';

        let msg = `Justificatif analysé avec ${modelName}\n\nDonnées détectées :\n`;
        if (ocrResult.merchant) msg += `- Commerçant : ${ocrResult.merchant}\n`;
        msg += `- Montant : ${ocrResult.amount || '?'} €\n`;
        if (ocrResult.tax) msg += `- TVA : ${ocrResult.tax} €\n`;
        if (ocrResult.category) msg += `- Catégorie : ${ocrResult.category}\n`;
        if (ocrResult.paymentMethod) msg += `- Paiement : ${ocrResult.paymentMethod}\n`;
        msg += `- Date : ${dateStr}\n`;

        if (ocrResult.usage) {
          msg += `\n📊 Consommation : ${ocrResult.usage.total} tokens`;
          msg += ` (Total global : ${ocrResult.usage.globalTotal.toLocaleString()} tokens)`;
        }

        msg += `\n\nVoulez-vous mettre à jour la dépense avec ces données ?`;

        if (window.confirm(msg)) {
          finalAmount = ocrResult.amount;
          finalDate = ocrResult.date;
          finalMotif = ocrResult.merchant || ocrResult.category;
        }
      }

      // 2. Prepare Upload
      const formData = new FormData();
      formData.append('receipt', file);
      if (finalAmount !== null) formData.append('amount', finalAmount.toString());
      if (finalDate !== null) formData.append('date', finalDate);
      if (finalMotif !== null) formData.append('motif', finalMotif);

      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast.success(finalAmount || finalDate ? "Dépense et justificatif mis à jour ✨" : "Justificatif ajouté ✨");
        fetchExpenses();
        fetchStorageStats();
      } else {
        const error = await response.text();
        toast.error("Échec de l'upload: " + error);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'upload ou de l'analyse");
    } finally {
      setUploadingId(null);
    }
  };

  const handleManualOCR = async (expense: any) => {
    if (!expense.receiptUrl) return;
    setAnalyzingId(expense.id);

    try {
      const ocrResult = await analyzeReceipt(expense.receiptUrl);

      if (ocrResult.amount || ocrResult.date || ocrResult.merchant || ocrResult.tax || ocrResult.category) {
        const dateStr = ocrResult.date ? new Date(ocrResult.date).toLocaleDateString('fr-FR') : '?';
        const modelName = ocrResult.model?.includes('2.0') ? 'Gemini 2.0 Flash ✨' : 'Gemini 1.5 Flash';

        let msg = `Analyse ${modelName}\n\nDonnées détectées :\n`;
        if (ocrResult.merchant) msg += `- Commerçant : ${ocrResult.merchant}\n`;
        msg += `- Montant : ${ocrResult.amount || '?'} €\n`;
        if (ocrResult.tax) msg += `- TVA : ${ocrResult.tax} €\n`;
        if (ocrResult.category) msg += `- Catégorie : ${ocrResult.category}\n`;
        if (ocrResult.paymentMethod) msg += `- Paiement : ${ocrResult.paymentMethod}\n`;
        msg += `- Date : ${dateStr}\n`;

        if (ocrResult.usage) {
          msg += `\n📊 Consommation : ${ocrResult.usage.total} tokens`;
          msg += ` (Total global : ${ocrResult.usage.globalTotal.toLocaleString()} tokens)`;
        }

        msg += `\n\nVoulez-vous mettre à jour la dépense avec ces données ?`;

        if (window.confirm(msg)) {
          const formData = new FormData();
          if (ocrResult.amount) formData.append('amount', ocrResult.amount.toString());
          if (ocrResult.date) formData.append('date', ocrResult.date);
          if (ocrResult.merchant) formData.append('motif', ocrResult.merchant);
          else if (ocrResult.category) formData.append('motif', ocrResult.category);

          const response = await fetch(`/api/expenses/${expense.id}`, {
            method: 'PUT',
            body: formData,
          });

          if (response.ok) {
            toast.success("Dépense mise à jour avec succès ✨");
            fetchExpenses();
            fetchStorageStats();
          } else {
            const error = await response.text();
            toast.error("Échec de la mise à jour: " + error);
          }
        }
      } else {
        toast.info("Aucune donnée n'a pu être extraite de ce justificatif.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'analyse OCR");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDeleteReceipt = async (expenseId: number) => {
    if (!window.confirm("Supprimer ce justificatif ? Cette action est irréversible.")) return;

    const formData = new FormData();
    formData.append('deleteReceipt', 'true');

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast.success("Justificatif supprimé");
        fetchExpenses();
        fetchStorageStats();
      } else {
        toast.error("Échec de la suppression");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur serveur lors de la suppression");
    }
  };

  return (
    <div className="container mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {storageStats && (
            <div className="hidden lg:flex flex-col gap-1 mr-4 min-w-[200px] border-r border-slate-200 dark:border-slate-700 pr-4">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <HardDrive size={10} className={storageStats.usagePercentage > 80 ? "text-orange-500" : (storageStats.storageType === 'local' ? "text-indigo-500" : "text-blue-500")} />
                  Stockage {storageStats.storageType === 'local' ? 'Local' : 'Cloud'}
                </span>
                <span>{Math.round(storageStats.usagePercentage)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                <div
                  className={`h-full transition-all duration-1000 ${
                    storageStats.usagePercentage > 90 ? 'bg-red-500' :
                    storageStats.usagePercentage > 70 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${storageStats.usagePercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-medium mt-0.5">
                <span className="text-slate-400">{storageStats.formattedSize} / {storageStats.formattedLimit}</span>
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-black">
                  <Sparkles size={8} />
                  {(storageStats.totalAiTokens || 0).toLocaleString()} tokens
                </span>
              </div>
            </div>
          )}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
            <Tooltip content="Afficher toutes les dépenses">
              <button
                onClick={() => setReceiptFilter('all')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${receiptFilter === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tous ({expenses.length})
              </button>
            </Tooltip>
            <Tooltip content="Dépenses avec photo">
              <button
                onClick={() => setReceiptFilter('with')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${receiptFilter === 'with' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Avec justificatif ({expensesWithReceipts})
              </button>
            </Tooltip>
            <Tooltip content="Dépenses sans justificatif">
              <button
                onClick={() => setReceiptFilter('without')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${receiptFilter === 'without' ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sans ({expenses.length - expensesWithReceipts})
              </button>
            </Tooltip>
          </div>

          {expensesWithReceipts > 0 && (
            <Tooltip content="Télécharger tous les reçus filtrés dans un ZIP">
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
                <span>ZIP <span className="hidden sm:inline">Justificatifs</span></span>
              </button>
            </Tooltip>
          )}
        </div>

        <Tooltip content="Ajouter manuellement une nouvelle dépense">
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 text-sm font-black"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nouvelle dépense</span>
            <span className="sm:hidden">Nouveau</span>
          </button>
        </Tooltip>
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
                  {expense.receiptUrl ? (
                    <div className="flex flex-wrap gap-1.5">
                      <Tooltip content="Voir le justificatif">
                        <button
                          onClick={() => handleViewReceipt(expense)}
                          className="flex items-center justify-center p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition shadow-sm border border-purple-100 dark:border-purple-800"
                        >
                          <ImageIcon size={18} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Relancer l'IA Gemini pour extraire les données">
                        <button
                          onClick={() => handleManualOCR(expense)}
                          disabled={analyzingId === expense.id}
                          className="flex items-center justify-center p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 transition shadow-sm border border-amber-100 dark:border-amber-800 disabled:opacity-50"
                        >
                          {analyzingId === expense.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Sparkles size={18} />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip content="Télécharger ce fichier image">
                        <a
                          href={expense.receiptUrl}
                          download={`justificatif_${expense.motif.replace(/\s+/g, '_')}_${new Date(expense.date).toISOString().split('T')[0]}.jpg`}
                          className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition shadow-sm border border-blue-100 dark:border-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={18} />
                        </a>
                      </Tooltip>
                      <Tooltip content="Supprimer uniquement le justificatif">
                        <button
                          onClick={() => handleDeleteReceipt(expense.id)}
                          className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition shadow-sm border border-red-100 dark:border-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCardFileUpload(expense.id, file);
                        }}
                        className="hidden"
                        id={`upload-receipt-${expense.id}`}
                      />
                      <Tooltip content="Prendre en photo ou choisir un fichier">
                        <label
                          htmlFor={`upload-receipt-${expense.id}`}
                          className={`p-2 rounded-xl cursor-pointer transition flex items-center justify-center shadow-sm border ${uploadingId === expense.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 border-purple-100 dark:border-purple-800'}`}
                        >
                          {uploadingId === expense.id ? (
                            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera size={18} />
                          )}
                        </label>
                      </Tooltip>
                    </div>
                  )}
                <div className="flex gap-1 transition-opacity text-xs font-bold">
                    <Tooltip content="Modifier les détails">
                      <button onClick={() => handleOpenModal(expense)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Edit2 size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Supprimer la dépense complète">
                      <button onClick={() => handleDelete(expense.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors text-red-500 flex items-center gap-1">
                          <Trash2 size={16} />
                      </button>
                    </Tooltip>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border"
                          style={{
                            backgroundColor: `${expense.user?.color}15`,
                            color: expense.user?.color || '#6366f1',
                            borderColor: `${expense.user?.color}40`
                          }}
                        >
                            <UserIcon size={10} />
                            {expense.user?.name || 'Système'}
                        </span>
                    </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white truncate">{expense.motif}</h3>
                  <div className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider mt-1">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-black">
                      <FileText size={12} className="text-blue-600 dark:text-blue-400" />
                      Saisie : {expense.recordingDate ? new Date(expense.recordingDate).toLocaleDateString('fr-FR') : 'Inconnue'}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold italic">
                      <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
                      Achat : {new Date(expense.date).toLocaleDateString('fr-FR')}
                    </div>
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
