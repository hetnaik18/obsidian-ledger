# The Obsidian Ledger - Setup Commands

This document contains the exact terminal commands to install all required dependencies for both the frontend and backend folders.

## Prerequisites

- Node.js (v18+)
- npm (v9+)

## Installation Commands

### 1. Install All Dependencies (Root Level)

From the project root (`The Obsidian Ledger` folder):

```
bash
# Install dependencies for all workspaces
npm install

# Or install individually:
cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend Dependencies

The backend requires the following packages (already in package.json):

```
bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# This will install:
# - cors@^2.8.5
# - dotenv@^16.3.1
# - express@^4.18.2
# - @google/generative-ai (for AI agents)

# Dev dependencies:
# - @types/cors@^2.8.17
# - @types/express@^4.17.21
# - @types/node@^20.10.0
# - nodemon@^3.0.2
# - ts-node@^10.9.2
# - typescript@^5.3.2
```

### 3. Frontend Dependencies

The frontend requires the following packages (already in package.json):

```
bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# This will install:
# - lucide-react@^0.294.0 (icons)
# - phaser@^3.70.0 (game engine)
# - react@^18.2.0
# - react-dom@^18.2.0

# Dev dependencies:
# - @types/react@^18.2.43
# - @types/react-dom@^18.2.17
# - @vitejs/plugin-react@^4.2.1
# - autoprefixer@^10.4.16
# - postcss@^8.4.32
# - tailwindcss@^3.3.6
# - typescript@^5.3.2
# - vite@^5.0.8
```

### 4. Shared Types (No Additional Dependencies)

The shared package only requires TypeScript:

```
bash
# Navigate to shared
cd shared

# Dev dependencies:
# - typescript@^5.3.2
```

## Running the Project

### Development Mode

**Backend:**
```
bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Frontend:**
```
bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Build for Production

**Backend:**
```
bash
cd backend
npm run build
# Output in backend/dist/
```

**Frontend:**
```
bash
cd frontend
npm run build
# Output in frontend/dist/
```

## Environment Variables

Create a `.env` file in the `backend/` folder:

```
env
PORT=3001
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

## Daily Development

The easiest way to run the entire ecosystem with a single command:

```
bash
# From the project root
npm run dev
```

This starts both:
- **Backend** server on http://localhost:3001 (labeled in RED)
- **Frontend** dev server on http://localhost:5173 (labeled in BLUE)

The colored labels help you distinguish between server and client logs in the console.

### Individual Commands

If you need to run only one part:

```
bash
# Run only backend
npm run server
# or
cd backend && npm run dev

# Run only frontend
npm run client
# or
cd frontend && npm run dev
```

## Quick Start Commands

```bash
# Full setup from scratch
cd "The Obsidian Ledger"

# Install all dependencies
npm install

# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev

# OR use the streamlined command:
npm run dev
```

## Troubleshooting

### PowerShell Security Warning

If you encounter this warning when using curl in PowerShell:
```
Security Warning: Script Execution Risk
Invoke-WebRequest parses the content of the web page. Script code in the web page might be run when the page is parsed.
```

Use the `-UseBasicParsing` flag to avoid the prompt:

```
powershell
# Basic syntax for PowerShell
curl -UseBasicParsing http://localhost:3001/health

# For POST requests
$body = @{documentation="test"} | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3001/ingest -Method Post -ContentType "application/json" -Body $body
```

### TypeScript Errors

If you encounter TypeScript errors:

```
bash
# Run typecheck
npm run typecheck
```

If you need to rebuild node_modules:

```
bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
