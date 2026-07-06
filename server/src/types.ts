import { SuspiciousAnalysis } from './services/suspiciousDetector';
import { QualityScore } from './services/qrQuality';

export interface QRCodeResult {
  id: string;
  data: string;
  dataType: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  corners: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
  color: string;
  suspiciousAnalysis?: SuspiciousAnalysis;
  qualityScore?: QualityScore;
}

export interface ScanResponse {
  success: boolean;
  filename: string;
  fileSize: number;
  mimeType: string;
  qrCodes: QRCodeResult[];
  totalFound: number;
  annotatedImageBase64: string;
  originalWidth: number;
  originalHeight: number;
  processingTimeMs: number;
}

export { SuspiciousAnalysis, QualityScore };
