import { logger } from '../utils/logger';
import { gapGPTService } from './gap-gpt.service';
import Anthropic from '@anthropic-ai/sdk';

export interface AIRequestOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export class AIOrchestratorService {
  private anthropic: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const disableDirect = process.env.DISABLE_DIRECT_CLAUDE === 'true';
    if (apiKey && !disableDirect) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * اجرای درخواست هوش مصنوعی با قابلیت Failover به GapGPT
   */
  async execute(prompt: string, options: AIRequestOptions = {}): Promise<string> {
    const timeout = options.timeout || 30000; // 30 seconds default
    
    // 1. تلاش با سرویس اصلی (Claude)
    if (this.anthropic) {
      try {
        logger.info(`🤖 Calling Primary AI (Claude)...`, 'ai-orchestrator');
        
        const modelId = options.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
        
        const response = await Promise.race([
          this.anthropic.messages.create({
            model: modelId,
            max_tokens: options.maxTokens || 4000,
            temperature: options.temperature || 0,
            system: options.systemPrompt,
            messages: [{ role: 'user', content: prompt }]
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Primary AI Timeout')), timeout))
        ]) as any;

        if (response && response.content && response.content[0].type === 'text') {
          logger.info('✅ Success with Primary AI', 'ai-orchestrator');
          return response.content[0].text;
        }
      } catch (error) {
        logger.warn('⚠️ Primary AI failed, falling back to GapGPT...', 'ai-orchestrator', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    } else {
      logger.warn('⚠️ Primary AI not configured, using GapGPT directly', 'ai-orchestrator');
    }

    // 2. Failover به GapGPT
    try {
      return await gapGPTService.generateResponse(prompt, options.systemPrompt);
    } catch (gapError) {
      logger.error('❌ Both Primary AI and GapGPT failed', 'ai-orchestrator', {
        error: gapError instanceof Error ? gapError.message : String(gapError)
      });
      throw gapError;
    }
  }
}

export const aiOrchestrator = new AIOrchestratorService();
