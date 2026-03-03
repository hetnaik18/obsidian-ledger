/**
 * GameContainer - Phaser Game Wrapper Component
 * HACKATHON EDITION: Enhanced visuals with more biomes and stunning effects
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { PlayerState, WorldMap, Zone } from '@obsidian-ledger/shared/types';
import { Map as MapIcon } from 'lucide-react';

interface GameContainerProps {
  playerState: PlayerState;
  worldMap: WorldMap | null;
  isScanning?: boolean;
  onPlayerMove: (x: number, y: number) => void;
  onZoneEnter?: (zoneId: string, zoneName: string) => void;
  scannedFiles?: Record<string, string>;
}

let sceneRef: any = null;

declare global {
  interface Window {
    phaserGame?: Phaser.Game;
    phaserScene?: MainScene;
  }
}

const TILE_SIZE = 32;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1800;

// HACKATHON EDITION: Enhanced zone themes with more variety!
const ZONE_THEMES: Record<string, { 
  bg: number; border: number; accent: number; 
  label: string; name: string; 
  gradient?: [number, number];
  particleColor?: number;
  buildingColor?: number;
  pathColor?: number;
}> = {
  // Backend/Server themes - Stone & Fortress
  'backend': { 
    bg: 0x2d2438, border: 0x8b5cf6, accent: 0xa78bfa, 
    label: '🏰', name: 'The Stone Bastion',
    gradient: [0x1a1428, 0x2d2438],
    particleColor: 0x8b5cf6,
    buildingColor: 0x6d28d9,
    pathColor: 0x5a4a7a
  },
  'server': { 
    bg: 0x2d2438, border: 0x8b5cf6, accent: 0xa78bfa, 
    label: '🏰', name: 'The Stone Bastion',
    gradient: [0x1a1428, 0x2d2438],
    particleColor: 0x8b5cf6,
    buildingColor: 0x6d28d9,
    pathColor: 0x5a4a7a
  },
  'api': { 
    bg: 0x352d4a, border: 0x9333ea, accent: 0xc084fc, 
    label: '🚪', name: 'The API Gateway',
    gradient: [0x251a35, 0x352d4a],
    particleColor: 0x9333ea,
    buildingColor: 0x7c3aed,
    pathColor: 0x5a4a7a
  },
  
  // Frontend themes - Forest & Nature
  'frontend': { 
    bg: 0x1a2d1a, border: 0x22c55e, accent: 0x4ade80, 
    label: '🌲', name: 'The Emerald Forest',
    gradient: [0x0f1a0f, 0x1a2d1a],
    particleColor: 0x22c55e,
    buildingColor: 0x15803d,
    pathColor: 0x3d5a3d
  },
  'client': { 
    bg: 0x1a2d1a, border: 0x22c55e, accent: 0x4ade80, 
    label: '🌲', name: 'The Emerald Forest',
    gradient: [0x0f1a0f, 0x1a2d1a],
    particleColor: 0x22c55e,
    buildingColor: 0x15803d,
    pathColor: 0x3d5a3d
  },
  'web': { 
    bg: 0x1f2d1f, border: 0x16a34a, accent: 0x3dd68c, 
    label: '🌿', name: 'The Web Meadow',
    gradient: [0x141a14, 0x1f2d1f],
    particleColor: 0x16a34a,
    buildingColor: 0x166534,
    pathColor: 0x3a5a3a
  },
  'ui': { 
    bg: 0x1f2d1f, border: 0x16a34a, accent: 0x3dd68c, 
    label: '🌳', name: 'The Component Grove',
    gradient: [0x141a14, 0x1f2d1f],
    particleColor: 0x16a34a,
    buildingColor: 0x166534,
    pathColor: 0x3a5a3a
  },
  'components': { 
    bg: 0x243324, border: 0x2d7a3d, accent: 0x5aeb7a, 
    label: '🪵', name: 'The Widget Woods',
    gradient: [0x1a241a, 0x243324],
    particleColor: 0x2d7a3d,
    buildingColor: 0x1e5c2e,
    pathColor: 0x3d5a3d
  },
  'pages': { 
    bg: 0x2d3a2d, border: 0x3d8a4d, accent: 0x6adb7d, 
    label: '🗺️', name: 'The Page Plains',
    gradient: [0x1f2a1f, 0x2d3a2d],
    particleColor: 0x3d8a4d,
    buildingColor: 0x2d6a3d,
    pathColor: 0x4a6a4a
  },
  'views': { 
    bg: 0x213121, border: 0x2a6a3a, accent: 0x4aba5a, 
    label: '🏞️', name: 'The View Valley',
    gradient: [0x162116, 0x213121],
    particleColor: 0x2a6a3a,
    buildingColor: 0x1e4a2a,
    pathColor: 0x3a5a3a
  },
  
  // Shared/Library themes - Marble & Crystal
  'shared': { 
    bg: 0x2a2a35, border: 0xd4a520, accent: 0xfcd34d, 
    label: '📚', name: 'The Crystal Library',
    gradient: [0x1a1a25, 0x2a2a35],
    particleColor: 0xd4a520,
    buildingColor: 0xb8860b,
    pathColor: 0x5a5a6a
  },
  'types': { 
    bg: 0x2a2a35, border: 0xd4a520, accent: 0xfcd34d, 
    label: '📜', name: 'The Type Archives',
    gradient: [0x1a1a25, 0x2a2a35],
    particleColor: 0xd4a520,
    buildingColor: 0xb8860b,
    pathColor: 0x5a5a6a
  },
  'common': { 
    bg: 0x32323d, border: 0xe4b727, accent: 0xffe066, 
    label: '⚖️', name: 'The Common Court',
    gradient: [0x22222d, 0x32323d],
    particleColor: 0xe4b727,
    buildingColor: 0xc99f1a,
    pathColor: 0x5a5a6a
  },
  'lib': { 
    bg: 0x2f2f3d, border: 0xd4a520, accent: 0xfcd34d, 
    label: '🏛️', name: 'The Grand Library',
    gradient: [0x1f1f2d, 0x2f2f3d],
    particleColor: 0xd4a520,
    buildingColor: 0xb8860b,
    pathColor: 0x555566
  },
  
  // Data/Mine themes - Underground & Treasure
  'scrapers': { 
    bg: 0x2a1f1f, border: 0xef4444, accent: 0xf87171, 
    label: '⛏️', name: 'The Data Mines',
    gradient: [0x1a1414, 0x2a1f1f],
    particleColor: 0xef4444,
    buildingColor: 0xdc2626,
    pathColor: 0x5a3a3a
  },
  'data': { 
    bg: 0x1f2a3a, border: 0x3b82f6, accent: 0x60a5fa, 
    label: '💎', name: 'The Data Vault',
    gradient: [0x141a25, 0x1f2a3a],
    particleColor: 0x3b82f6,
    buildingColor: 0x2563eb,
    pathColor: 0x3a4a5a
  },
  'database': { 
    bg: 0x1a2535, border: 0x0ea5e9, accent: 0x38bdf8, 
    label: '🕳️', name: 'The Underground Depths',
    gradient: [0x101820, 0x1a2535],
    particleColor: 0x0ea5e9,
    buildingColor: 0x0284c7,
    pathColor: 0x2a3a4a
  },
  'models': { 
    bg: 0x2a2535, border: 0x8b5cf6, accent: 0xa78bfa, 
    label: '🛕', name: 'The Model Monastery',
    gradient: [0x1a1525, 0x2a2535],
    particleColor: 0x8b5cf6,
    buildingColor: 0x7c3aed,
    pathColor: 0x4a3a5a
  },
  
  // Services/Logic themes - Guild & Tower
  'services': { 
    bg: 0x2d2820, border: 0xea580c, accent: 0xfb923c, 
    label: '🎭', name: 'The Guild Hall',
    gradient: [0x1d1810, 0x2d2820],
    particleColor: 0xea580c,
    buildingColor: 0xdd4806,
    pathColor: 0x5a4a3a
  },
  'controllers': { 
    bg: 0x28202d, border: 0xa855f7, accent: 0xc084fc, 
    label: '🗼', name: 'The Command Tower',
    gradient: [0x18101d, 0x28202d],
    particleColor: 0xa855f7,
    buildingColor: 0x9333ea,
    pathColor: 0x4a3a5a
  },
  'utils': { 
    bg: 0x282820, border: 0xca8a04, accent: 0xfacc15, 
    label: '🔧', name: "The Tinker's Workshop",
    gradient: [0x181510, 0x282820],
    particleColor: 0xca8a04,
    buildingColor: 0xa16207,
    pathColor: 0x5a5a3a
  },
  'helpers': { 
    bg: 0x2a2820, border: 0xd97706, accent: 0xf59e0b, 
    label: '🏠', name: "The Helper's Hut",
    gradient: [0x1a1810, 0x2a2820],
    particleColor: 0xd97706,
    buildingColor: 0xb45309,
    pathColor: 0x5a4a3a
  },
  'middleware': { 
    bg: 0x252530, border: 0x6366f1, accent: 0x818cf8, 
    label: '🛡️', name: 'The Guardian Gate',
    gradient: [0x151520, 0x252530],
    particleColor: 0x6366f1,
    buildingColor: 0x4f46e5,
    pathColor: 0x4a4a5a
  },
  'routes': { 
    bg: 0x2a2a35, border: 0x14b8a6, accent: 0x2dd4bf, 
    label: '🛤️', name: 'The Route Crossroads',
    gradient: [0x1a1a25, 0x2a2a35],
    particleColor: 0x14b8a6,
    buildingColor: 0x0d9488,
    pathColor: 0x4a5a5a
  },
  
  // Config/Docs themes
  'config': { 
    bg: 0x252535, border: 0x64748b, accent: 0x94a3b8, 
    label: '📋', name: 'The Strategy Room',
    gradient: [0x151525, 0x252535],
    particleColor: 0x64748b,
    buildingColor: 0x475569,
    pathColor: 0x4a5a6a
  },
  'scripts': { 
    bg: 0x28252a, border: 0xd946ef, accent: 0xe879f9, 
    label: '⛩️', name: 'The Script Shrine',
    gradient: [0x18151a, 0x28252a],
    particleColor: 0xd946ef,
    buildingColor: 0xc026d3,
    pathColor: 0x5a4a5a
  },
  'tests': { 
    bg: 0x2a2025, border: 0xf43f5e, accent: 0xfb7185, 
    label: '⚔️', name: 'The Trial Arena',
    gradient: [0x1a1015, 0x2a2025],
    particleColor: 0xf43f5e,
    buildingColor: 0xe11d48,
    pathColor: 0x5a3a4a
  },
  'docs': { 
    bg: 0x252530, border: 0x06b6d4, accent: 0x22d3ee, 
    label: '🛕', name: 'The Knowledge Temple',
    gradient: [0x151520, 0x252530],
    particleColor: 0x06b6d4,
    buildingColor: 0x0891b2,
    pathColor: 0x4a5a6a
  },
  'public': { 
    bg: 0x1f251f, border: 0x84cc16, accent: 0xa3e635, 
    label: '🏘️', name: 'The Town Square',
    gradient: [0x141a14, 0x1f251f],
    particleColor: 0x84cc16,
    buildingColor: 0x65a30d,
    pathColor: 0x3a5a3a
  },
  'assets': { 
    bg: 0x2a2520, border: 0xf59e0b, accent: 0xfbbf24, 
    label: '💰', name: 'The Treasure Chamber',
    gradient: [0x1a1510, 0x2a2520],
    particleColor: 0xf59e0b,
    buildingColor: 0xd97706,
    pathColor: 0x5a4a3a
  },
  
  // Default fallback
  'default': { 
    bg: 0x2a2a3a, border: 0x6a5acd, accent: 0x9370db, 
    label: '🏝️', name: 'The Mysterious Realm',
    gradient: [0x1a1a2a, 0x2a2a3a],
    particleColor: 0x6a5acd,
    buildingColor: 0x5b4eb0,
    pathColor: 0x5a5a6a
  },
};

class MainScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  playerState!: PlayerState;
  worldMap: WorldMap | null = null;
  scannedFiles: Record<string, string> = {};
  onPlayerMove!: (x: number, y: number) => void;
  onZoneEnter?: (zoneId: string, zoneName: string) => void;
  zonesGroup!: Phaser.Physics.Arcade.StaticGroup;
  pathsGroup!: Phaser.Physics.Arcade.StaticGroup;
  navMesh!: Phaser.Physics.Arcade.StaticGroup;
  worldGroup!: Phaser.GameObjects.Container;
  zoneDataMap: Record<string, Zone> = {};
  zoneRectangles: Phaser.GameObjects.Rectangle[] = [];
  pathRectangles: Phaser.GameObjects.Rectangle[] = [];
  zoneLabels: Phaser.GameObjects.Text[] = [];
  currentZoneId: string | null = null;
  gridGraphics!: Phaser.GameObjects.Graphics;
  knightGraphics!: Phaser.GameObjects.Graphics;
  knightShadow!: Phaser.GameObjects.Graphics;
  capeGraphics!: Phaser.GameObjects.Graphics;
  lastFacingDirection: string = 'down';
  isPlayerReady: boolean = false;
  isZonesRendered: boolean = false;
  lastValidX: number = 400;
  lastValidY: number = 450;
  isOnNavMesh: boolean = true;
  movementEnabled: boolean = false;
  particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  init(data: { playerState: PlayerState; worldMap: WorldMap | null; onPlayerMove: (x: number, y: number) => void; onZoneEnter?: (zoneId: string, zoneName: string) => void; scannedFiles?: Record<string, string> }) {
    console.log('🎮 Phaser: Initializing world...');
    this.playerState = data.playerState;
    this.worldMap = data.worldMap;
    this.scannedFiles = data.scannedFiles || {};
    this.onPlayerMove = data.onPlayerMove;
    this.onZoneEnter = data.onZoneEnter;
    sceneRef = this;
    window.phaserScene = this;
  }

  handleZoneEntry(player: Phaser.GameObjects.Sprite, zoneRect: Phaser.GameObjects.Rectangle) {
    if (!zoneRect) return;
    
    const zoneId = (zoneRect as any).zoneId;
    const zoneName = (zoneRect as any).zoneName;
    const folderName = (zoneRect as any).folderName;
    const fileCount = (zoneRect as any).fileCount;
    
    if (!zoneId) return;
    
    if (this.currentZoneId !== zoneId) {
      console.log('📍 Entered:', zoneName, '(ID:', zoneId, ')');
      this.currentZoneId = zoneId;
      this.lastValidX = player.x;
      this.lastValidY = player.y;
      
      window.dispatchEvent(new CustomEvent('zone-change', {
        detail: { zoneId, zoneName, folderName, fileCount } 
      }));
      
      this.onZoneEnter?.(zoneId, zoneName);
    }
  }

  createGrassBackground(theme: typeof ZONE_THEMES['default'] = ZONE_THEMES['default']) {
    if (this.gridGraphics) this.gridGraphics.clear();
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(0);
    
    // Gradient background
    const gradient = theme.gradient || [0x1a2e1a, 0x2d4a2d];
    this.gridGraphics.fillStyle(gradient[0], 1);
    this.gridGraphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    // Add texture variation
    const tiles = [
      gradient[0], gradient[1], 
      Phaser.Display.Color.GetColor(
        Math.min(255, (gradient[0] >> 16) + 20),
        Math.min(255, ((gradient[0] >> 8) & 0xff) + 20),
        Math.min(255, (gradient[0] & 0xff) + 20)
      )
    ];
    
    for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE * 2) {
      for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE * 2) {
        const color = tiles[Math.floor(Math.random() * tiles.length)];
        this.gridGraphics.fillStyle(color, 0.3);
        this.gridGraphics.fillRect(x + 4, y + 4, TILE_SIZE * 2 - 8, TILE_SIZE * 2 - 8);
      }
    }
    
    // Subtle grid
    const gridColor = Phaser.Display.Color.GetColor(
      Math.max(0, (gradient[0] >> 16) - 30),
      Math.max(0, ((gradient[0] >> 8) & 0xff) - 30),
      Math.max(0, (gradient[0] & 0xff) - 30)
    );
    this.gridGraphics.lineStyle(1, gridColor, 0.3);
    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
      this.gridGraphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
      this.gridGraphics.lineBetween(0, y, WORLD_WIDTH, y);
    }
  }

  wipeAllSprites() {
    if (this.worldGroup) this.worldGroup.removeAll(true);
    this.zoneRectangles = [];
    this.pathRectangles = [];
    this.zoneLabels = [];
    this.zoneDataMap = {};
    this.isZonesRendered = false;
  }

  renderZones(mapData: WorldMap) {
    this.wipeAllSprites();
    if (!mapData || !mapData.zones || mapData.zones.length === 0) {
      console.log('⚠️ No zones to render');
      return;
    }
    this.worldMap = mapData;
    this.createGrassBackground();
    this.drawProfessionalZones(mapData.zones);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.cameras.main.flash(500, 168, 85, 247);
    }
    this.isZonesRendered = true;
    console.log(`✅ Rendered ${mapData.zones.length} professional zones`);
  }

  drawProfessionalZones(zones: Zone[]) {
    const getThemeForZone = (zone: Zone): typeof ZONE_THEMES['default'] => {
      const folder = (zone.folderName || zone.name || '').toLowerCase();
      
      // Check direct matches first
      if (ZONE_THEMES[folder]) return ZONE_THEMES[folder];
      
      // Check partial matches
      for (const [key, theme] of Object.entries(ZONE_THEMES)) {
        if (folder.includes(key) || key.includes(folder)) {
          return theme;
        }
      }
      
      // Check by theme field
      if (zone.theme === 'stone') return ZONE_THEMES['backend'];
      if (zone.theme === 'forest') return ZONE_THEMES['frontend'];
      if (zone.theme === 'marble') return ZONE_THEMES['shared'];
      if (zone.theme === 'mine') return ZONE_THEMES['scrapers'];
      
      return ZONE_THEMES['default'];
    };

    zones.forEach((zone, index) => {
      const theme = getThemeForZone(zone);
      const fileCount = zone.fileCount || 10;
      
      // Dynamic sizing based on fileCount
      const baseSize = 380;
      const sizeMultiplier = Math.min(fileCount / 20, 2.5);
      const zoneSize = baseSize + (sizeMultiplier * 100);
      
      // Grid positioning
      const cols = Math.min(3, zones.length);
      const spacing = 700;
      const startX = 500 + (index % cols) * spacing;
      const startY = 450 + Math.floor(index / cols) * spacing;
      
      const x = zone.position?.x || startX;
      const y = zone.position?.y || startY;
      const w = zone.width || zoneSize;
      const h = zone.height || zoneSize;
      
      const zoneId = zone.id || `zone-${index}`;
      const zoneName = theme.name;
      const folderName = zone.folderName || '';
      
      console.log(`🎨 Rendering ${zoneName} (${folderName}) at (${x}, ${y}) size ${w}x${h}`);
      
      const zoneGraphics = this.add.graphics();
      zoneGraphics.setDepth(10);
      
      // Outer glow/moat effect
      const glowColor = Phaser.Display.Color.GetColor(
        (theme.border >> 16) & 0xff,
        (theme.border >> 8) & 0xff,
        theme.border & 0xff
      );
      zoneGraphics.fillStyle(glowColor, 0.2);
      zoneGraphics.fillRoundedRect(x - w/2 - 25, y - h/2 - 25, w + 50, h + 50, 25);
      
      // Outer wall shadow
      zoneGraphics.fillStyle(0x000000, 0.5);
      zoneGraphics.fillRoundedRect(x - w/2 + 6, y - h/2 + 6, w, h, 14);
      
      // Main zone floor
      const bgColor = Phaser.Display.Color.GetColor(
        (theme.bg >> 16) & 0xff,
        (theme.bg >> 8) & 0xff,
        theme.bg & 0xff
      );
      zoneGraphics.fillStyle(bgColor, 1);
      zoneGraphics.fillRoundedRect(x - w/2, y - h/2, w, h, 14);
      
      // Stone tile pattern
      const tileSize = 24;
      const borderColor = Phaser.Display.Color.GetColor(
        (theme.border >> 16) & 0xff,
        (theme.border >> 8) & 0xff,
        theme.border & 0xff
      );
      zoneGraphics.lineStyle(1, borderColor, 0.25);
      for (let tx = x - w/2 + 12; tx < x + w/2 - 12; tx += tileSize) {
        for (let ty = y - h/2 + 12; ty < y + h/2 - 12; ty += tileSize) {
          zoneGraphics.strokeRect(tx, ty, tileSize, tileSize);
        }
      }
      
      // Inner floor highlight
      const accentColor = Phaser.Display.Color.GetColor(
        (theme.accent >> 16) & 0xff,
        (theme.accent >> 8) & 0xff,
        theme.accent & 0xff
      );
      zoneGraphics.fillStyle(accentColor, 0.1);
      zoneGraphics.fillRoundedRect(x - w/2 + 10, y - h/2 + 10, w - 20, h - 20, 10);
      
      // Outer wall border - thicker
      zoneGraphics.lineStyle(8, borderColor, 1);
      zoneGraphics.strokeRoundedRect(x - w/2, y - h/2, w, h, 14);
      
      // Inner accent border
      zoneGraphics.lineStyle(3, accentColor, 0.8);
      zoneGraphics.strokeRoundedRect(x - w/2 + 8, y - h/2 + 8, w - 16, h - 16, 10);
      
      // Corner towers - more detailed
      const towerSize = 28;
      const towerOffsets = [
        { dx: -w/2 + 18, dy: -h/2 + 18 },
        { dx: w/2 - 18 - towerSize, dy: -h/2 + 18 },
        { dx: -w/2 + 18, dy: h/2 - 18 - towerSize },
        { dx: w/2 - 18 - towerSize, dy: h/2 - 18 - towerSize },
      ];
      
      towerOffsets.forEach(offset => {
        // Tower base
        zoneGraphics.fillStyle(borderColor, 0.9);
        zoneGraphics.fillRoundedRect(x + offset.dx, y + offset.dy, towerSize, towerSize, 8);
        // Tower top
        zoneGraphics.fillStyle(accentColor, 0.7);
        zoneGraphics.fillRoundedRect(x + offset.dx + 5, y + offset.dy + 5, towerSize - 10, towerSize - 10, 5);
        // Tower glow
        zoneGraphics.fillStyle(accentColor, 0.4);
        zoneGraphics.fillCircle(x + offset.dx + towerSize/2, y + offset.dy + towerSize/2, 6);
      });
      
      // Building details based on fileCount
      const buildingRows = Math.min(Math.ceil(fileCount / 4), 4);
      const buildingsPerRow = Math.min(4, fileCount);
      const buildingColor = theme.buildingColor || theme.border;
      
      for (let row = 0; row < buildingRows; row++) {
        for (let col = 0; col < buildingsPerRow; col++) {
          if (row * buildingsPerRow + col < fileCount) {
            const bx = x - w/2 + 35 + col * ((w - 70) / Math.max(buildingsPerRow - 1, 1));
            const by = y - h/2 + 50 + row * 35;
            
            // Building shadow
            zoneGraphics.fillStyle(0x000000, 0.4);
            zoneGraphics.fillRect(bx + 3, by + 3, 24, 20);
            
            // Building
            const bc = Phaser.Display.Color.GetColor(
              (buildingColor >> 16) & 0xff,
              (buildingColor >> 8) & 0xff,
              buildingColor & 0xff
            );
            zoneGraphics.fillStyle(bc, 0.85);
            zoneGraphics.fillRect(bx, by, 24, 20);
            
            // Building window
            zoneGraphics.fillStyle(accentColor, 0.7);
            zoneGraphics.fillRect(bx + 5, by + 5, 6, 6);
            zoneGraphics.fillRect(bx + 13, by + 5, 6, 6);
          }
        }
      }
      
      // Zone name label - PROMINENT
      const labelBg = this.add.graphics();
      labelBg.setDepth(100);
      const labelWidth = theme.name.length * 12 + 50;
      labelBg.fillStyle(0x000000, 0.9);
      labelBg.fillRoundedRect(x - labelWidth/2, y - h/2 - 45, labelWidth, 38, 10);
      
      // Label accent bar
      const labelAccentColor = Phaser.Display.Color.GetColor(
        (theme.border >> 16) & 0xff,
        (theme.border >> 8) & 0xff,
        theme.border & 0xff
      );
      labelBg.fillStyle(labelAccentColor, 1);
      labelBg.fillRoundedRect(x - labelWidth/2, y - h/2 - 45, labelWidth, 5, { tl: 10, tr: 10, bl: 0, br: 0 });
      
      const label = this.add.text(x, y - h/2 - 25, `${theme.label} ${theme.name}`, { 
        fontSize: '18px', 
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffffff', 
        stroke: '#000000',
        strokeThickness: 2
      });
      label.setOrigin(0.5, 0.5);
      label.setDepth(101);
      this.zoneLabels.push(label);
      
      // File count indicator
      const fileLabel = this.add.text(x, y + h/2 + 18, `📁 ${fileCount} files`, { 
        fontSize: '14px', 
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff', 
        backgroundColor: '#000000aa',
        padding: { x: 12, y: 5 }
      });
      fileLabel.setOrigin(0.5, 0.5);
      fileLabel.setDepth(101);
      this.zoneLabels.push(fileLabel);
      
      // Physics sensor for zone detection
      const sensorW = w - 40;
      const sensorH = h - 40;
      const zoneSensor = this.add.rectangle(x, y, sensorW, sensorH, 0x000000, 0);
      (zoneSensor as any).zoneId = zoneId;
      (zoneSensor as any).zoneName = zoneName;
      (zoneSensor as any).folderName = folderName;
      (zoneSensor as any).fileCount = fileCount;
      
      this.physics.add.existing(zoneSensor, true);
      if (!this.zonesGroup) this.zonesGroup = this.physics.add.staticGroup();
      this.zonesGroup.add(zoneSensor);
      this.zoneRectangles.push(zoneSensor);
      
      this.zoneDataMap[zoneId] = zone;
      
      (zone as any)._renderX = x;
      (zone as any)._renderY = y;
      (zone as any)._renderW = w;
      (zone as any)._renderH = h;
    });
    
    this.drawProfessionalPaths(zones);
    
    this.navMesh = this.physics.add.staticGroup();
    
    if (this.player && this.zonesGroup) {
      this.physics.add.overlap(
        this.player, 
        this.zonesGroup, 
        (player, zoneRect) => this.handleZoneEntry(player as Phaser.Physics.Arcade.Sprite, zoneRect as Phaser.GameObjects.Rectangle),
        undefined, 
        this
      );
    }
    
    console.log(`✅ World complete: ${zones.length} zones rendered with hackathon visuals!`);
  }

  drawProfessionalPaths(zones: Zone[]) {
    const pathGraphics = this.add.graphics();
    pathGraphics.setDepth(5);
    
    const positions: { x: number, y: number, w: number, h: number }[] = [];
    zones.forEach((zone: any) => {
      positions.push({ 
        x: zone._renderX || 400, 
        y: zone._renderY || 300, 
        w: zone._renderW || 200, 
        h: zone._renderH || 200 
      });
    });
    
    // Draw paths between all zones
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const from = positions[i];
        const to = positions[j];
        
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const startX = from.x + (dx / dist) * (from.w / 2 + 30);
          const startY = from.y + (dy / dist) * (from.h / 2 + 30);
          const endX = to.x - (dx / dist) * (to.w / 2 + 30);
          const endY = to.y - (dy / dist) * (to.h / 2 + 30);
          
          this.drawRoutePath(pathGraphics, startX, startY, endX, endY);
        }
      }
    }
  }

  drawRoutePath(graphics: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    
    const nx = -dy / len, ny = dx / len;
    
    // Main path
    graphics.fillStyle(0x8b7355, 0.9);
    graphics.fillTriangle(
      x1 + nx * 30, y1 + ny * 30,
      x1 - nx * 30, y1 - ny * 30,
      x2 - nx * 30, y2 - ny * 30
    );
    graphics.fillTriangle(
      x1 + nx * 30, y1 + ny * 30,
      x2 - nx * 30, y2 - ny * 30,
      x2 + nx * 30, y2 + ny * 30
    );
    
    // Path border
    graphics.lineStyle(5, 0x5a4a3a, 0.8);
    graphics.lineBetween(x1 + nx * 30, y1 + ny * 30, x2 + nx * 30, y2 + ny * 30);
    graphics.lineBetween(x1 - nx * 30, y1 - ny * 30, x2 - nx * 30, y2 - ny * 30);
    
    // Center line
    graphics.lineStyle(2, 0xa08060, 0.5);
    graphics.lineBetween(x1, y1, x2, y2);
    
    // Path markers
    const dots = Math.max(3, Math.floor(len / 100));
    for (let i = 0; i <= dots; i++) {
      const t = i / dots;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      graphics.fillStyle(0x6a5a4a, 0.7);
      graphics.fillCircle(px, py, 8);
      graphics.fillStyle(0x8b7b6b, 0.4);
      graphics.fillCircle(px - 2, py - 2, 4);
    }
  }

  drawKnight(graphics: Phaser.GameObjects.Graphics, capeGraphics: Phaser.GameObjects.Graphics, x: number, y: number, vx: number = 0, vy: number = 0) {
    // Cape physics
    if (vx !== 0 || vy !== 0) {
      capeGraphics.clear();
      capeGraphics.setDepth(98);
      capeGraphics.fillStyle(0x8b5cf6, 0.9);
      const capeDir = vx > 0 ? -1 : (vx < 0 ? 1 : 0);
      const capeX = x + capeDir * 10;
      capeGraphics.fillEllipse(capeX, y + 8, 14, 22);
    }
    
    // Shadow
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillEllipse(x, y + 16, 20, 8);
    
    // Body - purple armor
    graphics.fillStyle(0x8b5cf6, 1);
    graphics.fillCircle(x, y, 12);
    
    // Armor highlight
    graphics.fillStyle(0xa78bfa, 0.85);
    graphics.fillCircle(x, y - 2, 9);
    
    // Helmet
    graphics.fillStyle(0x6d28d9, 1);
    graphics.fillCircle(x, y - 6, 9);
    
    // Helmet visor glow
    graphics.fillStyle(0xc4b5fd, 1);
    graphics.fillRect(x - 6, y - 7, 12, 5);
    
    // Shoulder pads
    graphics.fillStyle(0x7c3aed, 1);
    graphics.fillCircle(x - 10, y + 2, 6);
    graphics.fillCircle(x + 10, y + 2, 6);
    
    // Sword glow when moving
    if (vx !== 0 || vy !== 0) {
      graphics.fillStyle(0xfbbf24, 1);
      const swordX = vx > 0 ? x + 16 : x - 16;
      graphics.fillRect(swordX - 3, y - 12, 6, 24);
      
      // Sword aura
      graphics.fillStyle(0xfde68a, 0.6);
      graphics.fillRect(swordX - 1, y - 10, 2, 20);
    }
  }

  preload() { 
    console.log('🎮 Phaser: Loading...'); 
  }

  create() {
    console.log('🎮 Phaser: Creating world...');
    window.phaserGame = this.game as Phaser.Game;
    this.cameras.main.setSize(1000, 600);
    this.cameras.main.setBackgroundColor('#1a2e1a');
    this.cameras.main.setViewport(0, 0, 1000, 600);
    this.worldGroup = this.add.container(0, 0) as any;
    
    this.createGrassBackground();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    const startX = 400, startY = 400;
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    this.knightShadow = this.add.graphics();
    this.knightShadow.setDepth(99);
    this.capeGraphics = this.add.graphics();
    this.capeGraphics.setDepth(98);
    this.knightGraphics = this.add.graphics();
    this.knightGraphics.setDepth(100);
    
    this.drawKnight(this.knightGraphics, this.capeGraphics, startX, startY);
    
    const physicsAny = this.physics as any;
    this.player = physicsAny.add.sprite(startX, startY) as Phaser.Physics.Arcade.Sprite;
    this.player.setDepth(100);
    this.player.setVisible(false);
    this.player.setCollideWorldBounds(true);
    this.player.setPushable(false);
    this.player.setSize(22, 22);
    this.player.setOffset(0, 0);
    
    this.isPlayerReady = true;
    this.isOnNavMesh = true;
    this.lastValidX = startX;
    this.lastValidY = startY;
    
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    
    if (this.worldMap && this.worldMap.zones && this.worldMap.zones.length > 0) {
      this.renderZones(this.worldMap);
      
      const firstZone = this.worldMap.zones[0];
      if (firstZone) {
        const zoneX = (firstZone as any)._renderX || 400;
        const zoneY = (firstZone as any)._renderY || 400;
        this.player.x = zoneX;
        this.player.y = zoneY + 100;
        this.lastValidX = this.player.x;
        this.lastValidY = this.player.y;
        this.currentZoneId = firstZone.id;
        
        window.dispatchEvent(new CustomEvent('zone-change', { 
          detail: { 
            zoneId: firstZone.id, 
            zoneName: firstZone.name,
            folderName: firstZone.folderName || '',
            fileCount: firstZone.fileCount || 0
          } 
        }));
      }
    }
    
    // 1 second delay before enabling movement
    this.time.delayedCall(1000, () => {
      this.movementEnabled = true;
      console.log('🎮 Ready to explore! Use arrow keys to move.');
    });
    
    this.events.on('postupdate', () => {
      if (this.player && this.knightGraphics) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        this.knightGraphics.clear();
        this.drawKnight(this.knightGraphics, this.capeGraphics, this.player.x, this.player.y, body.velocity.x, body.velocity.y);
      }
    });
  }

  update() {
    if (!this.player || !this.isPlayerReady || !this.movementEnabled) return;
    
    this.player.setCollideWorldBounds(true);
    const speed = 170;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = 0;
    body.velocity.y = 0;
    
    if (this.cursors.left.isDown) body.velocity.x = -speed;
    else if (this.cursors.right.isDown) body.velocity.x = speed;
    if (this.cursors.up.isDown) body.velocity.y = -speed;
    else if (this.cursors.down.isDown) body.velocity.y = speed;
    
    if (body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(speed);
    }
    
    // Direction facing
    if (body.velocity.x === 0 && body.velocity.y === 0) {
      // Keep last direction
    } else if (body.velocity.y < 0) this.lastFacingDirection = 'up';
    else if (body.velocity.y > 0) this.lastFacingDirection = 'down';
    else if (body.velocity.x < 0) { this.player.setFlipX(true); this.lastFacingDirection = 'left'; }
    else if (body.velocity.x > 0) { this.player.setFlipX(false); this.lastFacingDirection = 'right'; }
    
    if (this.onPlayerMove) this.onPlayerMove(this.player.x, this.player.y);
  }
}

export default function GameContainer({ playerState, worldMap, isScanning = false, onPlayerMove, onZoneEnter, scannedFiles = {} }: GameContainerProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGameReady, setIsGameReady] = useState(false);
  const hasInitialized = useRef(false);

  const updatePhaserWorldMap = useCallback((map: WorldMap) => {
    if (sceneRef && sceneRef.renderZones) {
      sceneRef.renderZones(map);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || gameRef.current || hasInitialized.current) return;
    hasInitialized.current = true;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO, width: 1000, height: 600,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      parent: containerRef.current, backgroundColor: '#1a2e1a',
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [MainScene]
    };

    gameRef.current = new Phaser.Game(config);
    gameRef.current.events.once('ready', () => {
      setIsGameReady(true);
      const scene = gameRef.current?.scene.scenes[0] as MainScene;
      if (scene && scene.init) scene.init({ playerState, worldMap, onPlayerMove, onZoneEnter, scannedFiles });
    });

    return () => {
      sceneRef = null;
      window.phaserGame = undefined;
      window.phaserScene = undefined;
      if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }
      hasInitialized.current = false;
    };
  }, []);

  useEffect(() => {
    if (worldMap && worldMap.zones && worldMap.zones.length > 0 && sceneRef) {
      updatePhaserWorldMap(worldMap);
    }
  }, [worldMap, updatePhaserWorldMap]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a1a0a' }}>
      {isScanning && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 26, 10, 0.95)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, border: '4px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>Generating World...</p>
            <p style={{ fontSize: '14px', color: '#a78bfa', marginTop: '8px' }}>AI is analyzing your codebase</p>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!isScanning && (!worldMap || !worldMap.zones || worldMap.zones.length === 0) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center', color: '#a78bfa', background: 'rgba(10, 26, 10, 0.9)', padding: '32px', borderRadius: '12px', border: '3px solid #8b5cf6' }}>
            <MapIcon size={64} style={{ margin: '0 auto 16px', color: '#8b5cf6' }} />
            <p style={{ fontSize: '22px', fontWeight: 'bold' }}>No World Generated</p>
            <p style={{ fontSize: '14px', marginTop: '12px' }}>Click "Scan Project" to generate your quest map</p>
          </div>
        </div>
      )}
    </div>
  );
}

