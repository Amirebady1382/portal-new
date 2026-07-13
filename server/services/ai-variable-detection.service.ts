import * as fs from 'fs/promises';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { unifiedVariableManager } from './unified-variable-manager.service';
import { gapGPTService } from './gap-gpt.service';
import { aiOrchestrator } from './ai-orchestrator.service';

interface DetectedVariable {
  original: string;
  suggestion: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  source: 'rasmio' | 'form' | 'calculated' | 'system';
  category: string;
  required: boolean;
  description: string;
  context: string;
  confidence: number;
  relatedTo?: 'company' | 'fund' | 'representative' | 'guarantor' | 'witness' | 'other'; // جدید: نقش متغیر
  leftContext?: string; // 🆕 متن قبل از placeholder برای تشخیص دقیق موقعیت
  rightContext?: string; // 🆕 متن بعد از placeholder برای تشخیص دقیق موقعیت
  availableInSystem?: boolean;
  apiSource?: string;
  formField?: any;
}

interface AIAnalysisResult {
  documentType: string;
  documentTitle: string;
  parties?: { // جدید: اطلاعات طرف‌های قرارداد
    party_a?: string;
    party_b?: string;
  };
  detectedVariables: DetectedVariable[];
  suggestedCategories: string[];
  processingTime: number;
  modelUsed: string;
  confidence: number;
  rawContent?: string;
  processedContent?: string;
  suggestedForms?: any[];
}

export class AIVariableDetectionService {
  private anthropic: Anthropic | null = null;

  constructor() {
    // Lazy initialization - will be created when needed
  }

