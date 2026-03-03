/**
 * The Obsidian Ledger - Backend Server
 * ENHANCED: File listing endpoint for code editor with proper scanned project tracking
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import ArchitectAgent from './agents/ArchitectAgent';
import { handleQuerySage, handleValidateCode, handleGetDialogueHistory, handleClearDialogue } from './controllers/sageController';
import ingestController from './controllers/ingestController';

const app = express();

// PORT FAIL-SAFE: Try 3001 first, then 3002
let PORT = 3001;
const BACKUP_PORT = 3002;

const corsOptions = {
  origin: ['http://localhost:5173', `http://localhost:${PORT}`, `http://localhost:${BACKUP_PORT}`],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', port: PORT }));

// Use the new controller functions that track scanned project root
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

/**
 * POST /validate-code
 */
app.post(['/validate-code', '/api/validate-code'], handleValidateCode);

/**
 * GET /dialogue-history
 */
app.get(['/dialogue-history', '/api/dialogue-history'], handleGetDialogueHistory);

/**
 * POST /clear-dialogue
 */
app.post(['/clear-dialogue', '/api/clear-dialogue'], handleClearDialogue);

/**
 * POST /api/scan-custom
 */
app.post('/api/scan-custom', async (req: Request, res: Response) => {
  console.log('📥 /api/scan-custom request received');
  const { basePath } = req.body;
  
  if (!basePath) {
    return res.status(400).json({ error: 'Missing basePath parameter' });
  }

  try {
    const architect = new ArchitectAgent({ apiKey: process.env.GEMINI_API_KEY });
    const result = await architect.generateFromDirectory(basePath);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Custom scan error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PORT FAIL-SAFE
const startServer = (port: number, isBackup: boolean = false) => {
  const server = app.listen(port, () => {
    PORT = port;
    console.log(`🟣 The Obsidian Ledger server running on http://localhost:${PORT}${isBackup ? ' (backup port)' : ''}`);
    console.log(`📡 API endpoints:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /api/file/read?path=...`);
    console.log(`   POST /api/list-files`);
    console.log(`   POST /ingest`);
    console.log(`   POST /query-sage`);
    console.log(`   POST /validate-code`);
    
    fs.writeFileSync(path.join(process.cwd(), 'PORT.txt'), String(port));
  });
  
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} in use, trying ${isBackup ? 'nowhere...' : BACKUP_PORT}...`);
      if (!isBackup) {
        startServer(BACKUP_PORT, true);
      }
    } else {
      console.error('❌ Server error:', err.message);
    }
  });
};

startServer(3001);

export default app;

