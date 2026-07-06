import axios, { AxiosProgressEvent } from 'axios';
import { ScanResponse } from './types';

const BASE_URL = '/api';

export async function scanImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post<ScanResponse>(`${BASE_URL}/scan`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return response.data;
}

export async function batchScanImages(
  files: File[]
): Promise<{
  success: boolean;
  totalFiles: number;
  successCount: number;
  errorCount: number;
  totalQRFound: number;
  totalProcessingTimeMs: number;
  results: Array<{
    filename: string;
    fileSize: number;
    status: 'success' | 'error';
    error?: string;
    totalFound?: number;
    qrCodes?: ScanResponse['qrCodes'];
    processingTimeMs?: number;
  }>;
}> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const response = await axios.post(`${BASE_URL}/batch`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

export async function sendResultsByEmail(
  recipientEmail: string,
  recipientName: string,
  scanResult: ScanResponse
): Promise<{ success: boolean; message: string; previewURL?: string }> {
  const response = await axios.post(`${BASE_URL}/email`, {
    recipientEmail,
    recipientName,
    scanResult,
  });
  return response.data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch {
    return false;
  }
}
