'use client';

import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

interface ReceiptLightboxProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  metadata?: {
    motif: string;
    amount: number;
    date: string;
    userName?: string;
  };
}

export default function ReceiptLightbox({ imageUrl, isOpen, onClose, metadata }: ReceiptLightboxProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full transform animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">
            Justificatif
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="max-h-[80vh] overflow-y-auto p-2 scrollbar-thin">
          <div className="flex flex-col items-center">
            {/* Image Wrapper */}
            <div className="w-full bg-slate-50 dark:bg-slate-950/50 rounded-2xl flex items-center justify-center p-2 min-h-[200px]">
              <img
                src={imageUrl}
                alt="Justificatif"
                className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Metadata Section */}
            {metadata && (
              <div className="w-full p-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Motif</p>
                    <p className="text-slate-800 dark:text-slate-100 font-bold text-sm truncate">{metadata.motif}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-emerald-500/70 dark:text-emerald-500/50 text-[10px] font-black uppercase tracking-wider mb-1">Montant</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{metadata.amount.toFixed(2)} €</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Date</p>
                    <p className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                      {new Date(metadata.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {metadata.userName && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                      <p className="text-blue-500/70 dark:text-blue-400/50 text-[10px] font-black uppercase tracking-wider mb-1">Bénéficiaire</p>
                      <p className="text-blue-600 dark:text-blue-400 font-bold text-sm truncate">{metadata.userName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
