/**
 * QR Code quality scorer
 * Uses bounding-box dimensions and contrast estimate from the image buffer.
 */
import sharp from 'sharp';

export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface QualityDetails {
  contrast: number;     // 0-100
  moduleSize: number;   // 0-100 (derived from bounding-box dimensions)
  decodability: number; // always 100 – the code was successfully decoded
}

export interface QualityScore {
  score: number;        // 0-100
  grade: QualityGrade;
  details: QualityDetails;
}

/**
 * Estimate the contrast of a cropped region (0-100).
 * Uses the standard-deviation of the greyscale pixel values.
 */
async function cropContrast(
  imageBuffer: Buffer,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<number> {
  try {
    // Clamp to at least 4×4 to avoid sharp errors
    const w = Math.max(4, width);
    const h = Math.max(4, height);

    const { data } = await sharp(imageBuffer)
      .extract({ left: Math.max(0, x), top: Math.max(0, y), width: w, height: h })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (data.length === 0) return 50;

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const mean = sum / data.length;

    let variance = 0;
    for (let i = 0; i < data.length; i++) {
      variance += (data[i] - mean) ** 2;
    }
    const stdDev = Math.sqrt(variance / data.length);

    // stdDev for a perfect B&W QR is ≈ 127, map that to 100
    return Math.min(100, Math.round((stdDev / 127) * 100));
  } catch {
    return 50;
  }
}

/**
 * Score based on the bounding-box size.
 * Too small QR codes are hard to decode reliably.
 */
function moduleSizeScore(width: number, height: number): number {
  const minDim = Math.min(width, height);

  if (minDim >= 200) return 100;
  if (minDim >= 100) return 85;
  if (minDim >= 60)  return 65;
  if (minDim >= 30)  return 40;
  if (minDim >= 15)  return 20;
  return 10;
}

function gradeFromScore(score: number): QualityGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Calculate quality score for one QR code detected in an image.
 *
 * @param imageBuffer - The full (possibly enhanced) image buffer
 * @param boundingBox - The bounding box of the QR code within the image
 */
export async function calculateQRQuality(
  imageBuffer: Buffer,
  boundingBox: { x: number; y: number; width: number; height: number }
): Promise<QualityScore> {
  const { x, y, width, height } = boundingBox;

  const contrast     = await cropContrast(imageBuffer, x, y, width, height);
  const moduleSize   = moduleSizeScore(width, height);
  const decodability = 100; // If we got here the code was decoded successfully

  // Weighted average: contrast 40 %, moduleSize 40 %, decodability 20 %
  const score = Math.round(contrast * 0.40 + moduleSize * 0.40 + decodability * 0.20);

  return {
    score,
    grade: gradeFromScore(score),
    details: { contrast, moduleSize, decodability },
  };
}
