import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Download, RefreshCw, Zap, AlertTriangle, Mail, Video,
  Layers, FileText, Sheet, FileDown, ShieldAlert
} from 'lucide-react';
import { DropZone } from './components/DropZone';
import { AnnotatedImage } from './components/AnnotatedImage';
import { QRCard } from './components/QRCard';
import { StatsBar } from './components/StatsBar';
import { LoadingOverlay } from './components/LoadingOverlay';
import { EmailModal } from './components/EmailModal';
import { EnhancementBadge } from './components/EnhancementBadge';
import { LiveScanner } from './components/LiveScanner';
import { BatchUpload } from './components/BatchUpload';
import { scanImage } from './api';
import { ScanResponse, ScanState } from './types';
import { useApp } from './context/AppContext';
import { exportToCSV, exportToExcel, exportToPDF } from './services/exportService';

export default function App() {
  const { addToHistory } = useApp();

  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [liveScannerOpen, setLiveScannerOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [liveResults, setLiveResults] = useState<{ data: string; dataType: string; time: Date }[]>([]);

  const handleFileSelected = useCallback(async (file: File) => {
    setState('uploading');
    setError(null);
    setResult(null);
    setUploadProgress(0);
    setHighlightedId(null);

    try {
      setState('uploading');
      const response = await scanImage(file, (pct) => {
        setUploadProgress(pct);
        if (pct === 100) setState('processing');
      });
      setResult(response);
      setState('done');

      // Persist to history
      addToHistory({
        id: crypto.randomUUID(),
        filename: response.filename,
        fileSize: response.fileSize,
        totalFound: response.totalFound,
        processingTimeMs: response.processingTimeMs,
        timestamp: new Date(),
        result: response,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response: { data: { error: string } } }).response?.data?.error
          : 'Failed to scan image. Please try again.';
      setError(message || 'Unknown error');
      setState('error');
    }
  }, [addToHistory]);

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError(null);
    setUploadProgress(0);
    setHighlightedId(null);
    setFilter('all');
  };

  const handleLiveDetection = useCallback((data: string, dataType: string) => {
    setLiveResults(prev => {
      const isDuplicate = prev.some(r => r.data === data &&
        new Date().getTime() - r.time.getTime() < 3000);
      if (isDuplicate) return prev;
      return [{ data, dataType, time: new Date() }, ...prev].slice(0, 50);
    });
  }, []);

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.annotatedImageBase64;
    link.download = `qr-annotated-${Date.now()}.png`;
    link.click();
  };

  // Get unique data types for filter tabs
  const dataTypes = result
    ? ['all', ...Array.from(new Set(result.qrCodes.map((q) => q.dataType)))]
    : ['all'];

  const filteredQRCodes = result
    ? filter === 'all'
      ? result.qrCodes
      : result.qrCodes.filter((q) => q.dataType === filter)
    : [];

  const isLoading = state === 'uploading' || state === 'processing';

  const hasSuspicious = result?.qrCodes.some((q) => q.suspiciousAnalysis?.isSuspicious) ?? false;

  return (
    <div className="space-y-8">
      {/* Hero section — shown when idle or error */}
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.section
            key="hero"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="text-center pt-4 pb-2 space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/25 rounded-full text-xs text-violet-300 dark:text-violet-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Automatic multi-QR detection
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-gray-900 dark:via-white to-cyan-300">
              Scan Multiple QR Codes
              <br className="hidden sm:block" /> from Any Image
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-base">
              Upload an image and instantly detect, decode, and visualize every QR code — with bounding boxes, data types, and a full results dashboard.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <button
                onClick={() => setLiveScannerOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500
                           text-white font-semibold rounded-xl transition-all duration-200 
                           shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-95"
              >
                <Video className="w-4 h-4" />
                Live Camera Scan
              </button>
              <button
                onClick={() => setBatchOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-500/15 hover:bg-violet-500/25
                           border border-violet-500/30 text-violet-300 font-semibold rounded-xl
                           transition-all duration-200 active:scale-95"
              >
                <Layers className="w-4 h-4" />
                Batch Scan
              </button>
              <span className="text-gray-500 text-sm">or upload below</span>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Upload zone */}
      <AnimatePresence mode="wait">
        {(state === 'idle' || state === 'error') && (
          <motion.section
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <DropZone onFileSelected={handleFileSelected} disabled={isLoading} />

            {state === 'error' && error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="font-semibold text-sm">Scan failed</p>
                  <p className="text-sm text-red-400/80 mt-0.5">{error}</p>
                </div>
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Loading state */}
        {isLoading && (
          <motion.section key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingOverlay
              progress={uploadProgress}
              stage={state === 'uploading' ? 'uploading' : 'processing'}
            />
          </motion.section>
        )}

        {/* Results */}
        {state === 'done' && result && (
          <motion.section
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Suspicious warning banner */}
            {hasSuspicious && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-300"
              >
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-400" />
                <div>
                  <p className="font-semibold text-sm">Suspicious QR codes detected</p>
                  <p className="text-sm text-orange-400/80 mt-0.5">
                    One or more QR codes in this image have been flagged as potentially malicious.
                    Review the details below before opening any URLs.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {result.totalFound === 0
                    ? 'No QR codes found'
                    : `Found ${result.totalFound} QR code${result.totalFound !== 1 ? 's' : ''}`}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{result.filename}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {result.totalFound > 0 && (
                  <>
                    <button onClick={handleDownload} className="btn-secondary flex items-center gap-2 text-sm">
                      <Download className="w-4 h-4" />
                      Image
                    </button>
                    <button
                      onClick={() => exportToCSV(result, result.filename)}
                      className="btn-secondary flex items-center gap-2 text-sm"
                      title="Export CSV"
                    >
                      <FileText className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={() => exportToExcel(result, result.filename)}
                      className="btn-secondary flex items-center gap-2 text-sm"
                      title="Export Excel"
                    >
                      <Sheet className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => exportToPDF(result, result.filename)}
                      className="btn-secondary flex items-center gap-2 text-sm"
                      title="Export PDF"
                    >
                      <FileDown className="w-4 h-4" />
                      PDF
                    </button>
                    <button
                      onClick={() => setEmailModalOpen(true)}
                      className="btn-secondary flex items-center gap-2 text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </button>
                  </>
                )}
                <button
                  onClick={() => setLiveScannerOpen(true)}
                  className="btn-secondary flex items-center gap-2 text-sm text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
                >
                  <Video className="w-4 h-4" />
                  Live
                </button>
                <button onClick={handleReset} className="btn-primary flex items-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4" />
                  Scan New
                </button>
              </div>
            </div>

            {/* Stats */}
            <StatsBar result={result} />

            {/* Enhancement info */}
            {result.enhancement && (
              <EnhancementBadge enhancement={result.enhancement} />
            )}

            {result.totalFound === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <ScanLine className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">No QR codes detected in this image</p>
                <p className="text-gray-600 text-sm mt-1">
                  Try an image with clearly visible, high-contrast QR codes
                </p>
                <button onClick={handleReset} className="btn-primary mt-6 text-sm">
                  Try Another Image
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {/* Annotated image panel */}
                <div className="space-y-4 xl:sticky xl:top-20">
                  <AnnotatedImage
                    base64Image={result.annotatedImageBase64}
                    qrCodes={result.qrCodes}
                    highlightedId={highlightedId}
                    onHighlight={setHighlightedId}
                  />
                </div>

                {/* QR codes list */}
                <div className="space-y-4">
                  {/* Filter tabs */}
                  {dataTypes.length > 2 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {dataTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilter(type)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            filter === type
                              ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40'
                              : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                          }`}
                        >
                          {type === 'all'
                            ? `All (${result.qrCodes.length})`
                            : `${type} (${result.qrCodes.filter((q) => q.dataType === type).length})`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* QR code cards */}
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredQRCodes.map((qr) => (
                        <QRCard
                          key={qr.id}
                          qr={qr}
                          index={result.qrCodes.indexOf(qr)}
                          isHighlighted={highlightedId === qr.id}
                          onHighlight={() =>
                            setHighlightedId(highlightedId === qr.id ? null : qr.id)
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {filteredQRCodes.length === 0 && (
                    <p className="text-center text-gray-600 py-8 text-sm">
                      No QR codes of type "{filter}"
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Email Modal */}
      {result && (
        <EmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          scanResult={result}
        />
      )}

      {/* Live Scanner Modal */}
      <LiveScanner
        isOpen={liveScannerOpen}
        onClose={() => setLiveScannerOpen(false)}
        onDetection={handleLiveDetection}
      />

      {/* Batch Upload Modal */}
      <BatchUpload
        isOpen={batchOpen}
        onClose={() => setBatchOpen(false)}
      />

      {/* Live Results Panel */}
      <AnimatePresence>
        {liveResults.length > 0 && !liveScannerOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed bottom-6 right-6 w-80 max-h-96 glass-card p-4 shadow-2xl z-40 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white dark:text-white">Live Scan Results</h3>
              </div>
              <button
                onClick={() => setLiveResults([])}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {liveResults.map((r, i) => (
                <motion.div
                  key={`${r.data}-${i}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md font-medium">
                      {r.dataType}
                    </span>
                    <span className="text-xs text-gray-600">
                      {r.time.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 dark:text-gray-300 font-mono break-all line-clamp-2">
                    {r.data}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
