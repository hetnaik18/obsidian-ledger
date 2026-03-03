/**
 * Sage Agent
 * Provides context-aware hints and answers questions about learning modules
 * Pre-written answers for ready-made questions
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LearningModule, DialogueEntry } from '@obsidian-ledger/shared/types';

export interface SageOptions {
  apiKey?: string;
  model?: string;
}

export interface HintResult {
  hint: string;
  suggestions?: string[];
  isComplete: boolean;
}

export interface ValidationResult {
  success: boolean;
  feedback: string;
  completedModules?: string[];
}

/**
 * Pre-written answers for ready-made questions (themed responses)
 */
const PREWRITTEN_ANSWERS: Record<string, (zoneContext?: string) => string> = {
  'tell me more about the basics': (zone) => {
    const zoneName = zone?.toLowerCase() || '';
    
    if (zoneName.includes('backend') || zoneName.includes('spire') || zoneName.includes('bastion')) {
      return `📜 **The Basics of The Obsidian Spire**

Welcome, young apprentice! Let me share the foundational wisdom of the backend...

**Core Concepts:**
• Express.js - The framework that shapes our server routes
• REST APIs - The pathways connecting travelers to data
• Middleware - The guardians that process requests
• TypeScript - The sacred language that prevents errors

**Getting Started:**
1. Define your routes in \`src/server.ts\` 
2. Create controllers in \`src/controllers/\`
3. Use services in \`src/services/\`
4. Return JSON responses

*The Spire stands firm on the foundation of structured code.*`;
    }
    
    if (zoneName.includes('frontend') || zoneName.includes('veil') || zoneName.includes('forest')) {
      return `🌲 **The Basics of The Glimmering Veil**

Greetings, seeker of beautiful interfaces! The Forest holds many secrets...

**Core Concepts:**
• React Components - The living trees of our forest UI
• State Management - The flowing waters that nourish
• Props & Events - The pollen that carries data
• Tailwind CSS - The natural colors that style

**Getting Started:**
1. Components live in \`src/components/\`
2. Use hooks (useState, useEffect)
3. The game canvas renders in GameContainer
4. The Sidebar houses your code editor

*The Veil shimmers with interactive possibilities.*`;
    }
    
    if (zoneName.includes('shared') || zoneName.includes('nexus') || zoneName.includes('library')) {
      return `📚 **The Basics of The Nexus of Runes**

Welcome, scholar! The Library binds all realms together...

**Core Concepts:**
• TypeScript Interfaces - The ancient runes that define shapes
• Shared Types - Scrolls copied to every corner
• Utility Functions - Spells reusable across zones
• Constants - Enchanted items that never change

**Getting Started:**
1. Define interfaces in \`shared/types.ts\`
2. Export utilities from \`shared/index.ts\`
3. Import using @obsidian-ledger/shared/types

*The Nexus glows with the light of shared knowledge.*`;
    }
    
    if (zoneName.includes('scraper') || zoneName.includes('shadow') || zoneName.includes('mine')) {
      return `⛏️ **The Basics of The Shadow Harvesters**

Ah, a data miner! The Mines hold untapped potential...

**Core Concepts:**
• HTTP Requests - The tunnels reaching into distant servers
• Cheerio/jQuery - Tools to extract ore from HTML rocks
• Puppeteer - Automated agents that navigate caves
• Rate Limiting - Resting periods to avoid detection

**Getting Started:**
1. Scripts reside in \`scrapers/\`
2. Use axios or fetch to retrieve pages
3. Parse HTML with cheerio
4. Store results in JSON

*The shadows reveal what others cannot see.*`;
    }
    
    return `📜 **The Basics of The Obsidian Ledger**

Welcome, traveler! Let me share the foundational wisdom...

**Your Journey Begins:**
1. Scan Project - Click the button to analyze your codebase
2. Explore Zones - Move your hero through different areas
3. Learn Modules - Complete challenges in each zone
4. Talk to Me - Ask questions when you're stuck

*The ancient ledger awaits your exploration!*`;
  },

  'what zones can i explore?': () => {
    return `🗺️ **Zones of The Obsidian Ledger**

Your journey spans across these magnificent realms:

**1. The Obsidian Spire (Backend)** 🏰
A towering fortress of server-side power.
• Express.js APIs and routing
• TypeScript backend development  
• RESTful services

**2. The Glimmering Veil (Frontend)** 🌲
An enchanting interface that users behold.
• React components and state
• Phaser game engine integration
• Tailwind CSS styling

**3. The Nexus of Runes (Shared)** 📚
The sacred repository binding all realms.
• TypeScript interfaces and types
• Shared utilities
• Cross-zone dependencies

**4. The Shadow Harvesters (Scrapers)** 🌑
Fleet agents gathering intel from distant realms.
• Web scraping techniques
• Data extraction
• External API integration

⚠️ *Note: Some zones may be locked until you complete prerequisites.*

*Which realm calls to your spirit, traveler?*`;
  },

  'how do i complete modules?': (zone) => {
    const zoneName = zone?.toLowerCase() || '';
    
    if (zoneName.includes('backend') || zoneName.includes('spire') || zoneName.includes('bastion')) {
      return `🏰 **Completing Modules in The Obsidian Spire**

To master the Spire's challenges:

**Step 1:** Select a Module - Click on a zone in the game
**Step 2:** Read the Challenge - Each module has a description
**Step 3:** Write Your Code - Use the code editor in the Sidebar
**Step 4:** Submit for Validation - Click "Validate" to test your code
**Step 5:** Advance - Complete modules to unlock new zones

*Every great developer started where you stand now.*`;
    }
    
    if (zoneName.includes('frontend') || zoneName.includes('veil') || zoneName.includes('forest')) {
      return `🌲 **Completing Modules in The Glimmering Veil**

To master the Forest's challenges:

**Step 1:** Choose Your Path - Explore zones by moving your hero
**Step 2:** Study the Grove - Read module descriptions carefully
**Step 3:** Plant Your Code - Write components in the editor
**Step 4:** Let the Sage Review - Submit your solution
**Step 5:** Watch It Bloom - Your completed module lights up

*The Veil rewards patient learners.*`;
    }
    
    return `📜 **How to Complete Modules**

Your quest follows these steps:

**1.** Enter a Zone - Move your hero to explore
**2.** Select a Learning Module - Each zone offers challenges
**3.** Understand the Goal - Read the description carefully
**4.** Write Your Solution - Use the code editor
**5.** Submit for Review - Click the validate button
**6.** Receive Feedback - Get guidance from the Sage
**7.** Progress - Completing modules unlocks new zones

*Persistence is the key to mastery!*`;
  },

  'can you give me a hint?': (zone) => {
    const zoneName = zone?.toLowerCase() || '';
    
    if (zoneName.includes('backend') || zoneName.includes('spire') || zoneName.includes('bastion')) {
      return `💡 **A Hint for The Obsidian Spire**

*The Sage leans in and speaks softly...*

For backend challenges:
• Start with the route - Define your endpoint first
• Check your types - Define interfaces before using them
• Middleware matters - Validate inputs before processing
• Return appropriately - JSON responses are your messages

*Would you like me to elaborate?*`;
    }
    
    if (zoneName.includes('frontend') || zoneName.includes('veil') || zoneName.includes('forest')) {
      return `💡 **A Hint for The Glimmering Veil**

*The Sage gestures toward the shimmering trees...*

For frontend challenges:
• Components first - Break your UI into reusable pieces
• State tells stories - Use useState to track changing data
• Props flow down - Data passes from parent to child
• Effects handle side effects - useEffect for fetching

*Would you like me to elaborate?*`;
    }
    
    if (zoneName.includes('shared') || zoneName.includes('nexus') || zoneName.includes('library')) {
      return `💡 **A Hint for The Nexus of Runes**

*The Sage points to the glowing scrolls...*

For shared code challenges:
• Types define shapes - Create interfaces that describe data
• Reusability is key - Write utilities others can import
• Document your runes - Add JSDoc comments
• Keep it simple - Complex types become hard to maintain

*Would you like me to elaborate?*`;
    }
    
    if (zoneName.includes('scraper') || zoneName.includes('shadow') || zoneName.includes('mine')) {
      return `💡 **A Hint for The Shadow Harvesters**

*The Sage whispers from the darkness...*

For scraping challenges:
• Inspect first - Use browser DevTools to understand structure
• Choose your tool - Cheerio for static, Puppeteer for dynamic
• Respect the target - Add delays between requests
• Handle errors - Not all pages are accessible

*Would you like me to elaborate?*`;
    }
    
    return `💡 **A Hint for Your Journey**

*The Sage smiles knowingly...*

General hints:
• Read carefully - The module description holds clues
• Check the examples - Code examples show the pattern
• Start simple - Get something working, then enhance
• Use the Sage - I'm here to help!

*What aspect would you like to explore further?*`;
  },
};

