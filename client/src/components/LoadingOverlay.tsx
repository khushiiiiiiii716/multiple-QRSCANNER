import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  progress: number;
  stage: 'uploading' | 'processing';
}

const STAGES = [
  { key: 'upload',   label: 'Uploading',     icon: '📤', color: '#3b82f6' },
  { key: 'enhance',  label: 'Enhancing',     icon: '✨', color: '#8b5cf6' },
  { key: 'detect',   label: 'Detecting QR',  icon: '🔍', color: '#14b8a6' },
  { key: 'annotate', label: 'Annotating',    icon: '🎨', color: '#f59e0b' },
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, stage }) => {
  const [activeStage, setActiveStage] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (stage === 'uploading') {
      setActiveStage(0);
    } else {
      // cycle through enhancement/detect/annotate stages while processing
      const t = setInterval(() => {
        setActiveStage(s => s >= 3 ? 1 : s + 1);
      }, 1200);
      return () => clearInterval(t);
    }
  }, [stage]);

  const displayProgress = stage === 'processing' ? null : progress;
  const current = STAGES[activeStage];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="glass-card overflow-hidden"
    >
      {/* Top gradient bar */}
      <div
        className="h-1"
        style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #14b8a6)' }}
      />

      <div className="p-10 text-center space-y-8">
        {/* Animated QR scanner */}
        <div className="relative w-32 h-32 mx-auto">
          {/* Outer rotating rings */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ border: '2px solid rgba(59,130,246,0.3)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-3 rounded-xl"
            style={{ border: '1px solid rgba(20,184,166,0.4)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          {/* QR grid pattern */}
          <div className="absolute inset-5 grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.div
                key={i}
                className="rounded-sm"
                style={{ background: current.color }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Scan line */}
          <motion.div
            className="absolute left-3 right-3 h-0.5 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${current.color}, transparent)`,
              boxShadow: `0 0 8px ${current.color}`,
            }}
            animate={{ top: ['20%', '80%', '20%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Corner brackets */}
          {[
            'top-0 left-0 border-t-2 border-l-2 rounded-tl',
            'top-0 right-0 border-t-2 border-r-2 rounded-tr',
            'bottom-0 left-0 border-b-2 border-l-2 rounded-bl',
            'bottom-0 right-0 border-b-2 border-r-2 rounded-br',
          ].map((cls, i) => (
            <span
              key={i}
              className={`absolute w-4 h-4 ${cls}`}
              style={{ borderColor: current.color }}
            />
          ))}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            <motion.h3
              key={current.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {current.icon} {current.label}{dots}
            </motion.h3>
          </AnimatePresence>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {stage === 'uploading'
              ? 'Securely transferring your image'
              : 'Applying AI enhancements and detecting all QR codes'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-sm mx-auto space-y-2">
          <div className="flex justify-between text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            <span>{current.label}</span>
            <span>{displayProgress !== null ? `${displayProgress}%` : 'In progress…'}</span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              style={{ background: `linear-gradient(90deg, #3b82f6, ${current.color})` }}
              animate={
                stage === 'processing'
                  ? { width: ['15%', '75%', '45%', '90%', '60%'] }
                  : { width: `${progress}%` }
              }
              transition={
                stage === 'processing'
                  ? { duration: 5, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.4, ease: 'easeOut' }
              }
            />
          </div>
        </div>

        {/* Stage pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.key}
              animate={i === activeStage
                ? { scale: 1.05, opacity: 1 }
                : i < activeStage
                ? { opacity: 0.7 }
                : { opacity: 0.35 }
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: i === activeStage ? `${s.color}20` : 'var(--glass-bg)',
                border: `1px solid ${i === activeStage ? s.color + '50' : 'var(--border-color)'}`,
                color: i === activeStage ? s.color : 'var(--text-muted)',
              }}
            >
              <span>{s.icon}</span>
              {s.label}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