  /**
   * Get Anthropic client with lazy initialization
   */
  private getAnthropicClient(): any {
    const disableDirect = process.env.DISABLE_DIRECT_CLAUDE === 'true';
    if (disableDirect) {
      return {
        messages: {
          create: async (options: any) => {
            logger.info("🤖 Routing direct Claude call to GapGPT because DISABLE_DIRECT_CLAUDE is active", "ai-var-detect");
            const prompt = options.messages?.[0]?.content || "";
            const systemPrompt = options.system || undefined;
            const content = await gapGPTService.generateResponse(prompt, systemPrompt);
            return {
              content: [{ type: "text", text: content }]
            };
          }
        }
      };
    }

    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      this.anthropic = new Anthropic({
        apiKey
      });
    }
    return this.anthropic;
  }

  /**
   * Extract text content from Word document using multiple methods
   */
  async extractContentFromWord(filePath: string): Promise<string> {
    console.log(`🔍 Starting advanced text extraction from: ${path.basename(filePath)}`);

    // Try multiple extraction methods in order of reliability
    const methods = [
      { name: 'Enhanced XML', method: () => this.extractWithEnhancedXML(filePath) },
      { name: 'Docxtemplater', method: () => this.extractWithDocxtemplater(filePath) },
      { name: 'Basic XML', method: () => this.extractWithBasicXML(filePath) },
      { name: 'Claude Vision', method: () => this.extractWithClaudeVision(filePath) }
    ];

    let lastError: Error | null = null;

    for (const { name, method } of methods) {
      try {
        console.log(`📄 Trying extraction method: ${name}`);
        const content = await method();

        if (content && content.length > 50) { // Minimum content threshold
          console.log(`✅ Successfully extracted ${content.length} characters using ${name}`);
          return content;
        } else {
          console.log(`⚠️ ${name} returned insufficient content (${content?.length || 0} chars)`);
        }
      } catch (error) {
        console.log(`❌ ${name} extraction failed:`, error instanceof Error ? error.message : error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw new Error(`All extraction methods failed. Last error: ${lastError?.message || 'Unknown'}`);
  }

  /**
   * Enhanced XML extraction with table detection and better text processing
   */
  private async extractWithEnhancedXML(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const zip = new PizZip(content);

    // Extract from multiple XML files
    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml',
      'word/footer1.xml',
      'word/footer2.xml'
    ];

    let allText = '';

    for (const xmlFile of xmlFiles) {
      const file = zip.file(xmlFile);
      if (!file) continue;

      let xmlContent = file.asText();

      // Extract tables first (they have special structure)
      const tableText = this.extractTablesFromXML(xmlContent);
      if (tableText) {
        allText += tableText + '\n\n';
      }

      // Then extract regular paragraphs
      const paragraphText = this.extractParagraphsFromXML(xmlContent);
      if (paragraphText) {
        allText += paragraphText + '\n';
      }
    }

    // Clean up and normalize
    return allText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Extract and format tables from XML with proper structure
   */
  private extractTablesFromXML(xmlContent: string): string {
    const tables: string[] = [];

    // Find all tables in the document
    const tableMatches = xmlContent.match(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g);

    if (!tableMatches) return '';

    console.log(`📊 Found ${tableMatches.length} table(s) in document`);

    tableMatches.forEach((tableXml, tableIndex) => {
      console.log(`🔍 Processing table ${tableIndex + 1}`);

      // Extract table rows
      const rowMatches = tableXml.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g);

      if (!rowMatches) return;

      const tableRows: string[] = [];
      let headerRow: string[] = [];

      rowMatches.forEach((rowXml, rowIndex) => {
        // Extract cells from this row
        const cellMatches = rowXml.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/g);

        if (!cellMatches) return;

        const rowCells: string[] = [];

        cellMatches.forEach((cellXml, cellIndex) => {
          // Extract text from cell
          const cellTextMatches = cellXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);

          let cellText = '';
          if (cellTextMatches) {
            cellText = cellTextMatches
              .map(match => match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'))
              .join(' ')
              .trim();
          }

          // If cell is empty, mark it as a potential variable location
          if (!cellText || cellText.length === 0) {
            // Try to infer variable name from context
            const variableName = this.inferVariableFromTableContext(
              headerRow,
              rowCells,
              cellIndex,
              rowIndex,
              tableIndex
            );
            cellText = `{{${variableName}}}`;
            console.log(`📝 Empty cell detected at table ${tableIndex + 1}, row ${rowIndex + 1}, col ${cellIndex + 1} -> ${variableName}`);
          }

          rowCells.push(cellText);
        });

        // Store header row for context
        if (rowIndex === 0) {
          headerRow = [...rowCells];
        }

        tableRows.push(rowCells.join(' | '));
      });

      if (tableRows.length > 0) {
        tables.push(`\n[جدول ${tableIndex + 1}]\n${tableRows.join('\n')}\n[پایان جدول ${tableIndex + 1}]\n`);
      }
    });

    return tables.join('\n');
  }

  /**
   * Extract regular paragraphs (non-table content)
   */
  private extractParagraphsFromXML(xmlContent: string): string {
    // Remove tables first to avoid duplicate extraction
    const contentWithoutTables = xmlContent.replace(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g, '');

    const textParts: string[] = [];

    // Extract text from w:t tags while preserving paragraph structure
    const paragraphs = contentWithoutTables.split(/<w:p[^>]*>/);

    for (const paragraph of paragraphs) {
      const textMatches = paragraph.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (textMatches) {
        const paragraphText = textMatches
          .map(match => match.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1'))
          .join(' ')
          .trim();

        if (paragraphText) {
          textParts.push(paragraphText);
        }
      }
    }

    return textParts.join('\n');
  }

  /**
   * Infer variable name from table context (headers, position, etc.)
   */
  private inferVariableFromTableContext(
    headerRow: string[],
    currentRowCells: string[],
    cellIndex: number,
    rowIndex: number,
    tableIndex: number
  ): string {
    // Try to use column header as variable name
    if (headerRow.length > cellIndex && headerRow[cellIndex]) {
      const header = headerRow[cellIndex].toLowerCase().trim();

      // Convert Persian/English headers to variable names
      const headerMappings: Record<string, string> = {
        'نام': 'name',
        'نام شرکت': 'company_name',
        'مبلغ': 'amount',
        'تاریخ': 'date',
        'تاریخ شروع': 'start_date',
        'تاریخ پایان': 'end_date',
        'شرح': 'description',
        'توضیحات': 'description',
        'آدرس': 'address',
        'تلفن': 'phone',
        'ایمیل': 'email',
        'کد ملی': 'national_id',
        'شماره ثبت': 'registration_number',
        'مدیرعامل': 'ceo_name',
        'نماینده': 'representative',
        'سمت': 'position',
        'واحد': 'unit',
        'تعداد': 'quantity',
        'قیمت': 'price',
        'جمع': 'total'
      };

      // Check for direct mapping
      if (headerMappings[header]) {
        return `table${tableIndex + 1}_${headerMappings[header]}_${rowIndex + 1}`;
      }

      // Convert header to snake_case
      const cleanHeader = header
        .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();

      if (cleanHeader) {
        return `table${tableIndex + 1}_${cleanHeader}_${rowIndex + 1}`;
      }
    }

    // Fallback: use position-based naming
    return `table${tableIndex + 1}_cell_r${rowIndex + 1}_c${cellIndex + 1}`;
  }

  /**
   * Extract using Docxtemplater for better reliability
   */
  private async extractWithDocxtemplater(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const zip = new PizZip(content);

    // Get raw text from document.xml
    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      throw new Error('No document.xml found');
    }

    const xmlContent = documentXml.asText();

    // More sophisticated text extraction
    const textNodes: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;

    while ((match = regex.exec(xmlContent)) !== null) {
      const text = match[1].trim();
      if (text) {
        textNodes.push(text);
      }
    }

    return textNodes.join(' ').trim();
  }

  /**
   * Basic XML extraction (fallback)
   */
  private async extractWithBasicXML(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const zip = new PizZip(content);

    const documentXml = zip.file('word/document.xml');
    if (!documentXml) {
      throw new Error('Invalid Word document structure');
    }

    let textContent = documentXml.asText();

    // Basic cleaning
    textContent = textContent
      .replace(/<w:t[^>]*>([^<]+)<\/w:t>/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    return textContent;
  }

  /**
   * Extract using Claude Vision (for complex documents)
   */
  private async extractWithClaudeVision(filePath: string): Promise<string> {
    // Convert DOCX to images first, then use Claude Vision
    // This is more complex but can handle documents with complex formatting

    console.log('🔍 Claude Vision extraction not yet implemented - would need DOCX to image conversion');
    throw new Error('Claude Vision extraction requires additional setup');
  }

  /**
   * Analyze document with AI to detect variables
   */
  async analyzeWithAI(
    content: string,
    model: string,
    systemContext: string,
    customPrompt?: string,
    existingVariables?: string
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    const analysisPrompt = this.buildAnalysisPrompt(content, systemContext, customPrompt, existingVariables);

    // Only use Claude models
    if (!['claude-4-sonnet', 'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'].includes(model)) {
      console.log(`Model ${model} requested, defaulting to claude-4-sonnet`);
      model = 'claude-4-sonnet';
    }

    const result = await this.analyzeWithClaude(analysisPrompt, model);

    result.processingTime = Date.now() - startTime;
    result.modelUsed = model;
    result.rawContent = content;

    // 🆕 Generate processedContent by applying variables with context-aware replacement
    console.log('🔄 Applying context-aware variable replacement...');
    result.processedContent = this.applyVariablesToText(content, result.detectedVariables);
    console.log('✅ Context-aware replacement complete');

    return result;
  }

  /**
   * 🆕 Apply variables to text using context-aware replacement
   * This method uses leftContext and rightContext to distinguish between identical placeholders
   */
  private applyVariablesToText(content: string, variables: DetectedVariable[]): string {
    console.log(`📝 Starting context-aware replacement for ${variables.length} variables`);
    let processedContent = content;
    let replacementCount = 0;

    // Sort variables by specificity (longer context = more specific = replace first)
    const sortedVariables = [...variables].sort((a, b) => {
      const aContextLength = (a.leftContext?.length || 0) + (a.rightContext?.length || 0);
      const bContextLength = (b.leftContext?.length || 0) + (b.rightContext?.length || 0);
      return bContextLength - aContextLength; // Descending order
    });

    // Track which positions we've already replaced to avoid double-replacement
    const replacedPositions = new Set<number>();

    for (const variable of sortedVariables) {
      const { original, suggestion, leftContext, rightContext, name, label } = variable;

      if (!original || !suggestion) {
        console.warn(`⚠️ Skipping variable ${name} - missing original or suggestion`);
        continue;
      }

      console.log(`🔍 Looking for: "${original}"`);
      console.log(`   Left context: "${leftContext || 'none'}"`);
      console.log(`   Right context: "${rightContext || 'none'}"`);
      console.log(`   Will replace with: ${suggestion}`);

      // If we have context, use it for precise matching
      if (leftContext || rightContext) {
        // Build a search pattern with context
        const leftPattern = leftContext ? this.escapeRegExp(leftContext) : '';
        const originalPattern = this.escapeRegExp(original);
        const rightPattern = rightContext ? this.escapeRegExp(rightContext) : '';

        // Create regex that matches: leftContext + original + rightContext
        const pattern = new RegExp(
          `(${leftPattern})(${originalPattern})(${rightPattern})`,
          'g'
        );

        let match;
        while ((match = pattern.exec(processedContent)) !== null) {
          const matchIndex = match.index;
          const originalStartIndex = matchIndex + match[1].length; // Position of original text

          // Check if this position was already replaced
          if (replacedPositions.has(originalStartIndex)) {
            console.log(`   ⏭️  Position ${originalStartIndex} already replaced, skipping`);
            continue;
          }

          console.log(`   ✅ Found match at position ${matchIndex}`);
          console.log(`      Before: "${match[0]}"`);

          // Replace: keep left context + replace original + keep right context
          const replacement = match[1] + suggestion + match[3];

          processedContent =
            processedContent.substring(0, matchIndex) +
            replacement +
            processedContent.substring(matchIndex + match[0].length);

          console.log(`      After: "${replacement}"`);

          // Mark this position as replaced
          replacedPositions.add(originalStartIndex);
          replacementCount++;

          // Reset regex index after modification
          pattern.lastIndex = matchIndex + replacement.length;
        }
      } else {
        // No context - simple replacement (may cause issues with identical placeholders!)
        console.warn(`⚠️ No context for "${original}" - using simple replace (may be ambiguous)`);

        // Only replace first occurrence to avoid replacing all identical placeholders
        const index = processedContent.indexOf(original);
        if (index !== -1 && !replacedPositions.has(index)) {
          processedContent =
            processedContent.substring(0, index) +
            suggestion +
            processedContent.substring(index + original.length);

          replacedPositions.add(index);
          replacementCount++;
          console.log(`   ✅ Replaced at position ${index}`);
        } else {
          console.log(`   ❌ Not found or already replaced`);
        }
      }
    }

    console.log(`✅ Replacement complete: ${replacementCount} replacements made`);
    return processedContent;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private buildAnalysisPrompt(content: string, systemContext: string, customPrompt?: string, existingVariables?: string): string {
    return `${systemContext}

🚨🚨🚨 CRITICAL WARNING - READ THIS FIRST! 🚨🚨🚨

⛔⛔⛔ MOST COMMON ERROR TO AVOID ⛔⛔⛔

NEVER EVER use the same "suggestion" name for different fields!

❌ WRONG EXAMPLE (DO NOT DO THIS):
- Field 1 (name): suggestion = "{{beneficiary_registration_office}}"
- Field 2 (birth date): suggestion = "{{beneficiary_registration_office}}" ← WRONG! Same name!
- Field 3 (address): suggestion = "{{beneficiary_registration_office}}" ← WRONG! Same name!

✅ CORRECT EXAMPLE (DO THIS):
- Field 1 (name): suggestion = "{{beneficiary_representative_name}}"
- Field 2 (birth date): suggestion = "{{beneficiary_representative_birth_date}}"
- Field 3 (address): suggestion = "{{beneficiary_address}}"

EACH FIELD MUST HAVE ITS OWN UNIQUE SUGGESTION NAME!

═══════════════════════════════════════════════════════════

🚨 **قوانین CRITICAL - خیلی مهم:**

⛔ **قانون طلایی: هر نقطه‌چین = یک متغیر منحصر به فرد**
- اگر متن "........" را 10 بار در سند دیدید → 10 متغیر مختلف ایجاد کنید
- هرگز از یک متغیر برای چند جای مختلف استفاده نکنید!
- مثال غلط: استفاده از {{beneficiary_registration_office}} برای نام، آدرس، و شناسه ملی ❌
- مثال صحیح: {{beneficiary_name}}, {{beneficiary_address}}, {{beneficiary_national_id}} ✅

⛔ **قانون دوم: original باید دقیقاً عین متن سند باشد**
- اگر سند دارد: "نام پدر: ................" → original = "................" (همان تعداد نقطه)
- اگر سند دارد: "کد ملی .........." → original = ".........." (همان تعداد نقطه)
- هر original باید UNIQUE باشد - نباید تکرار شود

⛔ **قانون سوم: suggestion باید منطقی و مرتبط با context باشد**
- اگر context می‌گوید "نام پدر" → suggestion = {{beneficiary_representative_father_name}}
- اگر context می‌گوید "کد ملی" → suggestion = {{beneficiary_representative_national_id}}
- اگر context می‌گوید "آدرس" → suggestion = {{beneficiary_address}}

⚠️ قوانین فنی JSON:
1. JSON باید کاملاً معتبر و بدون خطای syntax باشد
2. هیچ typo یا character تکراری نداشته باشید
3. تمام property nameها باید دقیقاً مطابق schema باشند
4. در کلمات فارسی دقت کنید فاصله اضافی نباشد
5. قبل از ارسال، JSON را بررسی کنید - به خصوص اینکه هیچ suggestion تکراری نداشته باشید!

${existingVariables || ''}

🎓 **آموزش با مثال واقعی:**

تصور کنید این متن را دارید:
"شرکت ............. به شناسه ملی ............ واقع در ............ فرزند ............"

❌ **خطای رایج (هرگز این کار را نکنید!):**
[
  {"original": ".............", "suggestion": "{{beneficiary_info}}"},
  {"original": "............", "suggestion": "{{beneficiary_info}}"},  ← غلط! تکراری!
  {"original": "............", "suggestion": "{{beneficiary_info}}"},  ← غلط! تکراری!
  {"original": "............", "suggestion": "{{beneficiary_info}}"}   ← غلط! تکراری!
]
این باعث می‌شود که همه جاها "{{beneficiary_info}}" جایگذاری شود که کاملاً غلط است!

✅ **روش صحیح:**
[
  {"original": ".............", "suggestion": "{{beneficiary_company_name}}", "context": "شرکت ............. به شناسه ملی"},
  {"original": "............", "suggestion": "{{beneficiary_national_id}}", "context": "به شناسه ملی ............ واقع در"},
  {"original": "............", "suggestion": "{{beneficiary_address}}", "context": "واقع در ............ فرزند"},
  {"original": "............", "suggestion": "{{beneficiary_representative_father_name}}", "context": "فرزند ............"}
]

🔥 **نکته مهم:** اگر validation error دریافت کردید که می‌گوید "Duplicate suggestion"، یعنی اشتباه کرده‌اید و از یک نام متغیر برای چند جای مختلف استفاده کرده‌اید. این را فوراً اصلاح کنید!

وظیفه شما:
1. متن قرارداد/سند زیر را با دقت بخوانید
2. بخش‌هایی که باید متغیر شوند را شناسایی کنید
3. برای هر بخش یک نام متغیر مناسب پیشنهاد دهید
4. نوع داده هر متغیر را تشخیص دهید
5. منبع داده را مشخص کنید (رسمیو، فرم، محاسباتی، سیستم)

🎯 **قوانین مهم برای تشخیص context و معنای متغیرها:**

**تشخیص طرف‌های قرارداد:**
- اگر "طرف اول" یا "ضمانت دهنده" یا "متعهد" → متغیرهای شرکت/شخص متقاضی
- اگر "طرف دوم" یا "ضمانت گیرنده" یا "صندوق" → متغیرهای صندوق (از تنظیمات سیستم)
- اگر "شرکت" در کنار نام → company_name (از رسمیو)
- اگر "نام ضمانت‌گیرنده" یا "طرف دوم" → fund_name (از تنظیمات)

**مثال‌های دقیق context:**

📄 ضمانت‌نامه:
- "شرکت ... به عنوان طرف اول" → company_name (source: rasmio)
- "به عنوان ضمانت‌گیرنده (طرف دوم)" → fund_name (source: system)
- "مبلغ ... ریال ضمانت" → guarantee_amount (source: form)
- "شناسه ملی شرکت ..." → company_national_id (source: rasmio)

📄 قرارداد سرمایه‌گذاری:
- "شرکت ... (سرمایه‌پذیر)" → company_name (source: rasmio)
- "صندوق ... (سرمایه‌گذار)" → fund_name (source: system)
- "مبلغ سرمایه‌گذاری ..." → investment_amount (source: form)

📄 قرارداد دوطرفه:
- "طرف اول قرارداد: شرکت ..." → party_a_name یا company_name (بسته به context)
- "طرف دوم قرارداد: شرکت ..." → party_b_name یا fund_name (بسته به context)

**قوانین جلوگیری از تکرار:**
- اگر "نام شرکت" چند بار در سند ذکر شده → همه به company_name تبدیل شوند
- اگر "نام صندوق" چند بار ذکر شده → همه به fund_name تبدیل شوند
- اگر یک مبلغ چند بار تکرار شده → یک متغیر با نام واضح (مثل guarantee_amount)
- اگر یک تاریخ چند بار تکرار شده → یک متغیر (مثل start_date)

**نام‌گذاری هوشمند:**
- برای شرکت متقاضی: company_* (company_name, company_address, ...)
- برای صندوق: fund_* (fund_name, fund_address, fund_representative, ...)
- برای اشخاص: [role]_name (representative_name, guarantor_name, witness_name, ...)
- برای مبالغ: [purpose]_amount (guarantee_amount, investment_amount, deposit_amount, ...)
- برای تاریخ‌ها: [event]_date (start_date, end_date, signature_date, ...)

قوانین نام‌گذاری متغیرها:
- متغیرهای شرکت متقاضی: با company_ شروع شوند (مثل company_name)
- متغیرهای صندوق: با fund_ شروع شوند (مثل fund_name)
- متغیرهای مالی: شامل amount یا price باشند
- متغیرهای تاریخ: شامل date باشند
- متغیرهای محاسباتی: با calc_ شروع شوند یا _words داشته باشند
- متغیرهای جدول: با table شروع شوند (مثل table1_name_2)
- از snake_case استفاده کنید
- نام‌ها به انگلیسی و معنادار باشند

قوانین ویژه برای جداول:
- هر جدول با [جدول X] شروع و با [پایان جدول X] تمام می‌شود
- سلول‌های خالی با {{متغیر}} نشان داده شده‌اند
- عناوین ستون‌ها برای تشخیص نوع متغیر استفاده شوند
- برای هر سلول خالی، نام متغیر مناسب با توجه به عنوان ستون پیشنهاد دهید
- متغیرهای جدول باید شامل شماره جدول، نام ستون و شماره ردیف باشند

${customPrompt ? `\n📝 دستورالعمل اضافی کاربر: ${customPrompt}\n` : ''}

متن سند:
"""
${content}
"""

لطفاً پاسخ را به صورت JSON با ساختار زیر ارائه دهید:
{
  "documentType": "نوع سند (قرارداد، ضمانت‌نامه، ...)",
  "documentTitle": "عنوان سند",
  "parties": {
    "party_a": "توضیح طرف اول (مثلاً: شرکت متقاضی)",
    "party_b": "توضیح طرف دوم (مثلاً: صندوق)"
  },
  "detectedVariables": [
    {
      "original": "🚨 CRITICAL: فقط و فقط placeholder خام (نقطه‌چین‌ها، خط‌تیره‌ها، یا عدد ثابت) - بدون هیچ کلمه اضافی! مثال: '....................' یا '184' یا '../../..' - نه 'شرکت ....................'",
      "suggestion": "فرمت متغیر با {{}} (مثلاً: '{{company_name}}' یا '{{start_date}}')",
      "name": "variable_name (snake_case انگلیسی)",
      "label": "برچسب فارسی (مثلاً: 'نام شرکت')",
      "type": "text|number|date|currency|percentage|boolean",
      "source": "rasmio|form|calculated|system",
      "category": "company|financial|dates|personal|legal|technical",
      "required": true/false,
      "description": "توضیح کوتاه شامل نقش این متغیر در قرارداد",
      "context": "متن اطراف این متغیر با حداقل 20 کاراکتر قبل و 20 کاراکتر بعد - برای تشخیص دقیق موقعیت",
      "leftContext": "🆕 دقیقاً 10-30 کاراکتر قبل از placeholder (مثال: 'شرکت ' یا 'به شماره ثبت ')",
      "rightContext": "🆕 دقیقاً 10-30 کاراکتر بعد از placeholder (مثال: ' به شناسه ملی' یا ' در اداره ثبت')",
      "relatedTo": "company|fund|representative|guarantor|witness|other",
      "confidence": 0.0-1.0
    }
  ],
  "suggestedCategories": ["دسته‌بندی‌های پیشنهادی"],
  "confidence": 85
}

⚠️ **مثال‌های دقیق با original و suggestion صحیح:**

📌 **EXAMPLE 1 - نام شرکت (با leftContext و rightContext):**
متن سند: "شرکت ............................. به شناسه ملی ................... (طرف اول)"
{
  "original": ".............................",  // ← فقط نقطه‌ها، بدون "شرکت"!
  "suggestion": "{{company_name}}",
  "name": "company_name",
  "label": "نام شرکت متقاضی",
  "source": "rasmio",
  "relatedTo": "company",
  "context": "شرکت ............................. به شناسه ملی ................... (طرف اول) با سرمایه ثبت شده...",
  "leftContext": "شرکت ",  // 🆕 متن قبل از نقطه‌ها
  "rightContext": " به شناسه ملی "  // 🆕 متن بعد از نقطه‌ها
}

📌 **EXAMPLE 2 - شناسه ملی:**
متن سند: "شرکت نوآوران به شناسه ملی ................... واقع در استان گیلان"
{
  "original": "...................",  // ← فقط نقطه‌ها
  "suggestion": "{{company_national_id}}",
  "name": "company_national_id",
  "label": "شناسه ملی شرکت",
  "source": "rasmio",
  "relatedTo": "company",
  "context": "شرکت نوآوران به شناسه ملی ................... واقع در استان گیلان با کد پستی...",
  "leftContext": "به شناسه ملی ",  // 🆕
  "rightContext": " واقع در "  // 🆕
}

📌 **EXAMPLE 3 - تاریخ:**
متن سند: "این قرارداد از تاریخ ../../.. الی تاریخ ../../.. معتبر است"
{
  "original": "../../..",  // ← اولین تاریخ
  "suggestion": "{{start_date}}",
  "name": "start_date",
  "label": "تاریخ شروع",
  "source": "form",
  "type": "date",
  "context": "این قرارداد از تاریخ ../../.. الی تاریخ ../../.. معتبر بوده و طرفین متعهد...",
  "leftContext": "از تاریخ ",  // 🆕
  "rightContext": " الی تاریخ "  // 🆕
}

📌 **EXAMPLE 4 - مبلغ:**
متن سند: "مبلغ ................... ریال به عنوان ضمانت‌نامه"
{
  "original": "...................",  // ← فقط نقطه‌ها
  "suggestion": "{{guarantee_amount}}",
  "name": "guarantee_amount",
  "label": "مبلغ ضمانت‌نامه",
  "source": "form",
  "type": "currency",
  "relatedTo": "other",
  "context": "مبلغ ................... ریال به عنوان ضمانت‌نامه از طریق بانک...",
  "leftContext": "مبلغ ",  // 🆕
  "rightContext": " ریال به عنوان "  // 🆕
}

📌 **EXAMPLE 5 - عدد ثابت (شماره ثبت):**
متن سند: "شرکت نوآوران به شماره ثبت 184 در اداره ثبت"
{
  "original": "184",  // ← عدد ثابت هم باید متغیر شود!
  "suggestion": "{{beneficiary_registration_number}}",
  "name": "beneficiary_registration_number",
  "label": "شماره ثبت شرکت",
  "source": "rasmio",
  "type": "text",
  "relatedTo": "company",
  "context": "شرکت نوآوران به شماره ثبت 184 در اداره ثبت شرکت‌ها",
  "leftContext": "به شماره ثبت ",  // 🆕
  "rightContext": " در اداره ثبت"  // 🆕
}

🔴 **قوانین CRITICAL برای original:**
1. original باید EXACT متنی باشد که در سند دیده می‌شود (مثل نقطه‌چین‌ها)
2. اگر چند جای سند نقطه‌چین یکسان دارد، هر کدام original متفاوتی دارند (با context متفاوت)
3. original باید UNIQUE باشد - دو متغیر نباید original یکسانی داشته باشند
4. suggestion همیشه به فرمت {{variable_name}} است

🔴 **اشتباهات رایج که باید اجتناب کنید:**
❌ WRONG: استفاده از یک original برای چند متغیر مختلف
✅ RIGHT: هر original منحصر به فرد و با context مشخص

❌ WRONG: original = "شرکت" (خیلی کوتاه و مبهم)
✅ RIGHT: original = "............................." (متن دقیق نقطه‌چین)

❌ WRONG: suggestion = "نام شرکت" (متن فارسی)
✅ RIGHT: suggestion = "{{company_name}}" (فرمت متغیر)

🔥 **مثال واقعی از اشتباه رایج:**

❌ **اشتباه - استفاده از یک متغیر برای چند جا:**
\`\`\`
متن: "شرکت ........ به شناسه ملی ........ در شهر ........"
خروجی غلط:
- original: "........", suggestion: "{{company_info}}"
- original: "........", suggestion: "{{company_info}}"  ← تکراری!
- original: "........", suggestion: "{{company_info}}"  ← تکراری!
\`\`\`

✅ **صحیح - هر جا یک متغیر جداگانه:**
\`\`\`
متن: "شرکت ........ به شناسه ملی ........ در شهر ........"
خروجی صحیح:
- original: "........" (اولی), suggestion: "{{beneficiary_company_name}}", context: "شرکت ........ به شناسه ملی"
- original: "........" (دومی), suggestion: "{{beneficiary_national_id}}", context: "به شناسه ملی ........ در شهر"
- original: "........" (سومی), suggestion: "{{beneficiary_city}}", context: "در شهر ........ به کد پستی"
\`\`\`

🎯 **راهنمای تشخیص context و نام‌گذاری صحیح:**

**1. تشخیص شرکت متقاضی (company_*) در مقابل شرکت دیگر (beneficiary_*):**
- اگر متن بگوید: "طرف اول" یا "ضمانت‌دهنده" یا "متعهد" → company_*
- اگر متن بگوید: "طرف دوم" یا "مضمون‌عنه" یا "بهره‌بردار" → beneficiary_*
- مثال:
  ✅ "نام شرکت (طرف اول)" → company_name
  ✅ "نام شرکت مضمون‌عنه" → beneficiary_company_name
  ✅ "آدرس دفتر ثبت شده شرکت (طرف اول)" → company_registration_office
  ✅ "آدرس دفتر ثبت شده مضمون‌عنه" → beneficiary_registration_office

**2. تشخیص صندوق (fund_*) در مقابل شرکت:**
- اگر متن بگوید: "صندوق" یا "ضمانت‌گیرنده" → fund_*
- مثال:
  ✅ "نام صندوق پژوهش و فناوری" → fund_name
  ✅ "نماینده صندوق" → fund_representative_name
  ❌ "شرکت صندوق سرمایه‌گذاری" → این company_name است نه fund_name!

**3. تشخیص نمایندگان (representative):
- "نماینده شرکت (طرف اول)" → company_representative_name
- "نماینده مضمون‌عنه" → beneficiary_representative_name
- "نماینده صندوق" → fund_representative_name

**4. هنگام مواجهه با نقطه‌چین‌های مشابه:**
اگر در سند چندین "..................." وجود دارد:
- هر کدام را با توجه به context اطراف آن شناسایی کنید
- original را متفاوت در نظر بگیرید (با context متفاوت)
- مثال:
  متن: "شرکت ................... به شناسه ملی ................... واقع در ..................."
  → سه متغیر جداگانه:
    1. company_name (context: "شرکت ... به شناسه")
    2. company_national_id (context: "به شناسه ملی ... واقع در")
    3. company_address (context: "واقع در ... با کد پستی")

مثال‌هایی از متغیرهای جدول:
- سلول خالی در ستون "نام" ردیف 2 جدول 1 → {{table1_name_2}}
- سلول خالی در ستون "مبلغ" ردیف 3 جدول 1 → {{table1_amount_3}}
- سلول خالی در ستون "تاریخ" ردیف 1 جدول 2 → {{table2_date_1}}

⚠️ **دقت کنید:**
- اعداد ثابت مثل شماره ماده‌ها را متغیر نکنید
- عناوین بخش‌ها را متغیر نکنید
- متن‌های قانونی ثابت را متغیر نکنید
- فقط مواردی که برای هر قرارداد متفاوت هستند را متغیر کنید
- برای هر متغیر، context کافی (حداقل 100 کاراکتر) ارائه دهید تا معنی آن روشن باشد
- UNIQUE بودن original را تضمین کنید - هیچ دو متغیری نباید original یکسانی داشته باشند`;
  }

  /**
   * Validate JSON structure and field names
   */
  private validateJSONStructure(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.detectedVariables || !Array.isArray(data.detectedVariables)) {
      errors.push('Missing or invalid detectedVariables array');
      return { valid: false, errors };
    }

    const validFields = ['original', 'suggestion', 'name', 'label', 'type',
      'source', 'category', 'required', 'description',
      'context', 'confidence', 'relatedTo', 'leftContext', 'rightContext'];
    const requiredFields = ['name', 'label', 'type', 'source', 'category'];

    // Track original values and suggestion values for uniqueness checks
    const originalValues = new Map<string, number>();
    const suggestionCounts = new Map<string, number[]>();

    for (let i = 0; i < data.detectedVariables.length; i++) {
      const variable = data.detectedVariables[i];

      // Check required fields
      for (const field of requiredFields) {
        if (!variable[field]) {
          errors.push(`Variable ${i}: Missing required field '${field}'`);
        }
      }

      // Check for typos in field names
      for (const key of Object.keys(variable)) {
        if (!validFields.includes(key)) {
          errors.push(`Variable ${i}: Invalid field name '${key}' (possible typo). Valid fields: ${validFields.join(', ')}`);
        }
      }

      // Check uniqueness of 'original' field combined with context
      // متغیرهایی با original یکسان (مثل "........") اما context متفاوت مجاز هستند
      if (variable.original) {
        const trimmedOriginal = String(variable.original).trim();
        const contextSnippet = variable.context ? String(variable.context).substring(0, 100).trim() : '';

        // استفاده از کلید ترکیبی: original + context برای شناسایی واقعی تکراری‌ها
        const uniqueKey = `${trimmedOriginal}|||${contextSnippet}`;

        if (originalValues.has(uniqueKey)) {
          const firstIndex = originalValues.get(uniqueKey);
          errors.push(`Variable ${i}: TRUE duplicate - same original "${trimmedOriginal.substring(0, 50)}..." AND same context (also used in variable ${firstIndex}). This is a real duplicate!`);
        } else {
          originalValues.set(uniqueKey, i);
        }
      }

      // Track suggestion usage
      if (variable.suggestion) {
        const trimmedSuggestion = String(variable.suggestion).trim();
        if (!suggestionCounts.has(trimmedSuggestion)) {
          suggestionCounts.set(trimmedSuggestion, []);
        }
        suggestionCounts.get(trimmedSuggestion)!.push(i);
      }

      // Check suggestion format
      if (variable.suggestion && !variable.suggestion.match(/^\{\{[a-z_]+\}\}$/)) {
        errors.push(`Variable ${i}: Invalid 'suggestion' format "${variable.suggestion}". Must be like "{{variable_name}}"`);
      }
    }

    // Check if same suggestion is used multiple times (BAD PRACTICE!)
    for (const [suggestion, indices] of suggestionCounts.entries()) {
      if (indices.length > 1) {
        errors.push(`⚠️ CRITICAL ERROR: Suggestion "${suggestion}" is used ${indices.length} times (variables: ${indices.join(', ')}). Each variable should have a DIFFERENT suggestion! Are you trying to use one variable name for multiple different fields? This is WRONG!`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Extract valid variables from partial/broken JSON
   */
  private extractPartialJSON(brokenJson: string): any {
    try {
      // Try to extract just the detectedVariables array
      const variablesMatch = brokenJson.match(/"detectedVariables":\s*\[([\s\S]*?)(?:\]|$)/);
      if (!variablesMatch) {
        throw new Error('Could not find detectedVariables array');
      }

      const variablesContent = variablesMatch[1];

      // Split by object boundaries and try to parse each variable
      const variables: any[] = [];
      const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      const matches = variablesContent.match(objectPattern);

      if (matches) {
        for (const match of matches) {
          try {
            const variable = JSON.parse(match);
            // Only add if it has required fields
            if (variable.name && variable.label && variable.type) {
              variables.push(variable);
            }
          } catch (e) {
            // Skip invalid objects
            console.log('Skipping invalid variable object');
          }
        }
      }

      if (variables.length === 0) {
        throw new Error('No valid variables extracted');
      }

      return {
        documentType: 'قرارداد',
        documentTitle: 'بدون عنوان',
        detectedVariables: variables,
        suggestedCategories: [],
        confidence: 70
      };
    } catch (error) {
      console.error('Failed to extract partial JSON:', error);
      throw error;
    }
  }

  /**
   * Clean JSON string to fix common issues including unterminated strings
   */
  private cleanJSON(jsonString: string): string {
    let cleaned = jsonString
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control chars except newline
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas

      // Fix common typos seen in logs:
      .replace(/""{2,}/g, '"') // Remove double quotes: ""type" → "type"
      .replace(/"ssource"/g, '"source"')
      .replace(/"orriginal"/g, '"original"')
      .replace(/"requireed"/g, '"required"')

      // Fix Persian text issues:
      .replace(/کنندده/g, 'کننده')
      .replace(/درخواست‌کنندده/g, 'درخواست‌کننده')
      .replace(/مؤسسا ات/g, 'مؤسسات')

      .trim();

    // More aggressive approach to fix unterminated strings
    // Split by lines and fix each field
    const lines = cleaned.split('\n');
    const fixedLines: string[] = [];
    let insideString = false;
    let currentKey = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Check if this line has a key-value pair
      const keyMatch = line.match(/"([^"]+)":\s*"([^"]*)$/);
      if (keyMatch && !line.endsWith('",') && !line.endsWith('"')) {
        // This is an unterminated string
        // Close it
        line = line + '"';
        if (i < lines.length - 1 && !lines[i + 1].trim().startsWith('}')) {
          line = line + ',';
        }
      }

      fixedLines.push(line);
    }

    cleaned = fixedLines.join('\n');

    // Fix incomplete JSON - if array not closed
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;

    // Add missing closing brackets/braces
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      cleaned += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      cleaned += '}';
    }

    // Ensure proper structure for our expected format
    if (cleaned.includes('"detectedVariables"') && !cleaned.includes('"suggestedCategories"')) {
      // Find the end of detectedVariables array
      const lastArrayClose = cleaned.lastIndexOf(']');
      if (lastArrayClose > 0) {
        cleaned = cleaned.substring(0, lastArrayClose + 1) +
          ', "suggestedCategories": [], "confidence": 75}';
      }
    }

    return cleaned;
  }

  /**
   * Analyze with Claude (Anthropic) with retry logic
   */
  private async analyzeWithClaude(prompt: string, model: string, retryCount: number = 0): Promise<AIAnalysisResult> {
    const MAX_RETRIES = 3;

    // Add retry feedback to prompt if this is a retry
    let enhancedPrompt = prompt;
    if (retryCount > 0) {
      enhancedPrompt = `⚠️ RETRY ${retryCount}/${MAX_RETRIES}: پاسخ قبلی دارای خطای JSON بود. لطفاً این بار با دقت بیشتر JSON معتبر بدون typo ارسال کنید.

${prompt}`;
    }

    try {
      let contentText = '';
      try {
        // استفاده از ارکستراتور برای مدیریت هوشمند Failover به GapGPT
        contentText = await aiOrchestrator.execute(enhancedPrompt, {
          model: 'claude-3-5-sonnet-20241022',
          systemPrompt: "You are an expert financial analyst. Respond ONLY with valid JSON.",
          temperature: 0,
          timeout: 60000 // 60 seconds for complex variable detection
        });
      } catch (error) {
        logger.error('❌ AI Analysis failed completely after fallback', 'variable-detection', error as Error);
        throw error;
      }

      // Extract JSON from response
      console.log(`🔍 AI response length (attempt ${retryCount + 1}):`, contentText.length);
      console.log('📝 AI response preview:', contentText.substring(0, 500) + '...');

      // Try multiple patterns to extract JSON
      let jsonMatch = contentText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        jsonMatch = contentText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1];
        }
      }

      if (!jsonMatch) {
        jsonMatch = contentText.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1];
        }
      }

      if (!jsonMatch) {
        console.error('❌ No JSON found in AI response');
        console.error('Full response:', contentText);
        throw new Error('Could not find JSON in AI response');
      }

      console.log('📋 Extracted JSON preview:', jsonMatch[0].substring(0, 300) + '...');

      let result;
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        
        // Try to clean and fix common JSON issues
        const cleanedJson = this.cleanJSON(jsonMatch[0]);

        try {
          console.log('🔧 Trying to parse cleaned JSON...');
          result = JSON.parse(cleanedJson);
          console.log('✅ Successfully parsed cleaned JSON');
        } catch (secondError) {
          console.error('❌ Even cleaned JSON failed to parse');

          // Try to extract valid variables from partial JSON
          console.log('🔍 Attempting to extract partial valid data...');
          let partialResult = null;

          try {
            partialResult = this.extractPartialJSON(cleanedJson);
            if (partialResult && partialResult.detectedVariables && partialResult.detectedVariables.length > 0) {
              result = partialResult;
            }
          } catch (partialError) {
            try {
              partialResult = this.extractPartialJSON(jsonMatch[0]);
              if (partialResult && partialResult.detectedVariables && partialResult.detectedVariables.length > 0) {
                result = partialResult;
              }
            } catch (rawError) {
              console.log('❌ Partial extraction failed');
            }
          }

          // If partial extraction failed completely, retry
          if (!result) {
            if (retryCount < MAX_RETRIES) {
              console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
              return await this.analyzeWithClaude(prompt, model, retryCount + 1);
            }
            throw new Error(`JSON parsing failed after ${MAX_RETRIES} retries`);
          }
        }
      }

      // Validate structure
      const validation = this.validateJSONStructure(result);
      if (!validation.valid) {
        if (retryCount < MAX_RETRIES) {
          const errorFeedback = `
🚨🚨🚨 VALIDATION ERRORS FROM PREVIOUS ATTEMPT 🚨🚨🚨
${validation.errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}
PLEASE FIX THESE ERRORS IN YOUR NEXT RESPONSE!
${prompt}`;
          return await this.analyzeWithClaude(errorFeedback, model, retryCount + 1);
        }
        throw new Error(`Invalid JSON structure: ${validation.errors.join(', ')}`);
      }

      console.log('✅ JSON validation passed');
      return this.validateAndEnhanceResult(result);

    } catch (error) {
      console.error('AI Analysis error:', error);

      // Retry on connection/timeout errors if not handled by orchestrator
      if (retryCount < MAX_RETRIES && (error instanceof Error && (error.message.includes('timeout') || error.message.includes('Connection')))) {
        console.log(`🔄 Connection error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.analyzeWithClaude(prompt, model, retryCount + 1);
      }

      throw error;
    }
  }


  /**
   * Validate and enhance AI result
   */
  private validateAndEnhanceResult(result: any): AIAnalysisResult {
    // Ensure required fields exist
    if (!result.detectedVariables || !Array.isArray(result.detectedVariables)) {
      result.detectedVariables = [];
    }

    // Enhance each variable
    result.detectedVariables = result.detectedVariables.map((variable: any) => ({
      ...variable,
      name: this.sanitizeVariableName(variable.name || ''),
      confidence: variable.confidence || this.calculateConfidence(variable),
      source: variable.source || this.detectSource(variable.name),
      category: variable.category || this.detectCategory(variable.name),
      required: variable.required !== undefined ? variable.required : true
    }));

    // Add default values
    result.documentType = result.documentType || 'قرارداد';
    result.documentTitle = result.documentTitle || 'بدون عنوان';
    result.suggestedCategories = result.suggestedCategories || ['عمومی'];
    result.confidence = result.confidence || 75;

    return result as AIAnalysisResult;
  }

  /**
   * Apply detected variables to Word document using Unified Variable Manager
   */
  async applyVariablesToDocument(
    filePath: string,
    variables: DetectedVariable[]
  ): Promise<Buffer> {
    try {
      console.log('🔄 Applying variables using Unified Variable Manager');

      // Convert DetectedVariable to replacement data
      const replacementData: Record<string, string> = {};
      variables.forEach(variable => {
        if (variable.name) {
          // Use the suggested value or create placeholder
          replacementData[variable.name] = `{{${variable.name}}}`;
        }
      });

      const result = await unifiedVariableManager.processDocumentWithVariables(
        filePath,
        replacementData,
        {
          fixBrokenVariables: true
        }
      );

      if (!result.success || !result.processedBuffer) {
        throw new Error(`Variable application failed: ${result.errors.join(', ')}`);
      }

      console.log(`✅ Variables applied: ${result.replacedCount} replacements`);
      return result.processedBuffer;

    } catch (error) {
      console.error('❌ Error applying variables with Unified Manager:', error);
      throw new Error('Failed to apply variables to document');
    }
  }

  /**
   * Create a more sophisticated variable application
   */
  async applyVariablesAdvanced(
    filePath: string,
    variables: DetectedVariable[]
  ): Promise<Buffer> {
    try {
      const content = await fs.readFile(filePath);

      // Use Docxtemplater for more reliable processing
      const doc = new Docxtemplater(new PizZip(content), {
        paragraphLoop: true,
        linebreaks: true,
        parser: (tag: string) => {
          // Custom parser to handle our variable format
          return {
            get: (scope: any) => {
              // Return the tag as-is for now (will be replaced later)
              return `{{${tag}}}`;
            }
          };
        }
      });

      // First pass: mark locations for variables
      const zip = doc.getZip();
      const documentXmlFile = zip.file('word/document.xml');
      if (!documentXmlFile) {
        throw new Error('Invalid document structure');
      }

      let xmlContent = documentXmlFile.asText();

      // Apply variables with context awareness
      for (const variable of variables) {
        if (!variable.original) continue;

        // Smart replacement that preserves Word formatting
        xmlContent = this.smartReplace(xmlContent, variable);
      }

      zip.file('word/document.xml', xmlContent);

      return zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
    } catch (error) {
      console.error('Advanced variable application error:', error);
      // Fall back to simple method
      return this.applyVariablesToDocument(filePath, variables);
    }
  }

  /**
   * Smart replacement that preserves Word XML structure
   */
  private smartReplace(xmlContent: string, variable: DetectedVariable): string {
    const placeholder = `{{${variable.name}}}`;

    // First, try simple replacement
    if (xmlContent.includes(variable.original)) {
      return xmlContent.replace(
        new RegExp(this.escapeRegex(variable.original), 'g'),
        placeholder
      );
    }

    // If not found, the text might be split across XML tags
    // Create a pattern that matches the text even if split
    const words = variable.original.split(/\s+/);
    if (words.length > 1) {
      // Build a regex that allows XML tags between words
      const pattern = words
        .map(word => this.escapeRegex(word))
        .join('(?:<[^>]+>)*\\s*(?:<[^>]+>)*');

      const regex = new RegExp(pattern, 'gi');
      const matches = xmlContent.match(regex);

      if (matches && matches.length > 0) {
        // Replace the first match (most likely the correct one)
        return xmlContent.replace(matches[0], `<w:t>${placeholder}</w:t>`);
      }
    }

    return xmlContent;
  }

  // Helper methods
  private sanitizeVariableName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private calculateConfidence(variable: any): number {
    let confidence = 0.5;

    if (variable.name && variable.name.match(/^company_|^calc_|_date$|_amount$/)) {
      confidence += 0.3;
    }

    if (variable.source && ['rasmio', 'calculated', 'system'].includes(variable.source)) {
      confidence += 0.15;
    }

    if (variable.type && variable.type !== 'text') {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  private detectSource(name: string): 'rasmio' | 'form' | 'calculated' | 'system' {
    if (name.startsWith('company_')) return 'rasmio';
    if (name.includes('calc_') || name.includes('_words')) return 'calculated';
    if (name.includes('system_') || name.includes('auto_')) return 'system';
    return 'form';
  }

  private detectCategory(name: string): string {
    if (name.includes('company') || name.includes('شرکت')) return 'company';
    if (name.includes('amount') || name.includes('price') || name.includes('مبلغ')) return 'financial';
    if (name.includes('date') || name.includes('تاریخ')) return 'dates';
    if (name.includes('person') || name.includes('name') || name.includes('نام')) return 'personal';
    if (name.includes('legal') || name.includes('قانون')) return 'legal';
    if (name.includes('tech') || name.includes('فنی')) return 'technical';
    return 'general';
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const aiVariableDetectionService = new AIVariableDetectionService();
