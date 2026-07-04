import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { aiVariableDetectionService } from '../services/ai-variable-detection.service';
import { storage } from '../storage';
import { contractVariablesService } from '../services/contract-variables.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PizZip from 'pizzip';

const router = Router();

/**
 * POST /api/ai/analyze-text-for-variables
 * Analyze plain text for variable detection
 */
router.post(
  '/analyze-text-for-variables',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { text, model = 'claude-4-sonnet' } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: 'متن ارسال نشده است'
        });
      }

      console.log(`🤖 Analyzing text (${text.length} characters) with model: ${model}`);

      // Get existing variables from system
      const existingVariables = await contractVariablesService.getContractVariables({ isActive: true });
      console.log(`📚 Found ${existingVariables.length} existing variables in system`);

      // Build variables guide for Claude
      const variablesGuide = existingVariables.length > 0 ? `
📋 متغیرهای موجود در سیستم (${existingVariables.length} عدد):
${existingVariables.map(v => `- {{${v.name}}}: ${v.label} (نوع: ${v.dataType}, منبع: ${v.source})`).join('\n')}

⚠️ مهم: اگر متغیری در لیست بالا وجود دارد که با متن مطابقت دارد، حتماً از همان استفاده کنید.
فقط در صورتی متغیر جدید پیشنهاد دهید که در لیست بالا نیست.
برای متغیرهای موجود، از دقیقاً همان نام استفاده کنید.
` : '';

      // Analyze text directly with AI
      const analysisResult = await aiVariableDetectionService.analyzeWithAI(
        text,
        model,
        '',
        `تحلیل متن برای شناسایی متغیرها. لطفاً تمام قسمت‌هایی که باید به صورت متغیر تعریف شوند را شناسایی کنید.`,
        variablesGuide
      );

      console.log(`✅ Analysis completed: ${analysisResult.detectedVariables.length} variables found`);

      // Apply variables to the original text to create processed version
      let processedText = text;
      for (const variable of analysisResult.detectedVariables) {
        if (variable.original && variable.name) {
          // Replace original text with {{variable_name}}
          const placeholder = `{{${variable.name}}}`;
          processedText = processedText.replace(new RegExp(variable.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), placeholder);
        }
      }

      res.json({
        success: true,
        ...analysisResult,
        processedText, // متن با متغیرهای جایگذاری شده
        message: `${analysisResult.detectedVariables.length} متغیر شناسایی شد`
      });

    } catch (error) {
      console.error('❌ Text analysis error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'خطا در تحلیل متن',
        error: error instanceof Error ? error.stack : String(error)
      });
    }
  }
);

/**
 * POST /api/ai/generate-word-from-text
 * Generate Word document with variables from analyzed text
 */
router.post(
  '/generate-word-from-text',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { text, variables } = req.body;

      if (!text || !variables || !Array.isArray(variables)) {
        return res.status(400).json({
          success: false,
          message: 'متن یا متغیرها ارسال نشده است'
        });
      }

      console.log(`📄 Generating Word document with ${variables.length} variables`);

      // Apply variables to text
      let processedText = text;
      for (const variable of variables) {
        if (variable.original && variable.name) {
          const placeholder = `{{${variable.name}}}`;
          const escapedOriginal = variable.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          processedText = processedText.replace(new RegExp(escapedOriginal, 'g'), placeholder);
        }
      }

      // Create a simple Word document using docx
      const Document = require('docx').Document;
      const Paragraph = require('docx').Paragraph;
      const TextRun = require('docx').TextRun;
      const Packer = require('docx').Packer;

      // Split text into paragraphs
      const paragraphs = processedText.split('\n').map((para: string) => 
        new Paragraph({
          children: [new TextRun({ text: para, rightToLeft: true })]
        })
      );

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);

      // Send as download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="processed_text_${Date.now()}.docx"`);
      res.send(buffer);

      console.log(`✅ Word document generated successfully`);

    } catch (error) {
      console.error('❌ Word generation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'خطا در تولید فایل Word'
      });
    }
  }
);

