import OpenAI from "openai";
import { logger } from '../utils/logger';

export class GapGPTService {
    private client: any = null;

    constructor() {
        // Lazy initialization
    }

    private getClient(): any {
        if (!this.client) {
            const apiKey = process.env.GAPGPT_API_KEY;
            const baseURL = process.env.GAPGPT_BASE_URL || "https://api.gapgpt.app/v1";

            if (!apiKey) {
                logger.warn('⚠️ GAPGPT_API_KEY not found in environment variables', 'gap-gpt');
            }

            this.client = new OpenAI({
                apiKey: apiKey || 'missing',
                baseURL: baseURL
            });
        }
        return this.client;
    }

    /**
     * تولید متن با استفاده از مدل GapGPT (Claude 4.6)
     * با مکانیزم تلاش مجدد (Retry) در صورت بروز خطا
     */
    async generateResponse(input: string, systemContext?: string, retries = 3): Promise<string> {
        const startTime = Date.now();
        const model = process.env.GAPGPT_MODEL || "claude-sonnet-4-6";

        let lastError: any;

        for (let i = 0; i < retries; i++) {
            try {
                logger.info(`🤖 Calling GapGPT (Attempt ${i + 1}/${retries})...`, 'gap-gpt');

                const client = this.getClient();

                const response = await client.chat.completions.create({
                    model: model,
                    messages: [
                        ...(systemContext ? [{ role: "system", content: systemContext }] : []),
                        { role: "user", content: input }
                    ]
                });

                const processingTime = Date.now() - startTime;
                logger.info(`✅ GapGPT response received in ${processingTime}ms`, 'gap-gpt');

                const content = response.choices[0]?.message?.content || "";
                
                // Check if the response is actually an HTML error page (common with 502/504 proxies)
                if (content.includes('<!DOCTYPE html>') || content.includes('<html>')) {
                    throw new Error('Service returned HTML error page (504/502)');
                }

                return content;
            } catch (error) {
                lastError = error;
                logger.warn(`⚠️ GapGPT attempt ${i + 1} failed`, 'gap-gpt', { error: String(error) });
                
                // Wait with exponential backoff before retrying
                if (i < retries - 1) {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        logger.error('❌ GapGPT failed after all retries:', 'gap-gpt', lastError);
        throw lastError;
    }

    /**
     * متد کمکی برای تبدیل پیام‌های استاندارد (messages) به متن واحد برای GapGPT
     */
    async generateFromMessages(messages: any[], system?: string): Promise<string> {
        let combinedText = system ? `System: ${system}\n\n` : "";

        for (const msg of messages) {
            const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'Context';
            combinedText += `${role}: ${msg.content}\n`;
        }

        return this.generateResponse(combinedText);
    }
}

export const gapGPTService = new GapGPTService();
