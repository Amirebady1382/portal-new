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
     * تولید متن با استفاده از مدل GapGPT (Qwen 3.5)
     * این تابع به عنوان جایگزین در صورت در دسترس نبودن Claude یا سایر سرویس‌ها عمل می‌کند
     */
    async generateResponse(input: string, systemContext?: string): Promise<string> {
        const startTime = Date.now();
        const model = process.env.GAPGPT_MODEL || "gapgpt-qwen-3.5";

        try {
            logger.info(`🤖 Calling GapGPT (National AI) as fallback...`, 'gap-gpt');

            const client = this.getClient();

            // ترکیب سیستم پرامپت و ورودی اگر هر دو موجود باشند
            const combinedInput = systemContext ? `${systemContext}\n\n${input}` : input;

            // استفاده از ساختار ارائه شده توسط کاربر
            // توجه: این متد در SDK استاندارد OpenAI وجود ندارد و احتمالاً مربوط به Wrapper خاص GapGPT است
            const response = await client.responses.create({
                model: model,
                input: combinedInput
            });

            const processingTime = Date.now() - startTime;
            logger.info(`✅ GapGPT response received in ${processingTime}ms`, 'gap-gpt');

            return response.output_text || "";
        } catch (error) {
            logger.error('❌ GapGPT Error:', 'gap-gpt', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
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
