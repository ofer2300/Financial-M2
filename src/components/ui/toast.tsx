import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function toast({ title, description, variant = 'default' }: ToastProps) {
  // כאן תהיה הלוגיקה של הצגת ההודעה
  console.log({ title, description, variant });
} 