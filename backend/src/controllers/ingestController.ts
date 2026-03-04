import { Request, Response } from 'express';
import { IngestRequest, IngestResponse } from '@obsidian-ledger/shared/types';
import ArchitectAgent, { GenerationResult } from '../agents/ArchitectAgent';
import * as path from 'path';
import fs from 'fs';

const architectAgent = new ArchitectAgent();

let lastZoneFileMap: Record<string, string[]> = {};
let lastScannedProjectRoot: string = '';
let lastZoneMetadata: Record<string, { folderName: string; subpath: string }> = {};

function getMonorepoRoot(): string {
  const currentDir = process.cwd();
  let monorepoRoot = currentDir;
  if (currentDir.includes('backend')) {
    monorepoRoot = path.join(currentDir, '..');
  }
  return path.resolve(monorepoRoot);
}

export const handleIngest = async (req: Request<{}, {}, IngestRequest>, res: Response<IngestResponse>) => {
  const { codebasePath, codebaseUrl, rawCode, documentation } = req.body;

  try {
    let result: GenerationResult;
    let scanPath: string;

    const monorepoRoot = getMonorepoRoot();

    if (codebasePath && codebasePath !== '.') {
      scanPath = path.isAbsolute(codebasePath) ? codebasePath : path.resolve(monorepoRoot, codebasePath);
    } else {
      scanPath = monorepoRoot;
    }

    if (!fs.existsSync(scanPath)) {
      throw new Error(`Path does not exist: ${scanPath}`);
    }

    lastScannedProjectRoot = scanPath;
    result = await architectAgent.generateFromDirectory(scanPath);

    lastZoneFileMap = result.zoneFileMap || {};
    lastZoneMetadata = {};
    
    if (result.worldMap.zones) {
      result.worldMap.zones.forEach(zone => {
        lastZoneMetadata[zone.id] = {
          folderName: zone.folderName || '',
          subpath: zone.folderName || ''
        };
      });
    }

    res.json({
      worldMap: result.worldMap,
      scannedProjectRoot: lastScannedProjectRoot,
      message: `World generated from: ${lastScannedProjectRoot}`
    });

  } catch (error) {
    console.error('❌ Ingest error:', error);
    res.status(500).json({
      worldMap: {
        id: 'world-error',
        name: 'Error World',
        description: 'Failed to generate world map',
        zones: [],
        startingZoneId: 'zone-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: `Error: ${error}`
    } as any);
  }
};

export const handleReadFile = async (req: Request, res: Response) => {
  const filePath = (req.query.path as string) || (req.body as any)?.filePath;
  
  if (!lastScannedProjectRoot) {
    return res.status(400).json({ content: 'No project scanned', filePath });
  }
  
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(lastScannedProjectRoot, filePath);
    
    if (!fullPath.startsWith(lastScannedProjectRoot)) {
      throw new Error('Security violation');
    }
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      res.json({ content, filePath });
    } else {
      res.status(404).json({ content: 'File not found', filePath });
    }
  } catch (error) {
    res.status(500).json({ content: `Error: ${error}`, filePath });
  }
};

export const handleListFiles = async (req: Request, res: Response) => {
  const { folder } = req.body;
  if (!lastScannedProjectRoot) return res.json({ files: [] });
  
  try {
    const targetFolder = folder ? path.join(lastScannedProjectRoot, folder) : lastScannedProjectRoot;
    const files: string[] = [];
    
    function scanDir(dir: string, basePath: string = '') {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;
        const fullPath = path.join(dir, item.name);
        const relativePath = basePath ? path.join(basePath, item.name) : item.name;
        if (item.isDirectory()) scanDir(fullPath, relativePath);
        else files.push(relativePath);
      }
    }
    scanDir(targetFolder, folder || '');
    res.json({ files, folder });
  } catch (error) {
    res.json({ files: [] });
  }
};

export const handleGetZoneFiles = async (req: Request, res: Response) => {
  const { zoneId } = req.body;
  const files = lastZoneFileMap[zoneId] || [];
  res.json({ files });
};

export default { handleIngest, handleReadFile, handleGetZoneFiles, handleListFiles };
