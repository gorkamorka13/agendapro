'use client';

import { useQuery } from '@tanstack/react-query';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft, User, MapPin, Phone, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PatientHistoryList from '@/components/patients/PatientHistoryList';
import PatientPdfGenerator from '@/components/patients/PatientPdfGenerator';
import type { Patient } from '@/types';

export default function PatientProfilePage() {
  const params = useParams();
  const idStr = params?.id as string;
  const patientId = parseInt(idStr, 10);

  if (isNaN(patientId)) {
    notFound();
  }

  const { data: patient, isLoading, error } = useQuery<Patient>({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}`);
      if (res.status === 404) throw new Error('NOT_FOUND');
      if (!res.ok) throw new Error('Erreur réseau');
      return res.json();
    },
    retry: false
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
        <span className="ml-3 text-slate-500 font-medium">Chargement du dossier...</span>
      </div>
    );
  }

  if (error || !patient) {
    if (error?.message === 'NOT_FOUND') notFound();
    return (
      <div className="text-center py-10">
        <p className="text-red-500 font-bold text-lg">Impossible de charger ce patient.</p>
        <Link href="/admin/patients" className="text-blue-500 hover:underline mt-2 inline-block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-10 max-w-6xl animate-in fade-in duration-300">
      <div className="mb-6">
        <Link
          href="/admin/patients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Retour à la liste des patients
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* Encart Patient */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex-1">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
              <User size={32} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                {patient.firstName} {patient.lastName}
              </h1>

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                  <MapPin size={18} className="mt-1 shrink-0 text-slate-400" />
                  <span className="leading-relaxed">{patient.address}</span>
                </div>
                {patient.contactInfo && (
                  <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                    <Phone size={18} className="mt-1 shrink-0 text-slate-400" />
                    <span className="leading-relaxed whitespace-pre-line">{patient.contactInfo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Encart Relevé PDF */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 p-6 lg:w-1/3 flex flex-col justify-center">
          <PatientPdfGenerator patient={patient} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Historique des Interventions
          </h2>
        </div>
        <PatientHistoryList patientId={patient.id} />
      </div>
    </div>
  );
}
