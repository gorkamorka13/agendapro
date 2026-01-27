'use client';

import { useState, useEffect } from 'react';
import { X, Euro, Calendar, FileText, Save, User as UserIcon, Camera, Trash2 } from 'lucide-react';
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
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
      setExistingReceiptUrl(expense.receiptUrl || null);
      setReceiptFile(null);
      setReceiptPreview(null);
    } else {
      setUserId('');
      setMotif('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setExistingReceiptUrl(null);
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  }, [expense, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setExistingReceiptUrl(null);
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

          {/* Receipt Upload Section */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              <Camera size={12} className="inline mr-2 text-purple-500" />
              Justificatif (Photo/Image)
            </label>

            {/* Show existing or preview image */}
            {(receiptPreview || existingReceiptUrl) && (
              <div className="relative inline-block">
                <img
                  src={receiptPreview || existingReceiptUrl || ''}
                  alt="Justificatif"
                  className="max-w-full h-32 object-contain rounded-lg border-2 border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
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
