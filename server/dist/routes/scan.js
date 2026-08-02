"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const qrScanner_1 = require("../services/qrScanner");
const imageEnhancer_1 = require("../services/imageEnhancer");
const suspiciousDetector_1 = require("../services/suspiciousDetector");
const qrQuality_1 = require("../services/qrQuality");
const router = (0, express_1.Router)();
exports.scanRouter = router;
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and BMP are allowed.'));
        }
    },
});
router.post('/', upload.single('image'), async (req, res) => {
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
            const enhanceResult = await (0, imageEnhancer_1.enhanceImage)(req.file.buffer, {
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
        const result = await (0, qrScanner_1.scanQRCodes)(processedBuffer, req.file.mimetype);
        // Enrich each QR code with suspicious analysis and quality score
        const enrichedQRCodes = await Promise.all(result.qrCodes.map(async (qr) => {
            const suspiciousAnalysis = (0, suspiciousDetector_1.analyzeQRCode)(qr.data);
            const qualityScore = await (0, qrQuality_1.calculateQRQuality)(processedBuffer, qr.boundingBox);
            return { ...qr, suspiciousAnalysis, qualityScore };
        }));
        res.json({
            success: true,
            filename: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            ...result,
            qrCodes: enrichedQRCodes,
            enhancement: enhancementInfo,
        });
    }
    catch (error) {
        console.error('Scan error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ error: message });
    }
});
