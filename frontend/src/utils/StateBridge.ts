/**
 * StateBridge - Communication Utility between React UI and Phaser Game
 * FIXED: Explicit API base URL + connection health check
 */

import { PlayerState, WorldMap, DialogueEntry } from '@obsidian-ledger/shared/types';

// Explicit API base URL - NO FALLBACK
const API_BASE = 'http://localhost:3001';

// Define the message types
export type BridgeMessageType = 
  | 'PLAYER_MOVE' 
  | 'ZONE_CHANGE' 
  | 'MODULE_COMPLETE' 
  | 'DIALOGUE_UPDATE' 
  | 'SYNC_STATE'
  | 'ZONE_UNLOCK'
  | 'NEW_WORLD_MAP';

export interface StateBridgeMessage {
  type: BridgeMessageType;
  payload: any;
  timestamp: string;
}

type MessageHandler = (message: StateBridgeMessage) => void;

// Interface for Phaser game events (minimal implementation)
interface PhaserGameEvents {
  emit(event: string, ...args: any[]): void;
  on(event: string, callback: (...args: any[]) => void): void;
}

interface PhaserGame {
  events: PhaserGameEvents;
}

export class StateBridge {
  private handlers: Set<MessageHandler> = new Set();
  private gameInstance: PhaserGame | null = null;
  private isConnected: boolean = false;

  /**
   * Check backend connection by pinging /health endpoint
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      this.isConnected = response.ok;
      console.log(`[StateBridge] Backend connection: ${this.isConnected ? 'ONLINE' : 'OFFLINE'}`);
      return this.isConnected;
    } catch (error) {
      console.error('[StateBridge] Connection check failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get the API base URL
   */
  getApiBase(): string {
    return API_BASE;
  }

  /**
   * Check if backend is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Register a message handler to receive messages from the game
   */
  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Send a message to all registered handlers (from React to Phaser or vice versa)
   */
  send(message: StateBridgeMessage): void {
    // If game instance exists, send to Phaser
    if (this.gameInstance) {
      this.gameInstance.events.emit('bridge-message', message);
    }
    
    // Notify local handlers
    this.handlers.forEach(handler => handler(message));
  }

  /**
   * Set the Phaser game instance for bidirectional communication
   */
  setGameInstance(game: PhaserGame): void {
    this.gameInstance = game;
    
    // Listen for messages from Phaser
    game.events.on('bridge-message', (message: StateBridgeMessage) => {
      this.handlers.forEach(handler => handler(message));
    });
  }

  /**
   * Get the current game instance
   */
  getGameInstance(): PhaserGame | null {
    return this.gameInstance;
  }

  /**
   * Convenience method to sync player state
   */
  syncPlayerState(playerState: PlayerState): void {
    this.send({
      type: 'SYNC_STATE',
      payload: { playerState },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Convenience method to sync world map
   */
  syncWorldMap(worldMap: WorldMap): void {
    this.send({
      type: 'SYNC_STATE',
      payload: { worldMap },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send world map with explicit NEW_WORLD_MAP event for Phaser
   */
  sendWorldMap(worldMap: WorldMap): void {
    console.log('StateBridge: Sending NEW_WORLD_MAP event', worldMap);
    this.send({
      type: 'NEW_WORLD_MAP',
      payload: { worldMap },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify zone change
   */
  notifyZoneChange(zoneId: string, position: { x: number; y: number }): void {
    this.send({
      type: 'ZONE_CHANGE',
      payload: { zoneId, position },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify module completion
   */
  notifyModuleComplete(moduleId: string): void {
    this.send({
      type: 'MODULE_COMPLETE',
      payload: { moduleId },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update dialogue history
   */
  updateDialogue(dialogueHistory: DialogueEntry[]): void {
    this.send({
      type: 'DIALOGUE_UPDATE',
      payload: { dialogueHistory },
      timestamp: new Date().toISOString()
    });
  }
}

// Singleton instance for global access
export const stateBridge = new StateBridge();

// Auto-check connection on load
stateBridge.checkConnection();
