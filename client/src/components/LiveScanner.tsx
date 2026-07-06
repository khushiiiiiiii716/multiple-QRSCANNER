import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, SwitchCamera, AlertCircle, CheckCircle2, Loader2, Video, VideoOff } from 'lucide-react';
import jsQR from 'jsqr';
import { QRCodeResult } from '../types';

interface LiveScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetection: (qrData: string, dataType: string) => void;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'error';

interface DetectedQR {
  data: string;
  dataType: string;
  timestamp: number;
  location: { x: number; y: number; width: number; height: number };
}

function detectDataType(data: string): string {
  if (/^https?:\/\//i.test(data)) return 'URL';
  if (/^mailto:/i.test(data)) return 'Email';
  if (/^tel:/i.test(data)) return 'Phone';
  if (/^smsto?:/i.test(data)) return 'SMS';
  if (/^BEGIN:VCARD/i.test(data)) return 'vCard';
  if (/^BEGIN:VEVENT/i.test(data)) return 'Calendar';
  if (/^WIFI:/i.test(data)) return 'WiFi';
  if (/^geo:/i.test(data)) return 'Geo Location';
  if (/^bitcoin:/i.test(data)) return 'Bitcoin';
  return 'Text';
}

export const LiveScanner: React.FC<LiveScannerProps> = ({ isOpen, onClose, onDetection }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [error, setError] = useState<string>('');
  const [detectedQRs, setDetectedQRs] = useState<DetectedQR[]>([]);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  // Get available cameras
  const getDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (err) {
      console.warn('Could not enumerate devices:', err);
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async (facingMode: 'user' | 'environment') => {
    setCameraState('requesting');
    setError('');

    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraState('active');
      await getDevices();
    } catch (err: unknown) {
      setCameraState('error');
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (message.includes('NotFoundError')) {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError(message);
      }
    }
  }, [getDevices]);

  // Switch camera
  const switchCamera = useCallback(() => {
    const newFacing = currentCamera === 'user' ? 'environment' : 'user';
    setCurrentCamera(newFacing);
    startCamera(newFacing);
  }, [currentCamera, startCamera]);

  // Scan frame for QR codes
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || cameraState !== 'active') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Scan for QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code) {
      const now = Date.now();
      const dataType = detectDataType(code.data);

      // Check if this QR was recently detected (debounce)
      const isDuplicate = detectedQRs.some(
        qr => qr.data === code.data && now - qr.timestamp < 2000
      );

      if (!isDuplicate) {
        const location = {
          x: code.location.topLeftCorner.x,
          y: code.location.topLeftCorner.y,
          width: code.location.topRightCorner.x - code.location.topLeftCorner.x,
          height: code.location.bottomLeftCorner.y - code.location.topLeftCorner.y,
        };

        setDetectedQRs(prev => [...prev, { data: code.data, dataType, timestamp: now, location }]);
        setScanCount(prev => prev + 1);
        onDetection(code.data, dataType);

        // Show success animation
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1000);

        // Draw bounding box
        ctx.strokeStyle = '#4ECDC4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
        ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
        ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
        ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
        ctx.closePath();
        ctx.stroke();

        // Draw corner dots
        const corners = [
          code.location.topLeftCorner,
          code.location.topRightCorner,
          code.location.bottomLeftCorner,
          code.location.bottomRightCorner,
        ];
        ctx.fillStyle = '#4ECDC4';
        corners.forEach(corner => {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Continue scanning
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [cameraState, detectedQRs, onDetection]);

  // Start/stop scanning loop
  useEffect(() => {
    if (isOpen && cameraState === 'active') {
      animationRef.current = requestAnimationFrame(scanFrame);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [isOpen, cameraState, scanFrame]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera(currentCamera);
    } else {
      // Cleanup when modal closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setCameraState('idle');
      setDetectedQRs([]);
      setScanCount(0);
    }
  }, [isOpen, startCamera, currentCamera]);

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-2xl bg-gray-900 border border-white/15 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-sm">Live QR Scanner</h2>
                    <p className="text-gray-500 text-xs">
                      {cameraState === 'active' ? `${scanCount} code${scanCount !== 1 ? 's' : ''} detected` : 'Point camera at QR code'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {devices.length > 1 && cameraState === 'active' && (
                    <button
                      onClick={switchCamera}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Switch camera"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Camera view */}
              <div className="relative bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                {/* Scanning overlay */}
                {cameraState === 'active' && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner guides */}
                    <div className="absolute top-1/4 left-1/4 w-16 h-16 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg opacity-50" />
                    <div className="absolute top-1/4 right-1/4 w-16 h-16 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg opacity-50" />
                    <div className="absolute bottom-1/4 left-1/4 w-16 h-16 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg opacity-50" />
                    <div className="absolute bottom-1/4 right-1/4 w-16 h-16 border-b-4 border-r-4 border-cyan-400 rounded-br-lg opacity-50" />

                    {/* Scan line animation */}
                    <motion.div
                      className="absolute left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                      animate={{ top: ['25%', '75%', '25%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                )}

                {/* Success animation */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-24 h-24 rounded-full bg-green-500/20 backdrop-blur-sm border-4 border-green-400 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-green-400" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading state */}
                {cameraState === 'requesting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-cyan-400 mx-auto animate-spin mb-3" />
                      <p className="text-white text-sm font-medium">Starting camera...</p>
                      <p className="text-gray-400 text-xs mt-1">Please allow camera access</p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {cameraState === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-white font-semibold mb-2">Camera Access Error</h3>
                      <p className="text-gray-400 text-sm mb-4">{error}</p>
                      <button
                        onClick={() => startCamera(currentCamera)}
                        className="btn-primary text-sm"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent detections */}
              {detectedQRs.length > 0 && (
                <div className="px-6 py-4 border-t border-white/10 bg-white/5 max-h-32 overflow-y-auto scrollbar-thin">
                  <p className="text-xs font-medium text-gray-400 mb-2">Recent Detections:</p>
                  <div className="space-y-1">
                    {detectedQRs.slice(-3).reverse().map((qr, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md font-medium">
                          {qr.dataType}
                        </span>
                        <span className="text-gray-400 font-mono truncate flex-1">
                          {qr.data.substring(0, 50)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="px-6 py-3 border-t border-white/8 bg-black/20">
                <p className="text-xs text-gray-500 text-center">
                  {cameraState === 'active' 
                    ? 'Position a QR code in the frame. Detection is automatic.'
                    : 'Click "Try Again" to enable camera access.'}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
