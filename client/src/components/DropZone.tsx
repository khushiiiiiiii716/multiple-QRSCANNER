import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ImageIcon, AlertCircle, CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/gif':  ['.gif'],
  'image/webp': ['.webp'],
  'image/bmp':  ['.bmp'],
};

const FORMATS = ['JPEG', 'PNG', 'WebP', 'GIF', 'BMP'];

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelected, disabled }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setPreviewName(file.name);
      const url = URL.createObjectURL(file);
      setPreview(url);
      // Small delay so user sees the preview flash
      setTimeout(() => {
        onFileSelected(file);
        URL.revokeObjectURL(url);
      }, 300);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled,
  });

  const rejection = fileRejections[0];
  const errorMsg = rejection
    ? rejection.errors[0]?.code === 'file-too-large'
      ? 'File exceeds 20 MB limit'
      : rejection.errors[0]?.code === 'file-invalid-type'
      ? 'Invalid type — use JPEG, PNG, WebP, GIF, or BMP'
      : rejection.errors[0]?.message
    : null;

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setPreviewName('');
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={clsx(
          'dropzone-base relative rounded-2xl p-10 text-center cursor-pointer select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          isDragActive && !isDragReject && 'dropzone-active',
          isDragReject && 'dropzone-reject',
          disabled && 'opacity-40 pointer-events-none cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        {/* Animated corner markers */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
          <span
            key={pos}
            className={clsx(
              'absolute w-5 h-5 transition-all duration-300',
              pos.includes('top')    ? 'top-3'    : 'bottom-3',
              pos.includes('left')   ? 'left-3'   : 'right-3',
              pos.includes('top')    && pos.includes('left')   ? 'border-t-2 border-l-2 rounded-tl-md' : '',
              pos.includes('top')    && pos.includes('right')  ? 'border-t-2 border-r-2 rounded-tr-md' : '',
              pos.includes('bottom') && pos.includes('left')   ? 'border-b-2 border-l-2 rounded-bl-md' : '',
              pos.includes('bottom') && pos.includes('right')  ? 'border-b-2 border-r-2 rounded-br-md' : '',
              isDragActive && !isDragReject ? 'border-blue-400 opacity-100' : 'border-blue-400/40 opacity-60'
            )}
          />
        ))}

        <AnimatePresence mode="wait">
          {/* Preview state */}
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-2xl shadow-lg"
                  style={{ boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}
                />
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/30 backdrop-blur-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <button
                  onClick={clearPreview}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-md"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {previewName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Uploading…
                </p>
              </div>
            </motion.div>
          ) : isDragActive && !isDragReject ? (
            <motion.div
              key="drag"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.15)' }}
              >
                <Upload className="w-9 h-9 text-blue-400" />
              </motion.div>
              <p className="text-xl font-bold text-gradient">Release to scan</p>
            </motion.div>
          ) : isDragReject ? (
            <motion.div
              key="reject"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-red-500/10">
                <AlertCircle className="w-9 h-9 text-red-400" />
              </div>
              <p className="text-lg font-semibold text-red-400">File not supported</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Animated icon with orb */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-pulse-slow"
                  style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)' }} />
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(20,184,166,0.12))',
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}
                >
                  <ImageIcon className="w-9 h-9" style={{ color: 'var(--accent-blue)' }} />
                </motion.div>
              </div>

              <div className="space-y-2 text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Drop your image here
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  or{' '}
                  <span
                    className="font-semibold underline underline-offset-2 cursor-pointer transition-colors"
                    style={{ color: 'var(--accent-blue)' }}
                  >
                    browse files
                  </span>
                  {' '}to scan QR codes
                </p>
              </div>

              {/* Format chips */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {FORMATS.map((fmt) => (
                  <span
                    key={fmt}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(59,130,246,0.08)',
                      border: '1px solid rgba(59,130,246,0.15)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {fmt}
                  </span>
                ))}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· Max 20 MB</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
