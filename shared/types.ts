/**
 * The Obsidian Ledger - Shared Type Definitions
 * Interfaces for the 2D RPG world representing technical documentation
 */

// Represents a zone in the game world (e.g., a module or chapter)
export interface Zone {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  connections: string[]; // IDs of connected zones
  learningModules: string[]; // IDs of learning modules in this zone
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isUnlocked: boolean;
  filePath?: string; // Path to the main file or directory this zone represents
  fileCount?: number; // Number of files in this zone for dynamic sizing
  folderName?: string; // Original folder name for biome mapping (e.g., 'backend', 'frontend', 'shared')
  width?: number; // Zone width for rendering (300 + fileCount * 25)
  height?: number; // Zone height for rendering (300 + fileCount * 25)
  theme?: string; // Theme for rendering: 'stone', 'forest', 'marble', 'mine'
}

// Represents a learning module (documented concept/topic)
export interface LearningModule {
  id: string;
  title: string;
  description?: string;
  content: string;
  zoneId: string;
  prerequisites: string[]; // IDs of required modules
  isCompleted: boolean;
  codeExamples?: CodeExample[];
}

export interface CodeExample {
  language: string;
  code: string;
  explanation: string;
}

// Represents the entire world map
export interface WorldMap {
  id: string;
  name: string;
  description: string;
  zones: Zone[];
  startingZoneId: string;
  createdAt: string;
  updatedAt: string;
}

// Player state in the game
export interface PlayerState {
  id: string;
  name: string;
  currentZoneId: string;
  position: { x: number; y: number };
  completedModules: string[];
  unlockedZones: string[];
  dialogueHistory: DialogueEntry[];
  inventory: string[];
  level: number;
  experience: number;
}

export interface DialogueEntry {
  speaker: 'player' | 'sage' | 'system';
  message: string;
  timestamp: string;
}

// API Request/Response types
export interface IngestRequest {
  codebaseUrl?: string;
  codebasePath?: string;
  rawCode?: string;
  documentation?: string;
}

export interface IngestResponse {
  worldMap: WorldMap;
  scannedProjectRoot?: string;  // Path to the scanned project for file lookups
  message: string;
}

export interface QuerySageRequest {
  playerId: string;
  query: string;
  context?: {
    currentZoneId?: string;
    currentModuleId?: string;
    currentZoneName?: string;
    currentZoneFolder?: string;
    contextString?: string;
  };
}

export interface QuerySageResponse {
  response: string;
  suggestions?: string[];
  updatedDialogueHistory: DialogueEntry[];
}

// StateBridge message types for React <-> Phaser communication
export interface StateBridgeMessage {
  type: 'PLAYER_MOVE' | 'ZONE_CHANGE' | 'MODULE_COMPLETE' | 'DIALOGUE_UPDATE' | 'SYNC_STATE';
  payload: any;
  timestamp: string;
}
