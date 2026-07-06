import nodemailer from 'nodemailer';
import { ScanResponse } from '../types';

export interface EmailRequest {
  recipientEmail: string;
  recipientName?: string;
  scanResult: ScanResponse;
}

// Create a test account using Ethereal (for development)
// For production, replace with real SMTP credentials (Gmail, SendGrid, AWS SES, etc.)
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  // For development: use Ethereal (fake SMTP service)
  // For production: configure with environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development mode: create Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal email (test mode):', testAccount.user);
  }

  return transporter;
}

function buildEmailHTML(scanResult: ScanResponse, recipientName?: string): string {
  const greeting = recipientName ? `Hello ${recipientName}` : 'Hello';
  
  const qrRows = scanResult.qrCodes.map((qr, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; font-weight: 600; color: #6366f1;">${i + 1}</td>
      <td style="padding: 12px 8px;">
        <span style="display: inline-block; padding: 4px 8px; background: ${qr.color}20; color: ${qr.color}; border-radius: 4px; font-size: 12px; font-weight: 500;">
          ${qr.dataType}
        </span>
      </td>
      <td style="padding: 12px 8px; font-family: monospace; font-size: 13px; word-break: break-all;">${escapeHtml(qr.data)}</td>
      <td style="padding: 12px 8px; color: #6b7280; font-size: 13px;">${qr.boundingBox.width}×${qr.boundingBox.height}px</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Scanner Results</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #06b6d4 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">QR Scanner Results</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Scan completed successfully</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 12px 24px;">
              <p style="margin: 0; color: #1f2937; font-size: 16px;">${greeting},</p>
              <p style="margin: 12px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Your QR code scan has been completed. ${scanResult.totalFound} QR code${scanResult.totalFound !== 1 ? 's were' : ' was'} detected and decoded from your image.
              </p>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding: 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="padding: 12px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
                    <div style="color: #6366f1; font-size: 24px; font-weight: 700;">${scanResult.totalFound}</div>
                    <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">QR Codes</div>
                  </td>
                  <td width="8%"></td>
                  <td width="29%" style="padding: 12px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
                    <div style="color: #6366f1; font-size: 24px; font-weight: 700;">${scanResult.processingTimeMs}ms</div>
                    <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Processing</div>
                  </td>
                  <td width="8%"></td>
                  <td width="22%" style="padding: 12px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
                    <div style="color: #6366f1; font-size: 20px; font-weight: 700;">${scanResult.originalWidth}×${scanResult.originalHeight}</div>
                    <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Image Size</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${scanResult.totalFound > 0 ? `
          <!-- QR Codes Table -->
          <tr>
            <td style="padding: 8px 24px 24px 24px;">
              <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Detected QR Codes</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">#</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Type</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Data</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Size</th>
                  </tr>
                </thead>
                <tbody>
                  ${qrRows}
                </tbody>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Generated by <strong style="color: #6366f1;">QR Scanner Pro</strong>
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Powered by jsQR • sharp • Node.js
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export async function sendScanResults(req: EmailRequest): Promise<{ success: true; messageId: string; previewURL?: string }> {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: '"QR Scanner Pro" <noreply@qrscanner.app>',
    to: req.recipientEmail,
    subject: `QR Scanner Results - ${req.scanResult.totalFound} QR Code${req.scanResult.totalFound !== 1 ? 's' : ''} Detected`,
    html: buildEmailHTML(req.scanResult, req.recipientName),
    attachments: [
      {
        filename: `qr-scan-${Date.now()}.png`,
        content: req.scanResult.annotatedImageBase64.split(',')[1],
        encoding: 'base64',
        contentType: 'image/png',
      },
    ],
  });

  // Get preview URL for Ethereal (test mode only)
  const previewURL = nodemailer.getTestMessageUrl(info);

  return {
    success: true,
    messageId: info.messageId,
    previewURL: previewURL || undefined,
  };
}
