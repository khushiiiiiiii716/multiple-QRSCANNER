"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailRouter = void 0;
const express_1 = require("express");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
exports.emailRouter = router;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
router.post('/', async (req, res) => {
    const { recipientEmail, recipientName, scanResult } = req.body;
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
        const result = await (0, emailService_1.sendScanResults)({ recipientEmail, recipientName, scanResult });
        res.json({
            success: true,
            message: `Results sent to ${recipientEmail}`,
            messageId: result.messageId,
            // previewURL is only present in dev/Ethereal mode — lets user preview the email
            ...(result.previewURL && { previewURL: result.previewURL }),
        });
    }
    catch (error) {
        console.error('Email send error:', error);
        const message = error instanceof Error ? error.message : 'Failed to send email';
        res.status(500).json({ error: message });
    }
});
