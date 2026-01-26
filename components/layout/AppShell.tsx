'use client';

import { useState, useRef } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const minSwipeDistance = 50;
  const edgeThreshold = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    const isHorizontalSwipe = Math.abs(diffX) > Math.abs(diffY);

    if (isHorizontalSwipe && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0 && isSidebarOpen) {
        // Swipe Left -> Close
        setIsSidebarOpen(false);
      } else if (diffX < 0 && !isSidebarOpen && touchStartX.current < edgeThreshold) {
        // Swipe Right from edge -> Open
        setIsSidebarOpen(true);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="flex h-screen bg-gray-100 dark:bg-slate-900 overflow-hidden transition-colors duration-300"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 dark:bg-slate-950 p-2 sm:p-4 md:p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
