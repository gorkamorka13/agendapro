// Fichier: components/ToasterProvider.tsx
'use client';

import { Toaster } from 'sonner';

export default function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      theme="system"
      toastOptions={{
        style: {
          borderRadius: '1rem',
          border: '1px solid var(--border)',
          fontFamily: 'inherit',
        },
      }}
    />
  );
}
