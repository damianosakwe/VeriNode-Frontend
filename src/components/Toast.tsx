'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type: 'info' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'error') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const colorMap: Record<string, string> = {
    info: 'border-blue-500 bg-blue-50 text-blue-800',
    success: 'border-green-500 bg-green-50 text-green-800',
    error: 'border-red-500 bg-red-50 text-red-800',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg transition-all ${colorMap[t.type] || colorMap.info}`}
            role="alert"
          >
            <span className="text-sm font-medium">{t.text}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 text-sm font-bold opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
