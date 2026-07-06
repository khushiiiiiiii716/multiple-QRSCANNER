import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  X, Upload, Layers, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Download, ScanLine
} from 'lucide-react';
import clsx from 'clsx';
import { batchScanImages } from '../api';
import { ScanResponse } from '../types';
import { exportToCSV } from '../services/exportService';
import Papa from 'papaparse';

interface BatchResult {
  filename: string;
  fileSize: number;
  status: 'success' | 'error';
  error?: string;
  totalFound?: number;
  qrCodes?: ScanResponse['qrCodes'];
  processingTimeMs?: number;
}

interface BatchSummary {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  totalQRFound: number;
  totalProcessingTimeMs: number;
  results: BatchResult[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const BatchUpload: React.FC<Props> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [scanning, setScanning] = useState(false);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const combined = [...prev, ...accepted];
      return combined.slice(0, 20); // max 20
    });
    setSummary(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'] },
    maxFiles: 20,
  });

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleScanAll = async () => {
    if (files.length === 0) return;
    setScanning(true);
    setSummary(null);
    setCurrentFileIdx(0);

    try {
      // Process in chunks to show progress
      const allResults: BatchResult[] = [];
      let totalQRFound = 0;
      let successCount = 0;
      const batchStart = Date.now();

      for (let i = 0; i < files.length; i++) {
        setCurrentFileIdx(i);
        try {
          const res = await batchScanImages([files[i]]);
          const r = res.results[0];
          allResults.push(r);
          if (r.status === 'success') {
            successCount++;
            totalQRFound += r.totalFound ?? 0;
          }
        } catch {
          allResults.push({
            filename: files[i].name,
            fileSize: files[i].size,
            status: 'error',
            error: 'Failed to process',
          });
        }
      }

      setSummary({
        totalFiles: files.length,
        successCount,
        errorCount: files.length - successCount,
        totalQRFound,
        totalProcessingTimeMs: Date.now() - batchStart,
        results: allResults,
      });
    } finally {
      setScanning(false);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleExportAllCSV = () => {
    if (!summary) return;
    const rows: Record<string, unknown>[] = [];
    summary.results.forEach((r) => {
      if (r.status === 'success' && r.qrCodes) {
        r.qrCodes.forEach((qr, i) => {
          rows.push({
            'File': r.filename,
            '#': i + 1,
            'Data Type': qr.dataType,
            'Data': qr.data,
            'Quality Grade': qr.qualityScore?.grade ?? '',
            'Risk Level': qr.suspiciousAnalysis?.riskLevel ?? '',
            'BBox X': qr.boundingBox.x,
            'BBox Y': qr.boundingBox.y,
            'BBox W': qr.boundingBox.width,
            'BBox H': qr.boundingBox.height,
          });
        });
      }
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-scan-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const progress = scanning ? Math.round(((currentFileIdx) / files.length) * 100) : 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col glass-card bg-gray-950 dark:bg-gray-950 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Batch Scan</h2>
                <p className="text-xs text-gray-500">Up to 20 images at once</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
            {/* Dropzone */}
            {!summary && (
              <div
                {...getRootProps()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-violet-400 bg-violet-500/10'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {isDragActive ? 'Drop images here…' : 'Drag & drop or click to select images'}
                </p>
                <p className="text-xs text-gray-600 mt-1">JPEG, PNG, GIF, WebP, BMP · Max 20 files · 20MB each</p>
              </div>
            )}

            {/* File list */}
            {files.length > 0 && !summary && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </p>
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove all
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                  {files.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg"
                    >
                      <ScanLine className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{file.name}</p>
                        <p className="text-xs text-gray-600">{formatSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar (while scanning) */}
            {scanning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Processing file {currentFileIdx + 1} of {files.length}…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                  />
                </div>
                <p className="text-xs text-gray-600 truncate">{files[currentFileIdx]?.name}</p>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Images', value: summary.totalFiles, color: 'text-violet-300' },
                    { label: 'QR Codes', value: summary.totalQRFound, color: 'text-cyan-300' },
                    { label: 'Time', value: `${(summary.totalProcessingTimeMs / 1000).toFixed(1)}s`, color: 'text-green-300' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                      <p className={clsx('text-2xl font-bold', color)}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Result cards */}
                <div className="space-y-2">
                  {summary.results.map((r, i) => (
                    <div key={i} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <button
                        onClick={() => toggleExpand(i)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                      >
                        {r.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm text-left text-gray-300 truncate">{r.filename}</span>
                        {r.status === 'success' && (
                          <span className="text-xs text-cyan-300 font-medium">
                            {r.totalFound} QR{(r.totalFound ?? 0) !== 1 ? 's' : ''}
                          </span>
                        )}
                        {r.status === 'error' && (
                          <span className="text-xs text-red-400">Error</span>
                        )}
                        {expandedResults.has(i) ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>

                      {expandedResults.has(i) && (
                        <div className="px-4 pb-3 border-t border-white/10 pt-2">
                          {r.status === 'error' ? (
                            <p className="text-sm text-red-400">{r.error}</p>
                          ) : r.qrCodes && r.qrCodes.length > 0 ? (
                            <div className="space-y-1">
                              {r.qrCodes.map((qr, j) => (
                                <div key={j} className="flex items-start gap-2 text-xs">
                                  <span className="text-violet-300 font-medium">[{qr.dataType}]</span>
                                  <span className="text-gray-400 break-all line-clamp-1">{qr.data}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">No QR codes found</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
            {summary ? (
              <>
                <button
                  onClick={() => { setFiles([]); setSummary(null); }}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Scan More
                </button>
                <button
                  onClick={handleExportAllCSV}
                  className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export All to CSV
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
                  Cancel
                </button>
                <button
                  onClick={handleScanAll}
                  disabled={files.length === 0 || scanning}
                  className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
                >
                  <ScanLine className="w-4 h-4" />
                  {scanning ? 'Scanning…' : `Scan All (${files.length})`}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
