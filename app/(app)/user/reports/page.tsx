// Fichier : app/(app)/user/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ExportModal from '@/components/ExportModal';
import { useTitle } from '@/components/TitleContext';

interface ExportOptions {
  financialSummary: boolean;
  dailyAmplitude: boolean;
  detailedLogs: boolean;
  evaluationAnalytics: boolean;
}
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import {
  Calendar,
  Download,
  TrendingUp,
  Clock,
  Euro,
  MapPin,
  CheckCircle,
  Zap,
  CreditCard,
  FileText,
  Search,
  Filter
} from 'lucide-react';

// Définir les types
interface DetailedEntry {
  date: string;
  patient: string;
  worker: string;
  startTime: string;
  endTime: string;
  duration: string;
  pay: string;
  status: string;
  isRealized: boolean;
}

interface ChartEntry {
  day: string;
  hours: number;
}

interface DailySummary {
  date: string;
  worker: string;
  firstStart: string;
  lastEnd: string;
  totalHours: string;
}

interface DistributionEntry {
  name: string;
  value: number;
}

interface ExpenseEntry {
  id: number;
  motif: string;
  amount: number;
  date: string;
  user?: { name: string | null };
}

interface ReportData {
  workedHours: DetailedEntry[];
  chartData: ChartEntry[];
  dailySummaries: DailySummary[];
  distributionData: DistributionEntry[];
  expenses: ExpenseEntry[];
  summary: {
    realizedHours: number;
    realizedPay: number;
    realizedTravelCost: number;
    plannedHours: number;
    plannedPay: number;
    plannedTravelCost: number;
    totalPay: number;
    totalHours: number;
    totalTravelCost: number;
    totalExpenses: number;
  };
}

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: {
    (options: any): jsPDF;
    previous?: {
      finalY?: number;
      [key: string]: any;
    };
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function UserReportsPage() {
  const { data: session } = useSession();
  const { setTitle } = useTitle();

  // Dates par défaut : du 1er du mois à aujourd'hui (ou fin du mois courant)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Manual formatting: YYYY-MM-DD
  const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
  };

  const [startDate, setStartDate] = useState(formatDate(firstDay));
  const [endDate, setEndDate] = useState(formatDate(lastDay));

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeMonths, setActiveMonths] = useState<{ year: number, month: number }[]>([]);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    // Trouver le premier mois disponible pour cette année
    const firstMonthForYear = activeMonths.find(am => am.year === year);
    if (firstMonthForYear) {
      handleMonthSelect(firstMonthForYear.month, year);
    }
  };

  // Extraire les années disponibles depuis activeMonths
  const availableYears = Array.from(new Set(activeMonths.map(am => am.year))).sort((a, b) => b - a);

  // Liste des mois pour le sélecteur
  const allMonths = [
    { name: 'Janvier', value: 0 },
    { name: 'Février', value: 1 },
    { name: 'Mars', value: 2 },
    { name: 'Avril', value: 3 },
    { name: 'Mai', value: 4 },
    { name: 'Juin', value: 5 },
    { name: 'Juillet', value: 6 },
    { name: 'Août', value: 7 },
    { name: 'Septembre', value: 8 },
    { name: 'Octobre', value: 9 },
    { name: 'Novembre', value: 10 },
    { name: 'Décembre', value: 11 },
  ];

  // Récupérer les mois avec activité
  useEffect(() => {
    if (session?.user?.id) {
      const fetchActiveMonths = async () => {
        try {
          const res = await fetch(`/api/reports/active-months?userId=${session.user.id}`);
          if (res.ok) {
            const data = await res.json();
            console.log('Active months received:', data);
            setActiveMonths(data);

            const isCurrentMonthActive = data.some((m: any) => m.year === selectedYear && m.month === now.getMonth());
            if (!isCurrentMonthActive && data.length > 0) {
                const lastActive = data.sort((a: any, b: any) => b.year - a.year || b.month - a.month)[0];
                setSelectedYear(lastActive.year);
                handleMonthSelect(lastActive.month, lastActive.year);
            }
          }
        } catch (e) { console.error(e); }
      };
      fetchActiveMonths();
    }
  }, [session?.user?.id]);

  const handleMonthSelect = (monthIndex: number, yearOverride?: number) => {
    const year = yearOverride ?? selectedYear;
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  useEffect(() => {
    setTitle("Mes Rapports & Paie");
  }, [setTitle]);

  // Génération automatique du rapport
  useEffect(() => {
    if (session?.user?.id && startDate && endDate) {
      generateReport();
    }
  }, [session?.user?.id, startDate, endDate]);

  const generateReport = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      const endpoint = `/api/reports?userId=${session.user.id}&startDate=${startDate}&endDate=${endDate}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        setReportData(await res.json());
      } else {
        const errorText = await res.text();
        console.error(`Erreur: ${errorText}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async (options: ExportOptions) => {
    if (!reportData || !session?.user) return;

    const doc = new jsPDF() as jsPDFWithAutoTable;
    let currentY = 0;

    // --- 1. MODERN PREMIUM HEADER ---
    doc.setFillColor(30, 41, 59); // Slate 900
    doc.rect(0, 0, 210, 45, 'F');

    // Add Logo
    try {
      doc.addImage('/agendapro.png', 'PNG', 14, 10, 25, 25);
    } catch (e) {
      console.error("Could not load logo in PDF", e);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AGENDA PRO', 45, 24);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('GESTION INTELLIGENTE D\'INTERVENTIONS', 45, 30);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`GÉNÉRÉ LE : ${new Date().toLocaleDateString('fr-FR')}`, 145, 20);
    doc.text(`PÉRIODE : ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`, 145, 27);

    currentY = 60;

    // --- 2. REPORT CONTEXT ---
    doc.setTextColor(30, 41, 59); // Slate 900
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Mon Rapport d'Activité : ${session.user.name || 'Utilisateur'}`, 14, currentY);

    doc.setDrawColor(59, 130, 246);
    doc.line(14, currentY + 2, 40, currentY + 2);

    currentY += 15;

    // --- 4. FINANCIAL SUMMARY ( DASHBOARD CARDS ) ---
    if (options.financialSummary) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }

      const cardW = 44; // approx 1/4 of content area
      const cardH = 25;
      const spacing = 2;
      const startX = 14;

      // ROW 1
      // 1. Hours Card
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.roundedRect(startX, currentY, cardW, cardH, 3, 3, 'F');
      doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text('HEURES RÉALISÉES', startX + 5, currentY + 7);
      doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
      doc.text(`${reportData.summary.realizedHours.toFixed(2)} h`, startX + 5, currentY + 14);
      doc.setFontSize(6); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
      doc.text(`PLANIFIÉES: ${reportData.summary.plannedHours.toFixed(2)} h`, startX + 5, currentY + 20);

      // 2. Travel Card
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(startX + cardW + spacing, currentY, cardW, cardH, 3, 3, 'F');
      doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text('FRAIS DE DÉPLACEMENT', startX + cardW + spacing + 5, currentY + 7);
      doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold');
      doc.text(`${reportData.summary.realizedTravelCost.toFixed(2)} €`, startX + cardW + spacing + 5, currentY + 14);
      doc.setFontSize(6); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
      doc.text(`À VENIR: ${reportData.summary.plannedTravelCost.toFixed(2)} €`, startX + cardW + spacing + 5, currentY + 20);

      // 3. Realized Pay (Emerald)
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.roundedRect(startX + (cardW + spacing) * 2, currentY, cardW, cardH, 3, 3, 'F');
      doc.setFontSize(7); doc.setTextColor(255, 255, 255);
      doc.text('MA PAIE RÉALISÉE', startX + (cardW + spacing) * 2 + 5, currentY + 7);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(`${reportData.summary.realizedPay.toFixed(2)} €`, startX + (cardW + spacing) * 2 + 5, currentY + 14);
      doc.setFontSize(5); doc.setFont('helvetica', 'normal');
      doc.text(`DONT ${reportData.summary.realizedTravelCost.toFixed(2)} € DE DÉPLACEMENT`, startX + (cardW + spacing) * 2 + 5, currentY + 20);

      // 4. Upcoming Pay (Blue)
      doc.setFillColor(37, 99, 235); // Blue 600
      doc.roundedRect(startX + (cardW + spacing) * 3, currentY, cardW, cardH, 3, 3, 'F');
      doc.setFontSize(7); doc.setTextColor(255, 255, 255);
      doc.text('MA PAIE À VENIR', startX + (cardW + spacing) * 3 + 5, currentY + 7);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(`${reportData.summary.plannedPay.toFixed(2)} €`, startX + (cardW + spacing) * 3 + 5, currentY + 14);
      doc.setFontSize(5); doc.setFont('helvetica', 'normal');
      doc.text(`DONT ${reportData.summary.plannedTravelCost.toFixed(2)} € DE FRAIS PRÉVUS`, startX + (cardW + spacing) * 3 + 5, currentY + 20);

      currentY += cardH + spacing;

      // ROW 2
      const largeCardW = (cardW * 2) + spacing;
      // 5. Expenses
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.roundedRect(startX, currentY, largeCardW, cardH, 3, 3, 'F');
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text('TOTAL MES DÉPENSES', startX + 5, currentY + 7);
      doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
      doc.text(`${reportData.summary.totalExpenses.toFixed(2)} €`, startX + 5, currentY + 18);

      // 6. Impact Trésorerie (Rose/Crimson)
      doc.setFillColor(190, 18, 60); // Rose 700
      doc.roundedRect(startX + largeCardW + spacing, currentY, largeCardW, cardH, 3, 3, 'F');
      doc.setFontSize(7); doc.setTextColor(244, 244, 245); // Slate 50
      doc.text('COUT TOTAL POUR STRUCTURE', startX + largeCardW + spacing + 5, currentY + 7);
      doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
      doc.text(`${(reportData.summary.realizedPay + reportData.summary.totalExpenses).toFixed(2)} €`, startX + largeCardW + spacing + 5, currentY + 16);
      doc.setFontSize(6); doc.setTextColor(244, 244, 245); doc.setFont('helvetica', 'normal');
      doc.text('TOTAL PAIE + DÉPENSES', startX + largeCardW + spacing + 5, currentY + 22);

      currentY += cardH + 15;
    }

    // --- 5. DAILY AMPLITUDE ---
    if (options.dailyAmplitude && reportData.dailySummaries.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text('Synthèse Quotidienne / Amplitude', 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Premier Début', 'Dernière Fin', 'Amplitude Totale']],
        body: reportData.dailySummaries.map(s => [
          s.date,
          s.firstStart,
          s.lastEnd,
          `${s.totalHours} h`
        ]),
        headStyles: { fillColor: [51, 65, 85] },
        bodyStyles: { fontSize: 9 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- 6. EVALUATION ANALYTICS (Charts) ---
    if (options.evaluationAnalytics) {
        if (currentY > 150) { doc.addPage(); currentY = 20; }
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text('Analyses de l\'Activité', 14, currentY);
        currentY += 10;

        try {
            const barContainer = document.getElementById('bar-chart-container');
            const pieContainer = document.getElementById('pie-chart-container');

            if (barContainer) {
                const canvas = await html2canvas(barContainer, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 14, currentY, 90, 60);
            }
            if (pieContainer) {
                const canvas = await html2canvas(pieContainer, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 106, currentY, 90, 60);
            }
            currentY += 70;
        } catch (e) {
            console.error("Error capturing charts:", e);
        }
    }

    // --- 7. DETAILED LOGS TABLE ---
    if (options.detailedLogs && reportData.workedHours.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text('Journal Détaillé de mes Interventions', 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Statut', 'Patient', 'Début', 'Fin', 'Durée', 'Cout']],
        body: reportData.workedHours.map(entry => [
          entry.date,
          entry.isRealized ? 'Vérifié' : 'Projeté',
          entry.patient,
          entry.startTime,
          entry.endTime,
          `${entry.duration} h`,
          `${entry.pay} €`
        ]),
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- 8. EXPENSES TABLE ---
    if (options.financialSummary && reportData.expenses && reportData.expenses.length > 0) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setTextColor(16, 185, 129); // Emerald 500
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Détail de mes Dépenses', 14, currentY);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Motif de la dépense', 'Montant']],
            body: reportData.expenses.map(exp => [
                new Date(exp.date).toLocaleDateString('fr-FR'),
                exp.motif,
                `${exp.amount.toFixed(2)} €`
            ]),
            headStyles: { fillColor: [16, 185, 129] },
            columnStyles: {
                2: { halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`TOTAL MES DÉPENSES : ${reportData.summary.totalExpenses.toFixed(2)} €`, 196, currentY + 5, { align: 'right' });
    }

    // --- 6. MODERN FOOTER ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 285, 196, 285);

        doc.text(`AGENDA PRO - © Michel ESPARSA`, 14, 290);
        doc.text(`Page ${i} sur ${pageCount}`, 185, 290);
    }

    doc.save(`Mon_Rapport_${startDate}.pdf`);
    setIsExportModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 transition-colors duration-300">

      {/* COMPACT MONTH/YEAR SELECTOR */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Year Selector */}
          <div className="flex-shrink-0 w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => handleYearSelect(parseInt(e.target.value))}
              className="w-full sm:w-28 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer text-sm"
            >
              {availableYears.length > 0 ? (
                availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              ) : (
                <option value={selectedYear}>{selectedYear}</option>
              )}
            </select>
          </div>

          {/* Month Scrollable Area */}
          <div className="flex-1 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 pb-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {(() => {
                const filteredMonths = allMonths.filter((m) =>
                  activeMonths.some((am) => am.year === selectedYear && am.month === m.value)
                );

                return filteredMonths.map((m) => {
                  const [yStr, mStr] = startDate.split('-');
                  const year = parseInt(yStr, 10);
                  const monthIndex = parseInt(mStr, 10) - 1;

                  const isActive = year === selectedYear && monthIndex === m.value;

                  return (
                    <button
                      key={m.value}
                      onClick={() => handleMonthSelect(m.value)}
                      className={`relative px-3 py-2 rounded-lg text-[11px] font-black transition-all text-center whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      }`}
                      title={m.name}
                    >
                      {m.name.substring(0, 3)}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS CARD */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-wrap items-end gap-4 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mise à jour...</span>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-[200px]">
           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-2">
            <FileText size={14} />
            <span>Période de Rapport</span>
          </label>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-slate-200 text-sm">
             {new Date(startDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Du
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-200 font-bold"
          />
        </div>

        <div>
           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Au
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-200 font-bold"
          />
        </div>

        <div className="h-[46px] flex items-center ml-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={!reportData}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={20} />
            <span className="hidden xs:inline">Exporter PDF</span>
          </button>
        </div>
      </div>

      {reportData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* STATS GRID - EXACTLY LIKE ADMIN */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Clock size={18} /></div>
                <span className="text-sm font-medium">Heures Réalisées</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{reportData.summary.realizedHours.toFixed(2)} h</div>
              <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Plannifiées: {reportData.summary.plannedHours.toFixed(2)} h</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg"><MapPin size={18} /></div>
                <span className="text-sm font-medium">Frais de Déplacement</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{reportData.summary.realizedTravelCost.toFixed(2)} €</div>
              <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">À venir: {reportData.summary.plannedTravelCost.toFixed(2)} €</div>
            </div>

            <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none text-white">
              <div className="flex items-center gap-3 mb-2 opacity-80">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Paie réalisée</span>
              </div>
              <div className="text-2xl font-bold">{reportData.summary.realizedPay.toFixed(2)} €</div>
              <div className="text-[10px] opacity-70 mt-1 uppercase font-black">
                Dont {reportData.summary.realizedTravelCost.toFixed(2)} € de frais de déplacement
              </div>
            </div>

            <div className="bg-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none text-white">
              <div className="flex items-center gap-3 mb-2 opacity-80">
                <Calendar size={18} />
                <span className="text-sm font-medium">Paie à venir</span>
              </div>
              <div className="text-2xl font-bold">{reportData.summary.plannedPay.toFixed(2)} €</div>
              <div className="text-[10px] opacity-70 mt-1 uppercase font-black">
                Dont {reportData.summary.plannedTravelCost.toFixed(2)} € de frais prévus
              </div>
            </div>

            {/* Row 2 - Exactly like Admin */}
            <div className="bg-slate-800 p-5 rounded-2xl shadow-lg dark:bg-slate-900 text-white md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg"><Euro size={18} /></div>
                <div>
                  <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Dépenses Fonctionnement</span>
                  <div className="text-2xl font-black">{reportData.summary.totalExpenses.toFixed(2)} €</div>
                </div>
              </div>
            </div>

            <div className="bg-rose-700 p-5 rounded-2xl shadow-lg text-white md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg"><TrendingUp size={18} /></div>
                <div>
                  <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Impact sur Trésorerie</span>
                  <div className="text-2xl font-black">{(reportData.summary.realizedPay + reportData.summary.totalExpenses).toFixed(2)} €</div>
                  <div className="text-[10px] opacity-60">Total Paie + Dépenses</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CHART BAR CARD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500 dark:text-blue-400" />
                Heures Travaillées par Jour
              </h3>
              <div className="h-[300px] w-full" id="bar-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip
                      cursor={{fill: 'rgba(241, 245, 249, 0.1)'}}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9'}}
                      formatter={(value: any) => [`${value?.toFixed(2) || 0} h`, 'Heures']}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {reportData.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={'#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PIE CHART CARD (Distribution) */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500 dark:text-blue-400" />
                Répartition des Activités
              </h3>
              <div className="h-[300px] w-full" id="pie-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ percent }: any) => percent > 0 ? `${(percent * 100).toFixed(1)}%` : ''}
                      labelLine={true}
                    >
                      {reportData.distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9'}}
                      formatter={(value: any, name: any) => [`${value?.toFixed(2) || 0} h`, name || 'Total']}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px' }}
                      formatter={(value: string) => <span className="text-slate-700 dark:text-slate-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DETAILS CARD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col col-span-3 lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Journal des Interventions</h3>
                <Download size={20} className="text-blue-500 opacity-50" />
              </div>

              <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 text-xs">
                {reportData.workedHours.map((entry, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">{entry.date}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${entry.isRealized ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                          {entry.isRealized ? 'Vérifié' : 'Projeté'}
                        </span>
                      </div>
                      <span className="font-bold text-blue-600">{entry.duration} h</span>
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">{entry.patient}</div>
                    <div className="text-slate-500 mt-1 uppercase text-[10px] font-bold">
                        {entry.startTime} - {entry.endTime} | <span className="text-slate-800 dark:text-white">{entry.pay} €</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EXPENSES BREAKDOWN CARD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col col-span-3 lg:col-span-1">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Détail des Dépenses</h3>
                <Euro size={20} className="text-emerald-500 opacity-50" />
              </div>
              <div className="mb-4 flex items-center gap-1.5 grayscale opacity-60">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Validées par l'administrateur</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {reportData.expenses && reportData.expenses.length > 0 ? (
                  reportData.expenses.map((expense, i) => (
                    <div key={i} className="p-3 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100/50 dark:border-emerald-500/20 flex justify-between items-center group">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{new Date(expense.date).toLocaleDateString('fr-FR')}</span>
                        <div className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">{expense.motif}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{expense.amount.toFixed(2)} €</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 italic text-sm">Aucune dépense sur cette période</div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline font-black font-black">
                 <span className="text-xs text-slate-400 uppercase">Total Dépenses</span>
                 <span className="text-xl text-slate-800 dark:text-white">{reportData.summary.totalExpenses.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportPDF}
      />
    </div>
  );
}