const getPrewrittenAnswer = (query: string, zoneContext?: string): string | null => {
  const lowerQ = query.toLowerCase().trim();
  for (const [key, answerFn] of Object.entries(PREWRITTEN_ANSWERS)) {
    if (lowerQ.includes(key.toLowerCase())) {
      return answerFn(zoneContext);
    }
  }
  return null;
};

const SYSTEM_INSTRUCTION = `You are the Sage, an ancient and wise NPC in "The Obsidian Ledger" - a 2D RPG that teaches programming through gameplay. Speak in a mystical, wise tone. Be encouraging but don't give away complete answers. Ask guiding questions.`;

function buildHintPrompt(module: LearningModule, question: string): string {
  return `Module: ${module.title}\nDescription: ${module.description}\nQuestion: ${question}\nProvide a helpful hint.`;
}

function buildValidationPrompt(module: LearningModule, playerCode: string): string {
  return `Module: ${module.title}\nRequirements: ${module.content}\nCode: ${playerCode}\nEvaluate and respond with COMPLETE or INCOMPLETE.`;
}

const DEFAULT_OPTIONS: SageOptions = {
  model: 'gemini-2.0-flash',
  apiKey: ''
};

export class SageAgent {
  private options: SageOptions;
  private dialogueHistory: DialogueEntry[] = [];
  private isOffline: boolean = false;

