'use client';

import { useState } from 'react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, FileText, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { toast } from 'sonner';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  address: string;
  contactInfo: string | null;
}

interface PatientPdfGeneratorProps {
  patient: Patient;
}

export default function PatientPdfGenerator({ patient }: PatientPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      // 1. Fetch assignments for this patient
      const res = await fetch(`/api/patients/${patient.id}/assignments`);
      if (!res.ok) throw new Error('Erreur récupération des données');

      const allAssignments: any[] = await res.json();

      // 2. Filter by selected month and year
      const filteredAssignments = allAssignments.filter(a => {
        const d = parseISO(a.startTime);
        return d.getMonth() === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear);
      });

      // 3. Generate PDF (dynamically import to avoid Edge SSR crashes)
      const [jspdfModule, autotableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);

      const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
      const autoTable = autotableModule.default;

      const doc = new jsPDF();
      const monthName = months[parseInt(selectedMonth)];

      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text('Relevé d\'Interventions', 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Période : ${monthName} ${selectedYear}`, 14, 30);

      // Patient Info Box
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(14, 40, 182, 35, 3, 3, 'FD');

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text(`Patient : ${patient.firstName} ${patient.lastName}`, 20, 50);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`${patient.address}`, 20, 60);
      if (patient.contactInfo) {
        doc.text(`${patient.contactInfo}`, 20, 68);
      }

      let totalMinutes = 0;

      // Formatting data for table
      const tableData = filteredAssignments.map(a => {
        const start = parseISO(a.startTime);
        const end = parseISO(a.endTime);
        const mins = differenceInMinutes(end, start);
        totalMinutes += mins;

        const durationStr = `${Math.floor(mins / 60)}h${mins % 60 > 0 ? (mins % 60).toString().padStart(2, '0') : '00'}`;

        return [
          format(start, 'dd/MM/yyyy'),
          a.user?.name || 'Inconnu',
          `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
          durationStr,
          a.status === 'COMPLETED' ? 'Réalisée' : a.status === 'CANCELLED' ? 'Annulée' : 'Planifiée'
        ];
      });

      // Table
      autoTable(doc, {
        startY: 85,
        head: [['Date', 'Intervenant', 'Horaires', 'Durée', 'Statut']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // blue-600
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 10, left: 14, right: 14 },
      });

      // Total Calculation
      const finalY = (doc as any).lastAutoTable.finalY || 85;
      const totalH = Math.floor(totalMinutes / 60);
      const totalM = totalMinutes % 60;
      const totalStr = `${totalH}h${totalM > 0 ? totalM.toString().padStart(2, '0') : '00'}`;

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(120, finalY + 10, 76, 20, 2, 2, 'FD');

      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Total des heures :', 125, finalY + 23);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(totalStr, 175, finalY + 23);

      // Save
      doc.save(`Releve_${patient.lastName}_${monthName}_${selectedYear}.pdf`);

    } catch (error: any) {
      console.error('Erreur PDF:', error);
      toast.error(`Erreur lors de la génération du PDF: ${error.message || 'Problème inconnu'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4 text-indigo-900 dark:text-indigo-300">
        <FileText size={20} />
        <h3 className="font-bold text-lg">Relevé Mensuel</h3>
      </div>

      <p className="text-sm text-indigo-700/80 dark:text-indigo-400/80 mb-5 leading-relaxed">
        Générez un document PDF listant toutes les interventions effectuées pour un mois donné.
      </p>

      <div className="flex flex-col sm:flex-row xl:flex-col gap-3 mb-5">
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm"
        >
          {months.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </Select>

        <Select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>

      <Button
        onClick={handleGeneratePdf}
        disabled={isGenerating}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 gap-2 h-11"
      >
        {isGenerating ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Génération...
          </>
        ) : (
          <>
            <Download size={18} /> Télécharger le PDF
          </>
        )}
      </Button>
    </>
  );
}
