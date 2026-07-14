import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Mail, Phone, MessageSquare, Wifi, MapPin, User, Calendar,
  Hash, Type, Copy, Check, ExternalLink, ChevronDown, ChevronUp,
  ShieldAlert, ShieldCheck, Download, Share2, Bitcoin
} from 'lucide-react';
import clsx from 'clsx';
import { QRCodeResult } from '../types';

interface QRCardProps {
  qr: QRCodeResult;
  index: number;
  isHighlighted: boolean;
  onHighlight: () => void;
}

const TYPE_META: Record<string, { icon: React.FC<{ className?: string; style?: React.CSSProperties }>, color: string, bg: string, darkColor: string }> = {
  URL:            { icon: Link2,          color: '#3b82f6',  darkColor: '#60a5fa',  bg: 'rgba(59,130,246,0.12)'  },
  Email:          { icon: Mail,           color: '#ec4899',  darkColor: '#f472b6',  bg: 'rgba(236,72,153,0.12)'  },
  Phone:          { icon: Phone,          color: '#22c55e',  darkColor: '#4ade80',  bg: 'rgba(34,197,94,0.12)'   },
  SMS:            { icon: MessageSquare,  color: '#f59e0b',  darkColor: '#fbbf24',  bg: 'rgba(245,158,11,0.12)'  },
  WiFi:           { icon: Wifi,           color: '#14b8a6',  darkColor: '#2dd4bf',  bg: 'rgba(20,184,166,0.12)'  },
  'Geo Location': { icon: MapPin,         color: '#f97316',  darkColor: '#fb923c',  bg: 'rgba(249,115,22,0.12)'  },
  vCard:          { icon: User,           color: '#8b5cf6',  darkColor: '#a78bfa',  bg: 'rgba(139,92,246,0.12)'  },
  Calendar:       { icon: Calendar,       color: '#6366f1',  darkColor: '#818cf8',  bg: 'rgba(99,102,241,0.12)'  },
  Bitcoin:        { icon: Bitcoin,        color: '#f59e0b',  darkColor: '#fbbf24',  bg: 'rgba(245,158,11,0.12)'  },
  Numeric:        { icon: Hash,           color: '#64748b',  darkColor: '#94a3b8',  bg: 'rgba(100,116,139,0.12)' },
  Text:           { icon: Type,           color: '#64748b',  darkColor: '#94a3b8',  bg: 'rgba(100,116,139,0.12)' },
  Alphanumeric:   { icon: Type,           color: '#64748b',  darkColor: '#94a3b8',  bg: 'rgba(100,116,139,0.12)' },
};

const QUALITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  A: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)'  },
  B: { bg: 'rgba(20,184,166,0.12)', color: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
  C: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  D: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.3)' },
  F: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
};

