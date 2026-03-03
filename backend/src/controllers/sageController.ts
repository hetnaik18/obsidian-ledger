/**
 * Sage Controller
 * Handles Sage Agent dialogue and code validation endpoints
 * FIXED: Extended context interface for zone-specific responses
 */

import { Request, Response } from 'express';
import { QuerySageRequest, QuerySageResponse, LearningModule } from '@obsidian-ledger/shared/types';
import { SageAgent } from '../agents/SageAgent';
import { validateCode } from '../services/CodeValidator';

// Shared Sage agent instance
const sageAgent = new SageAgent({
  apiKey: process.env.GEMINI_API_KEY
});

// Extended request types
interface CodeValidationRequest {
  code: string;
  moduleId: string;
  module: LearningModule;
}

interface CodeValidationResponse {
  success: boolean;
  feedback: string;
  score?: number;
  completedModuleId?: string;
}

// Extended context interface for Sage queries - includes all possible zone fields
interface ExtendedSageContext {
  currentZoneId?: string;
  currentModuleId?: string;
  currentZoneName?: string;
  currentZoneFolder?: string;
  currentZone?: string;
  contextString?: string;
  codeContent?: string;
}

// Random sage wisdom fallback based on zones
const SAGE_WISDOMS: Record<string, string[]> = {
  'The Bastion': [
    'The server stands as a fortress. Each endpoint is a gate, each route a pathway through the realm.',
    'In the backend, errors are not failures but lessons from the ancient ones.',
    'The database holds the memories of all who came before. Treat it with respect.',
    'Express routes are like guilds - each with its own purpose and middleware.',
  ],
  'The Forest': [
    'The UI grows like a forest - each component a tree, each state a changing season.',
    'React components are living things. They breathe with props and exhale with state.',
    'In the frontend, the user sees only the surface. But you know the depth beneath.',
    'The Forest teaches us that beauty and function can coexist in harmony.',
  ],
  'The Library': [
    'Types are the ancient scrolls that guard against the darkness of any.',
    'Shared knowledge multiplies when divided among the realm\'s travelers.',
    'In the Library, we find the patterns that bind all code together.',
    'Documentation is the map that guides travelers through unknown lands.',
  ],
  'The Mine': [
    'Data flows like ore through the tunnels. Extract it with care.',
    'The Mine reveals what is hidden in the depths of the digital world.',
    'Every scraper is a miner, seeking precious insights in the darkness.',
    'In the shadows of data, patterns emerge for those who know how to look.',
  ],
  'default': [
    'The code flows like water through the streams of time...',
    'Every function has a purpose, as every path has a destination.',
    'The ancient algorithms whisper secrets to those who listen.',
    'In the realm of bits, patience is the ultimate virtue.',
    'The documentation reveals what the code conceals.',
  ]
};

// Get zone-specific wisdom
const getZoneWisdom = (zoneName?: string): string => {
  const zoneKey = Object.keys(SAGE_WISDOMS).find(key => 
    zoneName?.toLowerCase().includes(key.toLowerCase())
  ) || 'default';
  const wisdoms = SAGE_WISDOMS[zoneKey] || SAGE_WISDOMS['default'];
  return wisdoms[Math.floor(Math.random() * wisdoms.length)];
};

/**
 * POST /query-sage
 * Handle dialogue with the Sage NPC
 */
export const handleQuerySage = async (
  req: Request<{}, {}, QuerySageRequest>, 
  res: Response<QuerySageResponse>
) => {
  const TIMEOUT_MS = 10000;
  
  const { playerId, query, context } = req.body;
  console.log('Sage query received:', { playerId, query, context });

  // Build zone context from various possible fields - INCLUDE FOLDER NAME & FILE COUNT
  const ctx = context as ExtendedSageContext | undefined;
  let zoneContext = ctx?.contextString || '';
  
  if (!zoneContext) {
    if (ctx?.currentZone) zoneContext = `In zone: ${ctx.currentZone}`;
    else if (ctx?.currentZoneName) zoneContext = `In zone: ${ctx.currentZoneName}`;
    else if (ctx?.currentZoneFolder) zoneContext = `In zone: ${ctx.currentZoneFolder} (folder: ${ctx.currentZoneFolder})`;
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sage timeout')), TIMEOUT_MS);
    });

    const result = await Promise.race([
      sageAgent.chat(playerId, query, {
        currentModuleId: ctx?.currentModuleId,
        zoneContext
      }),
      timeoutPromise
    ]);

    const response: QuerySageResponse = {
      response: result.response,
      suggestions: [
        'Tell me more about the basics',
        'What zones can I explore?',
        'How do I complete modules?',
        'Can you give me a hint?'
      ],
      updatedDialogueHistory: result.updatedHistory
    };

    res.json(response);
  } catch (error: any) {
    console.error('Sage query error:', error.message);
    
    // Use zone context for fallback wisdom
    const wisdomZone = ctx?.currentZone || ctx?.currentZoneName || ctx?.currentZoneFolder || undefined;
    const fallbackWisdom = getZoneWisdom(wisdomZone);
    
    res.status(200).json({
      response: fallbackWisdom,
      suggestions: [
        'Tell me more about the basics',
        'What zones can I explore?',
        'Try asking about your current location'
      ],
      updatedDialogueHistory: [
        {
          speaker: 'sage',
          message: fallbackWisdom,
          timestamp: new Date().toISOString()
        }
      ]
    });
  }
};

/**
 * POST /validate-code
 */
export const handleValidateCode = async (
  req: Request<{}, {}, CodeValidationRequest>, 
  res: Response<CodeValidationResponse>
) => {
  try {
    const { code, module, moduleId } = req.body;
    console.log('Code validation request:', { moduleId, codeLength: code.length });

    const result = await validateCode(code, module, process.env.GEMINI_API_KEY);

    if (result.success) {
      sageAgent.getDialogueHistory().push({
        speaker: 'system',
        message: `Module "${module.title}" completed!`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Code validation error:', error);
    res.status(500).json({
      success: false,
      feedback: "An error occurred during validation. Please try again."
    });
  }
};

/**
 * GET /dialogue-history
 */
export const handleGetDialogueHistory = (
  _req: Request, 
  res: Response<{ history: any[] }>
) => {
  const history = sageAgent.getDialogueHistory();
  res.json({ history });
};

/**
 * POST /clear-dialogue
 */
export const handleClearDialogue = (
  _req: Request, 
  res: Response<{ success: boolean }>
) => {
  sageAgent.clearHistory();
  res.json({ success: true });
};
