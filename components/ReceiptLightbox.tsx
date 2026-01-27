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
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-10"
      >
        <X size={24} />
      </button>

      {/* Image container */}
      <div
        className="relative max-w-6xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <img
          src={imageUrl}
          alt="Justificatif"
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />

        {/* Metadata */}
        {metadata && (
          <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-4 shadow-xl max-w-md w-full">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Motif</p>
                <p className="text-slate-900 dark:text-slate-100 font-bold">{metadata.motif}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Montant</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">{metadata.amount.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Date</p>
                <p className="text-slate-900 dark:text-slate-100 font-bold">
                  {new Date(metadata.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {metadata.userName && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Bénéficiaire</p>
                  <p className="text-slate-900 dark:text-slate-100 font-bold">{metadata.userName}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        Appuyez sur <kbd className="px-2 py-1 bg-white/10 rounded">Échap</kbd> pour fermer
      </div>
    </div>
  );
}
