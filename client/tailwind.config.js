/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':       'fadeIn 0.2s ease-in-out',
        'slide-up':      'slideUp 0.2s ease-out',
        'slide-down':    'slideDown 0.2s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'scan-line':     'scanLine 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scanLine: {
          '0%, 100%': { top: '10%' },
          '50%':      { top: '90%' },
        },
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
        'modal':      '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        'glow':       '0 0 15px rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
