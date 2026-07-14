import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  BarChart2, Clock, ScanLine, Shield, AlertTriangle,
  TrendingUp, Target, Zap, CheckCircle2, Activity,
  Calendar, Image as ImageIcon, QrCode,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ScanHistoryEntry } from '../types';

/* ── palette ─────────────────────────────────────────────────────────────── */
const PALETTE = [
  '#3b82f6','#14b8a6','#8b5cf6','#f59e0b','#ef4444',
  '#ec4899','#22c55e','#f97316','#06b6d4','#a78bfa',
];

const AXIS  = { fill: 'var(--text-muted)', fontSize: 10 } as const;
const GRID  = 'rgba(148,163,184,0.07)';

/* ── data helpers ────────────────────────────────────────────────────────── */
function dayKey(d: Date | string, short = false) {
  return new Date(d).toLocaleDateString('en-US',
    short
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric' });
}

function weekKey(d: Date | string) {
  const dt = new Date(d);
  const startOfWeek = new Date(dt);
  startOfWeek.setDate(dt.getDate() - dt.getDay());
  return startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Daily series for last N days – returns { date, scans, qrCodes } */
function buildDailySeries(history: ScanHistoryEntry[], days: number) {
  const map: Record<string, { scans: number; qrCodes: number }> = {};
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now - i * 86_400_000));
    map[key] = { scans: 0, qrCodes: 0 };
  }
  for (const e of history) {
    const k = dayKey(e.timestamp);
    if (k in map) {
      map[k].scans   += 1;
      map[k].qrCodes += e.totalFound;
    }
  }
  return Object.entries(map).map(([date, v]) => ({ date, ...v }));
}

/** Weekly series for last 12 weeks */
function buildWeeklySeries(history: ScanHistoryEntry[]) {
  const map: Record<string, { scans: number; qrCodes: number }> = {};
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now - i * 7 * 86_400_000);
    map[weekKey(d)] = { scans: 0, qrCodes: 0 };
  }
  for (const e of history) {
    const k = weekKey(e.timestamp);
    if (k in map) {
      map[k].scans   += 1;
      map[k].qrCodes += e.totalFound;
    }
  }
  return Object.entries(map).map(([week, v]) => ({ week, ...v }));
}

function buildTypeDistribution(history: ScanHistoryEntry[]) {
  const map: Record<string, number> = {};
  for (const e of history)
    for (const q of e.result.qrCodes)
      map[q.dataType] = (map[q.dataType] ?? 0) + 1;
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

function buildProcessingTrend(history: ScanHistoryEntry[]) {
  return [...history].slice(0, 30).reverse().map((e, i) => ({
    i: i + 1,
    label: e.filename.slice(0, 8) + (e.filename.length > 8 ? '…' : ''),
    ms: e.processingTimeMs,
  }));
}

/* ── tooltip ─────────────────────────────────────────────────────────────── */
const ChartTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; unit?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-xl text-xs shadow-2xl min-w-[120px]"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {label && (
        <p className="font-semibold mb-2 pb-1.5" style={{
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="font-bold flex items-center justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span>{p.value}{p.unit ?? ''}</span>
        </p>
      ))}
    </div>
  );
};

/* ── stat card ───────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  color: string;
  bg?: string;
  delay?: number;
  trend?: { value: number; label: string };
}

function StatCard({ icon: Icon, label, value, sub, subColor, color, bg, delay = 0, trend }: StatCardProps) {
  const trendUp = (trend?.value ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: 'easeOut' }}
      className="stat-card group"
    >
      {/* Top accent bar revealed on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: bg ?? color + '18' }}
      >
        <Icon className="w-5 h-5" style={{ color } as React.CSSProperties} />
      </div>
      <p className="text-3xl font-black tracking-tight" style={{ color }}>
        {value}
      </p>
      <p className="text-xs font-semibold mt-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {sub && (
        <p className="text-xs mt-0.5 font-medium" style={{ color: subColor ?? 'var(--text-muted)' }}>
          {sub}
        </p>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-md"
            style={{
              background: trendUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: trendUp ? '#22c55e' : '#ef4444',
            }}
          >
            {trendUp ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{trend.label}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ── section header ─────────────────────────────────────────────────────── */
