import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1e3a8a, #0f766e)'
          : 'linear-gradient(135deg, #93c5fd, #5eead4)',
        boxShadow: isDark
          ? '0 2px 12px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 2px 12px rgba(20,184,166,0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
    >
      {/* Track icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Moon className="w-3 h-3 text-blue-200 opacity-70" />
        <Sun className="w-3 h-3 text-yellow-200 opacity-70" />
      </span>

      {/* Thumb */}
      <motion.span
        animate={{ x: isDark ? 2 : 30 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 flex items-center justify-center w-6 h-6 rounded-full shadow-md"
        style={{
          background: isDark ? '#1e40af' : '#ffffff',
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <motion.span
          animate={{ rotate: isDark ? 0 : 180, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isDark
            ? <Moon className="w-3 h-3 text-blue-300" />
            : <Sun  className="w-3 h-3 text-yellow-500" />
          }
        </motion.span>
      </motion.span>
    </button>
  );
};
