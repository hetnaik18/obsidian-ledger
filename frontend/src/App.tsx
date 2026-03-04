/**
 * The Obsidian Ledger - Main App Component
 * PRODUCTION READY: Fixed API paths for Render deployment
 */

import { useState, useEffect, useCallback } from 'react';
import GameContainer from './components/GameContainer';
import Sidebar from './components/Sidebar';
import ConsoleTerminal from './components/ConsoleTerminal';
import { PlayerState, WorldMap, DialogueEntry, LearningModule, Zone } from '@obsidian-ledger/shared/types';
import { Terminal, FileCode } from 'lucide-react';

const DEFAULT_CODE = `// Welcome to The Obsidian Ledger
// 1. Enter a custom path in the sidebar OR
// 2. Click "Scan Project" to scan this monorepo
// 3. Walk your knight into a zone to see REAL code files!

function startJourney() {
  console.log("Welcome, Scholar!");
  return "Scan your project to begin...";
}
`;

// API CONFIG: Leave as empty string for production (Relative Paths)
const API_BASE = ""; 

// Get files for a zone from the ACTUAL SCANNED PROJECT
async function getFilesForZone(folderName: string): Promise<{ path: string; allFiles: string[] }> {
  try {
    // UPDATED: Removed localhost:3001
    const response = await fetch(`${API_BASE}/api/list-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: folderName })
    });
    
    if (response.ok) {
      const data = await response.json();
      const files = data.files || [];
      
      const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.json'];
      const codeFiles = files.filter((f: string) => {
        const ext = f.substring(f.lastIndexOf('.')).toLowerCase();
        return codeExtensions.includes(ext);
      });
      
      if (codeFiles.length > 0) return { path: codeFiles[0], allFiles: codeFiles };
      if (files.length > 0) return { path: files[0], allFiles: files };
    }
  } catch (e) {
    console.log('Error fetching zone files:', e);
  }
  
  const fallbackPaths: Record<string, string> = {
    'backend': 'backend/src/server.ts',
    'frontend': 'frontend/src/App.tsx',
    'shared': 'shared/types.ts',
  };
  
  return { 
    path: fallbackPaths[folderName.toLowerCase()] || `${folderName}/index.ts`, 
    allFiles: [] 
  };
}

function App() {
  const [playerState, setPlayerState] = useState<PlayerState>({
    id: 'player-1',
    name: 'Hero',
    currentZoneId: 'zone-1',
    position: { x: 0, y: 0 },
    completedModules: [],
    unlockedZones: ['zone-1'],
    dialogueHistory: [],
    inventory: [],
    level: 1,
    experience: 0
  });

  const [worldMap, setWorldMap] = useState<WorldMap | null>(null);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueEntry[]>([]);
  const [currentModule, setCurrentModule] = useState<LearningModule | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [currentZoneName, setCurrentZoneName] = useState<string>('The Entrance');
  const [currentZoneFileCount, setCurrentZoneFileCount] = useState<number>(0);
  const [currentFolderName, setCurrentFolderName] = useState<string>('');
  const [currentCode, setCurrentCode] = useState<string>(DEFAULT_CODE);
  const [currentFilePath, setCurrentFilePath] = useState<string>('');
  const [zoneFiles, setZoneFiles] = useState<string[]>([]);
  const [customPath, setCustomPath] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<Array<{id: number; timestamp: string; message: string; type: 'zone' | 'sage' | 'system' | 'player'}>>([]);
  const [showTerminal, setShowTerminal] = useState(true);

  const addLog = useCallback((message: string, type: 'zone' | 'sage' | 'system' | 'player' = 'system') => {
    setTerminalLogs(prev => [...prev, { id: Date.now(), timestamp: new Date().toISOString(), message, type }]);
  }, []);

  useEffect(() => { setIsLoading(false); }, []);

  // Fetch actual code file from backend
  const fetchCodeForFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      // UPDATED: Removed localhost:3001
      const response = await fetch(`${API_BASE}/api/file/read?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
    } catch (e) {
      console.log('Fetch error:', e);
    }
    return `// File not found: ${filePath}`;
  }, []);

  const loadZoneCode = useCallback(async (zone: Zone) => {
    const folder = zone.folderName || '';
    const fileCount = zone.fileCount || 0;
    const fileData = await getFilesForZone(folder);
    const filePath = fileData.path;
    const allFiles = fileData.allFiles;
    
    setCurrentFilePath(filePath);
    const code = await fetchCodeForFile(filePath);
    
    const header = `// ═══════════════════════════════════════════════════════════\n`;
    const header2 = `// 📁 Zone: ${zone.name}\n`;
    const header3 = `// 📂 Folder: ${folder}\n`;
    const header4 = `// 📄 File: ${filePath}\n`;
    const header5 = `// 📊 ${fileCount} files in this zone\n`;
    const header6 = `// ═══════════════════════════════════════════════════════════\n\n`;
    
    setCurrentCode(header + header2 + header3 + header4 + header5 + header6 + code);
    setZoneFiles(allFiles);
  }, [fetchCodeForFile]);

  useEffect(() => {
    const handleZoneChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { zoneId, zoneName, folderName, fileCount } = customEvent.detail;
      setPlayerState(prev => ({ ...prev, currentZoneId: zoneId }));
      setCurrentZoneName(zoneName);
      setCurrentFolderName(folderName || '');
      if (fileCount !== undefined) setCurrentZoneFileCount(fileCount);
      addLog("Entered " + zoneName, 'zone');
      if (worldMap) {
        const zone = worldMap.zones.find((z: Zone) => z.id === zoneId);
        if (zone) loadZoneCode(zone);
      }
    };
    window.addEventListener('zone-change', handleZoneChange);
    return () => window.removeEventListener('zone-change', handleZoneChange);
  }, [worldMap, loadZoneCode, addLog]);

  useEffect(() => {
    if (!worldMap || !playerState.currentZoneId) return;
    const zone = worldMap.zones.find((z: Zone) => z.id === playerState.currentZoneId);
    if (zone) loadZoneCode(zone);
  }, [playerState.currentZoneId, worldMap, loadZoneCode]);

  const handleQuerySage = async (query: string) => {
    addLog("Query: " + query, 'player');
    const sageContext = {
      currentZoneId: playerState.currentZoneId,
      codeContent: currentCode.substring(0, 500),
      currentZone: currentZoneName,
      currentZoneFolder: currentFolderName,
      contextString: `In zone: ${currentZoneName} (folder: ${currentFolderName}, files: ${currentZoneFileCount})`
    };
    try {
      // UPDATED: Removed localhost:3001
      const response = await fetch(`${API_BASE}/api/query-sage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerState.id, query, context: sageContext })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      setDialogueHistory(prev => [...prev, 
        { speaker: 'player' as const, message: query, timestamp: new Date().toISOString() }, 
        { speaker: 'sage' as const, message: data.response || 'I hear you.', timestamp: new Date().toISOString() }
      ]);
      addLog("Sage: " + (data.response || 'Response').substring(0, 50), 'sage');
      return data;
    } catch (error) {
      const fallback = `The Sage is meditating...`;
      addLog('Sage: Offline', 'sage');
      setDialogueHistory(prev => [...prev, 
        { speaker: 'player' as const, message: query, timestamp: new Date().toISOString() }, 
        { speaker: 'sage' as const, message: fallback, timestamp: new Date().toISOString() }
      ]);
      return { response: fallback };
    }
  };

  const handleScanProject = useCallback(async (useCustom?: boolean, customPathInput?: string) => {
    setIsScanning(true);
    const scanPath = useCustom && customPathInput ? customPathInput : '.';
    addLog("Scanning: " + scanPath, 'system');
    
    try {
      // UPDATED: Removed localhost:3001
      const response = await fetch(`${API_BASE}/api/ingest`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ codebasePath: scanPath }) 
      });
      
      if (!response.ok) throw new Error("HTTP");
      const data = await response.json();
      addLog('✅ World Generated - ' + data.worldMap?.zones?.length + ' zones', 'system');
      
      if (data.worldMap && data.worldMap.zones?.length > 0) {
        setWorldMap(data.worldMap);
        const startZone = data.worldMap.zones.find((z: Zone) => z.id === data.worldMap.startingZoneId);
        if (startZone) {
          setCurrentZoneName(startZone.name);
          setCurrentFolderName(startZone.folderName || '');
          setCurrentZoneFileCount(startZone.fileCount || 0);
          await loadZoneCode(startZone);
          setPlayerState(prev => ({ ...prev, currentZoneId: startZone.id }));
        }
      }
    } catch (e) {
      addLog('⚠️ Backend unreachable', 'system');
      setWorldMap(null);
    } finally { setIsScanning(false); }
  }, [addLog, loadZoneCode]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#050905' }}>
      <div style={{ width: 'calc(100vw - 350px)', display: 'flex', flexDirection: 'column', padding: '20px', gap: '15px', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: 'white', padding: '10px 20px', fontWeight: 'bold', textAlign: 'center', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: '2px solid #a855f7', flexShrink: 0 }}>
          <span style={{ fontSize: '18px', letterSpacing: '2px' }}>⚔️ THE OBSIDIAN LEDGER ⚔️</span>
          <button onClick={() => setShowTerminal(!showTerminal)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer' }}>
            <Terminal size={14} />{showTerminal ? 'Hide' : 'Show'} Terminal
          </button>
        </div>
        
        <div style={{ flex: 1, width: '100%', border: '2px solid #a855f7', borderRadius: '15px', overflow: 'hidden', position: 'relative' }}>
          <GameContainer 
            playerState={playerState} 
            worldMap={worldMap} 
            isScanning={isScanning} 
            onPlayerMove={() => {}} 
            onZoneEnter={async (id, name) => {
              setCurrentZoneName(name);
              setPlayerState(prev => ({ ...prev, currentZoneId: id }));
              if (worldMap) {
                const zone = worldMap.zones.find((z: Zone) => z.id === id);
                if (zone) await loadZoneCode(zone);
              }
            }} 
            scannedFiles={{}} 
          />
          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(5, 5, 5, 0.9)', border: '2px solid #a855f7', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
            <div style={{ color: '#a855f7', fontWeight: 'bold' }}>Lvl {playerState.level} Hero</div>
            <div style={{ opacity: 0.8 }}>📍 {currentZoneName}</div>
          </div>
        </div>
        
        {showTerminal && (
          <div style={{ width: '100%', height: '180px', border: '2px solid #a855f7', borderRadius: '15px', overflow: 'hidden' }}>
            <ConsoleTerminal logs={terminalLogs} />
          </div>
        )}
      </div>
      
      <Sidebar 
        playerState={playerState} 
        dialogueHistory={dialogueHistory} 
        currentZoneName={currentZoneName} 
        currentZoneFileCount={currentZoneFileCount} 
        isScanning={isScanning} 
        onScanProject={handleScanProject} 
        onQuerySage={handleQuerySage} 
        codeContent={currentCode} 
        onCodeChange={setCurrentCode}
        customPath={customPath}
        onCustomPathChange={setCustomPath}
      />
    </div>
  );
}

export default App;
