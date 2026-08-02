"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const qrScanner_1 = require("../services/qrScanner");
const imageEnhancer_1 = require("../services/imageEnhancer");
const suspiciousDetector_1 = require("../services/suspiciousDetector");
const qrQuality_1 = require("../services/qrQuality");
const router = (0, express_1.Router)();
exports.batchRouter = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB per file
        files: 20,
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type for ${file.originalname}`));
        }
    },
});
router.post('/', upload.array('images', 20), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No image files provided' });
            return;
        }
        const batchStartTime = Date.now();
        const results = [];
        // Process sequentially to avoid memory issues
        for (const file of files) {
            const fileStartTime = Date.now();
            try {
                const enhanceResult = await (0, imageEnhancer_1.enhanceImage)(file.buffer, {
                    autoBrightness: true,
                    autoContrast: true,
                    denoising: true,
                    sharpening: true,
                    autoRotate: true,
                });
                const result = await (0, qrScanner_1.scanQRCodes)(enhanceResult.enhancedBuffer, file.mimetype);
                // Enrich each QR code
                const enrichedQRCodes = await Promise.all(result.qrCodes.map(async (qr) => {
                    const suspiciousAnalysis = (0, suspiciousDetector_1.analyzeQRCode)(qr.data);
                    const qualityScore = await (0, qrQuality_1.calculateQRQuality)(enhanceResult.enhancedBuffer, qr.boundingBox);
                    return { ...qr, suspiciousAnalysis, qualityScore };
                }));
                results.push({
                    filename: file.originalname,
                    fileSize: file.size,
                    status: 'success',
                    totalFound: result.totalFound,
                    qrCodes: enrichedQRCodes,
                    processingTimeMs: Date.now() - fileStartTime,
                });
            }
            catch (fileError) {
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
    }
    catch (error) {
        console.error('Batch scan error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ error: message });
    }
});
