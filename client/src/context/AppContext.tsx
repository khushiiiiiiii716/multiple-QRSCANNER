import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ScanHistoryEntry, Theme } from '../types';

const MAX_HISTORY = 100;
const STORAGE_THEME   = 'qrscanner-theme';
const STORAGE_HISTORY = 'qrscanner-history';

interface AppContextValue {
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  // History
  scanHistory: ScanHistoryEntry[];
  addToHistory: (entry: ScanHistoryEntry) => void;
  clearHistory: () => void;
  deleteFromHistory: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function loadHistory(): ScanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanHistoryEntry[];
    // Revive Date objects
    return parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}

function saveHistory(history: ScanHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  } catch {
    // localStorage quota exceeded – silently fail
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_THEME) as Theme | null;
    return stored ?? 'dark';
  });

  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>(loadHistory);

  // Apply theme class on mount and on change
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const addToHistory = useCallback((entry: ScanHistoryEntry) => {
    setScanHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
    localStorage.removeItem(STORAGE_HISTORY);
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setScanHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{ theme, toggleTheme, scanHistory, addToHistory, clearHistory, deleteFromHistory }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
