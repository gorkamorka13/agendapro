// Fichier: app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Authprovider from '@/components/Authprovider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TitleProvider } from '@/components/TitleContext';
import ToasterProvider from '@/components/ToasterProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agenda PRO - Gestion des Interventions',
  description: 'Logiciel de gestion d\'interventions pour aide à domicile',
  icons: {
    icon: '/agendapro.png',
    shortcut: '/agendapro.png',
    apple: '/agendapro.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TitleProvider>
            <Authprovider>
              <ToasterProvider />
              {children}
            </Authprovider>
          </TitleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
