import { Router, Response, NextFunction } from "express";
import { authMiddleware, requireRole, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { aiAnalysisService } from "../services/ai-analysis";
import { uploadMiddleware } from "../middleware/upload";
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';

const router = Router();
// 🚀 استفاده از قوی‌ترین مدل موجود - Claude 4 Sonnet
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

// مدل‌های قدرتمند به ترتیب اولویت (از جدیدترین و بهترین)
const PREMIUM_MODELS = [
  "claude-sonnet-4-20250514",      // 🚀 Claude 4 - قوی‌ترین و جدیدترین
  "claude-3-5-sonnet-20241022",    // Claude 3.5 - بسیار قوی
  "claude-3-5-sonnet-20240620",    // Claude 3.5 - قوی و سریع
  "claude-3-opus-20240229",        // Claude 3 Opus - قوی‌ترین Claude 3
  "claude-3-sonnet-20240229",      // Claude 3 Sonnet - متعادل
  "claude-3-haiku-20240307"        // Claude 3 Haiku - سریع‌ترین
];

// Anthropic client
let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log(`🔑 Checking Anthropic API Key...`);
    console.log(`🔑 API Key exists: ${!!apiKey}`);
    console.log(`🔑 API Key length: ${apiKey ? apiKey.length : 0}`);
    console.log(`🔑 API Key preview: ${apiKey ? apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 4) : 'NONE'}`);
    console.log(`🔑 API Key starts with: ${apiKey ? apiKey.substring(0, 7) : 'N/A'}`);
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY environment variable is required');
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-ant-')) {
      console.warn('⚠️ API Key does not start with expected prefix "sk-ant-"');
      console.log(`🔍 Actual prefix: ${apiKey.substring(0, 10)}`);
    } else {
      console.log('✅ API Key format looks correct');
    }
    
    anthropicClient = new Anthropic({ 
      apiKey
    });
    console.log(`✅ Anthropic client initialized successfully`);
  }
  return anthropicClient;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/companies/:id/ai-chat
 * Interactive AI chat for company analysis
 */
