/**
 * The Obsidian Ledger - Backend Server
 * PRODUCTION READY: Fixed Imports (no extensions) and Pathing for Render
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fixed Imports: Removed .ts extensions to prevent tsc compilation errors
import ArchitectAgent from './agents/ArchitectAgent';
import { handleQuerySage, handleValidateCode, handleGetDialogueHistory, handleClearDialogue } from './controllers/sageController';
import ingestController from './controllers/ingestController';

const app = express();

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PORT CONFIGURATION
const PORT_TO_USE = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// CORS: Allow everything for the prototype
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// --- API ROUTES ---
app.get('/health', (_req, res) => res.json({ status: 'ok', port: PORT_TO_USE }));

app.get(['/api/file/read', '/file/read'], (req: Request, res: Response) => {
  ingestController.handleReadFile(req, res);
});

app.post('/api/list-files', (req: Request, res: Response) => {
  ingestController.handleListFiles(req, res);
});

/**
 * POST /ingest - Architect Agent endpoint
 */
app.post(['/ingest', '/api/ingest'], (req: Request, res: Response) => {
  console.log('📥 /ingest request received');
  ingestController.handleIngest(req, res);
});

/**
 * POST /query-sage - Sage Agent endpoint
 */
app.post(['/query-sage', '/api/query-sage'], (req: Request, res: Response) => {
  console.log('📥 /query-sage request received');
  handleQuerySage(req, res);
});

app.post(['/validate-code', '/api/validate-code'], handleValidateCode);
app.get(['/dialogue-history', '/api/dialogue-history'], handleGetDialogueHistory);
app.post(['/clear-dialogue', '/api/clear-dialogue'], handleClearDialogue);

app.post('/api/scan-custom', async (req: Request, res: Response) => {
  const { basePath } = req.body;
  if (!basePath) return res.status(400).json({ error: 'Missing basePath parameter' });

  try {
    const architect = new ArchitectAgent({ apiKey: process.env.GEMINI_API_KEY });
    const result = await architect.generateFromDirectory(basePath);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SERVE FRONTEND (Combined Method) ---
// We go up two levels from backend/src to reach the root, then into frontend/dist
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
    console.log(`✅ Serving static frontend from: ${frontendDistPath}`);
    app.use(express.static(frontendDistPath));
    
    app.get('*', (req, res) => {
        // Only serve index.html if it's not an API call
        if (!req.path.startsWith('/api') && !req.path.startsWith('/ingest') && !req.path.startsWith('/query-sage')) {
            res.sendFile(path.join(frontendDistPath, 'index.html'));
        }
    });
} else {
    console.log(`⚠️ Warning: frontend/dist not found at ${frontendDistPath}`);
}

// --- START SERVER ---
app.listen(PORT_TO_USE, '0.0.0.0', () => {
    console.log(`🟣 The Obsidian Ledger server running on Port ${PORT_TO_USE}`);
});

export default app;
