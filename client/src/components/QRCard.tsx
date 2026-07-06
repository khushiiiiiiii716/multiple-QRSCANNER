import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Link, Mail, Phone, MessageSquare, Wifi, MapPin, User, Calendar,
  Hash, Type, Copy, Check, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, ShieldAlert, ShieldCheck, Info
} from 'lucide-react';
import clsx from 'clsx';
import { QRCodeResult } from '../types';

interface QRCardProps {
  qr: QRCodeResult;
  index: number;
  isHighlighted: boolean;
  onHighlight: () => void;
}

const TYPE_META: Record<string, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  URL:            { icon: Link,          color: 'text-blue-400',   bg: 'bg-blue-500/15 text-blue-300' },
  Email:          { icon: Mail,          color: 'text-pink-400',   bg: 'bg-pink-500/15 text-pink-300' },
  Phone:          { icon: Phone,         color: 'text-green-400',  bg: 'bg-green-500/15 text-green-300' },
  SMS:            { icon: MessageSquare, color: 'text-yellow-400', bg: 'bg-yellow-500/15 text-yellow-300' },
  WiFi:           { icon: Wifi,          color: 'text-cyan-400',   bg: 'bg-cyan-500/15 text-cyan-300' },
  'Geo Location': { icon: MapPin,        color: 'text-orange-400', bg: 'bg-orange-500/15 text-orange-300' },
  vCard:          { icon: User,          color: 'text-violet-400', bg: 'bg-violet-500/15 text-violet-300' },
  Calendar:       { icon: Calendar,      color: 'text-indigo-400', bg: 'bg-indigo-500/15 text-indigo-300' },
  Numeric:        { icon: Hash,          color: 'text-gray-400',   bg: 'bg-gray-500/15 text-gray-300' },
  Text:           { icon: Type,          color: 'text-gray-400',   bg: 'bg-gray-500/15 text-gray-300' },
  Alphanumeric:   { icon: Type,          color: 'text-gray-400',   bg: 'bg-gray-500/15 text-gray-300' },
};

const QUALITY_COLORS: Record<string, string> = {
  A: 'bg-green-500/20 text-green-300 border-green-500/40',
  B: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  C: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  D: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  F: 'bg-red-500/20 text-red-300 border-red-500/40',
};

const RISK_COLORS: Record<string, string> = {
  safe:     'bg-green-500/20 text-green-300 border-green-500/40',
  low:      'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  medium:   'bg-orange-500/20 text-orange-300 border-orange-500/40',
  high:     'bg-red-500/20 text-red-300 border-red-500/40',
  critical: 'bg-red-600/30 text-red-200 border-red-600/50 animate-flash',
};

function parseWifi(data: string) {
  const ssid = data.match(/S:([^;]+)/)?.[1] ?? '';
  const pass = data.match(/P:([^;]+)/)?.[1] ?? '';
  const type = data.match(/T:([^;]+)/)?.[1] ?? '';
  return { ssid, pass, type };
}

function isUrl(data: string) {
  return /^https?:\/\//i.test(data);
}

export const QRCard: React.FC<QRCardProps> = ({ qr, index, isHighlighted, onHighlight }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showReasons, setShowReasons] = useState(false);

  const meta = TYPE_META[qr.dataType] ?? TYPE_META['Text'];
  const Icon = meta.icon;
  const isLong = qr.data.length > 120;

  const sus = qr.suspiciousAnalysis;
  const qual = qr.qualityScore;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(qr.data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wifi = qr.dataType === 'WiFi' ? parseWifi(qr.data) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onHighlight}
      className={clsx(
        'glass-card p-4 cursor-pointer transition-all duration-200 hover:bg-white/8 dark:hover:bg-white/8',
        isHighlighted && 'ring-2 bg-white/8'
      )}
      style={isHighlighted ? { '--tw-ring-color': qr.color } as React.CSSProperties : {}}
    >
      {/* Suspicious warning banner */}
      {sus?.isSuspicious && (
        <div className={clsx(
          'flex items-start gap-2 px-3 py-2 rounded-lg mb-3 border text-xs',
          RISK_COLORS[sus.riskLevel]
        )}>
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold uppercase tracking-wide">
              {sus.riskLevel} risk
            </span>
            {' · '}
            <span>Suspicious QR detected (score: {sus.riskScore}/100)</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowReasons(!showReasons); }}
              className="ml-2 underline opacity-75 hover:opacity-100"
            >
              {showReasons ? 'hide' : 'details'}
            </button>
            {showReasons && sus.reasons.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 list-disc list-inside opacity-90">
                {sus.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Number badge */}
        <div
          className="qr-badge text-white flex-shrink-0 mt-0.5"
          style={{ background: qr.color + '40', border: `2px solid ${qr.color}` }}
        >
          <span style={{ color: qr.color }}>{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type badge */}
            <span className={clsx('tag', meta.bg)}>
              <Icon className="w-3 h-3" />
              {qr.dataType}
            </span>

            {/* Quality score badge */}
            {qual && (
              <span className={clsx(
                'tag border text-xs font-bold',
                QUALITY_COLORS[qual.grade]
              )}>
                {qual.grade} · {qual.score}
              </span>
            )}

            {/* Risk level badge (shown only if not suspicious to avoid duplication) */}
            {sus && !sus.isSuspicious && sus.riskLevel === 'safe' && (
              <span className="tag bg-green-500/10 text-green-400 border border-green-500/30">
                <ShieldCheck className="w-3 h-3" /> Safe
              </span>
            )}

            {/* Position info */}
            <span className="text-xs text-gray-600 dark:text-gray-600">
              {qr.boundingBox.width}×{qr.boundingBox.height}px
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isUrl(qr.data) && (
            <a
              href={qr.data}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-blue-400 transition-colors"
              title="Open URL"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            title="Copy data"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Data content */}
      {wifi ? (
        <div className="space-y-2 ml-9">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-600 text-xs mb-0.5">Network (SSID)</p>
              <p className="text-gray-200 dark:text-gray-200 font-medium">{wifi.ssid || '—'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs mb-0.5">Security</p>
              <p className="text-gray-200 dark:text-gray-200 font-medium">{wifi.type || '—'}</p>
            </div>
            {wifi.pass && (
              <div className="col-span-2">
                <p className="text-gray-600 text-xs mb-0.5">Password</p>
                <p className="text-gray-200 dark:text-gray-200 font-mono">{wifi.pass}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="ml-9">
          <div
            className={clsx(
              'text-sm text-gray-300 dark:text-gray-300 font-mono break-all leading-relaxed',
              !expanded && isLong && 'line-clamp-3'
            )}
          >
            {qr.data}
          </div>
          {isLong && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-1.5 transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> Show less</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Show more ({qr.data.length} chars)</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Quality details (shown when quality score exists) */}
      {qual && (
        <div className="mt-3 ml-9 pt-2 border-t border-white/8 dark:border-white/8">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>Quality</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span>Contrast</span>
                <span className="text-gray-400">{qual.details.contrast}%</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <span>Size</span>
                <span className="text-gray-400">{qual.details.moduleSize}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Position details */}
      <div className="mt-3 ml-9 pt-3 border-t border-white/8 dark:border-white/8 grid grid-cols-4 gap-2">
        {[
          { label: 'X', value: qr.boundingBox.x },
          { label: 'Y', value: qr.boundingBox.y },
          { label: 'W', value: qr.boundingBox.width },
          { label: 'H', value: qr.boundingBox.height },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-gray-700 text-xs">{label}</p>
            <p className="text-gray-400 dark:text-gray-400 text-xs font-mono">{value}px</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