const handleAIChat = async (req: AuthRequest, res: Response) => {
  console.log(`🚀 AI Chat Handler called!`);
  console.log(`🚀 Method: ${req.method}, Path: ${req.path}`);
  console.log(`🚀 User:`, req.user ? { userId: req.user.userId, role: req.user.role } : 'No user');
  
  try {
    const companyId = parseInt(req.params.id);
    const { message, isInitial = false, conversationHistory = [], uploadedFile, sessionId, serviceId, deepAnalysis = false } = req.body;

    console.log(`🤖 AI Chat Request: Company ${companyId} - Message: ${message?.substring(0, 100)}...`);
    if (serviceId) {
      console.log(`🎯 Service focus requested: ${serviceId}`);
    }
    if (deepAnalysis) {
      console.log(`🔬 Deep analysis requested - will read all PDFs`);
    }

    // Make sure the company exists
    const company = await storage.getCompany(companyId);
    if (!company) {
      console.log(`❌ Company ${companyId} not found`);
      return res.status(404).json({ error: "شرکت یافت نشد" });
    }

    console.log(`📊 Company ${companyId} found: ${company.name}`);

    // Handle session management
    let currentSessionId = sessionId;
    
    // If no session provided and it's initial, create new session
    if (!currentSessionId && isInitial) {
      const newSession = await storage.createAIChatSession({
        userId: req.user.userId,
        companyId,
        title: `تحلیل ${company.name} - ${new Date().toLocaleDateString('fa-IR')}`,
        serviceId: serviceId
      });
      currentSessionId = newSession.id;
      console.log(`🆕 Created new chat session: ${currentSessionId}${serviceId ? ` for service ${serviceId}` : ''}`);
    }

    let response = "";

    if (isInitial) {
      // Initial analysis - use the existing AI analysis but format as conversation
      console.log(`🆕 Initial analysis for company: ${company.name}`);
      response = await generateInitialAnalysis(companyId, company, serviceId);
      
      // Save initial AI response to session
      if (currentSessionId) {
        await storage.createAIChatMessage({
          sessionId: currentSessionId,
          messageType: 'ai',
          content: response
        });
        console.log(`💾 Saved initial AI response to session ${currentSessionId}`);
      }
    } else {
      // Continue conversation
      console.log(`💬 Continuing conversation for company: ${company.name}`);
      
      // Save user message first
      if (currentSessionId && message) {
        await storage.createAIChatMessage({
          sessionId: currentSessionId,
          messageType: 'user',
          content: message,
          attachments: uploadedFile ? [uploadedFile] : undefined
        });
        console.log(`💾 Saved user message to session ${currentSessionId}`);
      }
      
      response = await continueConversation(companyId, company, message, conversationHistory, uploadedFile, deepAnalysis);
      
      // Save AI response
      if (currentSessionId) {
        await storage.createAIChatMessage({
          sessionId: currentSessionId,
          messageType: 'ai',
          content: response
        });
        console.log(`💾 Saved AI response to session ${currentSessionId}`);
      }
    }

    res.json({ 
      response,
      sessionId: Number(currentSessionId) // Convert BigInt to Number for JSON serialization
    });

  } catch (error) {
    console.error("❌ Error in AI Chat:", error);
    console.error("❌ Error details:", error instanceof Error ? error.message : String(error));
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: "خطا در گفتگو با هوش مصنوعی", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

// 🚀 تابع پیشرفته برای استفاده از قوی‌ترین مدل‌های Claude
async function tryPremiumAnthropicCall(messages: any[], maxTokens: number = 2000, temperature: number = 0.3): Promise<string> {
  const client = getAnthropicClient();
  console.log(`🤖 Starting PREMIUM AI call with ${PREMIUM_MODELS.length} high-performance models`);
  
  for (let i = 0; i < PREMIUM_MODELS.length; i++) {
    const model = PREMIUM_MODELS[i];
    try {
      console.log(`🚀 Trying PREMIUM model: ${model} (attempt ${i + 1}/${PREMIUM_MODELS.length})`);
      
      const response = await client.messages.create({
        model: model,
        max_tokens: maxTokens,
        temperature: temperature, // کمی خلاقیت برای پاسخ‌های بهتر
        messages: messages
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        console.log(`✅ SUCCESS with PREMIUM model: ${model}`);
        console.log(`📊 Response length: ${content.text.length} chars`);
        console.log(`🧠 Model performance: ${model.includes('sonnet-4') ? 'CLAUDE 4 - MAXIMUM INTELLIGENCE' : model.includes('3-5-sonnet') ? 'CLAUDE 3.5 - LATEST & FASTEST' : model.includes('opus') ? 'CLAUDE 3 OPUS - HIGH INTELLIGENCE' : 'HIGH QUALITY'}`);
        return content.text;
      }
      
      throw new Error('Unexpected response format');
      
    } catch (error: any) {
      console.log(`❌ Failed with PREMIUM model ${model}:`, error.message);
      console.log(`🔍 Error details:`, error.status, error.type);
      
      if (i === PREMIUM_MODELS.length - 1) {
        console.error(`🚨 ALL PREMIUM MODELS FAILED! Last error:`, error.message);
        throw error;
      }
      
      // Try next model
      console.log(`🔄 Trying next PREMIUM model...`);
      continue;
    }
  }
  
  throw new Error('All premium models failed');
}

/**
 * GET /api/companies/test-anthropic
 * Test Anthropic API connection
 */
// @ts-ignore
router.get("/test-anthropic", authMiddleware, requireRole(["admin"]), async (req: any, res: any) => {
  try {
    console.log('🧪 Testing Anthropic API connection...');
    
    const testResponse = await tryPremiumAnthropicCall([
      { role: 'user', content: 'سلام! لطفاً یک پیام کوتاه فارسی با کیفیت بالا پاسخ دهید.' }
    ], 150, 0.5);
    
    res.json({
      success: true,
      message: 'Anthropic API working correctly',
      response: testResponse,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Anthropic API test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.status || 'No status',
      timestamp: new Date().toISOString()
    });
  }
});

// @ts-ignore
router.post("/:id/ai-chat", authMiddleware, requireRole(["admin", "ceo", "employee"]), handleAIChat);

// Pitch Deck Analysis Route
// @ts-ignore
router.post("/:id/pitch-deck-analysis", authMiddleware, requireRole(["admin", "ceo", "employee"]), uploadMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);
    // @ts-ignore
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }

    console.log(`📊 Pitch Deck Analysis Request for Company ${companyId}, File: ${file.path}`);

    const analysis = await aiAnalysisService.analyzePitchDeck(file.path, file.mimetype);

    res.json(analysis);

  } catch (error: any) {
    console.error("❌ Error in Pitch Deck Analysis Route:", error);
    res.status(500).json({ error: error.message });
  } finally {
    // @ts-ignore
    if (req.file && req.file.path) {
      try {
        // @ts-ignore
        await fs.unlink(req.file.path);
        // @ts-ignore
        console.log(`🗑️ Cleaned up uploaded file: ${req.file.path}`);
      } catch (err) {
        console.error(`⚠️ Failed to cleanup file:`, err);
      }
    }
  }
});

