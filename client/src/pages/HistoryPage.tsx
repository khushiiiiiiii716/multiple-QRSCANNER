import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Search, Trash2, Eye, Download, ScanLine, Calendar,
  ChevronDown, ChevronUp, AlertTriangle, BarChart2
} from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import { ScanHistoryEntry } from '../types';
import { exportHistoryToCSV } from '../services/exportService';

type DateFilter = 'all' | 'today' | 'week' | 'month';
type SortKey = 'date' | 'qrCount' | 'time';

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getUniqueTypes(entry: ScanHistoryEntry): string[] {
  return [...new Set(entry.result.qrCodes.map((q) => q.dataType))];
}

function isInDateRange(entry: ScanHistoryEntry, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const now = new Date();
  const ts = new Date(entry.timestamp);
  if (filter === 'today') {
    return ts.toDateString() === now.toDateString();
  }
  if (filter === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return ts >= weekAgo;
  }
  if (filter === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return ts >= monthAgo;
  }
  return true;
}

export default function HistoryPage() {
  const { scanHistory, deleteFromHistory, clearHistory } = useApp();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return scanHistory
      .filter((e) => {
        if (!isInDateRange(e, dateFilter)) return false;
        if (!search) return true;
        const lower = search.toLowerCase();
        if (e.filename.toLowerCase().includes(lower)) return true;
        return e.result.qrCodes.some((q) => q.data.toLowerCase().includes(lower));
      })
      .sort((a, b) => {
        if (sortKey === 'date')    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (sortKey === 'qrCount') return b.totalFound - a.totalFound;
        if (sortKey === 'time')    return b.processingTimeMs - a.processingTimeMs;
        return 0;
      });
  }, [scanHistory, search, dateFilter, sortKey]);

  if (scanHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-300 dark:text-gray-300 mb-2">No scan history yet</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Scanned images will appear here. Go to the scanner and upload an image to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{scanHistory.length} scan{scanHistory.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportHistoryToCSV(scanHistory)}
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              if (confirm('Clear all scan history? This cannot be undone.')) clearHistory();
            }}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by filename or QR data…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10
                       text-gray-900 dark:text-gray-200 placeholder-gray-500
                       focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* Date filter */}
        {(['all', 'today', 'week', 'month'] as DateFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={clsx(
              'px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize',
              dateFilter === f
                ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40'
                : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10 hover:text-gray-300'
            )}
          >
            {f === 'all' ? 'All time' : f}
          </button>
        ))}

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 dark:bg-white/5 border border-white/10
                     text-gray-400 focus:outline-none focus:border-violet-500/50 transition-colors"
        >
          <option value="date">Sort: Date</option>
          <option value="qrCount">Sort: QR Count</option>
          <option value="time">Sort: Processing Time</option>
        </select>
      </div>

      {/* Results count */}
      {search || dateFilter !== 'all' ? (
        <p className="text-xs text-gray-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
      ) : null}

      {/* History cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No scans match your search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((entry) => {
              const types = getUniqueTypes(entry);
              const hasSuspicious = entry.result.qrCodes.some(
                (q) => q.suspiciousAnalysis?.isSuspicious
              );
              const isExpanded = expandedId === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="glass-card overflow-hidden"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-4 p-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <ScanLine className="w-5 h-5 text-violet-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{entry.filename}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(entry.timestamp)} · {formatSize(entry.fileSize)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasSuspicious && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-500/15 text-orange-300 rounded-full border border-orange-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Suspicious
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded-full border border-cyan-500/30 font-medium">
                            {entry.totalFound} QR{entry.totalFound !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-500">{entry.processingTimeMs}ms</span>
                        </div>
                      </div>

                      {/* Type tags */}
                      {types.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {types.map((t) => (
                            <span key={t} className="text-xs px-2 py-0.5 bg-white/5 text-gray-400 rounded-md">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        title={isExpanded ? 'Collapse' : 'View'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteFromHistory(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded view */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/10 px-4 pb-4 pt-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            QR Codes
                          </p>
                          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                            {entry.result.qrCodes.map((qr, i) => (
                              <div
                                key={qr.id}
                                className={clsx(
                                  'flex items-start gap-2 p-2 rounded-lg text-xs',
                                  qr.suspiciousAnalysis?.isSuspicious
                                    ? 'bg-orange-500/10 border border-orange-500/20'
                                    : 'bg-white/5'
                                )}
                              >
                                <span className="text-violet-300 font-medium flex-shrink-0">[{qr.dataType}]</span>
                                <span className="text-gray-400 break-all">{qr.data}</span>
                                {qr.qualityScore && (
                                  <span className="ml-auto flex-shrink-0 text-gray-500">
                                    {qr.qualityScore.grade}
                                  </span>
                                )}
                              </div>
                            ))}
                            {entry.result.qrCodes.length === 0 && (
                              <p className="text-xs text-gray-500">No QR codes were found</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