function SectionHeader({
  icon: Icon, title, sub, color = '#3b82f6', right,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  sub?: string;
  color?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: color + '15' }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 } as React.CSSProperties} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ── time range toggle ───────────────────────────────────────────────────── */
function RangeToggle({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <div
      className="flex items-center rounded-xl p-1 gap-0.5"
      style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}
    >
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
          style={value === o.key ? {
            background: 'linear-gradient(135deg,#3b82f6,#14b8a6)',
            color: '#fff',
          } : {
            color: 'var(--text-muted)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── accuracy ring ───────────────────────────────────────────────────────── */
function AccuracyRing({ pct }: { pct: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none"
          stroke="rgba(59,130,246,0.10)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none"
          stroke="url(#accGrad)" strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
        <defs>
          <linearGradient id="accGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-gradient">{pct}%</span>
        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>accuracy</span>
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { scanHistory } = useApp();
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | 'weekly'>('30d');

  /* ── top-level KPIs ──────────────────────────────────────────────────── */
  const totalScans = scanHistory.length;

  const totalQR = useMemo(
    () => scanHistory.reduce((s, e) => s + e.totalFound, 0),
    [scanHistory],
  );

  const avgMs = useMemo(
    () => (!totalScans ? 0 : Math.round(
      scanHistory.reduce((s, e) => s + e.processingTimeMs, 0) / totalScans,
    )),
    [scanHistory, totalScans],
  );

  const minMs = useMemo(
    () => (!totalScans ? 0 : Math.min(...scanHistory.map(e => e.processingTimeMs))),
    [scanHistory, totalScans],
  );

  const maxMs = useMemo(
    () => (!totalScans ? 0 : Math.max(...scanHistory.map(e => e.processingTimeMs))),
    [scanHistory, totalScans],
  );

  /** Detection accuracy = scans that found ≥1 QR / total scans */
  const accuracyPct = useMemo(
    () => (!totalScans ? 0 :
      Math.round((scanHistory.filter(e => e.totalFound > 0).length / totalScans) * 100)),
    [scanHistory, totalScans],
  );

  /** Avg QR codes per image (only images that had ≥1) */
  const avgQRPerImage = useMemo(() => {
    const found = scanHistory.filter(e => e.totalFound > 0);
    return !found.length ? 0 :
      (found.reduce((s, e) => s + e.totalFound, 0) / found.length).toFixed(1);
  }, [scanHistory]);

  const topType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of scanHistory)
      for (const q of e.result.qrCodes) m[q.dataType] = (m[q.dataType] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [scanHistory]);

  const susCount = useMemo(
    () => scanHistory.reduce(
      (s, e) => s + e.result.qrCodes.filter(q => q.suspiciousAnalysis?.isSuspicious).length, 0),
    [scanHistory],
  );

  const riskMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of scanHistory)
      for (const q of e.result.qrCodes)
        if (q.suspiciousAnalysis?.isSuspicious) {
          const lv = q.suspiciousAnalysis.riskLevel;
          m[lv] = (m[lv] ?? 0) + 1;
        }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [scanHistory]);

  /* ── chart data ──────────────────────────────────────────────────────── */
  const daily7   = useMemo(() => buildDailySeries(scanHistory, 7),   [scanHistory]);
  const daily30  = useMemo(() => buildDailySeries(scanHistory, 30),  [scanHistory]);
  const weekly12 = useMemo(() => buildWeeklySeries(scanHistory),      [scanHistory]);
  const typeData = useMemo(() => buildTypeDistribution(scanHistory),  [scanHistory]);
  const procData = useMemo(() => buildProcessingTrend(scanHistory),   [scanHistory]);
  const recent   = useMemo(() => scanHistory.slice(0, 8),             [scanHistory]);

  const trendData = trendRange === '7d' ? daily7 : trendRange === '30d' ? daily30 : weekly12;
  const trendKey  = trendRange === 'weekly' ? 'week' : 'date';

  /* ── week-over-week scan change ──────────────────────────────────────── */
  const wowChange = useMemo(() => {
    const now = Date.now();
    const thisWeek = scanHistory.filter(e => new Date(e.timestamp).getTime() > now - 7  * 86400000).length;
    const lastWeek = scanHistory.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t > now - 14 * 86400000 && t <= now - 7 * 86400000;
    }).length;
    if (!lastWeek) return null;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }, [scanHistory]);

  /* ── empty state ─────────────────────────────────────────────────────── */
  if (!scanHistory.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}
        >
          <BarChart2 className="w-12 h-12" style={{ color: '#3b82f6' }} />
        </motion.div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            No analytics yet
          </h2>
          <p className="max-w-xs text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Scan your first image and all metrics, charts, and trends will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
            Analytics Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Insights across {totalScans} scan{totalScans !== 1 ? 's' : ''} ·{' '}
            {totalQR} QR code{totalQR !== 1 ? 's' : ''} decoded
          </p>
        </div>
        {/* Live indicator */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.22)',
            color: '#22c55e',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live data
        </div>
      </motion.div>

      {/* ── Row 1 — 8 KPI cards (2×4) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={ImageIcon} label="Images Scanned" value={totalScans}
          sub={wowChange !== null ? `${wowChange >= 0 ? '+' : ''}${wowChange}% vs last week` : 'All time'}
          subColor={wowChange !== null && wowChange >= 0 ? '#22c55e' : '#f87171'}
          color="#3b82f6" delay={0}
          trend={wowChange !== null ? { value: wowChange, label: 'vs last week' } : undefined}
        />
        <StatCard
          icon={QrCode} label="QR Codes Found" value={totalQR}
          sub={`${avgQRPerImage} avg per image`}
          color="#14b8a6" delay={0.05}
        />
        <StatCard
          icon={Target} label="Detection Accuracy" value={`${accuracyPct}%`}
          sub={`${scanHistory.filter(e => e.totalFound > 0).length} of ${totalScans} images`}
          color={accuracyPct >= 80 ? '#22c55e' : accuracyPct >= 60 ? '#f59e0b' : '#ef4444'}
          delay={0.10}
        />
        <StatCard
          icon={Clock} label="Avg Scan Time" value={`${avgMs}ms`}
          sub={`Fast: ${minMs}ms · Slow: ${maxMs}ms`}
          color="#8b5cf6" delay={0.15}
        />
        <StatCard
          icon={Activity} label="Scans This Week"
          value={scanHistory.filter(e => new Date(e.timestamp).getTime() > Date.now() - 7 * 86400000).length}
          sub="Last 7 days"
          color="#f59e0b" delay={0.20}
        />
        <StatCard
          icon={TrendingUp} label="Top QR Type" value={topType}
          sub={typeData[0] ? `${typeData[0].value} occurrences` : undefined}
          color="#ec4899" delay={0.25}
        />
        <StatCard
          icon={Shield} label="Threats Detected" value={susCount}
          sub={totalQR > 0 ? `${((susCount / totalQR) * 100).toFixed(1)}% of all QR codes` : 'No data'}
          color={susCount > 0 ? '#f97316' : '#22c55e'}
          delay={0.30}
        />
        <StatCard
          icon={Zap} label="Scan Engine" value="5 Methods"
          sub="Multi-strategy detection"
          color="#06b6d4" delay={0.35}
        />
      </div>

      {/* ── Accuracy spotlight ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}
        className="glass-card p-6"
      >
        <SectionHeader
          icon={Target} title="Detection Accuracy"
          sub="Percentage of images where at least one QR code was successfully decoded"
          color="#22c55e"
        />
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Ring */}
          <AccuracyRing pct={accuracyPct} />

          {/* Breakdown bars */}
          <div className="flex-1 w-full space-y-3">
            {[
              {
                label: 'Successfully decoded',
                count: scanHistory.filter(e => e.totalFound > 0).length,
                color: '#22c55e',
              },
              {
                label: 'No QR codes found',
                count: scanHistory.filter(e => e.totalFound === 0).length,
                color: '#64748b',
              },
              {
                label: 'Flagged suspicious',
                count: scanHistory.filter(e => e.result.qrCodes.some(q => q.suspiciousAnalysis?.isSuspicious)).length,
                color: '#f97316',
              },
            ].map(({ label, count, color }) => {
              const pct = totalScans ? Math.round((count / totalScans) * 100) : 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {count} <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Daily / Weekly scan trends ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}
        className="glass-card p-5"
      >
        <SectionHeader
          icon={Calendar} title="Scan Trends"
          sub="Images scanned and QR codes detected over time"
          color="#3b82f6"
          right={
            <RangeToggle
              value={trendRange}
              onChange={v => setTrendRange(v as typeof trendRange)}
              options={[
                { key: '7d',     label: '7 Days'  },
                { key: '30d',    label: '30 Days' },
                { key: 'weekly', label: 'Weekly'  },
              ]}
            />
          }
        />
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradScans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradQR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis
              dataKey={trendKey} tick={AXIS}
              interval={trendRange === 'weekly' ? 1 : Math.ceil(trendData.length / 8)}
            />
            <YAxis tick={AXIS} allowDecimals={false} width={28} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>}
            />
            <Area
              type="monotone" dataKey="scans" name="Images Scanned"
              stroke="#3b82f6" strokeWidth={2} fill="url(#gradScans)"
              dot={false} activeDot={{ r: 4, fill: '#3b82f6' }}
            />
            <Area
              type="monotone" dataKey="qrCodes" name="QR Codes Found"
              stroke="#14b8a6" strokeWidth={2} fill="url(#gradQR)"
              dot={false} activeDot={{ r: 4, fill: '#14b8a6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── Type distribution + Processing time ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie — type distribution */}
        <motion.div
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.46 }}
          className="glass-card p-5"
        >
          <SectionHeader
            icon={BarChart2} title="QR Type Distribution"
            sub={`${typeData.length} distinct type${typeData.length !== 1 ? 's' : ''} detected`}
            color="#8b5cf6"
          />
          {typeData.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={typeData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={82} innerRadius={46}
                    paddingAngle={3} strokeWidth={0}
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend formatter={v => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
              {/* Top 3 type breakdown */}
              <div className="space-y-2 mt-3">
                {typeData.slice(0, 4).map(({ name, value }, i) => {
                  const pct = totalQR ? Math.round((value / totalQR) * 100) : 0;
                  return (
                    <div key={name} className="flex items-center gap-3 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="flex-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                      <div className="w-20 h-1.5 rounded-full overflow-hidden flex-shrink-0"
                        style={{ background: 'var(--glass-bg)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: PALETTE[i % PALETTE.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 + i * 0.1 }}
                        />
                      </div>
                      <span className="font-bold w-8 text-right" style={{ color: 'var(--text-primary)' }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* Bar — processing time trend */}
        <motion.div
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.50 }}
          className="glass-card p-5"
        >
          <SectionHeader
            icon={Clock} title="Processing Time"
            sub={`Last ${procData.length} scans · Avg ${avgMs}ms`}
            color="#f59e0b"
          />
          {procData.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={procData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} />
                <YAxis tick={AXIS} unit="ms" width={40} />
                <Tooltip content={<ChartTooltip />} />
                {avgMs > 0 && (
                  <ReferenceLine
                    y={avgMs} stroke="#f59e0b" strokeDasharray="5 3"
                    label={{ value: `Avg ${avgMs}ms`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
                  />
                )}
                <Bar dataKey="ms" name="Time (ms)" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* ── Most common QR type deep-dive ──────────────────────────────── */}
      {typeData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.54 }}
          className="glass-card p-5"
        >
          <SectionHeader
            icon={TrendingUp} title="QR Type Ranking"
            sub="All detected types sorted by frequency"
            color="#ec4899"
          />
          <div className="space-y-3">
            {typeData.map(({ name, value }, i) => {
              const pct = totalQR ? Math.round((value / totalQR) * 100) : 0;
              const color = PALETTE[i % PALETTE.length];
              return (
                <div key={name} className="flex items-center gap-3">
                  {/* Rank */}
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: color + '20', color }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold w-28 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                    {name}
                  </span>
                  {/* Bar */}
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 + i * 0.06 }}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-black" style={{ color }}>{value}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: color + '15', color }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Security analysis ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.58 }}
        className="glass-card p-5"
      >
        <SectionHeader
          icon={AlertTriangle} title="Security Analysis"
          sub="Suspicious QR code detection and risk breakdown"
          color="#f97316"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          {/* Big numbers */}
          <div className="space-y-4">
            <div>
              <p className="text-5xl font-black" style={{ color: susCount > 0 ? '#f97316' : '#22c55e' }}>
                {susCount}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Suspicious QR codes</p>
            </div>
            <div>
              <p className="text-3xl font-black" style={{ color: 'var(--text-secondary)' }}>
                {totalQR > 0 ? ((susCount / totalQR) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>of all QR codes</p>
            </div>
            {/* Clean badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold"
              style={susCount === 0
                ? { background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }
                : { background: 'rgba(249,115,22,0.10)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }
              }
            >
              <CheckCircle2 className="w-4 h-4" />
              {susCount === 0 ? 'All clear' : 'Review needed'}
            </div>
          </div>

          {/* Risk level pills */}
          <div className="sm:col-span-2">
            {riskMap.length === 0 ? (
              <div
                className="flex items-center justify-center h-24 rounded-2xl"
                style={{ background: 'rgba(34,197,94,0.05)', border: '1px dashed rgba(34,197,94,0.25)' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                  ✓ No suspicious QR codes detected
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {riskMap.map(([level, count]) => {
                  const riskColors: Record<string, string> = {
                    critical: '#ef4444', high: '#f97316',
                    medium: '#f59e0b', low: '#eab308', safe: '#22c55e',
                  };
                  const c = riskColors[level] ?? '#94a3b8';
                  const pct = susCount ? Math.round((count / susCount) * 100) : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                          <span className="font-semibold capitalize" style={{ color: c }}>{level} risk</span>
                        </div>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          {count} <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                        </span>
                      </div>
                      <div className="progress-bar">
                        <motion.div
                          className="progress-fill"
                          style={{ background: c }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.6 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Recent activity table ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.62 }}
        className="glass-card p-5"
      >
        <SectionHeader
          icon={Activity} title="Recent Activity"
          sub={`Last ${recent.length} scans`}
          color="#06b6d4"
        />
        <div className="overflow-x-auto scrollbar-thin -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['#', 'Filename', 'QR Found', 'Types', 'Proc. Time', 'Accuracy', 'Date'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-left font-semibold"
                    style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((e, i) => {
                const found = e.totalFound > 0;
                return (
                  <tr
                    key={e.id}
                    className="group transition-colors"
                    style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                  >
                    <td className="py-3 pr-4 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {i + 1}
                    </td>
                    <td className="py-3 pr-4 max-w-[140px]">
                      <p className="truncate font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {e.filename}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="font-black"
                        style={{ color: found ? '#14b8a6' : 'var(--text-muted)' }}
                      >
                        {e.totalFound}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(e.result.qrCodes.map(q => q.dataType))].slice(0, 3).map(t => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {e.processingTimeMs}ms
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit"
                        style={found
                          ? { background: 'rgba(34,197,94,0.10)', color: '#22c55e' }
                          : { background: 'rgba(100,116,139,0.10)', color: '#64748b' }
                        }
                      >
                        {found ? '✓ Hit' : '✗ Miss'}
                      </span>
                    </td>
                    <td className="py-3" style={{ color: 'var(--text-muted)' }}>
                      {new Date(e.timestamp).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>
  );
}
