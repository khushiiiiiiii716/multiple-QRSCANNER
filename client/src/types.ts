export interface QRCorner {
  x: number;
  y: number;
}

export interface QRBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SuspiciousAnalysis {
  isSuspicious: boolean;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  riskScore: number;
}

export interface QualityScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: { contrast: number; moduleSize: number; decodability: number };
}

export interface QRCodeResult {
  id: string;
  data: string;
  dataType: string;
  boundingBox: QRBoundingBox;
  corners: {
    topLeft: QRCorner;
    topRight: QRCorner;
    bottomLeft: QRCorner;
    bottomRight: QRCorner;
  };
  color: string;
  suspiciousAnalysis?: SuspiciousAnalysis;
  qualityScore?: QualityScore;
}

export interface ImageStats {
  brightness: number;
  contrast: number;
  sharpness: number;
}

export interface EnhancementInfo {
  applied: string[];
  originalStats: ImageStats;
  enhancedStats: ImageStats;
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
  enhancement?: EnhancementInfo;
}

export interface ScanHistoryEntry {
  id: string;
  filename: string;
  fileSize: number;
  totalFound: number;
  processingTimeMs: number;
  timestamp: Date;
  result: ScanResponse;
}

export type ScanState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export type Theme = 'dark' | 'light';