/**
 * POST /api/ai/analyze-excel-for-variables
 * Analyze Excel/table data for variable detection
 */
router.post(
  '/analyze-excel-for-variables',
  authMiddleware,
  requireRole(['admin']),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'فایل Excel ارسال نشده است'
        });
      }

      const { model = 'claude-sonnet-4-20250514' } = req.body;

      console.log(`📊 Analyzing Excel file: ${req.file.originalname}`);

      // Read file content as text (basic support)
      const content = await fs.readFile(req.file.path, 'utf-8').catch(() => {
        return `جدول اکسل با نام ${req.file!.originalname} آپلود شده است.`;
      });

      // Analyze with AI
      const analysisResult = await aiVariableDetectionService.analyzeWithAI(
        content.substring(0, 10000), // Limit for now
        model,
        undefined,
        'تحلیل ساختار جدول و شناسایی متغیرها از headers و داده‌ها. لطفاً ستون‌های جدول را به عنوان متغیر شناسایی کنید.'
      );

      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});

      res.json({
        success: true,
        ...analysisResult,
        message: `${analysisResult.detectedVariables.length} متغیر از جدول شناسایی شد`,
        note: 'برای پردازش بهتر، می‌توانید محتوای جدول را به Word تبدیل کنید'
      });

    } catch (error) {
      console.error('❌ Excel analysis error:', error);
      
      // Clean up file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'خطا در تحلیل Excel'
      });
    }
  }
);

/**
 * POST /api/ai/analyze-contract-template-advanced
 * Advanced analysis with source detection and form generation
 */
router.post(
  '/analyze-contract-template-advanced',
  authMiddleware,
  requireRole(['admin']),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'فایل ارسال نشده است' 
        });
      }

      const { 
        model = 'claude-sonnet-4-20250514', // استفاده از جدیدترین و قوی‌ترین مدل 
        customPrompt, 
        systemContext,
        checkExisting = 'true',
        detectSource = 'true'
      } = req.body;

      console.log(`🤖 Starting advanced AI analysis with model: ${model}`);
      console.log(`📄 File: ${req.file.originalname} (${req.file.size} bytes)`);
      console.log(`⚙️ Options: checkExisting=${checkExisting}, detectSource=${detectSource}`);

      // Extract content from Word document
      const content = await aiVariableDetectionService.extractContentFromWord(req.file.path);
      console.log(`📝 Extracted ${content.length} characters from document`);

      // Get existing variables from system
      const existingVariables = await contractVariablesService.getContractVariables({ isActive: true });
      console.log(`📚 Found ${existingVariables.length} existing variables in system`);

      // Build variables guide for Claude
      const variablesGuide = existingVariables.length > 0 ? `
📋 متغیرهای موجود در سیستم (${existingVariables.length} عدد):
${existingVariables.map(v => `- {{${v.name}}}: ${v.label} (نوع: ${v.dataType}, منبع: ${v.source}, دسته: ${v.category || 'other'})`).join('\n')}

⚠️ مهم: قبل از پیشنهاد متغیر جدید، حتماً لیست بالا را بررسی کنید.
اگر متغیری در لیست موجود است که با نیاز شما مطابقت دارد، از همان استفاده کنید.
فقط در صورتی متغیر جدید پیشنهاد دهید که در لیست بالا نیست.
برای متغیرهای موجود، از دقیقاً همان نام (name) استفاده کنید.
` : '';

      // Enhanced system context for advanced analysis
      const enhancedSystemContext = `
${systemContext || ''}

قوانین تحلیل پیشرفته:

1. برای هر متغیر مشخص کنید:
   - نام انگلیسی مناسب (snake_case)
   - برچسب فارسی کامل
   - نوع داده دقیق
   - منبع داده (rasmio/form/calculated/system/missing)
   - آیا در سیستم موجود است
   - نیاز به فرم ورودی دارد یا خیر

2. منابع داده:
   - رسمیو (company_*): نام، شناسه ملی، آدرس، تلفن، ایمیل، مدیران
   - سیستم (system_*): تاریخ جاری، شماره قرارداد، کاربر
   - محاسباتی (calc_*, *_words): مبلغ به حروف، محاسبات مالی
   - فرم: سایر اطلاعات که نیاز به ورودی دارند
   - ناموجود (missing): اطلاعاتی که باید فرم جدید برایشان تعریف شود

3. برای متغیرهای ناموجود، پیشنهاد فرم با این مشخصات:
   - عنوان فرم
   - فیلدهای مورد نیاز
   - نوع هر فیلد
   - اعتبارسنجی مورد نیاز

4. برای هر متغیر، context کافی (حداقل 100 کاراکتر) از متن اطراف ارائه دهید.

لطفاً با دقت بالا تحلیل کنید و فقط بخش‌هایی که واقعاً برای هر قرارداد متفاوت هستند را متغیر کنید.
      `;

      // Analyze with AI
      const analysisResult = await aiVariableDetectionService.analyzeWithAI(
        content,
        model,
        enhancedSystemContext,
        customPrompt,
        variablesGuide
      );

      // Add unique IDs to variables
      analysisResult.detectedVariables = analysisResult.detectedVariables.map(v => ({
        ...v,
        id: uuidv4()
      }));

      // Check data availability if requested
      if (checkExisting === 'true') {
        await checkDataAvailability(analysisResult);
      }

      // Generate form suggestions for missing data
      if (detectSource === 'true') {
        analysisResult.suggestedForms = generateFormSuggestions(analysisResult);
      }

      console.log(`✅ Advanced analysis complete:`);
      console.log(`   - ${analysisResult.detectedVariables.length} variables detected`);
      console.log(`   - ${analysisResult.detectedVariables.filter(v => v.availableInSystem).length} available in system`);
      console.log(`   - ${analysisResult.detectedVariables.filter(v => !v.availableInSystem).length} need form input`);
      console.log(`   - ${analysisResult.suggestedForms?.length || 0} forms suggested`);

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete temporary file:', error);
      }

      res.json({
        success: true,
        ...analysisResult
      });

    } catch (error) {
      console.error('❌ Advanced AI analysis error:', error);
      
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('Could not delete temporary file:', unlinkError);
        }
      }

      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'خطا در تحلیل پیشرفته فایل' 
      });
    }
  }
);

