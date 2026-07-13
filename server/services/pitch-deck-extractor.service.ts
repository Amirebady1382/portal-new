import fs from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { gapGPTService } from './gap-gpt.service';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

// Helper to get Anthropic client
let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): any {
  const disableDirect = process.env.DISABLE_DIRECT_CLAUDE === 'true';
  if (disableDirect) {
    return {
      messages: {
        create: async (options: any) => {
          logger.info("🤖 Routing direct Claude call to GapGPT because DISABLE_DIRECT_CLAUDE is active", "pitch-deck-ai");
          // Format prompt from messages/content
          const systemPrompt = options.system || undefined;
          let prompt = "";
          
          if (options.messages?.[0]?.content) {
            const content = options.messages[0].content;
            if (Array.isArray(content)) {
              // Extract text parts
              prompt = content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join("\n") || "Extract text from the attached pitch deck document.";
            } else {
              prompt = String(content);
            }
          }
          
          const content = await gapGPTService.generateResponse(prompt, systemPrompt);
          return {
            content: [{ type: "text", text: content }]
          };
        }
      }
    };
  }

  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export class PitchDeckExtractorService {

  /**
   * Extract text and key information from a Pitch Deck file (PDF, Image, etc.)
   * using Claude's vision and document capabilities.
   */
  async extractText(filePath: string, mimeType: string): Promise<string> {
    const fileName = path.basename(filePath);
    logger.info(`📄 Starting text extraction for Pitch Deck: ${fileName}`, 'pitch-deck-extractor');

    try {
      // Read file buffer
      const buffer = await fs.readFile(filePath);
      const fileSize = Math.round(buffer.length / 1024);

      logger.info(`📊 File size: ${fileSize}KB`, 'pitch-deck-extractor');

      // Validate file size (Claude limit ~32MB for base64 encoded)
      if (fileSize > 32 * 1024) {
        throw new Error(`File too large: ${fileSize}KB (Max: 32MB)`);
      }

      const base64Data = buffer.toString('base64');

      // Determine extraction method based on mime type
      if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
        return await this.extractFromPdf(base64Data);
      } else if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath)) {
        return await this.extractFromImage(base64Data, mimeType);
      } else {
        // Fallback or error for unsupported types
        throw new Error(`Unsupported file type for Pitch Deck extraction: ${mimeType}`);
      }

    } catch (error: any) {
      logger.error(`❌ Error extracting text from Pitch Deck: ${error.message}`, 'pitch-deck-extractor', error);
      throw new Error(`Failed to extract text from Pitch Deck: ${error.message}`);
    }
  }

  private async extractFromPdf(base64Data: string): Promise<string> {
    logger.info('🤖 Sending PDF to Claude Document API...', 'pitch-deck-extractor');
    logger.debug('Request payload (excluding base64)', 'pitch-deck-extractor', { model: DEFAULT_MODEL, max_tokens: 4000 });

    const anthropic = getAnthropicClient();
    const startTime = Date.now();

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data
              }
            },
            {
              type: 'text',
              text: `Please analyze this Pitch Deck PDF and extract all text and key information.
              Focus on:
              1. Team information (bios, roles, experience)
              2. Market Size (TAM, SAM, SOM, trends)
              3. Product/Solution description and value proposition
              4. Business Model / Revenue Model details
              5. Financial projections or history

              Provide the extracted content in a clear, structured text format.`
            }
          ]
        }
      ]
    });

    const duration = Date.now() - startTime;
    logger.info(`✅ Claude API Response received`, 'pitch-deck-extractor', {
      duration,
      usage: response.usage,
      stop_reason: response.stop_reason
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    if (!content || content.length < 50) {
      throw new Error('Claude response was empty or too short');
    }

    return content;
  }

  private async extractFromImage(base64Data: string, mimeType: string): Promise<string> {
    logger.info('👁️ Sending Image to Claude Vision...', 'pitch-deck-extractor');
    logger.debug('Request payload (excluding base64)', 'pitch-deck-extractor', { model: DEFAULT_MODEL, max_tokens: 4000, media_type: mimeType });

    const anthropic = getAnthropicClient();
    const startTime = Date.now();

    // Ensure mime type is supported
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (mimeType === 'image/png') mediaType = 'image/png';
    else if (mimeType === 'image/gif') mediaType = 'image/gif';
    else if (mimeType === 'image/webp') mediaType = 'image/webp';

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: `Please analyze this Pitch Deck slide/image and extract all text and key information.
              Focus on any visible details regarding Team, Market, Product, or Financials.`
            }
          ]
        }
      ]
    });

    const duration = Date.now() - startTime;
    logger.info(`✅ Claude Vision API Response received`, 'pitch-deck-extractor', {
      duration,
      usage: response.usage,
      stop_reason: response.stop_reason
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    if (!content || content.length < 20) {
      throw new Error('Claude response for image was empty or too short');
    }

    return content;
  }
}

export const pitchDeckExtractorService = new PitchDeckExtractorService();
