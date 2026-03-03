/**
 * Ingest Controller
 * Enhanced with zoneFileMap for real file display in code editor
 * FIXED: Properly handle custom paths and store scanned project root
 */

import { Request, Response } from 'express';
import { IngestRequest, IngestResponse, WorldMap, Zone } from '@obsidian-ledger/shared/types';
import ArchitectAgent, { GenerationResult } from '../agents/ArchitectAgent';
import * as path from 'path';

const architectAgent = new ArchitectAgent();

// Store the last generated zoneFileMap for file reading
let lastZoneFileMap: Record<string, string[]> = {};

// CRITICAL: Store the scanned project root path
let lastScannedProjectRoot: string = '';

// Store zone metadata for file lookups
let lastZoneMetadata: Record<string, { folderName: string; subpath: string }> = {};

// Get the absolute path to the monorepo root (where backend is located)
function getMonorepoRoot(): string {
  const currentDir = process.cwd();
  let monorepoRoot = currentDir;
  
  // If we're in backend folder, go up to monorepo root
  if (currentDir.includes('backend')) {
    monorepoRoot = path.join(currentDir, '..');
  }
  
  return path.resolve(monorepoRoot);
}

export const handleIngest = async (req: Request<{}, {}, IngestRequest>, res: Response<IngestResponse>) => {
  const { codebasePath, codebaseUrl, rawCode, documentation } = req.body;

  console.log('========================================');
  console.log('Ingest request received:', {
    codebasePath,
    codebaseUrl,
    hasRawCode: !!rawCode,
    hasDocumentation: !!documentation
  });
  console.log('========================================');

  try {
    let result: GenerationResult;
    let scanPath: string;

    // Get the monorepo root
    const monorepoRoot = getMonorepoRoot();
    console.log(`Monorepo root detected as: ${monorepoRoot}`);

    // Use provided codebasePath if it's a valid custom path
    if (codebasePath && codebasePath !== '.') {
      // Check if it's an absolute path or relative
      if (path.isAbsolute(codebasePath)) {
        scanPath = codebasePath;
      } else {
        // Resolve relative to monorepo root
        scanPath = path.resolve(monorepoRoot, codebasePath);
      }
      console.log(`Scanning CUSTOM path: ${scanPath}`);
    } else {
      // Default: Scan monorepo root
      scanPath = monorepoRoot;
      console.log(`Scanning MONOREPO root: ${scanPath}`);
    }

    // Verify the path exists
    const fs = require('fs');
    if (!fs.existsSync(scanPath)) {
      throw new Error(`Path does not exist: ${scanPath}`);
    }

    // CRITICAL: Store the scanned project root for file reading
    lastScannedProjectRoot = scanPath;
    console.log(`✅ Stored scanned project root: ${lastScannedProjectRoot}`);

    // Generate world map from REAL directory structure
    result = await architectAgent.generateFromDirectory(scanPath);

    // Store the zoneFileMap for file reading
    lastZoneFileMap = result.zoneFileMap || {};
    
    // Store zone metadata
    lastZoneMetadata = {};
    if (result.worldMap.zones) {
      result.worldMap.zones.forEach(zone => {
        lastZoneMetadata[zone.id] = {
          folderName: zone.folderName || '',
          subpath: zone.folderName || ''
        };
      });
    }
    
    console.log('✅ ZoneFileMap stored:', Object.keys(lastZoneFileMap).map(k => `${k}: ${lastZoneFileMap[k]?.length || 0} files`));
    console.log('✅ Project files tracked:', Object.keys(lastZoneMetadata));

    // Use the generated world map from scanned directories
    if (!result.worldMap.zones || result.worldMap.zones.length === 0) {
      throw new Error('No zones could be generated from directory scan');
    }

    console.log(`✅ Generated world map with ${result.worldMap.zones.length} zones`);
    console.log('Zone details:', result.worldMap.zones.map(z => ({
      name: z.name,
      folderName: z.folderName,
      fileCount: z.fileCount,
      position: z.position
    })));

    res.json({
      worldMap: result.worldMap,
      scannedProjectRoot: lastScannedProjectRoot,
      message: `World generated from: ${lastScannedProjectRoot} (${result.worldMap.zones.length} zones)`
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
    });
  }
};

