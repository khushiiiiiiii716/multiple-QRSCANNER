import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { EnhancementInfo } from '../types';

interface EnhancementBadgeProps {
  enhancement: EnhancementInfo;
}

export const EnhancementBadge: React.FC<EnhancementBadgeProps> = ({ enhancement }) => {
  const [expanded, setExpanded] = useState(false);

  const getDelta = (before: number, after: number) => {
    const diff = after - before;
    if (Math.abs(diff) < 3) return { icon: Minus, color: 'text-gray-500', text: '±0' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-green-400', text: `+${diff}` };
    return { icon: TrendingDown, color: 'text-red-400', text: `${diff}` };
  };

  const brightnessDelta = getDelta(enhancement.originalStats.brightness, enhancement.enhancedStats.brightness);
  const contrastDelta = getDelta(enhancement.originalStats.contrast, enhancement.enhancedStats.contrast);
  const sharpnessDelta = getDelta(enhancement.originalStats.sharpness, enhancement.enhancedStats.sharpness);

  const hasEnhancements = enhancement.applied.length > 0 && 
    !enhancement.applied[0].includes('No enhancement needed');

  if (!hasEnhancements) {
    return (
      <div className="glass-card px-3 py-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3 h-3 text-green-400" />
        </div>
        <span className="text-xs text-gray-400">Image quality is already optimal</span>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3 h-3 text-violet-300" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-violet-300">Image Enhanced</p>
            <p className="text-xs text-gray-500">
              {enhancement.applied.length} optimization{enhancement.applied.length !== 1 ? 's' : ''} applied
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/8">
              {/* Applied enhancements list */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1.5">Applied Enhancements:</p>
                <div className="flex flex-wrap gap-1.5">
                  {enhancement.applied.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 text-violet-300 rounded-md text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats comparison */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1.5">Quality Metrics:</p>
                <div className="space-y-1.5">
                  {/* Brightness */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Brightness</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-mono">{enhancement.originalStats.brightness}</span>
                      <span className="text-gray-700">→</span>
                      <span className="text-white font-mono font-medium">{enhancement.enhancedStats.brightness}</span>
                      <div className={`flex items-center gap-0.5 ${brightnessDelta.color} ml-1`}>
                        <brightnessDelta.icon className="w-3 h-3" />
                        <span className="font-mono text-xs">{brightnessDelta.text}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contrast */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Contrast</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-mono">{enhancement.originalStats.contrast}</span>
                      <span className="text-gray-700">→</span>
                      <span className="text-white font-mono font-medium">{enhancement.enhancedStats.contrast}</span>
                      <div className={`flex items-center gap-0.5 ${contrastDelta.color} ml-1`}>
                        <contrastDelta.icon className="w-3 h-3" />
                        <span className="font-mono text-xs">{contrastDelta.text}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sharpness */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Sharpness</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-mono">{enhancement.originalStats.sharpness}</span>
                      <span className="text-gray-700">→</span>
                      <span className="text-white font-mono font-medium">{enhancement.enhancedStats.sharpness}</span>
                      <div className={`flex items-center gap-0.5 ${sharpnessDelta.color} ml-1`}>
                        <sharpnessDelta.icon className="w-3 h-3" />
                        <span className="font-mono text-xs">{sharpnessDelta.text}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
