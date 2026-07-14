import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (msg: string) => void;
  error:   (msg: string) => void;
  info:    (msg: string) => void;
  warning: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
  warning: AlertTriangle,
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 dark:text-emerald-300',
  error:   'bg-red-500/10    border-red-500/30    text-red-400    dark:text-red-300',
  info:    'bg-blue-500/10   border-blue-500/30   text-blue-400   dark:text-blue-300',
  warning: 'bg-amber-500/10  border-amber-500/30  text-amber-400  dark:text-amber-300',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  info:    'text-blue-400',
  warning: 'text-amber-400',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 3500);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,   scale: 1 }}
      exit={{    opacity: 0, y: -8,  scale: 0.95, transition: { duration: 0.2 } }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-md text-sm font-medium max-w-xs ${STYLES[toast.type]}`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${ICON_STYLES[toast.type]}`} />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = crypto.randomUUID();
    setToasts(prev => [{ id, type, message, duration }, ...prev].slice(0, 5));
  }, []);

  const success = useCallback((msg: string) => toast(msg, 'success'), [toast]);
  const error   = useCallback((msg: string) => toast(msg, 'error', 5000), [toast]);
  const info    = useCallback((msg: string) => toast(msg, 'info'), [toast]);
  const warning = useCallback((msg: string) => toast(msg, 'warning'), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onRemove={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