/**
 * POST /api/ai/preview-variables
 * Generate preview of document with variables
 */
router.post(
  '/preview-variables',
  authMiddleware,
  requireRole(['admin']),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'فایل ارسال نشده است' 
        });
      }

      const variables = JSON.parse(req.body.variables || '[]');

      console.log(`👁️ Generating preview for ${variables.length} variables`);

      // Extract content
      const content = await aiVariableDetectionService.extractContentFromWord(req.file.path);
      
      // Generate preview sections
      const sections = generatePreviewSections(content, variables);

      // Clean up
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete temporary file:', error);
      }

      res.json({
        success: true,
        sections
      });

    } catch (error) {
      console.error('❌ Preview generation error:', error);
      
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('Could not delete temporary file:', unlinkError);
        }
      }

      res.status(500).json({ 
        success: false, 
        message: 'خطا در تولید پیش‌نمایش' 
      });
    }
  }
);

/**
 * POST /api/ai/apply-variables-final
 * Apply variables with form values to document
 */
router.post(
  '/apply-variables-final',
  authMiddleware,
  requireRole(['admin']),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'فایل ارسال نشده است' 
        });
      }

      const variables = JSON.parse(req.body.variables || '[]');
      const formValues = JSON.parse(req.body.formValues || '{}');

      console.log(`🔧 Applying ${variables.length} variables with ${Object.keys(formValues).length} form values`);

      // Merge form values into variables
      const enrichedVariables = variables.map((v: any) => ({
        ...v,
        value: formValues[v.name] || v.value || v.suggestion || `{{${v.name}}}`
      }));

      // Apply variables using the advanced method
      const processedBuffer = await applyVariablesWithValues(
        req.file.path,
        enrichedVariables
      );

      // Clean up
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.warn('Could not delete temporary file:', error);
      }

      // Generate filename
      const originalName = path.parse(req.file.originalname).name;
      const outputFilename = `${originalName}_final_${Date.now()}.docx`;

      console.log(`✅ Variables applied with values: ${outputFilename}`);

      // Send the processed file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
      res.send(processedBuffer);

    } catch (error) {
      console.error('❌ Final application error:', error);
      
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn('Could not delete temporary file:', unlinkError);
        }
      }

      res.status(500).json({ 
        success: false, 
        message: 'خطا در اعمال نهایی متغیرها' 
      });
    }
  }
);

