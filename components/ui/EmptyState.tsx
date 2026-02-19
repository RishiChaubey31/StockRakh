'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-12 text-center">
      {icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-slate-500 mb-6">{description}</p>}
      {action}
    </div>
  );
}
