import sharp from 'sharp';
import jsQR, { QRCode } from 'jsqr';
import { v4 as uuidv4 } from 'uuid';

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
}

export interface ScanResult {
  qrCodes: QRCodeResult[];
  totalFound: number;
  annotatedImageBase64: string;
  originalWidth: number;
  originalHeight: number;
  processingTimeMs: number;
}

const QR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#82E0AA', '#F0B27A',
];

// ─── Data type detection ─────────────────────────────────────────────────────
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
  if (/^\d+$/.test(data)) return 'Numeric';
  if (/^[A-Z0-9 $%*+\-./:]+$/.test(data)) return 'Alphanumeric';
  return 'Text';
}

// ─── SAFE rgba extractor ─────────────────────────────────────────────────────
// Routes any sharp pipeline through PNG first so we always get a proper
// colour image, then ensureAlpha → guaranteed width*height*4 bytes.
async function toRGBA(
  input: Buffer | sharp.Sharp
): Promise<{ px: Uint8ClampedArray; w: number; h: number }> {
  // Convert to PNG to normalise channels (handles greyscale, CMYK, etc.)
  const pngBuf = await (
    Buffer.isBuffer(input) ? sharp(input) : (input as sharp.Sharp)
  ).png().toBuffer();

  const { data, info } = await sharp(pngBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (data.length !== info.width * info.height * 4) {
    throw new Error(
      `RGBA mismatch: ${data.length} vs ${info.width * info.height * 4}`
    );
  }
  return {
    px: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    w: info.width,
    h: info.height,
  };
}

function tryDecode(px: Uint8ClampedArray, w: number, h: number): QRCode | null {
  try {
    return jsQR(px, w, h, { inversionAttempts: 'attemptBoth' });
  } catch {
    return null;
  }
}

// ─── Geometry ────────────────────────────────────────────────────────────────
type Corners = QRCodeResult['corners'];

function makeCorners(code: QRCode, sx: number, sy: number): Corners {
  return {
    topLeft:     { x: Math.round(code.location.topLeftCorner.x * sx),     y: Math.round(code.location.topLeftCorner.y * sy) },
    topRight:    { x: Math.round(code.location.topRightCorner.x * sx),    y: Math.round(code.location.topRightCorner.y * sy) },
    bottomLeft:  { x: Math.round(code.location.bottomLeftCorner.x * sx),  y: Math.round(code.location.bottomLeftCorner.y * sy) },
    bottomRight: { x: Math.round(code.location.bottomRightCorner.x * sx), y: Math.round(code.location.bottomRightCorner.y * sy) },
  };
}

function shiftCorners(code: QRCode, ox: number, oy: number): Corners {
  return {
    topLeft:     { x: Math.round(code.location.topLeftCorner.x + ox),     y: Math.round(code.location.topLeftCorner.y + oy) },
    topRight:    { x: Math.round(code.location.topRightCorner.x + ox),    y: Math.round(code.location.topRightCorner.y + oy) },
    bottomLeft:  { x: Math.round(code.location.bottomLeftCorner.x + ox),  y: Math.round(code.location.bottomLeftCorner.y + oy) },
    bottomRight: { x: Math.round(code.location.bottomRightCorner.x + ox), y: Math.round(code.location.bottomRightCorner.y + oy) },
  };
}

function toBox(c: Corners): QRCodeResult['boundingBox'] {
  const xs = [c.topLeft.x, c.topRight.x, c.bottomLeft.x, c.bottomRight.x];
  const ys = [c.topLeft.y, c.topRight.y, c.bottomLeft.y, c.bottomRight.y];
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function isDuplicate(list: QRCodeResult[], data: string, corners: Corners): boolean {
  const b = toBox(corners);
  return list.some((e) => {
    if (e.data !== data) return false;
    const eb = e.boundingBox;
    const ox = Math.max(0, Math.min(eb.x + eb.width,  b.x + b.width)  - Math.max(eb.x, b.x));
    const oy = Math.max(0, Math.min(eb.y + eb.height, b.y + b.height) - Math.max(eb.y, b.y));
    const area = Math.min(eb.width * eb.height, b.width * b.height);
    return area > 0 && (ox * oy) / area > 0.4;
  });
}

// ─── Annotation ──────────────────────────────────────────────────────────────
function hexRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

async function annotate(
  srcPng: Buffer,
  codes: QRCodeResult[],
  w: number,
  h: number
): Promise<string> {
  const sw  = Math.max(2, Math.round(w / 300));
  const dot = Math.max(4, Math.round(w / 150));
  const fs  = Math.max(11, Math.round(w / 70));

  let shapes = '';
  for (let i = 0; i < codes.length; i++) {
    const { corners: c, color, boundingBox: box } = codes[i];
    const pts = `${c.topLeft.x},${c.topLeft.y} ${c.topRight.x},${c.topRight.y} ${c.bottomRight.x},${c.bottomRight.y} ${c.bottomLeft.x},${c.bottomLeft.y}`;

    shapes += `<polygon points="${pts}" fill="${hexRgba(color, 0.2)}" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    for (const pt of [c.topLeft, c.topRight, c.bottomLeft, c.bottomRight]) {
      shapes += `<circle cx="${pt.x}" cy="${pt.y}" r="${dot}" fill="${color}"/>`;
    }
    const lbl = `QR ${i + 1}`;
    const bx  = box.x;
    const by  = Math.max(fs + 6, box.y);
    const bw  = lbl.length * (fs * 0.65) + 14;
    const bh  = fs + 8;
    shapes += `<rect x="${bx}" y="${by - bh}" width="${bw}" height="${bh}" rx="4" fill="${color}"/>`;
    shapes += `<text x="${bx + 6}" y="${by - 5}" font-family="Arial,sans-serif" font-size="${fs}" font-weight="bold" fill="white">${lbl}</text>`;
  }

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${shapes}</svg>`
  );

  const out = await sharp(srcPng)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png({ compressionLevel: 6 })
    .toBuffer();

  return `data:image/png;base64,${out.toString('base64')}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function scanQRCodes(
  imageBuffer: Buffer,
  _mimeType: string
): Promise<ScanResult> {
  const t0 = Date.now();

  // Normalise to PNG once — fixes EXIF rotation & enforces known format
  const srcPng = await sharp(imageBuffer).rotate().png().toBuffer();

  const meta = await sharp(srcPng).metadata();
  const OW = meta.width  ?? 800;
  const OH = meta.height ?? 600;

  const found: QRCodeResult[] = [];
  let ci = 0;

  function push(data: string, corners: Corners) {
    if (isDuplicate(found, data, corners)) return;
    found.push({
      id: uuidv4(),
      data,
      dataType: detectDataType(data),
      boundingBox: toBox(corners),
      corners,
      color: QR_COLORS[ci++ % QR_COLORS.length],
    });
  }

  // ── 1. Full resolution ────────────────────────────────────────────────────
  try {
    const { px, w, h } = await toRGBA(srcPng);
    const code = tryDecode(px, w, h);
    if (code) push(code.data, makeCorners(code, 1, 1));
  } catch (e) { console.warn('[scan] full-res failed:', (e as Error).message); }

  // ── 2. Multi-scale ────────────────────────────────────────────────────────
  for (const scale of [0.5, 0.75, 1.25, 1.5, 2.0]) {
    try {
      const tw = Math.max(10, Math.round(OW * scale));
      const th = Math.max(10, Math.round(OH * scale));
      const { px, w, h } = await toRGBA(sharp(srcPng).resize(tw, th, { fit: 'fill' }));
      const code = tryDecode(px, w, h);
      if (code) push(code.data, makeCorners(code, OW / w, OH / h));
    } catch { /* skip */ }
  }

  // ── 3. Tiling ─────────────────────────────────────────────────────────────
  try {
    const tileSize = Math.min(800, Math.max(OW, OH));
    const overlap  = Math.round(tileSize * 0.2);
    const step     = tileSize - overlap;

    for (let ty = 0; ty < OH; ty += step) {
      for (let tx = 0; tx < OW; tx += step) {
        const tw = Math.min(tileSize, OW - tx);
        const th = Math.min(tileSize, OH - ty);
        if (tw < 50 || th < 50) continue;
        try {
          const { px, w, h } = await toRGBA(
            sharp(srcPng).extract({ left: tx, top: ty, width: tw, height: th })
          );
          const code = tryDecode(px, w, h);
          if (code) push(code.data, shiftCorners(code, tx, ty));
        } catch { /* skip tile */ }
      }
    }
  } catch (e) { console.warn('[scan] tiling failed:', (e as Error).message); }

  // ── 4. Greyscale + normalise + sharpen ────────────────────────────────────
  try {
    const { px, w, h } = await toRGBA(sharp(srcPng).greyscale().normalise().sharpen());
    const code = tryDecode(px, w, h);
    if (code) push(code.data, makeCorners(code, 1, 1));
  } catch (e) { console.warn('[scan] greyscale failed:', (e as Error).message); }

  // ── 5. Threshold binarise ─────────────────────────────────────────────────
  try {
    const { px, w, h } = await toRGBA(sharp(srcPng).greyscale().threshold(128));
    const code = tryDecode(px, w, h);
    if (code) push(code.data, makeCorners(code, 1, 1));
  } catch (e) { console.warn('[scan] threshold failed:', (e as Error).message); }

  const annotatedImageBase64 = await annotate(srcPng, found, OW, OH);

  return {
    qrCodes: found,
    totalFound: found.length,
    annotatedImageBase64,
    originalWidth: OW,
    originalHeight: OH,
    processingTimeMs: Date.now() - t0,
  };
}
