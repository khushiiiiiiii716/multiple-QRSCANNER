import { Router, Request, Response } from 'express';
import multer from 'multer';
import { scanQRCodes } from '../services/qrScanner';
import { enhanceImage } from '../services/imageEnhancer';
import { analyzeQRCode } from '../services/suspiciousDetector';
import { calculateQRQuality } from '../services/qrQuality';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and BMP are allowed.'));
    }
  },
});

router.post('/', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Check if enhancement is requested (default: true)
    const enableEnhancement = req.body.enhance !== 'false';

    let processedBuffer = req.file.buffer;
    let enhancementInfo = null;

    // Apply image enhancement if enabled
    if (enableEnhancement) {
      const enhanceResult = await enhanceImage(req.file.buffer, {
        autoBrightness: true,
        autoContrast: true,
        denoising: true,
        sharpening: true,
        autoRotate: true,
      });

      processedBuffer = enhanceResult.enhancedBuffer;
      enhancementInfo = {
        applied: enhanceResult.appliedEnhancements,
        originalStats: enhanceResult.originalStats,
        enhancedStats: enhanceResult.enhancedStats,
      };
    }

    const result = await scanQRCodes(processedBuffer, req.file.mimetype);

    // Enrich each QR code with suspicious analysis and quality score
    const enrichedQRCodes = await Promise.all(
      result.qrCodes.map(async (qr) => {
        const suspiciousAnalysis = analyzeQRCode(qr.data);
        const qualityScore = await calculateQRQuality(processedBuffer, qr.boundingBox);
        return { ...qr, suspiciousAnalysis, qualityScore };
      })
    );

    res.json({
      success: true,
      filename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ...result,
      qrCodes: enrichedQRCodes,
      enhancement: enhancementInfo,
    });
  } catch (error: unknown) {
    console.error('Scan error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: message });
  }
});

export { router as scanRouter };
