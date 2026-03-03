/**
 * The Obsidian Ledger - Main App Component
 * ENHANCED: Real file loading from scanned projects + zoneFileMap support
 */

import { useState, useEffect, useCallback } from 'react';
import GameContainer from './components/GameContainer';
import Sidebar from './components/Sidebar';
import ConsoleTerminal from './components/ConsoleTerminal';
import { PlayerState, WorldMap, DialogueEntry, LearningModule, Zone } from '@obsidian-ledger/shared/types';
import { Terminal, FileCode, FolderOpen } from 'lucide-react';

const DEFAULT_CODE = `// Welcome to The Obsidian Ledger
// 1. Enter a custom path in the sidebar OR
// 2. Click "Scan Project" to scan this monorepo
// 3. Walk your knight into a zone to see REAL code files!

function startJourney() {
  console.log("Welcome, Scholar!");
  return "Scan your project to begin...";
}
`;

// Get files for a zone from the ACTUAL SCANNED PROJECT
async function getFilesForZone(folderName: string): Promise<{ path: string; allFiles: string[] }> {
  try {
    // Fetch actual files from the scanned project via backend
    const response = await fetch('http://localhost:3001/api/list-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: folderName })
    });
    
    if (response.ok) {
      const data = await response.json();
      const files = data.files || [];
      
      // Filter to common code files
      const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.json'];
      const codeFiles = files.filter((f: string) => {
        const ext = f.substring(f.lastIndexOf('.')).toLowerCase();
        return codeExtensions.includes(ext);
      });
      
      if (codeFiles.length > 0) {
        return { path: codeFiles[0], allFiles: codeFiles };
      }
      
      if (files.length > 0) {
        return { path: files[0], allFiles: files };
      }
    }
  } catch (e) {
    console.log('Error fetching zone files:', e);
  }
  
  // Fallback
  const fallbackPaths: Record<string, string> = {
    'backend': 'backend/src/server.ts',
    'frontend': 'frontend/src/App.tsx',
    'shared': 'shared/types.ts',
    'scrapers': 'scrapers/immobiliare_collector.py',
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
      const response = await fetch(`http://localhost:3001/api/file/read?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
    } catch (e) {
      console.log('Fetch error:', e);
    }
    return `// File not found: ${filePath}`;
  }, []);

  // Load code when zone changes - USES ACTUAL FILES FROM SCANNED PROJECT
  const loadZoneCode = useCallback(async (zone: Zone) => {
    const folder = zone.folderName || '';
    const fileCount = zone.fileCount || 0;
    
    // Get files from the scanned project
    const fileData = await getFilesForZone(folder);
    const filePath = fileData.path;
    const allFiles = fileData.allFiles;
    
    setCurrentFilePath(filePath);
    console.log(`📂 Loading files for zone "${zone.name}":`, { folder, filePath, totalFiles: allFiles.length });
    
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

  // Zone change handler
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
        if (zone) {
          loadZoneCode(zone);
        }
      }
    };
    window.addEventListener('zone-change', handleZoneChange);
    return () => window.removeEventListener('zone-change', handleZoneChange);
  }, [worldMap, loadZoneCode, addLog]);

  useEffect(() => {
    if (!worldMap || !playerState.currentZoneId) return;
    const zone = worldMap.zones.find((z: Zone) => z.id === playerState.currentZoneId);
    if (zone) {
      loadZoneCode(zone);
    }
  }, [playerState.currentZoneId, worldMap, loadZoneCode]);

  const handleModuleComplete = useCallback((moduleId: string) => {
    setPlayerState(prev => {
      if (prev.completedModules.includes(moduleId)) return prev;
      return { ...prev, completedModules: [...prev.completedModules, moduleId], experience: prev.experience + 100, level: Math.floor((prev.experience + 100) / 500) + 1 };
    });
  }, []);

  const getZoneGreeting = (zoneName: string, folderName?: string, fileCount?: number): string => {
    const fc = fileCount || 0;
    const fn = folderName || '';
    const greetings: Record<string, string> = { 
      'The Stone Bastion': `Welcome to The Stone Bastion! This ${fn} fortress contains ${fc} scripts guarding the server logic.`,
      'The Emerald Forest': `Welcome to The Emerald Forest! ${fc} UI components await in this ${fn} wilderness.`,
      'The Crystal Library': `Welcome to The Crystal Library! ${fc} type definitions shine in this ${fn} archive.`,
      'The Data Mines': `Welcome to The Data Mines! ${fc} data veins run deep in this ${fn} realm.`,
      'The Guild Hall': `Welcome to The Guild Hall! Services of ${fn} guild together here.`,
      "The Tinker's Workshop": `Welcome to The Tinker's Workshop! Tools and utilities for ${fn} are here.`,
    };
    return greetings[zoneName] || `Welcome to ${zoneName}! This ${fn} realm contains ${fc} mysteries.`;
  };

  const handleZoneEnter = useCallback(async (zoneId: string, zoneName: string) => {
    setCurrentZoneName(zoneName);
    setPlayerState(prev => ({ ...prev, currentZoneId: zoneId }));
    addLog("User entered " + zoneName, 'zone');
    
    if (worldMap) {
      const zone = worldMap.zones.find((z: Zone) => z.id === zoneId);
      if (zone) {
        setCurrentFolderName(zone.folderName || '');
        setCurrentZoneFileCount(zone.fileCount || 0);
        await loadZoneCode(zone);
        
        setDialogueHistory(prev => [...prev, { 
          speaker: 'sage' as const, 
          message: getZoneGreeting(zone.name, zone.folderName, zone.fileCount), 
          timestamp: new Date().toISOString() 
        }]);
      }
    }
  }, [worldMap, loadZoneCode, addLog]);

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
      const response = await fetch('http://localhost:3001/query-sage', {
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
      const fallback = `In ${currentZoneName} (${currentFolderName}), ${currentZoneFileCount} files await your exploration. The Sage is meditating...`;
      addLog('Sage: Offline', 'sage');
      setDialogueHistory(prev => [...prev, 
        { speaker: 'player' as const, message: query, timestamp: new Date().toISOString() }, 
        { speaker: 'sage' as const, message: fallback, timestamp: new Date().toISOString() }
      ]);
      return { response: fallback };
    }
  };

  const handleSubmitCode = async (code: string) => {
    if (!currentModule) return { success: false, feedback: 'No module.' };
    try {
      const response = await fetch('http://localhost:3001/validate-code', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ code, moduleId: currentModule.id, module: currentModule }) 
      });
      const data = await response.json();
      if (data.success && data.completedModuleId) handleModuleComplete(data.completedModuleId);
      return data;
    } catch (e) { return { success: false, feedback: 'Error.' }; }
  };

  const handleScanProject = useCallback(async (useCustom?: boolean, customPathInput?: string) => {
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 1500));
    
    const scanPath = useCustom && customPathInput ? customPathInput : '.';
    addLog("Scanning: " + scanPath, 'system');
    
    try {
      const response = await fetch('http://localhost:3001/ingest', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ codebasePath: scanPath }) 
      });
      
      if (!response.ok) throw new Error("HTTP");
      
      const data = await response.json();
      
      console.log('🔍 RAW API RESPONSE:', JSON.stringify(data, null, 2));
      console.log('🔍 ZONES:', data.worldMap?.zones?.map((z: any) => ({ 
        name: z.name, 
        theme: z.theme, 
        folderName: z.folderName,
        fileCount: z.fileCount 
      })));
      
      addLog('✅ World Generated - ' + data.worldMap?.zones?.length + ' zones', 'system');
      
      if (data.worldMap && data.worldMap.zones && data.worldMap.zones.length > 0) {
        setWorldMap(data.worldMap);
        
        const startZone = data.worldMap.zones.find((z: Zone) => z.id === data.worldMap.startingZoneId);
        if (startZone) {
          setCurrentZoneName(startZone.name);
          setCurrentFolderName(startZone.folderName || '');
          setCurrentZoneFileCount(startZone.fileCount || 0);
          
          await loadZoneCode(startZone);
          
          setDialogueHistory([{ 
            speaker: 'sage' as const, 
            message: getZoneGreeting(startZone.name, startZone.folderName, startZone.fileCount), 
            timestamp: new Date().toISOString() 
          }]);
          
          setPlayerState(prev => ({ ...prev, currentZoneId: startZone.id }));
        }
      } else {
        addLog('⚠️ No folders found in project', 'system');
        setWorldMap(null);
      }
    } catch (e) {
      console.error('Scan failed:', e);
      addLog('⚠️ Backend unreachable', 'system');
      setWorldMap(null);
    }
    finally { setIsScanning(false); }
  }, [addLog, loadZoneCode]);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#050905]"><div className="text-xl text-[#a855f7]">Loading...</div></div>;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#050905' }}>
      <div style={{ width: 'calc(100vw - 350px)', display: 'flex', flexDirection: 'column', padding: '20px', gap: '15px', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: 'white', padding: '10px 20px', fontWeight: 'bold', textAlign: 'center', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: '2px solid #a855f7', flexShrink: 0, boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)' }}>
          <span style={{ fontSize: '18px', letterSpacing: '2px' }}>⚔️ THE OBSIDIAN LEDGER ⚔️</span>
          <button onClick={() => setShowTerminal(!showTerminal)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px', border: 'none', color: 'white', cursor: 'pointer' }}>
            <Terminal size={14} />{showTerminal ? 'Hide' : 'Show'} Terminal
          </button>
        </div>
        
        <div style={{ flex: 1, width: '100%', border: '2px solid #a855f7', borderRadius: '15px', overflow: 'hidden', position: 'relative', boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)' }}>
          <GameContainer 
            playerState={playerState} 
            worldMap={worldMap} 
            isScanning={isScanning} 
            onPlayerMove={() => {}} 
            onZoneEnter={handleZoneEnter} 
            scannedFiles={{}} 
          />
          
          {/* Player Stats Overlay */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(5, 5, 5, 0.9)', border: '2px solid #a855f7', padding: '10px', borderRadius: '8px', fontSize: '12px', minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: '#fbbf24' }}>★</span>
              <span style={{ color: '#a855f7', fontWeight: 'bold' }}>Lvl {playerState.level}</span>
              <span style={{ color: '#d8b4fe', marginLeft: 'auto' }}>XP: {playerState.experience}</span>
            </div>
            <div style={{ opacity: 0.8, marginBottom: '2px' }}>📍 {currentZoneName}</div>
            <div style={{ opacity: 0.6, fontSize: '10px' }}>📂 {currentFolderName} ({currentZoneFileCount} files)</div>
            {currentFilePath && (
              <div style={{ opacity: 0.6, fontSize: '10px', marginTop: '4px', borderTop: '1px solid #a855f7', paddingTop: '4px' }}>
                <FileCode size={10} style={{ display: 'inline', marginRight: '4px' }} />
                {currentFilePath}
              </div>
            )}
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
        currentModule={currentModule} 
        currentZoneName={currentZoneName} 
        currentZoneFileCount={currentZoneFileCount} 
        isScanning={isScanning} 
        onScanProject={handleScanProject} 
        onQuerySage={handleQuerySage} 
        onSubmitCode={handleSubmitCode} 
        codeContent={currentCode} 
        onCodeChange={setCurrentCode}
        customPath={customPath}
        onCustomPathChange={setCustomPath}
      />
    </div>
  );
}

export default App;

