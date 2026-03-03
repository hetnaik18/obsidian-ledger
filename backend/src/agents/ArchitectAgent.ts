/**
 * Architect Agent - AI-POWERED WORLD GENERATION
 * Using AI as Architect (text generation only)
 */

import { WorldMap, Zone } from '@obsidian-ledger/shared/types';
import * as fs from 'fs';
import * as path from 'path';

export interface GenerationResult {
  worldMap: WorldMap;
  tokensUsed: number;
  modelResponse: string;
  zoneFileMap: Record<string, string[]>;
}

const CACHE_FILE = './world_cache.json';

function loadCache(): GenerationResult | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.worldMap && parsed.worldMap.zones && parsed.worldMap.zones.length > 0) {
        console.log('[Architect] Using cached world');
        return parsed;
      }
    }
  } catch (e) {}
  console.log('[Architect] No valid cache, generating new world...');
  return null;
}

function saveCache(result: GenerationResult) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(result, null, 2));
  } catch (e) {}
}

function scanDirectoryRecursive(dirPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx', '.py']): string[] {
  const files: string[] = [];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue;
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) files.push(...scanDirectoryRecursive(fullPath, extensions));
      else if (item.isFile() && extensions.includes(path.extname(item.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch (e) {}
  return files;
}

const FOLDER_BIOME_MAP: Record<string, { name: string; theme: string; description: string }> = {
  'backend': { name: 'The Stone Bastion', theme: 'stone', description: 'A fortress of server-side logic' },
  'frontend': { name: 'The Emerald Forest', theme: 'forest', description: 'A lush wilderness of UI components' },
  'shared': { name: 'The Crystal Library', theme: 'marble', description: 'A crystalline archive of shared types' },
  'scrapers': { name: 'The Data Mines', theme: 'mine', description: 'Deep mines of data extraction' },
};

function getBiomeInfo(folderName: string) {
  const key = folderName.toLowerCase();
  if (FOLDER_BIOME_MAP[key]) return FOLDER_BIOME_MAP[key];
  for (const [k, v] of Object.entries(FOLDER_BIOME_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return { name: `The ${folderName} Domain`, theme: 'stone', description: `The realm of ${folderName}` };
}

async function getZoneNamesFromAI(folders: string[], apiKey: string): Promise<string> {
  // Use Gemini 2.5 Flash - current GA model for free tier
  const endpoints = [
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, model: 'gemini-2.5-flash (v1beta)' },
    { url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`, model: 'gemini-2.0-flash (v1)' },
  ];
  
  const prompt = `You are an architect. Given these folders from a codebase: ${folders.join(', ')}.
Give each a creative fantasy name based on what that folder likely contains.
Respond with ONLY valid JSON array like: [{"folder":"backend","name":"The Stone Bastion","desc":"A fortress of server logic"}]`;

  for (const endpoint of endpoints) {
    try {
      console.log(`[Architect] Trying ${endpoint.model}...`);
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      });
      
      if (!response.ok) {
        console.log(`[Architect] ${endpoint.model} HTTP ${response.status}`);
        continue;
      }
      
      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`[Architect] ✅ ${endpoint.model} succeeded!`);
        return text;
      }
    } catch (e: any) {
      console.log(`[Architect] ${endpoint.model} error:`, e.message);
    }
  }
  
  throw new Error('All AI models failed');
}

function parseAIResponse(response: string): any[] {
  try {
    const match = response.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response);
  } catch { return []; }
}

export class ArchitectAgent {
  private apiKey: string;
  
  constructor(private options: any = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
  }

  async generateWorld(dirPath: string): Promise<GenerationResult> {
    console.log('[Architect] Starting AI-powered world generation');
    console.log('[Architect] API Key available:', !!this.apiKey);
    
    const cached = loadCache();
    if (cached) return cached;
    
    const scannedFolders: Record<string, { count: number; files: string[] }> = {};
    
    try {
      if (fs.existsSync(dirPath)) {
        const rootItems = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of rootItems) {
          if (!item.isDirectory() || item.name.startsWith('.') || item.name === 'node_modules') continue;
          const files = scanDirectoryRecursive(path.join(dirPath, item.name));
          scannedFolders[item.name] = { count: files.length, files };
        }
      }
    } catch (e) {}
    
    const folders = Object.keys(scannedFolders);
    console.log('[Architect] Folders found:', folders);
    
    if (folders.length === 0) return this.getFallbackResult();
    
    if (this.apiKey) {
      try {
        console.log('[Architect] Asking AI to architect the world...');
        const aiResponse = await getZoneNamesFromAI(folders, this.apiKey);
        
        const aiZones = parseAIResponse(aiResponse);
        console.log('[Architect] AI Zones:', JSON.stringify(aiZones, null, 2));
        
        if (aiZones && aiZones.length > 0) {
          console.log('[Architect] ✅ AI successfully generated custom zone names!');
          
          const zones = this.mapAIZones(aiZones, scannedFolders, folders);
          
          const zoneFileMap: Record<string, string[]> = {};
          folders.forEach(f => zoneFileMap[`zone-${f}`] = scannedFolders[f]?.files || []);
          
          const result = {
            worldMap: { 
              id: `world-${Date.now()}`, 
              name: 'The Obsidian Ledger', 
              description: 'AI-Architected world', 
              zones, 
              startingZoneId: zones[0]?.id, 
              createdAt: new Date().toISOString(), 
              updatedAt: new Date().toISOString() 
            },
            tokensUsed: aiResponse.length,
            modelResponse: aiResponse.substring(0, 500),
            zoneFileMap
          };
          
          saveCache(result);
          console.log('[Architect] World cached');
          
          return result;
        }
      } catch (aiError: any) {
        console.error('[Architect] AI failed:', aiError?.message || aiError);
      }
    }
    
    console.log('[Architect] Falling back to rule-based...');
    const result = this.generateRuleBased(scannedFolders, folders);
    saveCache(result);
    return result;
  }
  
  private mapAIZones(aiZones: any[], scanned: Record<string, any>, folders: string[]): Zone[] {
    const pos: Record<string, { x: number; y: number }> = {};
    if (folders.length >= 4) {
      pos[folders[0]] = { x: 350, y: 350 };
      pos[folders[1]] = { x: 1400, y: 350 };
      pos[folders[2]] = { x: 875, y: 1400 };
      pos[folders[3]] = { x: 875, y: 700 };
    }
    
    return aiZones.map((z: any, i: number) => {
      const folder = z.folder || folders[i];
      const fc = scanned[folder]?.count || 1;
      const biome = getBiomeInfo(folder);
      const size = 380 + Math.min(fc / 20, 2) * 100;
      return {
        id: `zone-${folder}`,
        name: z.name || biome.name,
        description: z.desc || biome.description,
        position: pos[folder] || { x: 400 + (i % 3) * 600, y: 400 + Math.floor(i / 3) * 600 },
        connections: folders.filter(f => f !== folder).map(f => `zone-${f}`),
        learningModules: [`module-${folder}`],
        difficulty: fc > 30 ? 'advanced' : fc > 15 ? 'intermediate' : 'beginner',
        isUnlocked: i === 0,
        fileCount: fc,
        folderName: folder,
        theme: biome.theme,
        width: size,
        height: size
      };
    });
  }
  
  private generateRuleBased(scanned: Record<string, any>, folders: string[]): GenerationResult {
    const pos: Record<string, { x: number; y: number }> = {};
    if (folders.length >= 4) {
      pos[folders[0]] = { x: 350, y: 350 };
      pos[folders[1]] = { x: 1400, y: 350 };
      pos[folders[2]] = { x: 875, y: 1400 };
      pos[folders[3]] = { x: 875, y: 700 };
    }
    
    const zones: Zone[] = folders.map((folder, i) => {
      const fc = scanned[folder]?.count || 1;
      const biome = getBiomeInfo(folder);
      const size = 380 + Math.min(fc / 20, 2) * 100;
      return {
        id: `zone-${folder}`,
        name: biome.name,
        description: biome.description,
        position: pos[folder] || { x: 400 + (i % 3) * 600, y: 400 + Math.floor(i / 3) * 600 },
        connections: folders.filter(f => f !== folder).map(f => `zone-${f}`),
        learningModules: [`module-${folder}`],
        difficulty: fc > 30 ? 'advanced' : fc > 15 ? 'intermediate' : 'beginner',
        isUnlocked: i === 0,
        fileCount: fc,
        folderName: folder,
        theme: biome.theme,
        width: size,
        height: size
      };
    });
    
    const zoneFileMap: Record<string, string[]> = {};
    folders.forEach(f => zoneFileMap[`zone-${f}`] = scanned[f]?.files || []);
    
    return {
      worldMap: { 
        id: `world-${Date.now()}`, 
        name: 'The Obsidian Ledger', 
        description: 'Your codebase journey', 
        zones, 
        startingZoneId: zones[0]?.id, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      },
      tokensUsed: 0,
      modelResponse: 'Rule-based',
      zoneFileMap
    };
  }
  
  private getFallbackResult(): GenerationResult {
    const zones: Zone[] = [
      { id: 'zone-backend', name: 'The Stone Bastion', description: 'Server logic', position: { x: 350, y: 350 }, connections: ['zone-frontend'], learningModules: ['module-backend'], difficulty: 'beginner', isUnlocked: true, fileCount: 5, folderName: 'backend', theme: 'stone', width: 450, height: 450 },
      { id: 'zone-frontend', name: 'The Emerald Forest', description: 'UI components', position: { x: 1400, y: 350 }, connections: ['zone-backend'], learningModules: ['module-frontend'], difficulty: 'beginner', isUnlocked: true, fileCount: 5, folderName: 'frontend', theme: 'forest', width: 450, height: 450 }
    ];
    return { worldMap: { id: 'world-1', name: 'The Obsidian Ledger', description: 'Journey', zones, startingZoneId: 'zone-backend', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, tokensUsed: 0, modelResponse: 'Fallback', zoneFileMap: {} };
  }
  
  async generateFromDirectory(dirPath: string): Promise<GenerationResult> { return this.generateWorld(dirPath); }
  async generateFromFiles(files: any[]): Promise<GenerationResult> { return this.generateWorld('.'); }
  async generateFromPath(dirPath: string): Promise<GenerationResult> { return this.generateWorld(dirPath); }
  async generateFromScannedFiles(scannedFiles: Record<string, string>): Promise<GenerationResult> { return this.generateWorld('.'); }
}

export default ArchitectAgent;
