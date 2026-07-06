import React from 'react';
import { motion } from 'framer-motion';

interface LoadingOverlayProps {
  progress: number;
  stage: 'uploading' | 'processing';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, stage }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass-card p-10 text-center"
    >
      {/* Animated QR scanner visual */}
      <div className="relative w-28 h-28 mx-auto mb-8">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-violet-500/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner squares - QR pattern */}
        <div className="absolute inset-3 grid grid-cols-3 gap-1 opacity-40">
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              className="rounded-sm bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {/* Scan line */}
        <motion.div
          className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full"
          animate={{ top: ['20%', '80%', '20%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Status text */}
      <h3 className="text-lg font-semibold text-gray-200 mb-1">
        {stage === 'uploading' ? 'Uploading image…' : 'Analyzing & enhancing…'}
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        {stage === 'uploading'
          ? 'Transferring to server'
          : 'Optimizing brightness, contrast, sharpness & detecting QR codes'}
      </p>

      {/* Progress bar */}
      <div className="max-w-xs mx-auto">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>{stage === 'uploading' ? 'Upload' : 'Processing'}</span>
          <span>{stage === 'uploading' ? `${progress}%` : '…'}</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
            animate={
              stage === 'processing'
                ? { width: ['30%', '85%', '60%', '90%'] }
                : { width: `${progress}%` }
            }
            transition={
              stage === 'processing'
                ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }
          />
        </div>
      </div>

      {/* Technique labels */}
      {stage === 'processing' && (
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          {['Brightness', 'Contrast', 'Sharpness', 'Detection'].map((tech, i) => (
            <motion.span
              key={tech}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.4 }}
              className="text-xs px-2 py-1 bg-white/5 rounded-md text-gray-500"
            >
              {tech}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
};
