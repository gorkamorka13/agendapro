'use client';

import { useState, useEffect } from 'react';
import { X, Euro, Calendar, FileText, Save, User as UserIcon, Camera, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { toast } from 'sonner';
import { analyzeReceipt } from '@/lib/ocr';
import Tooltip from './Tooltip';

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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const [isDateManuallyDirty, setIsDateManuallyDirty] = useState(false);

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
      setExistingReceiptUrl(expense.receiptUrl || null);
      setReceiptFile(null);
      setReceiptPreview(null);
      setAutoFilledFields([]);
      setIsDateManuallyDirty(false);
    } else {
      setUserId('');
      setMotif('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setExistingReceiptUrl(null);
      setReceiptFile(null);
      setReceiptPreview(null);
      setAutoFilledFields([]);
      setIsDateManuallyDirty(false);
    }
  }, [expense, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Trigger OCR Analysis
      setIsAnalyzing(true);
      setAutoFilledFields([]);
      try {
        const result = await analyzeReceipt(file);

        if (result.amount || result.date || result.merchant || result.tax || result.category) {
          const dateStr = result.date ? new Date(result.date).toLocaleDateString('fr-FR') : '?';
          const modelName = result.model === 'gemini-2.0-flash-exp' ? 'Gemini 2.0 Flash' : 'Gemini 1.5 Flash';

          let msg = `Analyse ${modelName} ✨\n\n`;
          if (result.merchant) msg += `- Commerçant : ${result.merchant}\n`;
          msg += `- Montant : ${result.amount || '?'} €\n`;
          if (result.tax) msg += `- TVA détectée : ${result.tax} €\n`;
          if (result.category) msg += `- Catégorie : ${result.category}\n`;
          if (result.paymentMethod) msg += `- Paiement : ${result.paymentMethod}\n`;

          msg += `- Date : ${dateStr}${isDateManuallyDirty ? ' (remplacera la vôtre)' : ''}\n`;
          msg += `\nVoulez-vous remplir automatiquement le formulaire ?`;

          if (window.confirm(msg)) {
            const newAutoFields = [];
            if (result.amount) {
              setAmount(result.amount.toString());
              newAutoFields.push('amount');
            }
            if (result.date) {
              setDate(result.date);
              newAutoFields.push('date');
            }
            if (result.merchant) {
              setMotif(result.merchant);
              newAutoFields.push('motif');
            } else if (result.category && !motif) {
              // Si pas de marchand mais une catégorie, on l'utilise pour le motif si vide
              setMotif(result.category);
              newAutoFields.push('motif');
            }
            setAutoFilledFields(newAutoFields);
            toast.success("Données remplies avec succès ✨");
          }
        }
      } catch (error) {
        console.error("OCR Analysis failed:", error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setExistingReceiptUrl(null);
    setAutoFilledFields([]);
  };

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

      // Use FormData to send file
      const formData = new FormData();
      formData.append('motif', motif);
      formData.append('amount', amount);
      formData.append('date', date);
      formData.append('userId', userId);
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.storageError) {
          toast.warning(`Données enregistrées, mais échec du stockage : ${data.storageError}`);
        } else {
          toast.success(expense ? "Dépense mise à jour" : "Dépense enregistrée");
        }
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
            <div className="relative">
              <Tooltip content="Ce montant peut être détecté automatiquement via un justificatif" position="right">
                <Input
                  label="Montant (€)"
                  icon={<Euro size={12} className="text-emerald-500" />}
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAutoFilledFields(prev => prev.filter(f => f !== 'amount'));
                  }}
                  placeholder="0.00"
                  className={autoFilledFields.includes('amount') ? 'border-purple-300 dark:border-purple-800 bg-purple-50/30' : ''}
                />
              </Tooltip>
              {autoFilledFields.includes('amount') && (
                <Sparkles size={14} className="absolute right-3 top-9 text-purple-500 animate-pulse" />
              )}
            </div>
            <div className="relative">
              <Tooltip content="La date peut être extraite de la photo du ticket" position="right">
                <Input
                  label="Date"
                  icon={<Calendar size={12} className="text-indigo-500" />}
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setIsDateManuallyDirty(true);
                    setAutoFilledFields(prev => prev.filter(f => f !== 'date'));
                  }}
                  className={autoFilledFields.includes('date') ? 'border-purple-300 dark:border-purple-800 bg-purple-50/30' : ''}
                />
              </Tooltip>
              {autoFilledFields.includes('date') && (
                <Sparkles size={14} className="absolute right-3 top-9 text-purple-500 animate-pulse" />
              )}
            </div>
          </div>

          {/* Receipt Upload Section */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center">
                <Camera size={12} className="inline mr-2 text-purple-500" />
                Justificatif (Photo/Image)
              </span>
              {isAnalyzing && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center animate-pulse">
                  <Loader2 size={10} className="mr-1 animate-spin" />
                  Analyse en cours...
                </span>
              )}
            </label>

            {/* Show existing or preview image */}
            {(receiptPreview || existingReceiptUrl) && (
              <div className="relative inline-block">
                <img
                  src={receiptPreview || existingReceiptUrl || ''}
                  alt="Justificatif"
                  className="max-w-full h-32 object-contain rounded-lg border-2 border-slate-200 dark:border-slate-700"
                />
                <Tooltip content="Retirer ce justificatif">
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* File input */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 dark:text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-50 file:text-purple-700
                hover:file:bg-purple-100
                dark:file:bg-purple-900/30 dark:file:text-purple-400
                dark:hover:file:bg-purple-900/50
                cursor-pointer"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              JPG, PNG, WEBP ou GIF (max 5MB)
            </p>
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
