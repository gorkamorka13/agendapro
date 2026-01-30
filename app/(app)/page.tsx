'use client';

import { useTitle } from "@/components/TitleContext";
import { useEffect } from "react";
import dynamic from 'next/dynamic';
import { CalendarSkeleton } from "@/components/ui/Skeleton";

// Lazy loading du calendrier avec skeleton
const AssignmentCalendar = dynamic(
  () => import("@/components/AssignmentCalendar"),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false // Le calendrier n'a pas besoin de SSR
  }
);

export default function HomePage() {
  const { setTitle } = useTitle();

  useEffect(() => {
    setTitle("Planning");
  }, [setTitle]);

  return (
    <div>
      <AssignmentCalendar />
    </div>
  );
}
