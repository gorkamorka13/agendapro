// Fichier : app/(app)/admin/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { User } from '@prisma/client';
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
  User as UserIcon,
  FileText,
  Download,
  TrendingUp,
  Clock,
  Euro,
  MapPin
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

interface ReportData {
  workedHours: DetailedEntry[];
  chartData: ChartEntry[];
  dailySummaries: DailySummary[];
  distributionData: DistributionEntry[];
  summary: {
    totalHours: number;
    totalPay: number;
    totalTravelCost: number;
    hourlyRate: number;
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

export default function ReportsPage() {
  const { setTitle } = useTitle();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

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
    const fetchActiveMonths = async () => {
      if (!selectedUserId) return;
      try {
        const res = await fetch(`/api/reports/active-months?userId=${selectedUserId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveMonths(data);

          // Vérifier si le mois affiché est dans les actifs
          const [y, mStr] = startDate.split('-').map(Number);
          const m = mStr - 1;
          const isCurrentActive = data.some((item: any) => item.year === y && item.month === m);

          if (!isCurrentActive && data.length > 0) {
             const lastActive = data.sort((a: any, b: any) => b.year - a.year || b.month - a.month)[0];
             setSelectedYear(lastActive.year);
             handleMonthSelect(lastActive.month, lastActive.year);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchActiveMonths();
  }, [selectedUserId]);

  const handleMonthSelect = (monthIndex: number, yearOverride?: number) => {
    const year = yearOverride ?? selectedYear;
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('/api/users');
      if (res.ok) {
        const allUsers: User[] = await res.json();
        const intervenants = allUsers.filter((u) => u.role !== 'ADMIN' && (u.hourlyRate !== null || u.role === 'USER'));
        setUsers(intervenants);
        if (intervenants.length > 0 && !selectedUserId) {
          setSelectedUserId('all');
        }
      } else {
        const errorText = await res.text();
        console.error(`Erreur chargement utilisateurs: ${errorText}`);
      }
    };
    fetchUsers();
    setTitle("Rapports & Analytics");
  }, [setTitle, selectedUserId]);

  // Génération automatique du rapport
  useEffect(() => {
    if (selectedUserId && startDate && endDate) {
      generateReport();
    }
  }, [selectedUserId, startDate, endDate]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const endpoint = selectedUserId === 'all'
        ? `/api/reports?userId=all&startDate=${startDate}&endDate=${endDate}`
        : `/api/reports?userId=${selectedUserId}&startDate=${startDate}&endDate=${endDate}`;

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
    if (!reportData) return;

    const doc = new jsPDF() as jsPDFWithAutoTable;
    const selectedUser = users.find(u => u.id === selectedUserId);
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
    doc.text(`Rapport d'Activité : ${selectedUser?.name || 'Vue Globale'}`, 14, currentY);

    // Decorative underline
    doc.setDrawColor(59, 130, 246); // Blue 500
    doc.setLineWidth(1);
    doc.line(14, currentY + 2, 40, currentY + 2);

    currentY += 15;

    // --- 3. GRAPHICS CAPTURE ---
    if (options.evaluationAnalytics) {
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await wait(600);

      const barChartElem = document.getElementById('bar-chart-container');
      const pieChartElem = document.getElementById('pie-chart-container');
      const costChartElem = document.getElementById('cost-chart-container');

      if (barChartElem && pieChartElem && costChartElem) {
        try {
          const [barCanvas, pieCanvas, costCanvas] = await Promise.all([
            html2canvas(barChartElem, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true }),
            html2canvas(pieChartElem, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true }),
            html2canvas(costChartElem, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true })
          ]);

          // Helper logic to add image without distortion
          const addImageAuto = (canvas: HTMLCanvasElement, x: number, y: number, maxWidth: number, maxHeight: number) => {
            const canvasRatio = canvas.width / canvas.height;
            let targetWidth = maxWidth;
            let targetHeight = targetWidth / canvasRatio;

            if (targetHeight > maxHeight) {
              targetHeight = maxHeight;
              targetWidth = targetHeight * canvasRatio;
            }

            doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, targetWidth, targetHeight);
            return targetHeight;
          };

          // Row 1: Bar Chart (Full width)
          doc.setFontSize(11);
          doc.setTextColor(71, 85, 105);
          doc.text('Activité par jour (Heures)', 14, currentY);
          const h1 = addImageAuto(barCanvas, 14, currentY + 5, 182, 70);
          currentY += h1 + 15;

          // Row 2: Two Pie Charts
          doc.text('Répartition des activités', 14, currentY);
          doc.text('Répartition des coûts', 110, currentY);

          addImageAuto(pieCanvas, 14, currentY + 5, 85, 60);
          addImageAuto(costCanvas, 110, currentY + 5, 85, 60);

          currentY += 75;
        } catch (err) {
          console.error("Erreur capture graphiques:", err);
        }
      }
    }

    // --- 4. FINANCIAL SUMMARY CARDS ---
    if (options.financialSummary) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }

      // Background for summary
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.roundedRect(14, currentY, 182, 30, 2, 2, 'F');

