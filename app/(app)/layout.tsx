import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import AppShell from '@/components/layout/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ceci est une action côté serveur pour vérifier la session
  const session = await getServerSession(authOptions);

  // Si pas de session, on redirige vers la page de connexion
  if (!session) {
    redirect('/login');
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
