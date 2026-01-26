'use client';

import { useState } from 'react';
import { X, FileText, CheckSquare, Square, Download } from 'lucide-react';

interface ExportOptions {
  financialSummary: boolean;
  dailyAmplitude: boolean;
  detailedLogs: boolean;
  evaluationAnalytics: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export default function ExportModal({ isOpen, onClose, onExport }: Props) {
  const [options, setOptions] = useState<ExportOptions>({
    financialSummary: true,
    dailyAmplitude: true,
    detailedLogs: true,
    evaluationAnalytics: true,
  });

  if (!isOpen) return null;

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Exporter le rapport</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">Personnalisez votre document PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 outline-none">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-4">
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Sélectionner les sections</p>

          <button
            onClick={() => toggleOption('financialSummary')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${options.financialSummary ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}>
                <FileText size={18} />
              </div>
              <span className={`text-sm font-bold ${options.financialSummary ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>Récapitulatif financier</span>
            </div>
            {options.financialSummary ? <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} /> : <Square className="text-slate-200 dark:text-slate-700" size={20} />}
          </button>

          <button
            onClick={() => toggleOption('dailyAmplitude')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${options.dailyAmplitude ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}>
                <FileText size={18} />
              </div>
              <span className={`text-sm font-bold ${options.dailyAmplitude ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>Synthèse quotidienne</span>
            </div>
            {options.dailyAmplitude ? <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} /> : <Square className="text-slate-200 dark:text-slate-700" size={20} />}
          </button>

          <button
            onClick={() => toggleOption('detailedLogs')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${options.detailedLogs ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}>
                <FileText size={18} />
              </div>
              <span className={`text-sm font-bold ${options.detailedLogs ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>Détails des interventions</span>
            </div>
            {options.detailedLogs ? <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} /> : <Square className="text-slate-200 dark:text-slate-700" size={20} />}
          </button>

          <button
            onClick={() => toggleOption('evaluationAnalytics')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${options.evaluationAnalytics ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`}>
                <FileText size={18} />
              </div>
              <span className={`text-sm font-bold ${options.evaluationAnalytics ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>Analyses & Graphiques (%)</span>
            </div>
            {options.evaluationAnalytics ? <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} /> : <Square className="text-slate-200 dark:text-slate-700" size={20} />}
          </button>
        </div>

        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm flex items-center justify-center gap-2"
          >
            <X size={18} /> Annuler
          </button>
          <button
            onClick={() => onExport(options)}
            className="sm:col-span-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none text-sm flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Télécharger le PDF
          </button>
        </div>
      </div>
    </div>
  );
}