  constructor(options: Partial<SageOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.isOffline = !this.options.apiKey || this.options.apiKey.trim() === '';
  }

  async callGemini(prompt: string, systemInstruction: string): Promise<string> {
    if (this.isOffline) throw new Error('Sage is in offline mode');
    
    try {
      const genAI = new GoogleGenerativeAI(this.options.apiKey || '');
      const model = genAI.getGenerativeModel({
        model: this.options.model || 'gemini-2.0-flash',
        generationConfig: { temperature: 0.7, topP: 0.8, maxOutputTokens: 1024 }
      });

      const result = await model.generateContent([{ text: systemInstruction }, { text: prompt }]);
      if (!result.response) throw new Error('Empty response');
      return result.response.text();
    } catch (error: any) {
      throw new Error(`Gemini error: ${error.message}`);
    }
  }

  async getHint(module: LearningModule, question: string, zoneContext?: string): Promise<HintResult> {
    const prewritten = getPrewrittenAnswer(question, zoneContext);
    if (prewritten) {
      this.addToHistory('player', question);
      this.addToHistory('sage', prewritten);
      return { hint: prewritten, suggestions: ['Tell me more', 'Give me another hint'], isComplete: false };
    }

    const prompt = buildHintPrompt(module, question);
    let response: string;

    try {
      response = await this.callGemini(prompt, SYSTEM_INSTRUCTION);
    } catch {
      response = this.getFallbackHint(question);
    }

    this.addToHistory('player', question);
    this.addToHistory('sage', response);

    return { hint: response, suggestions: ['Tell me more', 'Give me another hint'], isComplete: false };
  }

