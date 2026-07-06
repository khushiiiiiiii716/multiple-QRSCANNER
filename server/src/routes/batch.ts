import { Router, Request, Response } from 'express';
import multer from 'multer';
import { scanQRCodes } from '../services/qrScanner';
import { enhanceImage } from '../services/imageEnhancer';
import { analyzeQRCode } from '../services/suspiciousDetector';
import { calculateQRQuality } from '../services/qrQuality';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.originalname}`));
    }
  },
});

router.post('/', upload.array('images', 20), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No image files provided' });
      return;
    }

    const batchStartTime = Date.now();
    const results: Array<{
      filename: string;
      fileSize: number;
      status: 'success' | 'error';
      error?: string;
      totalFound?: number;
      qrCodes?: unknown[];
      processingTimeMs?: number;
    }> = [];

    // Process sequentially to avoid memory issues
    for (const file of files) {
      const fileStartTime = Date.now();
      try {
        const enhanceResult = await enhanceImage(file.buffer, {
          autoBrightness: true,
          autoContrast: true,
          denoising: true,
          sharpening: true,
          autoRotate: true,
        });

        const result = await scanQRCodes(enhanceResult.enhancedBuffer, file.mimetype);

        // Enrich each QR code
        const enrichedQRCodes = await Promise.all(
          result.qrCodes.map(async (qr) => {
            const suspiciousAnalysis = analyzeQRCode(qr.data);
            const qualityScore = await calculateQRQuality(enhanceResult.enhancedBuffer, qr.boundingBox);
            return { ...qr, suspiciousAnalysis, qualityScore };
          })
        );

        results.push({
          filename: file.originalname,
          fileSize: file.size,
          status: 'success',
          totalFound: result.totalFound,
          qrCodes: enrichedQRCodes,
          processingTimeMs: Date.now() - fileStartTime,
        });
      } catch (fileError) {
        // Don't fail the whole batch on individual file errors
        const message = fileError instanceof Error ? fileError.message : 'Unknown error';
        console.error(`[batch] Error processing ${file.originalname}:`, message);
        results.push({
          filename: file.originalname,
          fileSize: file.size,
          status: 'error',
          error: message,
          processingTimeMs: Date.now() - fileStartTime,
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const totalQRFound = results.reduce((acc, r) => acc + (r.totalFound ?? 0), 0);

    res.json({
      success: true,
      totalFiles: files.length,
      successCount,
      errorCount: files.length - successCount,
      totalQRFound,
      totalProcessingTimeMs: Date.now() - batchStartTime,
      results,
    });
  } catch (error: unknown) {
    console.error('Batch scan error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

export { router as batchRouter };
