import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import Papa from 'papaparse';
import { ScanResponse, ScanHistoryEntry } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString();
}

function bb(qr: ScanResponse['qrCodes'][number]) {
  return `${qr.boundingBox.x},${qr.boundingBox.y} ${qr.boundingBox.width}×${qr.boundingBox.height}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV Export ───────────────────────────────────────────────────────────────

export function exportToCSV(scanResult: ScanResponse, filename: string): void {
  const rows = scanResult.qrCodes.map((qr, i) => ({
    '#': i + 1,
    'Data Type': qr.dataType,
    'Data': qr.data,
    'Bounding Box X': qr.boundingBox.x,
    'Bounding Box Y': qr.boundingBox.y,
    'Width': qr.boundingBox.width,
    'Height': qr.boundingBox.height,
    'Quality Score': qr.qualityScore?.score ?? '',
    'Quality Grade': qr.qualityScore?.grade ?? '',
    'Risk Level': qr.suspiciousAnalysis?.riskLevel ?? '',
    'Risk Score': qr.suspiciousAnalysis?.riskScore ?? '',
    'Color': qr.color,
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.replace(/\.[^.]+$/, '') + '_qr_codes.csv');
}

// ── Excel Export ─────────────────────────────────────────────────────────────

export function exportToExcel(scanResult: ScanResponse, filename: string): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1 – Summary
  const summaryData = [
    ['QR Scanner Pro — Scan Report'],
    [],
    ['Filename',        scanResult.filename],
    ['Date',           formatDate(new Date())],
    ['File Size',      `${(scanResult.fileSize / 1024).toFixed(1)} KB`],
    ['Total QR Codes', scanResult.totalFound],
    ['Processing Time',`${scanResult.processingTimeMs} ms`],
    ['Image Dimensions', `${scanResult.originalWidth} × ${scanResult.originalHeight} px`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // Sheet 2 – QR Codes
  const qrRows = scanResult.qrCodes.map((qr, i) => ({
    '#': i + 1,
    'Data Type': qr.dataType,
    'Data': qr.data,
    'X': qr.boundingBox.x,
    'Y': qr.boundingBox.y,
    'Width': qr.boundingBox.width,
    'Height': qr.boundingBox.height,
    'Quality Grade': qr.qualityScore?.grade ?? '',
    'Quality Score': qr.qualityScore?.score ?? '',
    'Risk Level': qr.suspiciousAnalysis?.riskLevel ?? '',
    'Risk Score': qr.suspiciousAnalysis?.riskScore ?? '',
    'Suspicious Reasons': qr.suspiciousAnalysis?.reasons?.join('; ') ?? '',
  }));
  const ws2 = XLSX.utils.json_to_sheet(qrRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'QR Codes');

  // Sheet 3 – Statistics
  const typeCounts: Record<string, number> = {};
  for (const qr of scanResult.qrCodes) {
    typeCounts[qr.dataType] = (typeCounts[qr.dataType] ?? 0) + 1;
  }
  const statsRows = [
    ['Type', 'Count', 'Percentage'],
    ...Object.entries(typeCounts).map(([type, count]) => [
      type,
      count,
      `${((count / scanResult.totalFound) * 100).toFixed(1)}%`,
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(statsRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Statistics');

  XLSX.writeFile(wb, filename.replace(/\.[^.]+$/, '') + '_qr_report.xlsx');
}

// ── PDF Export ───────────────────────────────────────────────────────────────

export function exportToPDF(scanResult: ScanResponse, filename: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
    addFooter();
  };

  const checkY = (needed: number) => {
    if (y + needed > 280) addPage();
  };

  const addFooter = () => {
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } })
      .internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `QR Scanner Pro — ${formatDate(new Date())} — Page ${pageCount}`,
      margin,
      295
    );
  };

  // ── Page 1: Header ─────────────────────────────────────────────────────────
  // Title bar
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('QR Scanner Pro Report', margin, 18);

  y = 38;

  // Metadata
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  const meta = [
    ['Filename',        scanResult.filename],
    ['Date',           formatDate(new Date())],
    ['File Size',      `${(scanResult.fileSize / 1024).toFixed(1)} KB`],
    ['Image Size',     `${scanResult.originalWidth} × ${scanResult.originalHeight} px`],
    ['Processing Time',`${scanResult.processingTimeMs} ms`],
    ['Total QR Codes', String(scanResult.totalFound)],
  ];
  for (const [label, value] of meta) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, y);
    y += 7;
  }

  y += 6;

  // Stats boxes
  const typeCounts: Record<string, number> = {};
  for (const qr of scanResult.qrCodes) {
    typeCounts[qr.dataType] = (typeCounts[qr.dataType] ?? 0) + 1;
  }
  const types = Object.entries(typeCounts);
  const boxW = contentW / Math.max(types.length, 1);

  doc.setFontSize(9);
  types.forEach(([type, count], i) => {
    const bx = margin + i * boxW;
    doc.setFillColor(240, 235, 255);
    doc.roundedRect(bx, y, boxW - 2, 18, 2, 2, 'F');
    doc.setTextColor(109, 40, 217);
    doc.setFont('helvetica', 'bold');
    doc.text(String(count), bx + boxW / 2 - 1, y + 7, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(type, bx + boxW / 2 - 1, y + 14, { align: 'center' });
    doc.setFontSize(9);
  });
  y += 28;

  // ── QR Code Details Table ──────────────────────────────────────────────────
  checkY(14);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('QR Code Details', margin, y);
  y += 8;

  const colWidths = [8, 22, 80, 22, 22, 26];
  const headers = ['#', 'Type', 'Data', 'Quality', 'Risk', 'Bounding Box'];

  // Header row
  doc.setFillColor(109, 40, 217);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  let cx = margin + 1;
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 5.5);
    cx += colWidths[i];
  });
  y += 8;

  // Data rows
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < scanResult.qrCodes.length; i++) {
    const qr = scanResult.qrCodes[i];
    checkY(10);

    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 255);
      doc.rect(margin, y, contentW, 9, 'F');
    }

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8);
    cx = margin + 1;

    const rowData = [
      String(i + 1),
      qr.dataType,
      qr.data.length > 55 ? qr.data.slice(0, 52) + '…' : qr.data,
      qr.qualityScore ? `${qr.qualityScore.grade} (${qr.qualityScore.score})` : '—',
      qr.suspiciousAnalysis?.riskLevel ?? '—',
      bb(qr),
    ];

    rowData.forEach((val, ci) => {
      doc.text(val, cx, y + 5.5);
      cx += colWidths[ci];
    });
    y += 9;
  }

  addFooter();
  doc.save(filename.replace(/\.[^.]+$/, '') + '_qr_report.pdf');
}

// ── History CSV Export ────────────────────────────────────────────────────────

export function exportHistoryToCSV(history: ScanHistoryEntry[]): void {
  const rows = history.map((entry, i) => ({
    '#': i + 1,
    'Filename': entry.filename,
    'Date': formatDate(entry.timestamp),
    'File Size (KB)': (entry.fileSize / 1024).toFixed(1),
    'QR Codes Found': entry.totalFound,
    'Processing Time (ms)': entry.processingTimeMs,
    'Types': entry.result.qrCodes.map((q) => q.dataType).join(', '),
    'Suspicious': entry.result.qrCodes.some((q) => q.suspiciousAnalysis?.isSuspicious) ? 'Yes' : 'No',
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `qr-scan-history-${Date.now()}.csv`);
}
