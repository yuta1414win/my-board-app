'use client';

import { ReactNode } from 'react';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  className?: string;
}

export default function Alert({
  type = 'info',
  children,
  className = '',
}: AlertProps) {
  const baseStyles = 'px-4 py-3 rounded-md border text-sm font-medium';

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`${baseStyles} ${typeStyles[type]} ${className}`}>
      {children}
    </div>
  );
}
