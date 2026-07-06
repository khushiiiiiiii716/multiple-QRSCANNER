import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { QRCodeResult } from '../types';

interface AnnotatedImageProps {
  base64Image: string;
  qrCodes: QRCodeResult[];
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
}

export const AnnotatedImage: React.FC<AnnotatedImageProps> = ({
  base64Image,
  qrCodes,
  highlightedId,
  onHighlight,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const reset = () => setZoom(1);

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-gray-500 font-medium">Annotated Preview</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors text-gray-400 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 w-10 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= 3}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors text-gray-400 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={reset}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white ml-1"
              title="Reset zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white ml-1"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="overflow-auto bg-black/30 scrollbar-thin" style={{ maxHeight: '520px' }}>
          <div className="flex items-start justify-center p-4 min-h-[200px]">
            <motion.div
              animate={{ scale: zoom }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ transformOrigin: 'top center' }}
            >
              <div className="relative inline-block">
                <img
                  src={base64Image}
                  alt="Annotated QR scan result"
                  className="block max-w-full rounded-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                {/* Clickable overlay regions */}
                {qrCodes.map((qr) => (
                  <button
                    key={qr.id}
                    onClick={() => onHighlight(highlightedId === qr.id ? null : qr.id)}
                    className="absolute transition-all duration-200 rounded cursor-pointer focus:outline-none"
                    style={{
                      left: `${(qr.boundingBox.x / 100)}%`,
                      top: `${(qr.boundingBox.y / 100)}%`,
                      width: `${Math.max(qr.boundingBox.width, 20)}px`,
                      height: `${Math.max(qr.boundingBox.height, 20)}px`,
                      opacity: highlightedId === qr.id ? 0.15 : 0,
                      background: qr.color,
                    }}
                    title={`QR ${qrCodes.indexOf(qr) + 1}: ${qr.data.substring(0, 40)}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer legend */}
        {qrCodes.length > 0 && (
          <div className="px-4 py-3 border-t border-white/8 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-600">Click to highlight:</span>
            {qrCodes.map((qr, i) => (
              <button
                key={qr.id}
                onClick={() => onHighlight(highlightedId === qr.id ? null : qr.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  highlightedId === qr.id ? 'bg-white/15 scale-105' : 'hover:bg-white/8'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: qr.color }}
                />
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
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={base64Image}
              alt="Annotated QR scan result - fullscreen"
              className="max-w-full max-h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm bg-white/10 px-3 py-1.5 rounded-lg"
              onClick={() => setIsFullscreen(false)}
            >
              Close ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
