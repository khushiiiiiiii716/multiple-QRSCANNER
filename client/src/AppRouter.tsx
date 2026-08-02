import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Clock, BarChart2, Zap, Menu, X, Github, Linkedin, Sparkles, UserCircle
} from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import { ThemeToggle } from './components/ThemeToggle';
import App from './App';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';

const NAV_LINKS = [
  { to: '/',          label: 'Scanner',   icon: ScanLine,  badge: null },
  { to: '/history',   label: 'History',   icon: Clock,     badge: null },
  { to: '/analytics', label: 'Analytics', icon: BarChart2,  badge: null },
];

function Shell() {
  const location = useLocation();
  const { theme, scanHistory, toggleTheme } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else                  document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navigate = useNavigate();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const isFormElement = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      const tag = target.tagName.toLowerCase();
      const elem = target as HTMLElement;
      return tag === 'input' || tag === 'textarea' || tag === 'select' || elem.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isFormElement(event.target)) return;
      const isCommand = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (isCommand) {
        switch (key) {
          case '1':
            navigate('/');
            event.preventDefault();
            break;
          case '2':
            navigate('/history');
            event.preventDefault();
            break;
          case '3':
            navigate('/analytics');
            event.preventDefault();
            break;
          case 't':
            toggleTheme();
            event.preventDefault();
            break;
          default:
            break;
        }
      }

      if (key === 'escape') {
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleTheme]);

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'backdrop-blur-xl border-b'
            : 'border-b border-transparent'
        }`}
        style={{
          background: scrolled
            ? (theme === 'dark' ? 'rgba(4,13,26,0.92)' : 'rgba(240,244,255,0.92)')
            : 'transparent',
          borderColor: scrolled ? 'var(--border-color)' : 'transparent',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-9 h-9 rounded-md flex items-center justify-center transition-all duration-300 group-hover:scale-105 bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm">
              <ScanLine className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  MultiScanner
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-zinc-900 text-white dark:bg-white dark:text-black tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                QR Detection Engine
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`nav-link ${active ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {to === '/history' && scanHistory.length > 0 && (
                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black">
                      {scanHistory.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Live
            </div>

            <ThemeToggle />

            <button
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-black/10 bg-black/5 text-sm font-semibold text-black dark:border-white/10 dark:bg-white/5 dark:text-white transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10"
              type="button"
            >
              <span className="w-7 h-7 rounded-full grid place-items-center bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                <UserCircle className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">Shruti</span>
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden btn-ghost p-2"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {NAV_LINKS.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`nav-link ${active ? 'active' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="flex-1 relative">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Routes>
                <Route path="/"          element={<App />} />
                <Route path="/history"   element={<HistoryPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="border-t py-6 mt-8"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>MultiScanner QR Pro — Multi-QR detection with AI enhancement</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="badge badge-blue">React</span>
            <span className="badge badge-teal">TypeScript</span>
            <span className="badge badge-purple">Node.js</span>
            <span className="badge badge-green">Python</span>
            <span className="badge badge-gray">OpenCV</span>
            <span className="badge badge-blue">AI Vision</span>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-white">
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-white">
              <Linkedin className="w-3.5 h-3.5" /> LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function AppRouter() {
  return (
    <AppProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AppProvider>
  );
}