/**
 * GET /api/ai/check-data-availability/:variableName
 * Check if data for a variable is available in the system
 */
router.get(
  '/check-data-availability/:variableName',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { variableName } = req.params;
      const { companyId } = req.query;
      
      const availability = await checkVariableAvailability(
        variableName, 
        companyId ? parseInt(companyId as string) : undefined
      );
      
      res.json({
        success: true,
        variableName,
        ...availability
      });
      
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'خطا در بررسی دسترسی به داده' 
      });
    }
  }
);

// Helper Functions

async function checkDataAvailability(analysisResult: any) {
  for (const variable of analysisResult.detectedVariables) {
    const availability = await checkVariableAvailability(variable.name);
    variable.availableInSystem = availability.available;
    variable.apiSource = availability.source;
    
    if (!availability.available) {
      variable.source = 'missing';
      variable.formField = {
        label: variable.label,
        placeholder: getPlaceholderForType(variable.type),
        validation: getValidationForType(variable.type)
      };
    }
  }
}

async function checkVariableAvailability(variableName: string, companyId?: number): Promise<{
  available: boolean;
  source?: string;
  value?: any;
}> {
  // Check Rasmio data
  if (variableName.startsWith('company_')) {
    if (companyId) {
      const company = await storage.getCompany(companyId);
      if (company?.rasmioData) {
        return { 
          available: true, 
          source: 'Rasmio API',
          value: extractFromRasmio(variableName, company.rasmioData)
        };
      }
    }
    return { available: true, source: 'Rasmio API (needs company selection)' };
  }
  
  // Check system values
  if (variableName.startsWith('system_') || 
      ['contract_number', 'current_date', 'user_name'].includes(variableName)) {
    return { available: true, source: 'System Generated' };
  }
  
  // Check calculated values
  if (variableName.startsWith('calc_') || variableName.includes('_words')) {
    return { available: true, source: 'Calculated' };
  }
  
  // Check settings/defaults
  const settings = await storage.getAllSystemSettings();
  if (settings && settings.length > 0) {
    const setting = settings.find(s => s.key === variableName);
    if (setting) {
      return { available: true, source: 'System Settings', value: setting.value };
    }
  }
  
  // Not available - needs form input
  return { available: false };
}

function extractFromRasmio(variableName: string, rasmioData: any): any {
  // استفاده از تابع مرکزی
  const { extractFromRasmio: centralExtract } = require('../utils/rasmio-field-mapping');
  return centralExtract(variableName, rasmioData);
}

function generateFormSuggestions(analysisResult: any): any[] {
  const forms: any[] = [];
  const missingVariables = analysisResult.detectedVariables.filter((v: any) => !v.availableInSystem);
  
  if (missingVariables.length === 0) return forms;
  
  // Group by category
  const grouped = missingVariables.reduce((acc: any, variable: any) => {
    const cat = variable.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(variable);
    return acc;
  }, {});
  
  // Create forms
  for (const [category, variables] of Object.entries(grouped)) {
    const categoryLabels: Record<string, string> = {
      company: 'اطلاعات شرکت',
      financial: 'اطلاعات مالی',
      dates: 'تاریخ‌ها',
      personal: 'اطلاعات فردی',
      legal: 'اطلاعات حقوقی',
      general: 'اطلاعات عمومی'
    };
    
    forms.push({
      id: uuidv4(),
      title: `فرم ${categoryLabels[category] || category}`,
      description: `اطلاعات مورد نیاز برای ${(variables as any[]).length} متغیر در دسته ${categoryLabels[category] || category}`,
      category,
      fields: (variables as any[]).map(v => ({
        variableName: v.name,
        label: v.label,
        type: mapVariableTypeToFormType(v.type),
        required: v.required,
        placeholder: getPlaceholderForType(v.type),
        validation: getValidationForType(v.type)
      }))
    });
  }
  
  return forms;
}

