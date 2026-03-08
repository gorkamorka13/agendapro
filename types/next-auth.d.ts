// Fichier: types/next-auth.d.ts
import { type Role } from '@/lib/auth';
import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      color?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
    color?: string;
  }
}
