import React from 'react';
import { BarChart2, Clock, FileImage, Layers } from 'lucide-react';
import { ScanResponse } from '../types';

interface StatsBarProps {
  result: ScanResponse;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const StatsBar: React.FC<StatsBarProps> = ({ result }) => {
  const stats = [
    {
      icon: Layers,
      label: 'QR Codes Found',
      value: result.totalFound.toString(),
      highlight: true,
    },
    {
      icon: Clock,
      label: 'Processing Time',
      value: `${result.processingTimeMs}ms`,
    },
    {
      icon: FileImage,
      label: 'Image Size',
      value: formatBytes(result.fileSize),
    },
    {
      icon: BarChart2,
      label: 'Dimensions',
      value: `${result.originalWidth}×${result.originalHeight}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value, highlight }) => (
        <div
          key={label}
          className={`glass-card px-4 py-3 ${
            highlight
              ? 'bg-gradient-to-br from-violet-500/15 to-cyan-500/15 border-violet-500/30'
              : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-violet-400' : 'text-gray-500'}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
          <p className={`text-lg font-bold ${highlight ? 'text-violet-300' : 'text-gray-200'}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
};
