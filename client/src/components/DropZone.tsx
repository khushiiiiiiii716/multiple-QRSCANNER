import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
};

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelected, disabled }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
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
      ? 'File exceeds 20MB limit'
      : rejection.errors[0]?.code === 'file-invalid-type'
      ? 'Invalid file type. Use JPEG, PNG, WebP, GIF, or BMP'
      : rejection.errors[0]?.message
    : null;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
          isDragActive && !isDragReject && 'dropzone-active border-violet-500/80 bg-violet-500/10',
          isDragReject && 'border-red-500/80 bg-red-500/10',
          !isDragActive && !isDragReject && 'border-white/15 hover:border-violet-500/50 hover:bg-violet-500/5',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <input {...getInputProps()} />

        {/* Background grid */}
        <div className="absolute inset-0 opacity-5 rounded-2xl overflow-hidden pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0zm39 0h1v40h-1zM0 0v1h40V0zm0 39v1h40v-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <motion.div
          className="flex flex-col items-center gap-5"
          animate={isDragActive ? { scale: 1.02 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Icon cluster */}
          <div className="relative">
            <div className={clsx(
              'w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300',
              isDragActive && !isDragReject ? 'bg-violet-500/20' : 'bg-white/8'
            )}>
              {isDragActive ? (
                <Upload className="w-9 h-9 text-violet-400" />
              ) : (
                <ImageIcon className="w-9 h-9 text-gray-400" />
              )}
            </div>
            {/* QR corner decorations */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-violet-500/60 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-500/60 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-500/60 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-violet-500/60 rounded-br" />
          </div>

          <div className="space-y-2">
            {isDragActive && !isDragReject ? (
              <p className="text-lg font-semibold text-violet-300">Release to scan</p>
            ) : isDragReject ? (
              <p className="text-lg font-semibold text-red-400">File type not supported</p>
            ) : (
              <>
                <p className="text-lg font-semibold text-gray-200">
                  Drop your image here
                </p>
                <p className="text-sm text-gray-500">
                  or{' '}
                  <span className="text-violet-400 hover:text-violet-300 font-medium underline-offset-2 underline">
                    browse files
                  </span>
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-600">
            {['JPEG', 'PNG', 'WebP', 'GIF', 'BMP'].map((fmt) => (
              <span key={fmt} className="px-2 py-1 bg-white/5 rounded-md">{fmt}</span>
            ))}
            <span className="text-gray-700">·</span>
            <span>Max 20MB</span>
          </div>
        </motion.div>
      </div>

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </motion.div>
      )}
    </div>
  );
};
