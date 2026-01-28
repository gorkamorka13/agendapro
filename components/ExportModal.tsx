'use client';

import { useState } from 'react';
import { X, FileText, CheckSquare, Square, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface ExportOptions {
  financialSummary: boolean;
  dailyAmplitude: boolean;
  detailedLogs: boolean;
  evaluationAnalytics: boolean;
  includeReceipts: boolean;
}

export type ExportFormat = 'pdf' | 'excel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions, format: ExportFormat) => void;
}

export default function ExportModal({ isOpen, onClose, onExport }: Props) {
  const [options, setOptions] = useState<ExportOptions>({
    financialSummary: true,
    dailyAmplitude: true,
    detailedLogs: true,
    evaluationAnalytics: true,
    includeReceipts: false,
  });
  const [format, setFormat] = useState<ExportFormat>('pdf');

  if (!isOpen) return null;

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 animate-in fade-in duration-200">
      <div className="flex min-h-full items-start justify-center py-10">
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
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={20} />
          </Button>
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

          <button
            onClick={() => toggleOption('includeReceipts')}
            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-500/50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${options.includeReceipts ? 'text-purple-600 dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`}>
                <Download size={18} />
              </div>
              <span className={`text-sm font-bold ${options.includeReceipts ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>Justificatifs Photos (Cloud/Blob)</span>
            </div>
            {options.includeReceipts ? <CheckSquare className="text-purple-600 dark:text-purple-400" size={20} /> : <Square className="text-slate-200 dark:text-slate-700" size={20} />}
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-8 pb-8 space-y-3">
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Format d'exportation</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('pdf')}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                format === 'pdf' ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400" : "bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800/50 dark:border-slate-800"
              )}
            >
              <FileText size={20} />
              <span className="font-bold text-sm">PDF</span>
            </button>
            <button
              onClick={() => setFormat('excel')}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                format === 'excel' ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" : "bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800/50 dark:border-slate-800"
              )}
            >
              <FileSpreadsheet size={20} />
              <span className="font-bold text-sm">EXCEL</span>
            </button>
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="rounded-2xl"
          >
            <X size={18} /> Annuler
          </Button>
          <Button
            onClick={() => onExport(options, format)}
            className={cn(
               "sm:col-span-2 rounded-2xl",
               format === 'excel' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
            )}
          >
            <Download size={18} />
            {format === 'pdf' ? 'Télécharger le PDF' : 'Télécharger l\'Excel'}
          </Button>
        </div>
      </div>
    </div>
  </div>
  );
}