async function generateInitialAnalysis(companyId: number, company: any, serviceId?: number): Promise<string> {
  try {
    console.log(`🔍 Generating initial analysis for company ${companyId}`);
    if (serviceId) {
      console.log(`🎯 Focusing analysis on service ${serviceId}`);
    }

    // Build the data object expected by the AIAnalysisService (same as existing analysis)
    const companyData: any = {
      basicInfo: {
        id: company.id,
        name: company.name,
        title: company.name,
        nationalId: company.nationalId,
        capital: company.capital,
        address: company.address,
        status: company.status,
        registrationDate: company.registrationDate,
      },
      companyPanels: {
        teamInfo: company.teamInfo ? JSON.parse(company.teamInfo as unknown as string) : undefined,
        productInfo: company.productInfo ? JSON.parse(company.productInfo as unknown as string) : undefined,
        marketInfo: company.marketInfo ? JSON.parse(company.marketInfo as unknown as string) : undefined,
        financialInfo: company.financialInfo ? JSON.parse(company.financialInfo as unknown as string) : undefined,
      },
    };

    // Add serviceId if provided
    if (serviceId) {
      companyData.serviceId = serviceId;
    }

    // Parse Rasmio (enriched) data if available
    if (company.rasmioData) {
      try {
        const rasmio = typeof company.rasmioData === "object" ? company.rasmioData : JSON.parse(company.rasmioData as unknown as string);
        companyData.managers = rasmio.managers || rasmio.boardMembers || [];
        companyData.activities = rasmio.activities || [];
        companyData.news = rasmio.ads || rasmio.news || [];
      } catch (err) {
        console.warn("Unable to parse rasmioData for AI analysis", err);
      }
    }

    // سعی کنیم از تحلیل cache شده استفاده کنیم
    console.log(`🔍 بررسی تحلیل cache شده برای شرکت ${companyId}...`);
    
    let structuredAnalysis: any = null;
    
    // بررسی cache
    if ((company as any).aiAnalysisData) {
      try {
        const cachedAnalysis = typeof (company as any).aiAnalysisData === 'string' 
          ? JSON.parse((company as any).aiAnalysisData) 
          : (company as any).aiAnalysisData;
          
        if (cachedAnalysis && cachedAnalysis.teamAnalysis && cachedAnalysis.overallRecommendation) {
          console.log(`✅ استفاده از تحلیل cache شده (${cachedAnalysis.analysisTimestamp || 'نامشخص'})`);
          structuredAnalysis = cachedAnalysis;
        } else {
          console.log(`⚠️ ساختار cache معتبر نیست`);
        }
      } catch (error) {
        console.log(`⚠️ خطا در parse کردن cache:`, error);
      }
    }
    
    // اگر cache نبود، تحلیل ساده بدون خواندن PDF
    if (!structuredAnalysis) {
      console.log(`🆕 تحلیل cache نبود - ایجاد تحلیل ساده بدون خواندن PDFها`);
      
      // ایجاد تحلیل ساده بر اساس اطلاعات موجود
      const [documents, formSubmissions] = await Promise.all([
        storage.getDocumentsByCompany(companyId),
        storage.getFormSubmissions({ companyId })
      ]);
      
      structuredAnalysis = {
        companyOverview: `شرکت ${company.name} - اطلاعات اولیه دریافت شد. ${documents.length} سند و ${formSubmissions.length} فرم موجود است.`,
        teamAnalysis: {
          score: 5,
          strengths: ["در حال بررسی"],
          weaknesses: ["نیاز به تحلیل عمیق‌تر"],
          summary: "برای تحلیل دقیق تیم، از دکمه 'تحلیل عمیق اسناد' استفاده کنید."
        },
        productAnalysis: {
          score: 5,
          marketPotential: "در حال بررسی",
          competitiveAdvantage: "نیاز به بررسی",
          summary: "برای تحلیل دقیق محصولات، از دکمه 'تحلیل عمیق' استفاده کنید."
        },
        marketAnalysis: {
          score: 5,
          marketSize: "در حال بررسی",
          competition: "نیاز به بررسی",
          trends: "نیاز به تحلیل",
          summary: "اطلاعات اولیه موجود است."
        },
        financialAnalysis: {
          score: company.capital ? 6 : 4,
          capitalStructure: company.capital ? `سرمایه: ${company.capital} ریال` : "نامشخص",
          growthPotential: "قابل بررسی",
          summary: `${documents.length} سند مالی موجود است.`
        },
        formAnalysis: {
          score: formSubmissions.length > 0 ? 6 : 3,
          completedForms: formSubmissions.map((f: any) => f.id),
          summary: `${formSubmissions.length} فرم تکمیل شده است.`
        },
        overallRecommendation: {
          score: 5,
          recommendation: 'neutral',
          reasoning: "این یک تحلیل اولیه است. برای بررسی دقیق‌تر از گزینه 'تحلیل عمیق اسناد' استفاده کنید.",
          nextSteps: ["استفاده از تحلیل عمیق برای بررسی اسناد", "پرسیدن سوالات تخصصی"]
        }
      };
    }

    console.log(`✅ تحلیل آماده شد برای شرکت ${companyId}`);

    // Convert structured analysis to conversational format
    const conversationalResponse = await convertAnalysisToConversation(structuredAnalysis, company.name);

    return conversationalResponse;

  } catch (error) {
    console.error("❌ Error generating initial analysis:", error);
    console.error("❌ Analysis error details:", error instanceof Error ? error.message : String(error));
    console.error("❌ Analysis error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return `متأسفانه در تحلیل شرکت ${company.name} خطایی رخ داد. جزئیات خطا: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function convertAnalysisToConversation(analysis: any, companyName: string): Promise<string> {
  try {
    console.log(`🔄 Converting structured analysis to conversational format for ${companyName}`);

    const prompt = `شما یک مشاور هوش مصنوعی تخصصی در زمینه سرمایه‌گذاری هستید. لطفاً تحلیل زیر را به صورت یک مکالمه دوستانه و طبیعی ارائه دهید.

نام شرکت: ${companyName}

تحلیل ساختارمند:
${JSON.stringify(analysis, null, 2)}

لطفاً این تحلیل را بازنویسی کنید:
1. با سلام و معرفی خودتان شروع کنید
2. به صورت متنی طبیعی و جذاب ارائه دهید (نه JSON!)
3. همه بخش‌های مهم را پوشش دهید: تیم، محصول، بازار، مالی، ریسک
4. نمره‌ها و امتیازها را به صورت فارسی ذکر کنید
5. در پایان بپرسید آیا سوال خاصی دارند
6. لحن دوستانه و تخصصی داشته باشید
7. متن فارسی و روان باشد

توجه: این اولین پیام در مکالمه است، بنابراین کامل و جامع باشید اما طولانی نشود.`;

    const conversationalText = await tryPremiumAnthropicCall([{ role: 'user', content: prompt }], 3000, 0.4);
    
    console.log(`✅ Conversational analysis generated for ${companyName}`);
    return conversationalText;

  } catch (error) {
    console.error("❌ Error converting analysis to conversation:", error);
    console.error("❌ Conversion error details:", error instanceof Error ? error.message : String(error));
    return `سلام! من مشاور هوش مصنوعی شما هستم. 

❌ متأسفانه در تبدیل تحلیل به مکالمه خطایی رخ داد: ${error instanceof Error ? error.message : String(error)}

تحلیل اولیه شرکت ${companyName} را انجام دادم. در حال حاضر اطلاعات محدودی در دسترس است که نیاز به تکمیل دارد.

بر اساس اطلاعات موجود:
- نیاز به بررسی بیشتر تیم مدیریتی دارد
- اطلاعات محصول و خدمات باید تکمیل شود  
- وضعیت مالی نیاز به بررسی دقیق‌تر دارد

آیا سوال خاصی درباره این شرکت دارید یا اطلاعات بیشتری می‌خواهید ارائه دهید؟`;
  }
}

async function continueConversation(
  companyId: number, 
  company: any, 
  userMessage: string, 
  conversationHistory: ConversationMessage[],
  uploadedFile?: string,
  deepAnalysis: boolean = false
): Promise<string> {
  try {
    console.log(`💬 Continuing conversation for company ${companyId}, message: ${userMessage?.substring(0, 100)}...`);

    // Get fresh company data for context
    const companyData: any = {
      basicInfo: {
        id: company.id,
        name: company.name,
        title: company.name,
        nationalId: company.nationalId,
        capital: company.capital,
        address: company.address,
        status: company.status,
        registrationDate: company.registrationDate,
      },
      companyPanels: {
        teamInfo: company.teamInfo ? JSON.parse(company.teamInfo as unknown as string) : undefined,
        productInfo: company.productInfo ? JSON.parse(company.productInfo as unknown as string) : undefined,
        marketInfo: company.marketInfo ? JSON.parse(company.marketInfo as unknown as string) : undefined,
        financialInfo: company.financialInfo ? JSON.parse(company.financialInfo as unknown as string) : undefined,
      },
    };

    // Parse Rasmio data
    if (company.rasmioData) {
      try {
        const rasmio = typeof company.rasmioData === "object" ? company.rasmioData : JSON.parse(company.rasmioData as unknown as string);
        companyData.managers = rasmio.managers || rasmio.boardMembers || [];
        companyData.activities = rasmio.activities || [];
        companyData.news = rasmio.ads || rasmio.news || [];
      } catch (err) {
        console.warn("Unable to parse rasmioData", err);
      }
    }

    // Get fresh documents and forms
    const [documents, formSubmissions] = await Promise.all([
      storage.getDocumentsByCompany(companyId),
      storage.getFormSubmissions({ companyId })
    ]);

    console.log(`📄 دریافت ${documents.length} سند و ${formSubmissions.length} فرم برای چت`);

    // ساخت لیست کامل اسناد (شامل اسناد مستقل + فایل‌های فرم)
    const { AIAnalysisService } = await import('../services/ai-analysis');
    const aiAnalysisService = new AIAnalysisService();
    
    let allDocuments = [...documents];
    
    // استخراج فایل‌های موجود در فرم‌ها
    if (formSubmissions.length > 0) {
      console.log(`🔍 بررسی فرم‌ها برای یافتن فایل‌های اضافی...`);
      
      for (const form of formSubmissions) {
        if (form.formData) {
          try {
            const formData = typeof form.formData === 'string' ? JSON.parse(form.formData) : form.formData;
            
            for (const [key, value] of Object.entries(formData)) {
              if (value && typeof value === 'object' && (value as any).fileName) {
                const fileInfo = value as { filePath?: string; fileName: string; fileId?: number };
                
                if (fileInfo.fileId && !fileInfo.filePath) {
                  const document = await storage.getDocument(fileInfo.fileId);
                  if (document) {
                    let actualFilePath = document.filePath;
                    if (!actualFilePath && (document as any).filename) {
                      actualFilePath = `uploads/${(document as any).filename}`;
                    }
                    
                    if (actualFilePath) {
                      const docToAdd = {
                        id: document.id,
                        originalName: document.originalName,
                        filePath: actualFilePath,
                        mimeType: document.mimeType,
                        status: document.status,
                        category: key,
                        description: `فایل ضمیمه فرم: ${key}`
                      };
                      allDocuments.push(docToAdd as any);
                      console.log(`   📎 فایل فرم اضافه شد: ${document.originalName || 'بدون نام'}`);
                    }
                  }
                } else if (fileInfo.filePath) {
                  allDocuments.push({
                    id: 0,
                    originalName: fileInfo.fileName,
                    filePath: fileInfo.filePath,
                    mimeType: fileInfo.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'unknown',
                    category: key,
                    description: `فایل ضمیمه فرم: ${key}`
                  } as any);
                }
              }
            }
          } catch (error) {
            console.error('خطا در استخراج فایل‌های فرم:', error);
          }
        }
      }
    }

    console.log(`📊 تعداد کل اسناد (شامل فرم‌ها): ${allDocuments.length}`);

    let contextPrompt = `شما مشاور هوش مصنوعی تخصصی سرمایه‌گذاری هستید و در حال گفتگو با کاربر درباره شرکت ${company.name} هستید.

اطلاعات شرکت:
${JSON.stringify(companyData, null, 2)}

`;

    // اضافه کردن محتوای کامل فرم‌ها
    if (formSubmissions.length > 0) {
      contextPrompt += `\n📋 فرم‌های تکمیل شده (${formSubmissions.length} فرم):\n`;
      for (const form of formSubmissions) {
        try {
          const formData = typeof form.formData === 'string' ? JSON.parse(form.formData) : form.formData;
          contextPrompt += `\nفرم:\n`;
          for (const [key, value] of Object.entries(formData)) {
            if (value && typeof value !== 'object') {
              contextPrompt += `  ${key}: ${value}\n`;
            }
          }
        } catch (error) {
          console.error('خطا در پردازش فرم:', error);
        }
      }
    }

    // اضافه کردن اطلاعات اسناد
    if (allDocuments.length > 0) {
      contextPrompt += `\n\n📄 اسناد و مدارک موجود شرکت (${allDocuments.length} سند):\n`;
      
      // اگر deepAnalysis فعال باشد، محتوای همه اسناد را بخوان
      if (deepAnalysis) {
        console.log(`🔬 تحلیل عمیق: خواندن محتوای ${allDocuments.length} سند...`);
        
        for (let i = 0; i < allDocuments.length; i++) {
          const doc = allDocuments[i];
          contextPrompt += `\n--- سند ${i + 1}: ${doc.originalName} ---\n`;
          contextPrompt += `نوع: ${doc.mimeType || 'نامشخص'}\n`;
          contextPrompt += `دسته: ${doc.category || 'عمومی'}\n`;
          
          if (doc.filePath) {
            try {
              console.log(`   📖 خواندن محتوای سند: ${doc.originalName}`);
              const documentContent = await aiAnalysisService.extractFileContent(doc.filePath, doc.mimeType);
              
              if (documentContent && documentContent.content) {
                console.log(`   ✅ محتوا استخراج شد (${documentContent.content.length} کاراکتر)`);
                contextPrompt += `\n**محتوای کامل سند:**\n${documentContent.content}\n`;
              } else {
                console.log(`   ⚠️ محتوا قابل استخراج نیست`);
                contextPrompt += `محتوا: قابل استخراج نیست\n`;
              }
            } catch (error) {
              console.error(`   ❌ خطا در خواندن سند:`, error);
              contextPrompt += `خطا در خواندن محتوا\n`;
            }
          }
        }
        console.log(`✅ تحلیل عمیق: محتوای تمام اسناد خوانده شد`);
      } else {
        // حالت عادی: فقط لیست اسناد (برای سرعت)
        console.log(`⚡ حالت سریع: فقط لیست اسناد ارائه می‌شود`);
        allDocuments.forEach((doc, i) => {
          contextPrompt += `${i + 1}. ${doc.originalName} (${doc.mimeType || 'نامشخص'}) - دسته: ${doc.category || 'عمومی'}\n`;
        });
        contextPrompt += `\n💡 نکته: برای تحلیل دقیق محتوای اسناد، از دکمه "تحلیل عمیق اسناد" استفاده کنید.\n`;
      }
    }

    // خواندن فایل جدید آپلود شده توسط کاربر (با دقت کامل)
    if (uploadedFile) {
      console.log(`📎 فایل جدید آپلود شده توسط کاربر: ${uploadedFile}`);
      contextPrompt += `\n\n🆕 فایل جدید آپلود شده توسط کاربر:\n`;
      contextPrompt += `- نام فایل: ${uploadedFile}\n`;
      
      // uploadedFile می‌تونه یا نام اصلی باشه یا نام تصادفی (filename) یا filePath کامل
      try {
        let uploadPath = uploadedFile;
        
        // اگر فقط نام فایل است (نه مسیر کامل)، به uploads اضافه کنیم
        if (!uploadedFile.includes('/') && !uploadedFile.includes('\\')) {
          uploadPath = `uploads/${uploadedFile}`;
        }
        
        console.log(`   🔍 جستجوی فایل در: ${uploadPath}`);
        
        // تشخیص نوع فایل از پسوند
        const fileExt = uploadedFile.toLowerCase();
        let mimeType = 'application/octet-stream';
        if (fileExt.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (fileExt.endsWith('.png')) mimeType = 'image/png';
        else if (fileExt.endsWith('.jpg') || fileExt.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (fileExt.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (fileExt.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        
        const documentContent = await aiAnalysisService.extractFileContent(uploadPath, mimeType);
        
        if (documentContent && documentContent.content) {
          console.log(`   ✅ محتوای فایل آپلودی استخراج شد (${documentContent.content.length} کاراکتر)`);
          contextPrompt += `\n**محتوای کامل فایل آپلودی:**\n${documentContent.content}\n`;
          contextPrompt += `\n⚠️ مهم: این فایل تازه توسط کاربر آپلود شده است. حتماً آن را با دقت بررسی کنید و در پاسخ خود به آن اشاره کنید.\n`;
        } else {
          console.log(`   ⚠️ محتوای فایل آپلودی قابل استخراج نیست`);
          contextPrompt += `- محتوای فایل قابل استخراج نیست\n`;
        }
      } catch (error) {
        console.error(`   ❌ خطا در خواندن فایل آپلودی:`, error);
        contextPrompt += `- خطا در خواندن فایل: ${error instanceof Error ? error.message : 'خطای نامشخص'}\n`;
      }
    }

    contextPrompt += `\n\n`;

    contextPrompt += `لطفاً به سوال کاربر پاسخ دهید:
- پاسخ دقیق و تخصصی باشد
${deepAnalysis ? '- از محتوای کامل اسناد که خوانده شد استفاده کنید' : '- در صورت نیاز به محتوای دقیق اسناد، از کاربر بخواهید "تحلیل عمیق" را فعال کند'}
${uploadedFile ? '- حتماً به فایل جدید آپلود شده توجه ویژه کنید' : ''}
- لحن دوستانه و راهنما باشد
- در صورت نیاز، سوال‌های راهنما بپرسید
- پاسخ فارسی و روان باشد`;

    // Build conversation messages for Claude
    const messages: any[] = [
      { role: 'user', content: contextPrompt }
    ];

    // Add conversation history (limited to last 10 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const aiResponse = await tryPremiumAnthropicCall(messages, 2500, 0.3);
    
    console.log(`✅ Conversation response generated for company ${companyId}`);
    return aiResponse;

  } catch (error) {
    console.error("❌ Error continuing conversation:", error);
    console.error("❌ Conversation error details:", error instanceof Error ? error.message : String(error));
    console.error("❌ Conversation error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return `متأسفانه در پردازش درخواست شما خطایی رخ داد. جزئیات خطا: ${error instanceof Error ? error.message : String(error)}. لطفاً سوال خود را دوباره مطرح کنید.`;
  }
}

export default router;
