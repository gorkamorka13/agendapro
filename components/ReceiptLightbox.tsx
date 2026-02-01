import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setZoom(1); // Reset zoom on open
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => setZoom(1);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full transform animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">
            Justificatif
          </h3>
          <div className="flex items-center gap-2">

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto p-2 scrollbar-thin flex-1 flex flex-col relative">
          <div className="flex flex-col items-center">
            {/* Image Wrapper */}
            <div className={`w-full bg-slate-50 dark:bg-slate-950/50 rounded-2xl relative overflow-auto border border-slate-200 dark:border-slate-800 transition-all duration-300 ${zoom > 1 ? 'min-h-[400px]' : 'min-h-[200px] flex items-center justify-center'}`}>

              <img
                src={imageUrl}
                alt="Justificatif"
                className={`transition-all duration-300 ease-in-out origin-top-left ${zoom === 1 ? 'max-w-full max-h-[50vh] object-contain mx-auto' : 'max-w-none object-contain'}`}
                style={zoom > 1 ? { width: `${zoom * 100}%` } : {}}
              />

              {/* Float Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-lg border border-slate-200 dark:border-slate-700 p-1 rounded-xl z-10">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-[10px] font-black w-8 text-center text-slate-700 dark:text-slate-300">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
                >
                  <ZoomIn size={16} />
                </button>
                {zoom > 1 && (
                  <button
                    onClick={handleReset}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 border-l border-slate-200 dark:border-slate-700 ml-1 pl-2 transition-colors"
                    title="Réinitialiser"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
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
