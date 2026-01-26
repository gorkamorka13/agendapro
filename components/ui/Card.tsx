// Fichier: components/ui/Card.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'elevated' | 'bordered' | 'glass';
}

export function Card({ className, variant = 'bordered', ...props }: CardProps) {
  const variants = {
    flat: "bg-slate-50 dark:bg-slate-900/50",
    elevated: "bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800",
    bordered: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800",
    glass: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700",
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-all",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4 border-b border-slate-100 dark:border-slate-800", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4 border-t border-slate-100 dark:border-slate-800", className)} {...props} />;
}
