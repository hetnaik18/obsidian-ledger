import { Request, Response } from 'express';
import { QuerySageRequest, QuerySageResponse } from '@obsidian-ledger/shared/types';
import { SageAgent } from '../agents/SageAgent';
import { validateCode } from '../services/CodeValidator';

const sageAgent = new SageAgent({
  apiKey: process.env.GEMINI_API_KEY
});

export const handleQuerySage = async (req: Request<{}, {}, QuerySageRequest>, res: Response) => {
  const { playerId, query, context } = req.body;
  try {
    const result = await sageAgent.chat(playerId, query, { zoneContext: JSON.stringify(context) });
    res.json({
      response: result.response,
      suggestions: ['Tell me more', 'Hint?'],
      updatedDialogueHistory: result.updatedHistory
    });
  } catch (error) {
    res.status(200).json({ response: "The ancient scrolls are blurry...", updatedDialogueHistory: [] });
  }
};

export const handleValidateCode = async (req: Request, res: Response) => {
  try {
    const { code, module } = req.body;
    const result = await validateCode(code, module, process.env.GEMINI_API_KEY);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, feedback: "Validation error." });
  }
};

export const handleGetDialogueHistory = (_req: Request, res: Response) => {
  res.json({ history: sageAgent.getDialogueHistory() });
};

export const handleClearDialogue = (_req: Request, res: Response) => {
  sageAgent.clearHistory();
  res.json({ success: true });
};
