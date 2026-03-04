/**
 * The Obsidian Ledger - Backend Server
 * PRODUCTION READY: Includes Static File Serving and Dynamic Port Binding
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

// --- PRODUCTION CONFIGURATION ---
// Use Render's port if available, otherwise 3001
const PORT_TO_USE = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Updated CORS to allow all origins for the live prototype
const corsOptions = {
  origin: '*', 
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// --- STATIC FILE SERVING (THE "ONE-LINK" FIX) ---
// This tells the backend to show the frontend game to anyone who visits the link
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', port: PORT_TO_USE }));

// Use the new controller functions
app.get(['/api/file/read', '/file/read'], (req: Request, res: Response) => {
  ingestController.handleReadFile(req, res);
});

app.post('/api/list-files', (req: Request, res: Response) => {
  ingestController.handleListFiles(req, res);
});

app.post(['/ingest', '/api/ingest'], (req: Request, res: Response) => {
  console.log('📥 /ingest request received');
  ingestController.handleIngest(req, res);
});

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

// --- SERVE FRONTEND (This must be AFTER your API routes) ---
if (fs.existsSync(frontendDistPath)) {
    console.log(`✅ Serving static frontend from: ${frontendDistPath}`);
    app.use(express.static(frontendDistPath));
    
    // Catch-all: Route all other requests to the React index.html
    app.get('*', (req, res) => {
        // Don't intercept API calls
        if (!req.path.startsWith('/api') && !req.path.startsWith('/ingest') && !req.path.startsWith('/query-sage')) {
            res.sendFile(path.join(frontendDistPath, 'index.html'));
        }
    });
} else {
    console.log(`⚠️ Frontend dist folder not found at: ${frontendDistPath}. Check your build script.`);
}

// --- START SERVER ---
app.listen(PORT_TO_USE, '0.0.0.0', () => {
    console.log(`🟣 The Obsidian Ledger server running on Port ${PORT_TO_USE}`);
    console.log(`📡 Static Frontend & API Ready`);
});

export default app;
