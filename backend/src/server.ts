import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Native Node 22 (Strip-Types) requires NO extensions for local imports
import ArchitectAgent from './agents/ArchitectAgent';
import { handleQuerySage, handleValidateCode, handleGetDialogueHistory, handleClearDialogue } from './controllers/sageController';
import ingestController from './controllers/ingestController';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render uses Port 10000
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// API Routes
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));
app.post(['/ingest', '/api/ingest'], (req, res) => ingestController.handleIngest(req, res));
app.post(['/query-sage', '/api/query-sage'], (req, res) => handleQuerySage(req, res));
app.get(['/api/file/read', '/file/read'], (req, res) => ingestController.handleReadFile(req, res));
app.post('/api/list-files', (req, res) => ingestController.handleListFiles(req, res));

// Serve Frontend
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/ingest')) {
            res.sendFile(path.join(frontendDistPath, 'index.html'));
        }
    });
}

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🟣 Server running on Port ${PORT}`);
});