const RISK_STYLE: Record<string, { bg: string; color: string; border: string; flash?: boolean }> = {
  safe:     { bg: 'rgba(34,197,94,0.08)',  color: '#22c55e', border: 'rgba(34,197,94,0.2)'  },
  low:      { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  medium:   { bg: 'rgba(249,115,22,0.10)', color: '#f97316', border: 'rgba(249,115,22,0.3)' },
  high:     { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
  critical: { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: 'rgba(239,68,68,0.4)',  flash: true },
};

function parseWifi(data: string) {
  return {
    ssid: data.match(/S:([^;]+)/)?.[1] ?? '',
    pass: data.match(/P:([^;]+)/)?.[1] ?? '',
    type: data.match(/T:([^;]+)/)?.[1] ?? '',
  };
}

function isUrl(data: string) { return /^https?:\/\//i.test(data); }

export const QRCard: React.FC<QRCardProps> = ({ qr, index, isHighlighted, onHighlight }) => {
  const [copied, setCopied]           = useState(false);
  const [shared, setShared]           = useState(false);
  const [expanded, setExpanded]       = useState(false);
  const [showReasons, setShowReasons] = useState(false);

  const meta = TYPE_META[qr.dataType] ?? TYPE_META['Text'];
  const Icon = meta.icon;
  const isLong = qr.data.length > 100;
  const sus  = qr.suspiciousAnalysis;
  const qual = qr.qualityScore;
  const wifi = qr.dataType === 'WiFi' ? parseWifi(qr.data) : null;
  const riskStyle = sus ? RISK_STYLE[sus.riskLevel] ?? RISK_STYLE['safe'] : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(qr.data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([qr.data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `qr-${index + 1}-${qr.dataType.toLowerCase()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({ title: `QR Code #${index + 1}`, text: qr.data });
        setShared(true); setTimeout(() => setShared(false), 2000);
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(qr.data);
      setShared(true); setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.05 }}
      onClick={onHighlight}
      className="glass-card-interactive overflow-hidden"
      style={isHighlighted ? {
        borderColor: qr.color,
        boxShadow: `0 0 0 2px ${qr.color}40, var(--shadow-lg)`,
      } : {}}
    >
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: qr.color }}
      />

      <div className="pl-4 pr-4 pt-4 pb-3">
        {/* Risk banner */}
        {sus?.isSuspicious && riskStyle && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={clsx(
              'flex items-start gap-2 px-3 py-2.5 rounded-xl mb-3 border text-xs',
              sus.riskLevel === 'critical' && 'animate-flash'
            )}
            style={{ background: riskStyle.bg, borderColor: riskStyle.border, color: riskStyle.color }}
          >
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-bold uppercase tracking-wider">{sus.riskLevel} risk</span>
              <span className="mx-1.5 opacity-50">·</span>
              <span>Score {sus.riskScore}/100</span>
              <button
                onClick={e => { e.stopPropagation(); setShowReasons(v => !v); }}
                className="ml-2 underline opacity-70 hover:opacity-100"
              >
                {showReasons ? 'hide' : 'details'}
              </button>
              <AnimatePresence>
                {showReasons && sus.reasons.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-1 list-disc list-inside opacity-90 overflow-hidden"
                  >
                    {sus.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Number badge */}
          <div
            className="qr-badge flex-shrink-0 mt-0.5 text-white"
            style={{ background: qr.color + '30', border: `2px solid ${qr.color}` }}
          >
            <span style={{ color: qr.color }} className="text-xs font-bold">{index + 1}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {/* Type badge */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
              >
                <Icon className="w-3 h-3" style={{ color: meta.color }} />
                {qr.dataType}
              </span>

              {/* Quality badge */}
              {qual && (() => {
                const qs = QUALITY_STYLE[qual.grade];
                return (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: qs.bg, color: qs.color, border: `1px solid ${qs.border}` }}
                  >
                    Grade {qual.grade}
                  </span>
                );
              })()}

              {/* Safe badge */}
              {sus && !sus.isSuspicious && sus.riskLevel === 'safe' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <ShieldCheck className="w-3 h-3" />
                  Safe
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isUrl(qr.data) && (
              <a
                href={qr.data}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                style={{ background: 'rgba(59,130,246,0.10)', color: '#3b82f6' }}
                title="Open URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
              style={{
                background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.10)',
                color: copied ? '#22c55e' : 'var(--text-muted)',
              }}
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(100,116,139,0.10)', color: 'var(--text-muted)' }}
              title="Download as text"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
              style={{
                background: shared ? 'rgba(20,184,166,0.12)' : 'rgba(100,116,139,0.10)',
                color: shared ? '#14b8a6' : 'var(--text-muted)',
              }}
              title="Share"
            >
              {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Data content */}
        {wifi ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: 'Network (SSID)', value: wifi.ssid || '—' },
              { label: 'Security', value: wifi.type || '—' },
              ...(wifi.pass ? [{ label: 'Password', value: wifi.pass, mono: true, full: true }] : []),
            ].map(({ label, value, mono, full }) => (
              <div key={label} className={clsx('p-3 rounded-xl', full && 'col-span-2')}
                style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid var(--border-color)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className={clsx('text-sm font-semibold', mono && 'font-mono')}
                  style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2">
            <div
              className={clsx(
                'text-sm font-mono break-all leading-relaxed p-3 rounded-xl',
                !expanded && isLong && 'line-clamp-3'
              )}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              {qr.data}
            </div>
            {isLong && (
              <button
                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                className="flex items-center gap-1 text-xs mt-1.5 font-medium transition-colors"
                style={{ color: '#3b82f6' }}
              >
                {expanded
                  ? <><ChevronUp className="w-3 h-3" /> Show less</>
                  : <><ChevronDown className="w-3 h-3" /> Show all {qr.data.length} chars</>
                }
              </button>
            )}
          </div>
        )}

        {/* Footer: position grid */}
        <div
          className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-4">
            {[
              { label: 'X', value: qr.boundingBox.x },
              { label: 'Y', value: qr.boundingBox.y },
              { label: 'W', value: qr.boundingBox.width },
              { label: 'H', value: qr.boundingBox.height },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-secondary)' }}>{value}</p>
              </div>
            ))}
          </div>
          {qual && (
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Contrast <strong style={{ color: 'var(--text-primary)' }}>{qual.details.contrast}%</strong></span>
              <span>Size <strong style={{ color: 'var(--text-primary)' }}>{qual.details.moduleSize}%</strong></span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
