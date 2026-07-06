import express from 'express';
import cors from 'cors';
import path from 'path';
import { scanRouter } from './routes/scan';
import { emailRouter } from './routes/email';
import { batchRouter } from './routes/batch';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve annotated images
app.use('/output', express.static(path.join(__dirname, '../output')));

// API routes
app.use('/api/scan', scanRouter);
app.use('/api/email', emailRouter);
app.use('/api/batch', batchRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 QR Scanner server running on http://localhost:${PORT}`);
});

export default app;
