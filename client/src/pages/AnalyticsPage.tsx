import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart2, Clock, ScanLine, Shield, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScanHistoryEntry } from '../types';

// ── Palette ──────────────────────────────────────────────────────────────────
const COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#3b82f6', '#84cc16', '#f97316', '#a78bfa',
];

const CHART_STYLE = {
  background: 'transparent',
  fontSize: 11,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function dayKey(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildDailyData(history: ScanHistoryEntry[]) {
  const map: Record<string, number> = {};
  const now = Date.now();
  // Pre-fill last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    map[dayKey(d)] = 0;
  }
  for (const e of history) {
    const key = dayKey(e.timestamp);
    if (key in map) map[key] = (map[key] ?? 0) + e.totalFound;
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

function buildTypeDistribution(history: ScanHistoryEntry[]) {
  const map: Record<string, number> = {};
  for (const e of history) {
    for (const q of e.result.qrCodes) {
      map[q.dataType] = (map[q.dataType] ?? 0) + 1;
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

function buildProcessingTrend(history: ScanHistoryEntry[]) {
  const last20 = [...history].slice(0, 20).reverse();
  return last20.map((e, i) => ({
    index: i + 1,
    label: e.filename.slice(0, 12) + (e.filename.length > 12 ? '…' : ''),
    time: e.processingTimeMs,
  }));
}

function buildEnhancementData(history: ScanHistoryEntry[]) {
  if (history.length === 0) return [];
  const metrics = ['brightness', 'contrast', 'sharpness'] as const;
  return metrics.map((m) => {
    const before = history.reduce((s, e) => s + (e.result.enhancement?.originalStats[m] ?? 0), 0) / history.length;
    const after  = history.reduce((s, e) => s + (e.result.enhancement?.enhancedStats[m]  ?? 0), 0) / history.length;
    return {
      metric: m.charAt(0).toUpperCase() + m.slice(1),
      before: Math.round(before),
      after:  Math.round(after),
    };
  });
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace(/\d+$/, '500/15')}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { scanHistory } = useApp();

  const totalScans     = scanHistory.length;
  const totalQR        = useMemo(() => scanHistory.reduce((s, e) => s + e.totalFound, 0), [scanHistory]);
  const avgTime        = useMemo(() => {
    if (!totalScans) return 0;
    return Math.round(scanHistory.reduce((s, e) => s + e.processingTimeMs, 0) / totalScans);
  }, [scanHistory, totalScans]);
  const mostCommonType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of scanHistory) {
      for (const q of e.result.qrCodes) map[q.dataType] = (map[q.dataType] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [scanHistory]);

  const dailyData       = useMemo(() => buildDailyData(scanHistory), [scanHistory]);
  const typeData        = useMemo(() => buildTypeDistribution(scanHistory), [scanHistory]);
  const processingTrend = useMemo(() => buildProcessingTrend(scanHistory), [scanHistory]);
  const enhData         = useMemo(() => buildEnhancementData(scanHistory), [scanHistory]);
  const avgProcTime     = useMemo(() => {
    if (!processingTrend.length) return 0;
    return Math.round(processingTrend.reduce((s, r) => s + r.time, 0) / processingTrend.length);
  }, [processingTrend]);

  const suspiciousCount = useMemo(() =>
    scanHistory.reduce((s, e) =>
      s + e.result.qrCodes.filter((q) => q.suspiciousAnalysis?.isSuspicious).length, 0),
    [scanHistory]
  );
  const riskTypes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of scanHistory) {
      for (const q of e.result.qrCodes) {
        if (q.suspiciousAnalysis?.isSuspicious) {
          const level = q.suspiciousAnalysis.riskLevel;
          map[level] = (map[level] ?? 0) + 1;
        }
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [scanHistory]);

  const recentActivity = useMemo(() => scanHistory.slice(0, 5), [scanHistory]);

  if (scanHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
          <BarChart2 className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-300 mb-2">No data yet</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Scan some images first and analytics will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Insights from your {totalScans} scan{totalScans !== 1 ? 's' : ''}</p>
      </div>

      {/* ── 1. Top Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ScanLine} label="Total Scans" value={totalScans} color="text-violet-400" />
        <StatCard icon={BarChart2} label="Total QR Codes" value={totalQR} color="text-cyan-400" />
        <StatCard icon={Clock} label="Avg Process Time" value={`${avgTime}ms`} color="text-green-400" />
        <StatCard icon={Shield} label="Most Common Type" value={mostCommonType} color="text-yellow-400" />
      </div>

      {/* ── 2. QR Codes Over Time ─────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">QR Codes Found — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData} style={CHART_STYLE}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }}
              interval={Math.ceil(dailyData.length / 7)} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone" dataKey="count" name="QR Codes"
              stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── 3 + 4. Type Distribution + Processing Trend ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">QR Type Distribution</h2>
          {typeData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No QR codes scanned</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={typeData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  paddingAngle={3}
                >
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(val) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Processing time bar */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Processing Time — Last 20 Scans</h2>
          {processingTrend.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={processingTrend} style={CHART_STYLE}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 9 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit="ms" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="time" name="Time (ms)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                {/* Average reference line */}
                <Line
                  type="monotone"
                  data={processingTrend.map((d) => ({ ...d, avg: avgProcTime }))}
                  dataKey="avg"
                  stroke="#f59e0b"
                  strokeDasharray="5 3"
                  dot={false}
                  name="Average"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── 5. Enhancement Effectiveness ─────────────────────────────────── */}
      {enhData.some((d) => d.before > 0 || d.after > 0) && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Enhancement Effectiveness (Average)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={enhData} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(val) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{val}</span>} />
              <Bar dataKey="before" name="Before" fill="#6b7280" radius={[3, 3, 0, 0]} />
              <Bar dataKey="after"  name="After"  fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 6. Suspicious QR Detection ───────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-gray-300">Suspicious QR Detection</h2>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-3xl font-bold text-orange-400">{suspiciousCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Suspicious QR codes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-400">
              {totalQR > 0 ? ((suspiciousCount / totalQR) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="text-xs text-gray-500 mt-0.5">of all QR codes</p>
          </div>
          {riskTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {riskTypes.map(([level, count]) => (
                <div
                  key={level}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    level === 'critical' ? 'bg-red-500' :
                    level === 'high' ? 'bg-red-400' :
                    level === 'medium' ? 'bg-orange-400' :
                    level === 'low' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <span className="text-xs text-gray-400 capitalize">{level}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 7. Recent Activity ────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Activity</h2>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/10">
                <th className="text-left pb-2 font-medium">Filename</th>
                <th className="text-center pb-2 font-medium">QR Count</th>
                <th className="text-left pb-2 font-medium hidden sm:table-cell">Types</th>
                <th className="text-right pb-2 font-medium">Time</th>
                <th className="text-right pb-2 font-medium hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((e, i) => (
                <tr key={e.id} className={i < recentActivity.length - 1 ? 'border-b border-white/5' : ''}>
                  <td className="py-2.5 text-gray-300 max-w-[140px] truncate">{e.filename}</td>
                  <td className="py-2.5 text-center text-cyan-300 font-medium">{e.totalFound}</td>
                  <td className="py-2.5 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(e.result.qrCodes.map((q) => q.dataType))].slice(0, 3).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-white/5 text-gray-400 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-gray-400">{e.processingTimeMs}ms</td>
                  <td className="py-2.5 text-right text-gray-500 hidden md:table-cell">
                    {new Date(e.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
