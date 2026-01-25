// Fichier: components/layout/Header.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import ThemeToggle from '../ThemeToggle';
import { useTitle } from '../TitleContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const { title } = useTitle();

  return (
    <header className="bg-white dark:bg-slate-900 dark:text-white shadow-md p-3 sm:p-4 flex justify-between items-center transition-colors">
      <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none flex-shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-base sm:text-xl font-bold truncate text-blue-600 dark:text-blue-400">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-4 ml-2">
        <span className="hidden sm:inline text-[13px] opacity-70">Bonjour, {session?.user?.name || session?.user?.email}</span>
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all font-bold border border-red-500/20"
        >
          <span className="hidden xs:inline">Déconnexion</span>
          <svg className="xs:hidden w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
