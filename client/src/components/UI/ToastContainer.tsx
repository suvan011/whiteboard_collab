/**
 * ToastContainer.tsx
 * Floating animated toast notification list for user alerts, room joins, errors, and exports.
 */

import React from 'react';
import { ToastMessage } from '../../types/whiteboard';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let bgClass = 'bg-slate-900/90 border-slate-700 text-slate-100';
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

        if (toast.type === 'success') {
          bgClass = 'bg-slate-900/95 border-emerald-500/40 text-emerald-100';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bgClass = 'bg-slate-900/95 border-rose-500/40 text-rose-100';
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
        } else if (toast.type === 'warning') {
          bgClass = 'bg-slate-900/95 border-amber-500/40 text-amber-100';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md animate-slide-down transition-all duration-200 ${bgClass}`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              {toast.title && <div className="text-xs font-semibold uppercase tracking-wider mb-0.5">{toast.title}</div>}
              <div className="text-sm font-medium leading-snug">{toast.message}</div>
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
