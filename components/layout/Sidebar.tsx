'use client'; // <-- Très important ! Les hooks ne fonctionnent que dans les composants client.

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === 'ADMIN';

  const linkStyle = "block py-2 px-4 rounded-md transition-colors";
  const defaultStyle = "hover:bg-gray-700";
  const activeStyle = "bg-blue-600 text-white font-semibold";

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 w-64 bg-slate-800 dark:bg-slate-950 text-slate-300 p-4 flex flex-col h-screen transition-transform duration-300 ease-in-out
      md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/agendapro.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <h2 className="text-xl font-bold text-white whitespace-nowrap">Agenda Pro</h2>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul>
          <li className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 mt-4 mb-2">
            Navigation
          </li>
          <li className="mb-2">
            <Link
              href="/"
              className={`${linkStyle} ${pathname === '/' ? activeStyle : defaultStyle}`}
              onClick={() => onClose()} // Close sidebar on mobile when link clicked
            >
              Calendrier
            </Link>
          </li>

          <li className="mb-2">
            <Link
              href="/user/reports"
              className={`${linkStyle} ${pathname === '/user/reports' ? activeStyle : defaultStyle}`}
              onClick={() => onClose()}
            >
              Mes Rapports & Paie
            </Link>
          </li>

          {isAdmin && (
            <>
              <li className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 mt-8 mb-2 border-t border-gray-700 pt-4">
                Administration
              </li>
              <li className="mb-2">
                <Link
                  href="/admin/users"
                  className={`${linkStyle} ${pathname === '/admin/users' ? activeStyle : defaultStyle}`}
                  onClick={() => onClose()}
                >
                  Gestion Utilisateurs
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/admin/patients"
                  className={`${linkStyle} ${pathname === '/admin/patients' ? activeStyle : defaultStyle}`}
                  onClick={() => onClose()}
                >
                  Gestion Patients
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/admin/expenses"
                  className={`${linkStyle} ${pathname === '/admin/expenses' ? activeStyle : defaultStyle}`}
                  onClick={() => onClose()}
                >
                  Gestion Dépenses
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/?action=create-appointment"
                  className={`${linkStyle} ${defaultStyle}`}
                  onClick={() => onClose()}
                >
                  Gestion Rendez-vous
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/admin/reports"
                  className={`${linkStyle} ${pathname === '/admin/reports' ? activeStyle : defaultStyle}`}
                  onClick={() => onClose()}
                >
                  Rapports & Paie
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-700/50 pb-2">
        <div className="text-xs text-slate-500 font-bold opacity-80 space-y-1">
          <p>AGENDA PRO - © Michel ESPARSA</p>
          <p>v{process.env.APP_VERSION} - {process.env.BUILD_DATE}</p>
        </div>
      </div>
    </div>
  );
}