      const col1 = 25, col2 = 85, col3 = 145;

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('HEURES TOTALES', col1, currentY + 10);
      doc.text('DÉPLACEMENT', col2, currentY + 10);
      doc.text('MONTANT NET', col3, currentY + 10);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${reportData.summary.totalHours.toFixed(2)} h`, col1, currentY + 20);
      doc.text(`${reportData.summary.totalTravelCost.toFixed(2)} €`, col2, currentY + 20);

      doc.setTextColor(37, 99, 235);
      doc.text(`${reportData.summary.totalPay.toFixed(2)} €`, col3, currentY + 20);

      currentY += 45;
    }

    // --- 5. DETAILED LOGS TABLE (Amplitude removed as requested) ---
    if (options.detailedLogs && reportData.workedHours.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Journal Détaillé des Interventions', 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Intervenant', 'Patient', 'Début', 'Fin', 'Durée', 'Coût']],
        body: reportData.workedHours.map(entry => [
          entry.date,
          entry.worker,
          entry.patient,
          entry.startTime,
          entry.endTime,
          `${entry.duration} h`,
          `${entry.pay} €`
        ]),
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] }
        },
        margin: { top: 20 },
      });
    }

    // --- 6. MODERN FOOTER ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 285, 196, 285);

        doc.text(`AGENDA PRO - © Michel ESPARSA - v${process.env.APP_VERSION} - ${process.env.BUILD_DATE}`, 14, 290);
        doc.text(`Page ${i} sur ${pageCount}`, 185, 290);
    }

    doc.save(`Rapport_${selectedUser?.name || 'Global'}_${startDate}.pdf`);
    setIsExportModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 transition-colors duration-300">


      {/* YEAR & MONTH SELECTOR */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
           {[2025, 2026].map(year => (
             <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedYear === year ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
             >
                {year}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex gap-2 min-w-max">
            {allMonths.map((m) => {
              // Be robust: parse startDate string "YYYY-MM-DD" directly to avoid any timezone shifting
              const [yStr, mStr] = startDate.split('-');
              const year = parseInt(yStr, 10);
              const monthIndex = parseInt(mStr, 10) - 1; // 0-based

              const isActive = year === selectedYear && monthIndex === m.value;
              const hasActivity = activeMonths.some((am) => am.year === selectedYear && am.month === m.value);

              if (!hasActivity && !isActive) return null;

              return (
                <button
                  key={m.value}
                  onClick={() => handleMonthSelect(m.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
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
            <UserIcon size={14} /> Intervenant
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-200"
          >
            <option value="all">Tous les intervenants</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Du
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-200"
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
            className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-200"
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

          {/* SYNTHESE QUOTIDIENNE */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Clock size={20} className="text-blue-500 dark:text-blue-400" />
              Synthèse Quotidienne (Amplitude par intervenant)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="pb-3 px-2">Date</th>
                    {selectedUserId === 'all' && <th className="pb-3 px-2">Intervenant</th>}
                    <th className="pb-3 px-2">Heure début visite</th>
                    <th className="pb-3 px-2">Heure fin visite</th>
                    <th className="pb-3 px-2">Total Heures</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-300">
                  {reportData.dailySummaries.map((s, idx) => (
                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-2 font-medium">{s.date}</td>
                      {selectedUserId === 'all' && <td className="py-3 px-2 font-bold text-indigo-600 dark:text-indigo-400">{s.worker}</td>}
                      <td className="py-3 px-2">{s.firstStart}</td>
                      <td className="py-3 px-2">{s.lastEnd}</td>
                      <td className="py-3 px-2 font-bold">{s.totalHours} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* STATS GRID */}
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
                <TrendingUp size={18} />
                <span className="text-sm font-medium">Paye Réalisée</span>
              </div>
              <div className="text-2xl font-bold">{reportData.summary.realizedPay.toFixed(2)} €</div>
              <div className="text-[10px] opacity-70 mt-1 uppercase font-bold italic">Validé en base</div>
            </div>

            <div className="bg-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none text-white">
              <div className="flex items-center gap-3 mb-2 opacity-80">
                <Calendar size={18} />
                <span className="text-sm font-medium">Coûts à venir</span>
              </div>
              <div className="text-2xl font-bold">{reportData.summary.plannedPay.toFixed(2)} €</div>
              <div className="text-[10px] opacity-70 mt-1 uppercase font-bold italic">Activités prévisionnelles</div>
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
                      ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12]}
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
                        <Cell key={`cell-${index}`} fill={entry.hours > 0 ? '#3b82f6' : '#475569'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PIE CHART CARD (Evaluation Graph) */}
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

            {/* COST BREAKDOWN PIE CHART */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <Euro size={20} className="text-blue-500 dark:text-blue-400" />
                Répartition des Coûts
              </h3>
              <div className="h-[300px] w-full" id="cost-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Salaires',
                          value: parseFloat((reportData.summary.totalPay - reportData.summary.totalTravelCost).toFixed(2)),
                          color: '#3b82f6'
                        },
                        {
                          name: 'Frais de déplacement',
                          value: parseFloat(reportData.summary.totalTravelCost.toFixed(2)),
                          color: '#f59e0b'
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ percent }: any) => percent > 0 ? `${(percent * 100).toFixed(1)}%` : ''}
                      labelLine={true}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9'}}
                      formatter={(value: any, name: any) => [`${value?.toFixed(2) || 0} €`, name || 'Total']}
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
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Détails des interventions</h3>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Exporter en PDF"
                >
                  <Download size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {reportData.workedHours.map((entry, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{entry.date}</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/50 rounded-full">{entry.duration} h</span>
                    </div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{entry.patient}</div>
                    {selectedUserId === 'all' && (
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase">Intervenant: {entry.worker}</div>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{entry.startTime} - {entry.endTime}</div>
                    {selectedUserId === 'all' && (
                       <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">Paye estimée: {entry.pay} €</div>
                    )}
                  </div>
                ))}
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
