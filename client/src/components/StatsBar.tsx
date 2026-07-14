import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Clock, FileImage, Maximize2, ShieldCheck, Zap } from 'lucide-react';
import { ScanResponse } from '../types';

interface StatsBarProps {
  result: ScanResponse;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getSpeedLabel(ms: number): { label: string; color: string } {
  if (ms < 300) return { label: 'Fast',   color: '#22c55e' };
  if (ms < 600) return { label: 'Good',   color: '#3b82f6' };
  if (ms < 1000) return { label: 'Normal', color: '#f59e0b' };
  return { label: 'Slow', color: '#ef4444' };
}

export const StatsBar: React.FC<StatsBarProps> = ({ result }) => {
  const speed = getSpeedLabel(result.processingTimeMs);
  const suspiciousCount = result.qrCodes.filter(q => q.suspiciousAnalysis?.isSuspicious).length;

  const stats = [
    {
      icon: Layers,
      label: 'QR Codes Found',
      value: result.totalFound.toString(),
      sub: result.totalFound === 1 ? 'code detected' : 'codes detected',
      accent: true,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.08)',
    },
    {
      icon: Clock,
      label: 'Processing Time',
      value: `${result.processingTimeMs}ms`,
      sub: speed.label,
      subColor: speed.color,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.08)',
    },
    {
      icon: FileImage,
      label: 'File Size',
      value: formatBytes(result.fileSize),
      sub: result.mimeType?.split('/')[1]?.toUpperCase() ?? 'IMAGE',
      color: '#14b8a6',
      bg: 'rgba(20,184,166,0.08)',
    },
    {
      icon: Maximize2,
      label: 'Dimensions',
      value: `${result.originalWidth}×${result.originalHeight}`,
      sub: 'pixels',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
    },
    {
      icon: ShieldCheck,
      label: 'Security',
      value: suspiciousCount === 0 ? 'Clean' : `${suspiciousCount} Risk`,
      sub: suspiciousCount === 0 ? 'No threats' : 'Review needed',
      subColor: suspiciousCount === 0 ? '#22c55e' : '#ef4444',
      color: suspiciousCount === 0 ? '#22c55e' : '#ef4444',
      bg: suspiciousCount === 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
    },
    {
      icon: Zap,
      label: 'Engine',
      value: '5 Methods',
      sub: 'Multi-strategy',
      color: '#ec4899',
      bg: 'rgba(236,72,153,0.08)',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map(({ icon: Icon, label, value, sub, subColor, accent, color, bg }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="stat-card"
          style={{
            background: accent
              ? `linear-gradient(135deg, rgba(59,130,246,0.10), rgba(20,184,166,0.08))`
              : undefined,
            borderColor: accent ? 'rgba(59,130,246,0.25)' : undefined,
          }}
        >
          {/* Top accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100"
            style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
          />

          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
            style={{ background: bg }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }} />
          </div>

          {/* Value */}
          <p
            className="text-2xl font-black leading-none mb-1"
            style={{ color: accent ? color : 'var(--text-primary)' }}
          >
            {value}
          </p>

          {/* Sub */}
          <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          {sub && (
            <p
              className="text-xs font-semibold"
              style={{ color: subColor ?? color + 'aa' }}
            >
              {sub}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
};
