/**
 * Code Validator Service
 * Validates player code submissions using LLM evaluation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LearningModule } from '@obsidian-ledger/shared/types';

export interface ValidationRequest {
  code: string;
  module: LearningModule;
  language?: string;
}

export interface ValidationResponse {
  success: boolean;
  feedback: string;
  score?: number;
  completedModuleId?: string;
}

const VALIDATION_SYSTEM_PROMPT = `You are a code validator for "The Obsidian Ledger" - a gamified programming learning platform.

Your job is to evaluate player code submissions against module requirements.

EVALUATION CRITERIA:
1. Does the code solve the stated problem?
2. Is the code syntactically correct?
3. Does it follow best practices?
4. Does it meet all requirements?

OUTPUT FORMAT:
Return a JSON object with:
{
  "success": true/false - whether the solution is correct
  "feedback": "Detailed explanation of what's correct and what needs work"
  "score": 0-100 - overall score
}

Be encouraging but honest. If incorrect, point to specific issues.`;

function buildValidationPrompt(request: ValidationRequest): string {
  const { code, module, language = 'javascript' } = request;

  return `
MODULE: ${module.title}
DESCRIPTION: ${module.description || module.content}
PREREQUISITES: ${module.prerequisites?.join(', ') || 'None'}

PLAYER'S CODE (${language}):
\`\`\`${language}
${code}
\`\`\`

Evaluate this code submission and return JSON with success, feedback, and score fields.
`;
}

export async function validateCode(
  code: string, 
  module: LearningModule, 
  apiKey?: string
): Promise<ValidationResponse> {
  // If no API key, use heuristic validation
  if (!apiKey) {
    return heuristicValidation(code, module);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
      }
    });

    const prompt = buildValidationPrompt({ code, module });
    
    const result = await model.generateContent(prompt);
    const response = result.response?.text();

    if (!response) {
      throw new Error('Empty response');
    }

    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: parsed.success || false,
        feedback: parsed.feedback || 'Code evaluated.',
        score: parsed.score || 0,
        completedModuleId: parsed.success ? module.id : undefined
      };
    }

    // Fallback if no valid JSON
    return {
      success: response.toLowerCase().includes('success') || response.includes('✓'),
      feedback: response,
      score: response.includes('✓') ? 80 : 50
    };

  } catch (error) {
    console.warn('LLM validation failed, using heuristic:', error);
    return heuristicValidation(code, module);
  }
}

/**
 * Simple heuristic-based validation when no LLM is available
 */
function heuristicValidation(code: string, module: LearningModule): ValidationResponse {
  const codeLower = code.toLowerCase();
  const moduleTitleLower = module.title.toLowerCase();
  
  let score = 0;
  const feedback: string[] = [];

  // Check code length
  if (code.length < 10) {
    return {
      success: false,
      feedback: "Your code is too short. Try adding more implementation!",
      score: 10
    };
  }

  // Basic keyword checks based on common patterns
  const keywords: Record<string, string[]> = {
    'function': ['function', '=>', 'const', 'let', 'var'],
    'array': ['[]', 'array', 'map', 'filter', 'reduce'],
    'loop': ['for', 'while', 'foreach', 'loop'],
    'object': ['{}', 'object', 'key', 'value'],
    'class': ['class', 'constructor', 'extends'],
    'async': ['async', 'await', 'promise', 'then'],
  };

  // Check for relevant keywords based on module title
  for (const [topic, words] of Object.entries(keywords)) {
    if (moduleTitleLower.includes(topic)) {
      const found = words.some(w => codeLower.includes(w));
      if (found) {
        score += 25;
        feedback.push(`✓ Good use of ${topic} concepts`);
      }
    }
  }

  // General code quality checks
  if (code.includes('function') || code.includes('=>')) {
    score += 20;
    feedback.push("✓ Uses functions appropriately");
  }

  if (code.includes('{') && code.includes('}')) {
    score += 10;
    feedback.push("✓ Proper block structure");
  }

  if (code.includes('return')) {
    score += 10;
    feedback.push("✓ Has return statement");
  }

  if (code.includes('//') || code.includes('/*')) {
    score += 5;
    feedback.push("✓ Includes comments");
  }

  // Cap score
  score = Math.min(score, 100);

  const success = score >= 50;

  return {
    success,
    feedback: feedback.length > 0 
      ? feedback.join('\n') + (success ? '\n\n🎉 Great job!' : '\n\nKeep exploring the module for more hints!')
      : 'Code submitted. Visit the Sage for personalized feedback!',
    score,
    completedModuleId: success ? module.id : undefined
  };
}

export default { validateCode };
