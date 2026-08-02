"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceImage = enhanceImage;
exports.quickEnhance = quickEnhance;
const sharp_1 = __importDefault(require("sharp"));
/**
 * Estimate image brightness (0-255 scale)
 */
async function estimateBrightness(buffer) {
    const { data } = await (0, sharp_1.default)(buffer)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i];
    }
    return sum / data.length;
}
/**
 * Estimate image contrast using standard deviation
 */
async function estimateContrast(buffer) {
    const { data } = await (0, sharp_1.default)(buffer)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
    // Calculate mean
    let mean = 0;
    for (let i = 0; i < data.length; i++) {
        mean += data[i];
    }
    mean /= data.length;
    // Calculate standard deviation
    let variance = 0;
    for (let i = 0; i < data.length; i++) {
        variance += Math.pow(data[i] - mean, 2);
    }
    return Math.sqrt(variance / data.length);
}
/**
 * Estimate sharpness using Laplacian variance
 */
async function estimateSharpness(buffer) {
    try {
        // Get image dimensions first, then resize to at most 400px wide before applying Laplacian
        const metadata = await (0, sharp_1.default)(buffer).metadata();
        const resizeWidth = Math.min(metadata.width || 800, 400);
        const { data } = await (0, sharp_1.default)(buffer)
            .greyscale()
            .resize(resizeWidth, null, { fit: 'inside' })
            .convolve({
            width: 3,
            height: 3,
            kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0], // Laplacian kernel
        })
            .raw()
            .toBuffer({ resolveWithObject: true });
        // Calculate variance
        let mean = 0;
        for (let i = 0; i < data.length; i++) {
            mean += data[i];
        }
        mean /= data.length;
        let variance = 0;
        for (let i = 0; i < data.length; i++) {
            variance += Math.pow(data[i] - mean, 2);
        }
        return Math.sqrt(variance / data.length);
    }
    catch {
        return 50; // Default if estimation fails
    }
}
/**
 * Apply adaptive brightness correction
 */
async function enhanceBrightness(buffer, currentBrightness) {
    const targetBrightness = 140; // Target mid-range brightness
    const diff = targetBrightness - currentBrightness;
    if (Math.abs(diff) < 15)
        return buffer; // Already good
    // Apply brightness adjustment
    return await (0, sharp_1.default)(buffer)
        .modulate({
        brightness: 1 + (diff / 255),
    })
        .toBuffer();
}
/**
 * Apply adaptive contrast enhancement
 */
async function enhanceContrast(buffer, currentContrast) {
    // Target contrast range
    if (currentContrast > 40 && currentContrast < 80)
        return buffer; // Already good
    // Low contrast → apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    if (currentContrast < 40) {
        return await (0, sharp_1.default)(buffer)
            .normalise({ lower: 5, upper: 95 }) // Clip extremes, stretch histogram
            .toBuffer();
    }
    // High contrast → reduce slightly
    return await (0, sharp_1.default)(buffer)
        .linear(0.85, 20) // Reduce slope, add offset
        .toBuffer();
}
/**
 * Apply noise reduction (median filter approximation)
 */
async function denoise(buffer) {
    return await (0, sharp_1.default)(buffer)
        .median(3) // 3x3 median filter
        .toBuffer();
}
/**
 * Apply adaptive sharpening
 */
async function sharpen(buffer, currentSharpness) {
    if (currentSharpness > 30)
        return buffer; // Already sharp enough
    const strength = currentSharpness < 15 ? 2.5 : 1.5;
    return await (0, sharp_1.default)(buffer)
        .sharpen({ sigma: strength })
        .toBuffer();
}
/**
 * Comprehensive image enhancement pipeline for QR code detection
 */
async function enhanceImage(inputBuffer, options = {}) {
    const { autoBrightness = true, autoContrast = true, denoising = true, sharpening = true, autoRotate = true, } = options;
    const applied = [];
    let buffer = inputBuffer;
    // Step 0: Auto-rotate based on EXIF (if enabled)
    if (autoRotate) {
        buffer = await (0, sharp_1.default)(buffer).rotate().toBuffer();
        applied.push('Auto-rotation');
    }
    // Measure original stats
    const [origBrightness, origContrast, origSharpness] = await Promise.all([
        estimateBrightness(buffer),
        estimateContrast(buffer),
        estimateSharpness(buffer),
    ]);
    const originalStats = {
        brightness: Math.round(origBrightness),
        contrast: Math.round(origContrast),
        sharpness: Math.round(origSharpness),
    };
    // Step 1: Brightness correction
    if (autoBrightness) {
        const brightened = await enhanceBrightness(buffer, origBrightness);
        if (brightened !== buffer) {
            buffer = brightened;
            applied.push('Brightness adjustment');
        }
    }
    // Step 2: Contrast enhancement
    if (autoContrast) {
        const contrasted = await enhanceContrast(buffer, origContrast);
        if (contrasted !== buffer) {
            buffer = contrasted;
            applied.push('Contrast enhancement');
        }
    }
    // Step 3: Noise reduction
    if (denoising && origSharpness < 25) {
        // Only denoise if image is blurry (likely has noise)
        buffer = await denoise(buffer);
        applied.push('Noise reduction');
    }
    // Step 4: Sharpening
    if (sharpening) {
        const sharpened = await sharpen(buffer, origSharpness);
        if (sharpened !== buffer) {
            buffer = sharpened;
            applied.push('Sharpening');
        }
    }
    // Measure enhanced stats
    const [enhBrightness, enhContrast, enhSharpness] = await Promise.all([
        estimateBrightness(buffer),
        estimateContrast(buffer),
        estimateSharpness(buffer),
    ]);
    const enhancedStats = {
        brightness: Math.round(enhBrightness),
        contrast: Math.round(enhContrast),
        sharpness: Math.round(enhSharpness),
    };
    // If no enhancements were applied, note that
    if (applied.length === 0) {
        applied.push('No enhancement needed (image quality is good)');
    }
    return {
        enhancedBuffer: buffer,
        appliedEnhancements: applied,
        originalStats,
        enhancedStats,
    };
}
/**
 * Quick enhancement for real-time preview (lighter processing)
 */
async function quickEnhance(inputBuffer) {
    return await (0, sharp_1.default)(inputBuffer)
        .rotate() // EXIF rotation
        .normalise() // Quick contrast
        .sharpen() // Moderate sharpen
        .toBuffer();
}