function generatePreviewSections(content: string, variables: any[]): any[] {
  const sections = [];
  const contentLength = content.length;
  const sectionSize = 500; // Characters per section
  
  // Sort variables by their position in content (if they have original text)
  const sortedVariables = [...variables].sort((a, b) => {
    const posA = a.original ? content.indexOf(a.original) : contentLength;
    const posB = b.original ? content.indexOf(b.original) : contentLength;
    return posA - posB;
  });
  
  // Create sections
  for (let i = 0; i < sortedVariables.length; i += 3) {
    const sectionVars = sortedVariables.slice(i, i + 3);
    
    for (const variable of sectionVars) {
      if (variable.context) {
        const original = variable.context;
        const replaced = original.replace(
          variable.original || variable.context,
          `{{${variable.name}}}`
        );
        
        sections.push({
          original: original.substring(0, Math.min(original.length, sectionSize)),
          replaced: replaced.substring(0, Math.min(replaced.length, sectionSize)),
          variables: [variable.name]
        });
      }
    }
  }
  
  return sections;
}

async function applyVariablesWithValues(filePath: string, variables: any[]): Promise<Buffer> {
  try {
    const content = await fs.readFile(filePath);
    const zip = new PizZip(content);
    
    // Get document.xml
    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('Invalid Word document');
    }
    
    let xmlContent = documentXmlFile.asText();
    
    // Apply variables with their values
    for (const variable of variables) {
      if (!variable.original) continue;
      
      const placeholder = variable.value || `{{${variable.name}}}`;
      
      // Escape special regex characters
      const escapedOriginal = variable.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace in content
      const regex = new RegExp(escapedOriginal, 'g');
      xmlContent = xmlContent.replace(regex, placeholder);
    }
    
    // Update the document
    zip.file('word/document.xml', xmlContent);
    
    return zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
  } catch (error) {
    console.error('Error applying variables with values:', error);
    throw new Error('Failed to apply variables to document');
  }
}

function mapVariableTypeToFormType(type: string): string {
  const mapping: Record<string, string> = {
    'text': 'text',
    'number': 'number',
    'currency': 'number',
    'percentage': 'number',
    'date': 'date',
    'boolean': 'checkbox',
    'select': 'select'
  };
  return mapping[type] || 'text';
}

function getPlaceholderForType(type: string): string {
  const placeholders: Record<string, string> = {
    'text': 'متن را وارد کنید',
    'number': 'عدد را وارد کنید',
    'currency': 'مبلغ به ریال',
    'percentage': 'درصد (0-100)',
    'date': 'انتخاب تاریخ',
    'boolean': 'بله/خیر',
    'select': 'انتخاب کنید'
  };
  return placeholders[type] || '';
}

function getValidationForType(type: string): string {
  const validations: Record<string, string> = {
    'currency': 'فقط عدد، حداقل 0',
    'percentage': 'عدد بین 0 تا 100',
    'date': 'فرمت تاریخ معتبر',
    'number': 'فقط عدد'
  };
  return validations[type] || '';
}

/**
 * POST /api/ai/sync-variables-to-system
 * Sync detected variables to contract_variables table
 */
