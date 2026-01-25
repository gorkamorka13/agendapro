'use client';
// Fichier: app/(app)/page.tsx  <-- C'est la page pour l'URL "/"

import AssignmentCalendar from "@/components/AssignmentCalendar";
import { useTitle } from "@/components/TitleContext";
import { useEffect } from "react";

export default function HomePage() {
  const { setTitle } = useTitle();

  useEffect(() => {
    setTitle("Calendrier des Affectations");
  }, [setTitle]);

  return (
    <div>
      <AssignmentCalendar />
    </div>
  );
}
