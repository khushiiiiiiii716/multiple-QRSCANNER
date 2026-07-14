import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, X, Download } from 'lucide-react';
import { QRCodeResult } from '../types';

interface AnnotatedImageProps {
  base64Image: string;
  qrCodes: QRCodeResult[];
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
}

export const AnnotatedImage: React.FC<AnnotatedImageProps> = ({
  base64Image, qrCodes, highlightedId, onHighlight,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoomIn  = () => setZoom(z => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const reset   = () => setZoom(1);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = base64Image;
    a.download = `qr-annotated-${Date.now()}.png`;
    a.click();
  };

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          {/* macOS-style dots */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
            </div>
            <span className="text-xs font-medium ml-2" style={{ color: 'var(--text-muted)' }}>
              Annotated Preview · {qrCodes.length} QR{qrCodes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} disabled={zoom <= 0.5} className="btn-ghost p-1.5 text-xs disabled:opacity-30" title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span
              className="text-xs font-mono w-12 text-center font-semibold py-1 px-2 rounded-lg"
              style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn} disabled={zoom >= 3} className="btn-ghost p-1.5 disabled:opacity-30" title="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={reset} className="btn-ghost p-1.5" title="Reset">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 mx-1" style={{ background: 'var(--border-color)' }} />
            <button onClick={handleDownload} className="btn-ghost p-1.5" title="Download annotated image">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsFullscreen(true)} className="btn-ghost p-1.5" title="Fullscreen">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div
          className="overflow-auto scrollbar-thin bg-[#08101f]"
          style={{ maxHeight: 520, minHeight: 200 }}
        >
          <div className="flex items-start justify-center p-6 min-h-[200px]">
            <motion.div
              animate={{ scale: zoom }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ transformOrigin: 'top center' }}
            >
              <div className="relative inline-block rounded-xl overflow-hidden shadow-2xl">
                <img
                  src={base64Image}
                  alt="Annotated QR scan"
                  className="block max-w-full"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                {/* Clickable overlay regions */}
                {qrCodes.map(qr => (
                  <button
                    key={qr.id}
                    onClick={() => onHighlight(highlightedId === qr.id ? null : qr.id)}
                    className="absolute rounded transition-all duration-200 focus:outline-none"
                    style={{
                      left:    qr.boundingBox.x,
                      top:     qr.boundingBox.y,
                      width:   Math.max(qr.boundingBox.width,  20),
                      height:  Math.max(qr.boundingBox.height, 20),
                      background: qr.color + '20',
                      border:  `2px solid ${qr.color}${highlightedId === qr.id ? 'ff' : '00'}`,
                      opacity: highlightedId === qr.id ? 1 : 0,
                      boxShadow: highlightedId === qr.id ? `0 0 12px ${qr.color}60` : 'none',
                    }}
                    title={`QR ${qrCodes.indexOf(qr) + 1}: ${qr.data.substring(0, 40)}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Legend */}
        {qrCodes.length > 0 && (
          <div
            className="px-4 py-3 flex items-center gap-3 flex-wrap"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Click to highlight:
            </span>
            {qrCodes.map((qr, i) => (
              <button
                key={qr.id}
                onClick={() => onHighlight(highlightedId === qr.id ? null : qr.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: highlightedId === qr.id ? qr.color + '20' : 'var(--glass-bg)',
                  border: `1px solid ${highlightedId === qr.id ? qr.color + '60' : 'var(--border-color)'}`,
                  color: highlightedId === qr.id ? qr.color : 'var(--text-secondary)',
                  transform: highlightedId === qr.id ? 'scale(1.05)' : undefined,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: qr.color }} />
                QR {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            {/* Controls overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button
                onClick={e => { e.stopPropagation(); handleDownload(); }}
                className="btn-secondary text-xs px-3 py-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.92, opacity: 0 }}
              src={base64Image}
              alt="Annotated QR scan — fullscreen"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
