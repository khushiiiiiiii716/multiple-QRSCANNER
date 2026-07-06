import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import App from './App';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { Link, useLocation } from 'react-router-dom';
import { ScanLine, Clock, BarChart2 } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';

function Shell() {
  const location = useLocation();
  const { theme } = useApp();

  // Keep the html class in sync when Shell is rendered
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const navLinks = [
    { to: '/',          label: 'Scanner',   icon: ScanLine  },
    { to: '/history',   label: 'History',   icon: Clock     },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Top nav */}
      <header className="border-b border-gray-200 dark:border-white/8 bg-white/80 dark:bg-black/20 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">QR Scanner</span>
              <span className="ml-1 text-[10px] text-gray-500 font-medium">PRO</span>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${location.pathname === to
                    ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-1 px-4 pb-2">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1 justify-center
                ${location.pathname === to
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <Routes>
          <Route path="/"          element={<App />} />
          <Route path="/history"   element={<HistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-white/8 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-gray-500">
          <span>QR Scanner Pro — Multi-QR detection engine</span>
          <span>jsQR · sharp · React · Tailwind</span>
        </div>
      </footer>
    </div>
  );
}

export default function AppRouter() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
