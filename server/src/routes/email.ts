import { Router, Request, Response } from 'express';
import { sendScanResults } from '../services/emailService';
import { ScanResponse } from '../types';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { recipientEmail, recipientName, scanResult } = req.body as {
    recipientEmail: string;
    recipientName?: string;
    scanResult: ScanResponse;
  };

  // Validation
  if (!recipientEmail || !EMAIL_REGEX.test(recipientEmail)) {
    res.status(400).json({ error: 'Valid recipient email is required' });
    return;
  }

  if (!scanResult || typeof scanResult.totalFound !== 'number') {
    res.status(400).json({ error: 'Valid scan result data is required' });
    return;
  }

  try {
    const result = await sendScanResults({ recipientEmail, recipientName, scanResult });
    res.json({
      success: true,
      message: `Results sent to ${recipientEmail}`,
      messageId: result.messageId,
      // previewURL is only present in dev/Ethereal mode — lets user preview the email
      ...(result.previewURL && { previewURL: result.previewURL }),
    });
  } catch (error: unknown) {
    console.error('Email send error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    res.status(500).json({ error: message });
  }
});

export { router as emailRouter };
