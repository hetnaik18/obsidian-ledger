/**
 * The Obsidian Ledger - Main App Component
 * FINAL PRODUCTION FIX: Removed all localhost references
 */

import { useState, useEffect, useCallback } from 'react';
import GameContainer from './components/GameContainer';
import Sidebar from './components/Sidebar';
import ConsoleTerminal from './components/ConsoleTerminal';
import { PlayerState, WorldMap, DialogueEntry, LearningModule, Zone } from '@obsidian-ledger/shared/types';
import { Terminal, FileCode } from 'lucide-react';

const DEFAULT_CODE = `// Welcome to The Obsidian Ledger\nfunction startJourney() {\n  return "Scan your project to begin...";\n}`;

// CRITICAL: This must be an empty string for Render
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
      return { path: files[0] || '', allFiles: files };
    }
  } catch (e) { console.log('Error:', e); }
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
  const [currentModule] = useState<LearningModule | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [currentZoneName, setCurrentZoneName] = useState<string>('The Entrance');
  const [currentZoneFileCount, setCurrentZoneFileCount] = useState<number>(0);
  const [currentFolderName, setCurrentFolderName] = useState<string>('');
  const [currentCode, setCurrentCode] = useState<string>(DEFAULT_CODE);
  const [currentFilePath, setCurrentFilePath] = useState<string>('');
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
    return `// File not found`;
  }, []);

  const loadZoneCode = useCallback(async (zone: Zone) => {
    const fileData = await getFilesForZone(zone.folderName || '');
    setCurrentFilePath(fileData.path);
    const code = await fetchCodeForFile(fileData.path);
    setCurrentCode(`// 📁 Zone: ${zone.name}\n// 📄 File: ${fileData.path}\n\n${code}`);
  }, [fetchCodeForFile]);

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
    } catch (error) { return { response: "The Sage is offline." }; }
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
        addLog('✅ World Generated', 'system');
      }
    } catch (e) { addLog('⚠️ Scan Failed', 'system'); }
    finally { setIsScanning(false); }
  }, [addLog]);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#050905]">Loading...</div>;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#050905' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '15px' }}>
        <div style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: 'white', padding: '10px 20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between' }}>
          <span>⚔️ THE OBSIDIAN LEDGER ⚔️</span>
          <button onClick={() => setShowTerminal(!showTerminal)} style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', cursor: 'pointer' }}>Terminal</button>
        </div>
        <div style={{ flex: 1, border: '2px solid #a855f7', borderRadius: '15px', overflow: 'hidden' }}>
          <GameContainer 
            playerState={playerState} worldMap={worldMap} isScanning={isScanning} 
            onZoneEnter={async (id, name) => {
              setCurrentZoneName(name);
              if (worldMap) {
                const zone = worldMap.zones.find((z: Zone) => z.id === id);
                if (zone) await loadZoneCode(zone);
              }
            }} 
            scannedFiles={{}} 
            onPlayerMove={() => {}}
          />
        </div>
        {showTerminal && <div style={{ height: '180px', border: '2px solid #a855f7', borderRadius: '15px' }}><ConsoleTerminal logs={terminalLogs} /></div>}
      </div>
      <Sidebar 
        playerState={playerState} dialogueHistory={dialogueHistory} 
        currentZoneName={currentZoneName} currentZoneFileCount={currentZoneFileCount} 
        isScanning={isScanning} onScanProject={handleScanProject} 
        onQuerySage={handleQuerySage} onSubmitCode={async () => ({success: true})} 
        codeContent={currentCode} onCodeChange={setCurrentCode}
        customPath={customPath} onCustomPathChange={setCustomPath}
        currentModule={currentModule}
      />
    </div>
  );
}

export default App;
