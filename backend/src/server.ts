import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import ArchitectAgent from './agents/ArchitectAgent.js';
import { handleQuerySage, handleValidateCode, handleGetDialogueHistory, handleClearDialogue } from './controllers/sageController.js';
import ingestController from './controllers/ingestController.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post(['/ingest', '/api/ingest'], (req, res) => ingestController.handleIngest(req, res));
app.post(['/query-sage', '/api/query-sage'], (req, res) => handleQuerySage(req, res));

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendDistPath, 'index.html'));
        }
    });
}

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🟣 Server running on Port ${PORT}`);
});