  async validateCode(module: LearningModule, playerCode: string): Promise<ValidationResult> {
    const prompt = buildValidationPrompt(module, playerCode);
    let response: string;
    let isComplete = false;

    try {
      response = await this.callGemini(prompt, SYSTEM_INSTRUCTION);
      isComplete = response.includes('COMPLETE');
    } catch {
      response = this.getFallbackValidationFeedback(playerCode);
      isComplete = playerCode.length > 20 && (playerCode.includes('function') || playerCode.includes('const'));
    }

    this.addToHistory('player', `[Submitted code for ${module.title}]`);
    this.addToHistory('sage', response);

    return { success: isComplete, feedback: response, completedModules: isComplete ? [module.id] : undefined };
  }

  async chat(playerId: string, message: string, context?: { currentModuleId?: string; zoneContext?: string }): Promise<{ response: string; updatedHistory: DialogueEntry[] }> {
    const prewritten = getPrewrittenAnswer(message, context?.zoneContext);
    if (prewritten) {
      this.addToHistory('player', message);
      this.addToHistory('sage', prewritten);
      return { response: prewritten, updatedHistory: this.getDialogueHistory() };
    }

    if (context?.currentModuleId) {
      const module: LearningModule = { id: context.currentModuleId, title: 'Current Module', content: '', zoneId: '', prerequisites: [], isCompleted: false };
      const hintResult = await this.getHint(module, message, context.zoneContext);
      return { response: hintResult.hint, updatedHistory: this.getDialogueHistory() };
    }

    let response: string;
    try {
      response = await this.callGemini(message, SYSTEM_INSTRUCTION);
    } catch {
      response = this.getFallbackChatResponse(message);
    }

    this.addToHistory('player', message);
    this.addToHistory('sage', response);

    return { response, updatedHistory: this.getDialogueHistory() };
  }

  private addToHistory(speaker: 'player' | 'sage' | 'system', message: string) {
    this.dialogueHistory.push({ speaker, message, timestamp: new Date().toISOString() });
    if (this.dialogueHistory.length > 20) this.dialogueHistory = this.dialogueHistory.slice(-20);
  }

  getDialogueHistory(): DialogueEntry[] {
    return [...this.dialogueHistory];
  }

  clearHistory() {
    this.dialogueHistory = [];
  }

  isInOfflineMode(): boolean {
    return this.isOffline;
  }

  private getFallbackHint(question: string): string {
    return "Consider breaking the problem into smaller pieces. What specific part is causing you trouble?";
  }

  private getFallbackValidationFeedback(code: string): string {
    if (code.length < 10) return "Your code seems quite short. Perhaps you should add more?";
    if (code.length < 50) return "You're on the right path! But there's more to discover.";
    return "Interesting approach! Consider reviewing the module requirements again.";
  }

  private getFallbackChatResponse(message: string): string {
    const lowerM = message.toLowerCase();
    if (lowerM.includes('help') || lowerM.includes('stuck')) return "Visit the Forest for beginner challenges, or ask me about specific modules.";
    if (lowerM.includes('zone')) return "Zones are connected by paths - some are unlocked from the start.";
    if (lowerM.includes('backend') || lowerM.includes('spire')) return "Ah, you speak of The Obsidian Spire! This is where the server's heart beats.";
    if (lowerM.includes('frontend') || lowerM.includes('veil')) return "The Glimmering Veil calls to you! This is where user interfaces bloom.";
    if (lowerM.includes('shared') || lowerM.includes('nexus')) return "The Nexus of Runes holds the ancient scrolls of shared knowledge!";
    if (lowerM.includes('scraper') || lowerM.includes('shadow')) return "The Shadow Harvesters yield valuable data from the depths of the web!";
    return "The ancient scrolls whisper of your curiosity. Would you like a hint?";
  }
}

export default SageAgent;
