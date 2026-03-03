/**
 * Setup Script for The Obsidian Ledger
 * Checks if .env exists and creates it from .env.example if needed
 */

const fs = require('fs');
const path = require('path');

const backendEnvPath = path.join(__dirname, 'backend', '.env');
const backendEnvExamplePath = path.join(__dirname, 'backend', '.env.example');

console.log('🔧 Running setup for The Obsidian Ledger...\n');

// Check if .env already exists
if (fs.existsSync(backendEnvPath)) {
  console.log('✅ .env file already exists in backend/');
} else {
  // Check if .env.example exists
  if (fs.existsSync(backendEnvExamplePath)) {
    // Copy .env.example to .env
    fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
    console.log('✅ Created .env from .env.example');
    console.log('   Please edit backend/.env and add your GEMINI_API_KEY');
  } else {
    console.log('⚠️  .env.example not found - please create backend/.env manually');
  }
}

// Verify setup
if (fs.existsSync(backendEnvPath)) {
  console.log('\n📝 Current .env configuration:');
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key === 'GEMINI_API_KEY') {
        console.log(`   ${key}=${value ? '*** (set)' : '(not set)'}`);
      } else {
        console.log(`   ${key}=${value}`);
      }
    }
  });
  
  if (!envContent.includes('GEMINI_API_KEY=') || envContent.match(/GEMINI_API_KEY=\s*$/)) {
    console.log('\n⚠️  WARNING: GEMINI_API_KEY is not set!');
    console.log('   AI features will work in fallback mode.');
    console.log('   Get your API key from: https://aistudio.google.com/app/apikey');
  } else {
    console.log('\n✅ GEMINI_API_KEY is configured');
  }
}

console.log('\n✨ Setup complete! You can now run:');
console.log('   cd backend && npm run dev');
console.log('   cd frontend && npm run dev');
