"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const scan_1 = require("./routes/scan");
const email_1 = require("./routes/email");
const batch_1 = require("./routes/batch");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve annotated images
app.use('/output', express_1.default.static(path_1.default.join(__dirname, '../output')));
// API routes
app.use('/api/scan', scan_1.scanRouter);
app.use('/api/email', email_1.emailRouter);
app.use('/api/batch', batch_1.batchRouter);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`🚀 QR Scanner server running on http://localhost:${PORT}`);
});
exports.default = app;
