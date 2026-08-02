import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, X, SwitchCamera, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import jsQR from 'jsqr';

interface LiveScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetection: (data: string, dataType: string) => void;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'error';

interface DetectedQR { data: string; dataType: string; timestamp: number; }

function detectDataType(data: string): string {
  if (/^https?:\/\//i.test(data)) return 'URL';
  if (/^mailto:/i.test(data))     return 'Email';
  if (/^tel:/i.test(data))        return 'Phone';
  if (/^smsto?:/i.test(data))     return 'SMS';
  if (/^BEGIN:VCARD/i.test(data)) return 'vCard';
  if (/^BEGIN:VEVENT/i.test(data))return 'Calendar';
  if (/^WIFI:/i.test(data))       return 'WiFi';
  if (/^geo:/i.test(data))        return 'Geo';
  if (/^bitcoin:/i.test(data))    return 'Bitcoin';
  return 'Text';
}

export const LiveScanner: React.FC<LiveScannerProps> = ({ isOpen, onClose, onDetection }) => {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const animRef      = useRef<number | null>(null);
  const detectedRef  = useRef<DetectedQR[]>([]);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [error, setError]             = useState('');
  const [detectedQRs, setDetectedQRs] = useState<DetectedQR[]>([]);
  const [facingMode, setFacingMode]   = useState<'user' | 'environment'>('environment');
  const [hasMultiCam, setHasMultiCam] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanCount, setScanCount]     = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setCameraState('requesting');
    setError('');
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraState('active');

      // check for multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasMultiCam(devices.filter(d => d.kind === 'videoinput').length > 1);
    } catch (err) {
      setCameraState('error');
      const msg = err instanceof Error ? err.message : 'Camera error';
      setError(
        msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Camera permission denied. Please allow access in your browser settings.'
          : msg.includes('NotFound')
          ? 'No camera found on this device.'
          : msg
      );
    }
  }, [stopStream]);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || cameraState !== 'active') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });

    if (code) {
      const now = Date.now();
      const isDup = detectedRef.current.some(q => q.data === code.data && now - q.timestamp < 2000);
      if (!isDup) {
        const dt = detectDataType(code.data);
        const entry: DetectedQR = { data: code.data, dataType: dt, timestamp: now };
        detectedRef.current = [entry, ...detectedRef.current].slice(0, 20);
        setDetectedQRs(prev => [entry, ...prev].slice(0, 10));
        setScanCount(c => c + 1);
        onDetection(code.data, dt);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 900);

        // Draw bounding box on canvas
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#14b8a6';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(code.location.topLeftCorner.x,     code.location.topLeftCorner.y);
        ctx.lineTo(code.location.topRightCorner.x,    code.location.topRightCorner.y);
        ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
        ctx.lineTo(code.location.bottomLeftCorner.x,  code.location.bottomLeftCorner.y);
        ctx.closePath(); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    animRef.current = requestAnimationFrame(scanFrame);
  }, [cameraState, onDetection]);

  // Scanning loop
  useEffect(() => {
    if (cameraState === 'active') {
      animRef.current = requestAnimationFrame(scanFrame);
      return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }
  }, [cameraState, scanFrame]);

  // Open / close
  useEffect(() => {
    if (isOpen) {
      detectedRef.current = [];
      setDetectedQRs([]);
      setScanCount(0);
      startCamera(facingMode);
    } else {
      stopStream();
      setCameraState('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const switchCam = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-2xl glass-card pointer-events-auto overflow-hidden"
              style={{ boxShadow: '0 0 60px rgba(20,184,166,0.15), var(--shadow-lg)' }}
            >
              {/* Gradient bar */}
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #14b8a6, #3b82f6)' }} />

              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #3b82f6)' }}>
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Live QR Scanner</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {cameraState === 'active'
                        ? `${scanCount} code${scanCount !== 1 ? 's' : ''} detected — scanning continuously`
                        : cameraState === 'requesting'
                        ? 'Requesting camera access…'
                        : cameraState === 'error'
                        ? 'Camera unavailable'
                        : 'Point camera at any QR code'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasMultiCam && cameraState === 'active' && (
                    <button onClick={switchCam} className="btn-secondary p-2" title="Switch camera">
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={onClose} className="btn-ghost p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {cameraState === 'error' && (
                <div className="px-6 py-4 border-b border-white/10 bg-red-500/10 text-red-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 text-red-300" />
                  <div className="text-sm">
                    <p className="font-semibold">Camera error</p>
                    <p className="text-sm text-red-100/80">{error || 'Please enable camera access or try a different device.'}</p>
                  </div>
                </div>
              )}

              {/* Camera viewport */}
              <div className="relative bg-[#020a14] aspect-video overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                {/* Scanning overlay — corner guides + sweep line */}
                {cameraState === 'active' && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Vignette */}
                    <div className="absolute inset-0"
                      style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />

                    {/* Corner brackets */}
                    {[
                      'top-[20%] left-[20%] border-t-2 border-l-2 rounded-tl-lg',
                      'top-[20%] right-[20%] border-t-2 border-r-2 rounded-tr-lg',
                      'bottom-[20%] left-[20%] border-b-2 border-l-2 rounded-bl-lg',
                      'bottom-[20%] right-[20%] border-b-2 border-r-2 rounded-br-lg',
                    ].map((cls, i) => (
                      <span key={i} className={`absolute w-8 h-8 ${cls}`}
                        style={{ borderColor: '#14b8a6', opacity: 0.8 }} />
                    ))}

                    {/* Sweep line */}
                    <motion.div
                      className="absolute left-[20%] right-[20%] h-0.5 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #14b8a6, transparent)',
                        boxShadow: '0 0 10px #14b8a6',
                      }}
                      animate={{ top: ['22%', '78%', '22%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                )}

                {/* Success flash */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.4 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div
                        className="w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-sm"
                        style={{ background: 'rgba(20,184,166,0.2)', border: '3px solid #14b8a6' }}
                      >
                        <CheckCircle2 className="w-12 h-12" style={{ color: '#14b8a6' }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading */}
                {cameraState === 'requesting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-12 h-12 mx-auto animate-spin" style={{ color: '#14b8a6' }} />
                      <p className="text-white font-semibold">Starting camera…</p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Allow camera access when prompted</p>
                    </div>
                  </div>
                )}

                {/* Error */}
                {cameraState === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="text-center space-y-4 max-w-sm">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.4)' }}>
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">Camera Error</h3>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
                      </div>
                      <button onClick={() => startCamera(facingMode)} className="btn-primary text-sm">
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent detections */}
              <AnimatePresence>
                {detectedQRs.length > 0 && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden"
                    style={{ borderTop: '1px solid var(--border-color)' }}
                  >
                    <div className="px-5 py-3 max-h-28 overflow-y-auto scrollbar-thin">
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                        Recent Detections
                      </p>
                      <div className="space-y-1.5">
                        {detectedQRs.slice(0, 4).map((qr, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2.5 text-xs"
                          >
                            <span
                              className="px-2 py-0.5 rounded-md font-semibold flex-shrink-0"
                              style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}
                            >
                              {qr.dataType}
                            </span>
                            <span className="font-mono truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                              {qr.data.substring(0, 60)}{qr.data.length > 60 && '…'}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div
                className="px-6 py-3 text-center"
                style={{ borderTop: '1px solid var(--border-color)', background: 'var(--glass-bg)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {cameraState === 'active'
                    ? 'Hold camera steady · Detection is automatic and continuous'
                    : 'Camera required for live scanning'}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
