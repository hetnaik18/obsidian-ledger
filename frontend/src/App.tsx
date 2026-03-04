/**
 * The Obsidian Ledger - Main App Component
 * PRODUCTION READY: Restored missing props and fixed API paths
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

const API_BASE = ""; 

async function getFilesForZone(folderName: string): Promise<{ path: string; allFiles: string[] }> {
  try {
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
  return { path: `${folderName}/index.ts`, allFiles: [] };
}

function App() {
  const [playerState, setPlayerState] = useState<PlayerState>({
    id: 'player-1', name: 'Hero', currentZoneId: 'zone-1', position: { x: 0, y: 0 },
    completedModules: [], unlockedZones: ['zone-1'], dialogueHistory: [],
    inventory: [], level: 1, experience: 0
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

  const fetchCodeForFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE}/api/file/read?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
    } catch (e) { console.log('Fetch error:', e); }
    return `// File not found: ${filePath}`;
  }, []);

  const loadZoneCode = useCallback(async (zone: Zone) => {
    const folder = zone.folderName || '';
    const fileData = await getFilesForZone(folder);
    const filePath = fileData.path;
    setCurrentFilePath(filePath);
    const code = await fetchCodeForFile(filePath);
    const header = `// 📁 Zone: ${zone.name}\n// 📄 File: ${filePath}\n// ════════════════════════════════════════\n\n`;
    setCurrentCode(header + code);
    setZoneFiles(fileData.allFiles);
  }, [fetchCodeForFile]);

  useEffect(() => {
    const handleZoneChange = (event: Event) => {
      const { zoneId, zoneName, folderName, fileCount } = (event as CustomEvent).detail;
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

  const handleQuerySage = async (query: string) => {
    addLog("Query: " + query, 'player');
    try {
      const response = await fetch(`${API_BASE}/api/query-sage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerState.id, query, context: { currentZoneName } })
      });
      const data = await response.json();
      setDialogueHistory(prev => [...prev, 
        { speaker: 'player' as const, message: query, timestamp: new Date().toISOString() }, 
        { speaker: 'sage' as const, message: data.response || 'I hear you.', timestamp: new Date().toISOString() }
      ]);
      return data;
    } catch (error) {
      addLog('Sage: Offline', 'sage');
      return { response: "The Sage is meditating..." };
    }
  };

  const handleSubmitCode = async (code: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/validate-code`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ code }) 
      });
      return await response.json();
    } catch (e) { return { success: false, feedback: 'Error.' }; }
  };

  const handleScanProject = useCallback(async (useCustom?: boolean, customPathInput?: string) => {
    setIsScanning(true);
    const scanPath = useCustom && customPathInput ? customPathInput : '.';
    try {
      const response = await fetch(`${API_BASE}/api/ingest`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ codebasePath: scanPath }) 
      });
      const data = await response.json();
      if (data.worldMap) {
        setWorldMap(data.worldMap);
        const startZone = data.worldMap.zones.find((z: Zone) => z.id === data.worldMap.startingZoneId);
        if (startZone) {
          setCurrentZoneName(startZone.name);
          await loadZoneCode(startZone);
          setPlayerState(prev => ({ ...prev, currentZoneId: startZone.id }));
        }
      }
    } catch (e) { addLog('⚠️ Backend unreachable', 'system'); }
    finally { setIsScanning(false); }
  }, [addLog, loadZoneCode]);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#050905]">Loading...</div>;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#050905' }}>
      <div style={{ width: 'calc(100vw - 350px)', display: 'flex', flexDirection: 'column', padding: '20px', gap: '15px', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: 'white', padding: '10px 20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚔️ THE OBSIDIAN LEDGER ⚔️</span>
          <button onClick={() => setShowTerminal(!showTerminal)} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', color: 'white', border: 'none' }}>
            <Terminal size={14} /> {showTerminal ? 'Hide' : 'Show'} Terminal
          </button>
        </div>
        
        <div style={{ flex: 1, border: '2px solid #a855f7', borderRadius: '15px', overflow: 'hidden', position: 'relative' }}>
          <GameContainer 
            playerState={playerState} worldMap={worldMap} isScanning={isScanning} 
            onPlayerMove={() => {}} onZoneEnter={async (id, name) => {
              setCurrentZoneName(name);
              setPlayerState(prev => ({ ...prev, currentZoneId: id }));
              if (worldMap) {
                const zone = worldMap.zones.find((z: Zone) => z.id === id);
                if (zone) await loadZoneCode(zone);
              }
            }} 
            scannedFiles={{}} 
          />
        </div>
        
        {showTerminal && (
          <div style={{ height: '180px', border: '2px solid #a855f7', borderRadius: '15px', overflow: 'hidden' }}>
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
        onSubmitCode={handleSubmitCode}  // <--- FIXED: Added this missing line
        codeContent={currentCode} 
        onCodeChange={setCurrentCode}
        customPath={customPath}
        onCustomPathChange={setCustomPath}
        currentModule={currentModule} // Added back for completeness
      />
    </div>
  );
}

export default App;