router.post(
  '/sync-variables-to-system',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { variables } = req.body;

      if (!Array.isArray(variables) || variables.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'متغیرها ارسال نشده‌اند'
        });
      }

      console.log(`🔄 Syncing ${variables.length} variables to system...`);

      const results = {
        created: [] as any[],
        updated: [] as any[],
        skipped: [] as any[],
        errors: [] as any[]
      };

      for (const variable of variables) {
        try {
          // Check if variable already exists
          const existing = await contractVariablesService.getContractVariableByName(variable.name);

          if (existing) {
            // Update existing variable
            const updated = await contractVariablesService.updateContractVariable(existing.id, {
              label: variable.label,
              description: variable.description,
              dataType: variable.type || 'text',
              source: variable.source || 'form',
              category: variable.category || 'other',
              isActive: true
            } as any);
            results.updated.push(updated);
            console.log(`✅ Updated variable: ${variable.name}`);
          } else {
            // Create new variable
            const created = await contractVariablesService.createContractVariable({
              name: variable.name,
              label: variable.label || variable.name,
              description: variable.description || '',
              dataType: variable.type || 'text',
              source: variable.source || 'form',
              category: variable.category || 'other',
              defaultValue: variable.defaultValue || null,
              isRequired: variable.required || false,
              validationRules: variable.validation ? JSON.stringify(variable.validation) : null,
              placeholder: variable.placeholder || null,
              isActive: true,
              sortOrder: 0,
              createdBy: (req as any).user.userId
            } as any);
            results.created.push(created);
            console.log(`✅ Created variable: ${variable.name}`);
          }
        } catch (error) {
          console.error(`❌ Error syncing variable ${variable.name}:`, error);
          results.errors.push({
            variable: variable.name,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      console.log(`✅ Sync completed: ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors`);

      res.json({
        success: true,
        results,
        message: `${results.created.length} متغیر ایجاد و ${results.updated.length} متغیر به‌روزرسانی شد`,
        summary: {
          total: variables.length,
          created: results.created.length,
          updated: results.updated.length,
          errors: results.errors.length
        }
      });

    } catch (error) {
      console.error('❌ Sync variables error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'خطا در سینک متغیرها'
      });
    }
  }
);

/**
 * POST /api/ai/create-form-from-variables
 * Create form from detected variables and attach to service
 */
router.post(
  '/create-form-from-variables',
  authMiddleware,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const {
        formTitle,
        formDescription,
        department,
        variables,
        serviceIds, // آرایه‌ای از شناسه خدمات برای اتصال
        category
      } = req.body;

      if (!formTitle || !department || !Array.isArray(variables) || variables.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'اطلاعات فرم ناقص است'
        });
      }

      console.log(`📋 Creating form "${formTitle}" with ${variables.length} variables...`);

      // ساخت fields برای فرم
      const fields = variables.map((variable: any, index: number) => ({
        name: variable.name,
        label: variable.label || variable.name,
        type: variable.type || 'text',
        required: variable.required || false,
        placeholder: variable.placeholder || '',
        validation: variable.validation || null,
        variableName: variable.name, // 🔗 این فیلد برای mapping به متغیر استفاده می‌شود
        order: index
      }));

      // ایجاد document requirement (فرم)
      const createdForm = await storage.createDocumentRequirement({
        title: formTitle,
        description: formDescription || '',
        department,
        category: category || 'general',
        fields: JSON.stringify(fields),
        isRequired: true,
        order: 0,
        isActive: true,
        accessType: 'all',
        createdBy: (req as any).user.userId
      });

      console.log(`✅ Form created with ID: ${createdForm.id}`);

      // اتصال فرم به خدمات (اگر مشخص شده باشد)
      const attachedServices = [];
      if (Array.isArray(serviceIds) && serviceIds.length > 0) {
        const { servicesService } = await import('../services/services.service');
        
        for (const serviceId of serviceIds) {
          try {
            const mapping = await servicesService.addFormToService({
              serviceId,
              documentRequirementId: createdForm.id,
              department,
              isRequired: true,
              createdBy: (req as any).user.userId
            });
            attachedServices.push(mapping);
            console.log(`✅ Form attached to service ${serviceId}`);
          } catch (error) {
            console.error(`❌ Failed to attach form to service ${serviceId}:`, error);
          }
        }
      }

      res.json({
        success: true,
        form: createdForm,
        attachedServices,
        message: `فرم "${formTitle}" با ${variables.length} فیلد ایجاد شد${attachedServices.length > 0 ? ` و به ${attachedServices.length} خدمت متصل شد` : ''}`
      });

    } catch (error) {
      console.error('❌ Create form from variables error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'خطا در ساخت فرم'
      });
    }
  }
);

export default router;
