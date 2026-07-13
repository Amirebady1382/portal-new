import axios from 'axios';
import { gapGPTService } from './gap-gpt.service';

interface PerplexityRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  object: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }>;
}

export interface ResearchResult {
  content: string;
  citations: string[];
  model: string;
  tokensUsed: number;
  relatedQuestions?: string[];
  processingTime: number;
}

export class PerplexityResearchService {
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai';
  private defaultModel = 'sonar-deep-research'; // مدل پیشرفته برای تحقیق عمیق

  constructor() {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ PERPLEXITY_API_KEY not found in environment variables');
      this.apiKey = '';
    } else {
      this.apiKey = apiKey;
    }
  }

  /**
   * Check if Perplexity API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Research about a company
   */
  async researchCompany(companyData: {
    name: string;
    nationalId?: string;
    industry?: string;
    additionalContext?: string;
  }): Promise<ResearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Perplexity API is not configured. Please set PERPLEXITY_API_KEY in .env');
    }

    const startTime = Date.now();

    const query = this.buildCompanyResearchQuery(companyData);

    console.log(`🔍 Researching company with Perplexity: ${companyData.name}`);

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: 'شما یک محقق حرفه‌ای هستید که درباره شرکت‌ها و صنایع تحقیق می‌کنید. لطفاً اطلاعات دقیق، معتبر و به‌روز ارائه دهید.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 4000,
      temperature: 0.2,
      return_related_questions: true,
      search_recency_filter: 'month' // جستجوی اطلاعات یک ماه اخیر
    });

    const processingTime = Date.now() - startTime;

    console.log(`✅ Perplexity research completed in ${processingTime}ms`);
    console.log(`📊 Tokens used: ${response.usage.total_tokens}`);
    console.log(`📚 Citations: ${response.citations?.length || 0}`);

    return {
      content: response.choices[0].message.content,
      citations: response.citations || [],
      model: response.model,
      tokensUsed: response.usage.total_tokens,
      processingTime
    };
  }

  /**
   * Research about an industry or market
   */
  async researchIndustry(industryName: string, focusAreas?: string[]): Promise<ResearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Perplexity API is not configured');
    }

    const startTime = Date.now();

    let query = `تحقیق جامع درباره صنعت ${industryName} در ایران:
    
1. وضعیت فعلی بازار و اندازه آن
2. روندهای رشد و پیش‌بینی آینده
3. بازیگران اصلی و رقبا
4. فرصت‌ها و تهدیدها
5. مقررات و قوانین مرتبط`;

    if (focusAreas && focusAreas.length > 0) {
      query += `\n\nتمرکز ویژه روی: ${focusAreas.join('، ')}`;
    }

    const response = await this.makeRequest({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: 'شما یک تحلیلگر بازار و صنعت هستید. اطلاعات دقیق و معتبر درباره صنایع ایران ارائه دهید.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 4000,
      temperature: 0.2,
      search_recency_filter: 'month'
    });

    return {
      content: response.choices[0].message.content,
      citations: response.citations || [],
      model: response.model,
      tokensUsed: response.usage.total_tokens,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Custom research query
   */
  async research(query: string, options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    recencyFilter?: string;
  }): Promise<ResearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Perplexity API is not configured');
    }

    const startTime = Date.now();

    const response = await this.makeRequest({
      model: options?.model || this.defaultModel,
      messages: [
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.2,
      search_recency_filter: options?.recencyFilter || 'month'
    });

    return {
      content: response.choices[0].message.content,
      citations: response.citations || [],
      model: response.model,
      tokensUsed: response.usage.total_tokens,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Make request to Perplexity API
   */
  private async makeRequest(request: PerplexityRequest): Promise<PerplexityResponse> {
    try {
      const response = await axios.post<PerplexityResponse>(
        `${this.baseURL}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 seconds timeout
        }
      );

      return response.data;
    } catch (error) {
      console.warn('⚠️ Perplexity API failed, trying GapGPT fallback...', error instanceof Error ? error.message : error);

      try {
        // Prepare combined prompt for GapGPT
        const systemMessage = request.messages.find(m => m.role === 'system')?.content || '';
        const userMessage = request.messages.find(m => m.role === 'user')?.content || '';

        const responseText = await gapGPTService.generateResponse(userMessage, systemMessage);

        // Return normalized response matching PerplexityResponse structure
        return {
          id: `gapgpt-${Date.now()}`,
          model: 'gapgpt-qwen-3.5',
          created: Math.floor(Date.now() / 1000),
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          },
          object: 'chat.completion',
          choices: [{
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: responseText + '\n\n(توجه: این پاسخ توسط هوش مصنوعی جایگزین ملی به دلیل عدم دسترسی به سرویس تحقیق Perplexity تولید شده است و ممکن است شامل اطلاعات لحظه‌ای اینترنت نباشد.)'
            },
            delta: {
              role: 'assistant',
              content: responseText
            }
          }]
        };
      } catch (gapError) {
        if (axios.isAxiosError(error)) {
          console.error('❌ Perplexity API error:', error.response?.data || error.message);
          throw new Error(`Perplexity API error: ${error.response?.data?.error?.message || error.message}`);
        }
        throw error;
      }
    }
  }

  /**
   * Build company research query
   */
  private buildCompanyResearchQuery(companyData: {
    name: string;
    nationalId?: string;
    industry?: string;
    additionalContext?: string;
  }): string {
    let query = `تحقیق جامع درباره شرکت ${companyData.name}`;

    if (companyData.nationalId) {
      query += ` با شناسه ملی ${companyData.nationalId}`;
    }

    query += `:\n\n`;
    query += `1. معرفی و تاریخچه شرکت\n`;
    query += `2. محصولات یا خدمات ارائه شده\n`;
    query += `3. بازار هدف و مشتریان\n`;
    query += `4. رقبای اصلی و موقعیت رقابتی\n`;
    query += `5. نقاط قوت و مزیت‌های رقابتی\n`;
    query += `6. چالش‌ها و تهدیدها\n`;
    query += `7. اخبار و رویدادهای اخیر مرتبط با شرکت\n`;

    if (companyData.industry) {
      query += `8. وضعیت صنعت ${companyData.industry} در ایران\n`;
    }

    if (companyData.additionalContext) {
      query += `\n${companyData.additionalContext}`;
    }

    query += `\n\nلطفاً اطلاعات معتبر و به‌روز ارائه دهید و منابع را ذکر کنید.`;

    return query;
  }
}

export const perplexityResearchService = new PerplexityResearchService();

