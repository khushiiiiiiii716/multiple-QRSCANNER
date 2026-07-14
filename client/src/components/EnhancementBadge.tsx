import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';
import { EnhancementInfo } from '../types';

interface EnhancementBadgeProps {
  enhancement: EnhancementInfo;
}

function Delta({ before, after }: { before: number; after: number }) {
  const diff = after - before;
  if (Math.abs(diff) < 3) return (
    <span className="flex items-center gap-0.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
      <Minus className="w-3 h-3" /> ±0
    </span>
  );
  const up = diff > 0;
  return (
    <span
      className="flex items-center gap-0.5 text-xs font-mono font-semibold"
      style={{ color: up ? '#22c55e' : '#ef4444' }}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{diff}
    </span>
  );
}

function StatRow({ label, before, after }: { label: string; before: number; after: number }) {
  const pct = Math.min(100, Math.round((after / 255) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{before}</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{after}</span>
          <Delta before={before} after={after} />
        </div>
      </div>
      {/* Mini bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #14b8a6)' }}
        />
      </div>
    </div>
  );
}

export const EnhancementBadge: React.FC<EnhancementBadgeProps> = ({ enhancement }) => {
  const [expanded, setExpanded] = useState(false);

  const hasEnhancements = enhancement.applied.length > 0 &&
    !enhancement.applied[0].includes('No enhancement needed');

  if (!hasEnhancements) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}
      >
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
        <span className="text-sm font-medium" style={{ color: '#22c55e' }}>
          Image quality is optimal — no enhancement needed
        </span>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Gradient top bar */}
      <div className="h-0.5" style={{ background: 'linear-gradient(90deg, #8b5cf6, #3b82f6, #14b8a6)' }} />

      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between transition-all duration-200 hover:bg-[rgba(59,130,246,0.04)]"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(20,184,166,0.2))' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: '#8b5cf6' }}>
              AI Image Enhancement Applied
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {enhancement.applied.length} optimization{enhancement.applied.length !== 1 ? 's' : ''} improved scan quality
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Applied count badge */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}
          >
            +{Math.round(((enhancement.enhancedStats.brightness - enhancement.originalStats.brightness) +
               (enhancement.enhancedStats.contrast - enhancement.originalStats.contrast)) / 2)} pts
          </span>
          {expanded
            ? <ChevronUp  className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          }
        </div>
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3 space-y-5"
              style={{ borderTop: '1px solid var(--border-color)' }}
            >
              {/* Applied ops */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  Applied Operations
                </p>
                <div className="flex flex-wrap gap-2">
                  {enhancement.applied.map((op, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgba(139,92,246,0.10)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        color: '#a78bfa',
                      }}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {op}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                  Quality Metrics (Before → After)
                </p>
                <div className="space-y-4">
                  <StatRow label="Brightness" before={enhancement.originalStats.brightness} after={enhancement.enhancedStats.brightness} />
                  <StatRow label="Contrast"   before={enhancement.originalStats.contrast}   after={enhancement.enhancedStats.contrast}   />
                  <StatRow label="Sharpness"  before={enhancement.originalStats.sharpness}  after={enhancement.enhancedStats.sharpness}  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
