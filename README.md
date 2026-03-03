

```
obsidian-ledger/
├── frontend/           # Vite + React + TypeScript + Phaser 3
├── backend/           # Express + TypeScript API server
├── shared/            # Shared TypeScript types
├── package.json       # Root monorepo config
└── README.md
```

## Quick Start

### 1. Install Dependencies

Run these commands from the project root:

```
bash
# Install root dependencies (for monorepo scripts)
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

Or use the convenient install script:

```
bash
npm run install:all
```

### 2. Start Development Servers

**Terminal 1 - Backend:**
```
bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```
bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

Or use the root script to run both:
```
bash
npm run dev
```

## Features

### Backend (Express + TypeScript)
- `/health` - Health check endpoint
- `/ingest` - POST endpoint for Architect Agent (codebase parsing)
- `/query-sage` - POST endpoint for Sage Agent (dialogue)

### Frontend (Vite + React + Phaser 3)
- **GameContainer** - Phaser game with hero sprite (arrow keys to move)
- **Sidebar** - Code editor + Sage NPC dialogue
- **StateBridge** - React-Phaser communication utility
- **Tailwind CSS** - Dark theme UI

### Shared Types
- `WorldMap` - Complete world structure
- `Zone` - Individual zones in the game
- `LearningModule` - Documentation modules
- `PlayerState` - Player progress and inventory

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 18, TypeScript |
| Game Engine | Phaser 3 |
| UI | Tailwind CSS, lucide-react |
| Backend | Express, TypeScript, nodemon |
| API | RESTful with CORS |

## API Proxy

The frontend is configured to proxy API requests:
- `/api/*` → `http://localhost:3001/*`

This allows calling endpoints like `/api/ingest` from the frontend.