// File reading endpoint - reads actual file content from SCANNED PROJECT
export const handleReadFile = async (req: Request<{}, {}, { filePath: string }>, res: Response<{ content: string; filePath: string }>) => {
  // Support both query param and body
  const filePath = req.query.path as string || (req.body as any)?.filePath;
  
  console.log('========================================');
  console.log('📂 File read request for:', filePath);
  console.log('📂 Scanned project root:', lastScannedProjectRoot);
  console.log('========================================');
  
  if (!lastScannedProjectRoot) {
    res.status(400).json({ content: 'No project has been scanned yet', filePath: filePath || '' });
    return;
  }
  
  try {
    const fs = require('fs');
    
    // Resolve the path relative to the SCANNED PROJECT ROOT
    let fullPath: string;
    
    if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    } else {
      fullPath = path.resolve(lastScannedProjectRoot, filePath);
    }
    
    console.log('📂 Full resolved path:', fullPath);
    
    // Security check - ensure path is within scanned project
    if (!fullPath.startsWith(lastScannedProjectRoot)) {
      console.log('❌ Security: Path outside scanned project');
      throw new Error('Invalid path - must be within scanned project directory');
    }
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      console.log(`✅ Read ${content.length} characters from ${path.basename(fullPath)}`);
      res.json({ content, filePath });
    } else {
      console.log(`❌ File not found: ${fullPath}`);
      res.status(404).json({ content: `File not found: ${filePath}\nFull path: ${fullPath}\nScanned root: ${lastScannedProjectRoot}`, filePath });
    }
  } catch (error) {
    console.error('❌ File read error:', error);
    res.status(500).json({ content: `Error reading file: ${error}`, filePath });
  }
};

// Get all files in the scanned project
export const handleListFiles = async (req: Request<{}, {}, { folder?: string }>, res: Response<{ files: string[]; folder?: string }>) => {
  const { folder } = req.body;
  
  console.log('📂 List files request for folder:', folder);
  console.log('📂 Scanned project root:', lastScannedProjectRoot);
  
  if (!lastScannedProjectRoot) {
    res.json({ files: [], folder });
    return;
  }
  
  try {
    const fs = require('fs');
    const targetFolder = folder ? path.join(lastScannedProjectRoot, folder) : lastScannedProjectRoot;
    
    if (!fs.existsSync(targetFolder)) {
      console.log(`❌ Folder not found: ${targetFolder}`);
      res.json({ files: [], folder });
      return;
    }
    
    // Get all files recursively
    const files: string[] = [];
    
    function scanDir(dir: string, basePath: string = '') {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;
        
        const fullPath = path.join(dir, item.name);
        const relativePath = basePath ? path.join(basePath, item.name) : item.name;
        
        if (item.isDirectory()) {
          scanDir(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    }
    
    scanDir(targetFolder, folder || '');
    
    console.log(`✅ Found ${files.length} files in ${folder || 'root'}`);
    res.json({ files, folder });
  } catch (error) {
    console.error('❌ List files error:', error);
    res.json({ files: [], folder });
  }
};

// Get zone files endpoint
export const handleGetZoneFiles = async (req: Request<{}, {}, { zoneId: string }>, res: Response<{ files: string[] }>) => {
  const { zoneId } = req.body;
  
  console.log('Get zone files request:', zoneId);
  
  const files = lastZoneFileMap[zoneId] || [];
  
  // Convert absolute paths to relative
  if (lastScannedProjectRoot && files.length > 0) {
    const relativeFiles = files.map(f => {
      if (f.startsWith(lastScannedProjectRoot)) {
        return f.substring(lastScannedProjectRoot.length + 1);
      }
      return f;
    });
    res.json({ files: relativeFiles });
  } else {
    res.json({ files });
  }
};

export default { handleIngest, handleReadFile, handleGetZoneFiles, handleListFiles };

