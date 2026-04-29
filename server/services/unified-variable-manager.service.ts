/**
 * سرویس یکپارچه مدیریت متغیرهای قرارداد
 * - تعمیر متغیرهای شکسته
 * - تشخیص منبع و نوع متغیرها
 * - جایگزینی هوشمند در فایل‌های Word
 * - مدیریت cache و بهینه‌سازی
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../storage';

// ================================
// 🎯 TYPES & INTERFACES
// ================================

export interface Variable {
  id?: string;
  name: string;
  originalText: string;
  label: string;
  type: VariableType;
  source: VariableSource;
  category: VariableCategory;
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
  confidence: number;
  context: string;
  position?: {
    xmlFile: string;
    line: number;
    start: number;
    end: number;
  };
  validation?: ValidationRules;
}

export type VariableType = 'text' | 'number' | 'date' | 'currency' | 'email' | 'phone' | 'textarea' | 'boolean' | 'select';

export type VariableSource = 'rasmio' | 'form' | 'manual' | 'calculated' | 'system' | 'missing';

export type VariableCategory = 'company' | 'financial' | 'dates' | 'personal' | 'legal' | 'technical' | 'other';

export interface ValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
  custom?: string;
}

export interface ExtractionResult {
  success: boolean;
  variables: Variable[];
  stats: {
    totalVariables: number;
    bySource: Record<VariableSource, number>;
    byType: Record<VariableType, number>;
    byCategory: Record<VariableCategory, number>;
    fixedBrokenVariables: number;
    duplicatesRemoved: number;
  };
  errors: string[];
  warnings: string[];
  recommendations: string[];
  processingTime: number;
  filePath: string;
  fileSize: number;
}

export interface ReplacementData {
  [variableName: string]: any;
}

export interface ProcessingResult {
  success: boolean;
  processedBuffer?: Buffer;
  fileName?: string;
  errors: string[];
  warnings: string[];
  replacedCount: number;
  processingTime: number;
}

// ================================
// 🏭 UNIFIED VARIABLE MANAGER
// ================================

export class UnifiedVariableManager {
  private cache = new Map<string, { data: ExtractionResult; timestamp: number; accessCount: number }>();
  private patterns = new VariablePatterns();
  private readonly MAX_CACHE_SIZE = 50;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  // ================================
  // 📥 EXTRACTION METHODS
  // ================================

  constructor() {
    // 🚀 PERFORMANCE: Auto-cleanup expired cache every 10 minutes
    this.cleanupInterval = setInterval(() => {
      const removed = this.cleanExpiredCache();
      if (removed > 0) {
        console.log(`🧹 Auto-cleanup removed ${removed} expired cache entries`);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * استخراج جامع متغیرها از فایل Word
   */
  async extractVariables(
    filePath: string,
    options: {
      useCache?: boolean;
      fixBrokenVariables?: boolean;
      detectSource?: boolean;
      generateRecommendations?: boolean;
    } = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const {
      useCache = true,
      fixBrokenVariables = true,
      detectSource = true,
      generateRecommendations = true
    } = options;

    try {
      // بررسی cache
      const cacheKey = `${filePath}_${JSON.stringify(options)}`;
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        const age = Date.now() - cached.timestamp;
        
        if (age < this.CACHE_TTL) {
          // 🚀 PERFORMANCE: Update access count for LRU tracking
          cached.accessCount++;
          this.cache.set(cacheKey, cached);
          console.log(`📋 Using cached extraction result (age: ${Math.round(age / 1000)}s, hits: ${cached.accessCount})`);
          return cached.data;
        } else {
          console.log('🗑️ Cache expired, removing old entry');
          this.cache.delete(cacheKey);
        }
      }

      console.log(`🔍 Starting unified variable extraction: ${path.basename(filePath)}`);

      // خواندن و اعتبارسنجی فایل
      const fileStats = await fs.stat(filePath);
      const templateBuffer = await fs.readFile(filePath);
      
      if (!this.isValidDocxFile(templateBuffer)) {
        throw new Error('فایل Word نامعتبر است');
      }

      // استخراج اولیه
      let variables = await this.performExtraction(templateBuffer, filePath, fixBrokenVariables);
      
      // تشخیص منبع و نوع
      if (detectSource) {
        variables = await this.enrichVariablesWithSourceDetection(variables);
      }

      // حذف تکراری‌ها و بهینه‌سازی
      const { uniqueVariables, duplicatesCount } = this.removeDuplicatesAndOptimize(variables);
      variables = uniqueVariables;

      // محاسبه آمار
      const stats = this.calculateStats(variables, duplicatesCount);

      // تولید توصیه‌ها
      const recommendations = generateRecommendations ? 
        this.generateRecommendations(variables, stats) : [];

      // تولید نتیجه نهایی
      const result: ExtractionResult = {
        success: true,
        variables,
        stats,
        errors: [],
        warnings: [],
        recommendations,
        processingTime: Date.now() - startTime,
        filePath,
        fileSize: fileStats.size
      };

      // ذخیره در cache با TTL و مدیریت حجم
      if (useCache) {
        // 🚀 PERFORMANCE: حذف قدیمی‌ترین یا کم استفاده‌ترین ورودی اگر cache پر شده
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
          const evictKey = this.findLeastRecentlyUsedKey();
          if (evictKey) {
            const evicted = this.cache.get(evictKey);
            this.cache.delete(evictKey);
            console.log(`🗑️ Evicted LRU cache entry (age: ${Math.round((Date.now() - evicted!.timestamp) / 1000)}s, hits: ${evicted!.accessCount})`);
          }
        }
        
        this.cache.set(cacheKey, { 
          data: result, 
          timestamp: Date.now(),
          accessCount: 1
        });
        console.log(`💾 Cached result (cache size: ${this.cache.size}/${this.MAX_CACHE_SIZE})`);
      }

      console.log(`✅ Extraction completed: ${variables.length} variables found in ${result.processingTime}ms`);
      return result;

    } catch (error) {
      console.error('❌ Variable extraction failed:', error);
      return {
        success: false,
        variables: [],
        stats: this.getEmptyStats(),
        errors: [error instanceof Error ? error.message : 'خطای نامشخص در استخراج متغیرها'],
        warnings: [],
        recommendations: [],
        processingTime: Date.now() - startTime,
        filePath,
        fileSize: 0
      };
    }
  }

  /**
   * استخراج اصلی متغیرها با تعمیر خودکار
   */
  private async performExtraction(
    templateBuffer: Buffer, 
    filePath: string, 
    fixBrokenVariables: boolean
  ): Promise<Variable[]> {
    const zip = new PizZip(templateBuffer);
    const variables: Variable[] = [];
    let totalFixedCount = 0;

    // فایل‌های XML که باید بررسی شوند
    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml', 
      'word/header3.xml',
      'word/footer1.xml',
      'word/footer2.xml',
      'word/footer3.xml',
      'word/footnotes.xml',
      'word/endnotes.xml'
    ];

    for (const xmlFile of xmlFiles) {
      const file = zip.file(xmlFile);
      if (!file) continue;

      let xmlContent = file.asText();
      let fixedCount = 0;

      // تعمیر متغیرهای شکسته
      if (fixBrokenVariables) {
        const { fixedContent, fixCount } = this.fixBrokenVariables(xmlContent);
        xmlContent = fixedContent;
        fixedCount = fixCount;
        totalFixedCount += fixCount;
        
        if (fixCount > 0) {
          console.log(`🔧 ${xmlFile}: ${fixCount} broken variables fixed`);
        }
      }

      // استخراج متغیرها از XML
      const extractedVars = this.extractVariablesFromXML(xmlContent, xmlFile);
      variables.push(...extractedVars);
    }

    if (totalFixedCount > 0) {
      console.log(`✅ Total broken variables fixed: ${totalFixedCount}`);
    }

    return variables;
  }

  /**
   * تعمیر متغیرهای شکسته با الگوریتم‌های چندگانه
   */
  private fixBrokenVariables(xmlContent: string): { fixedContent: string; fixCount: number } {
    let content = xmlContent;
    let totalFixCount = 0;

    // الگوی 1: متغیرهای پیچیده شکسته (بیشترین مورد)
    const pattern1 = /\{\{<\/w:t><\/w:r><w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t[^>]*>([^<]+)<\/w:t><\/w:r><w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t[^>]*>\}\}/g;
    content = content.replace(pattern1, (match, variableName) => {
      const cleanName = this.sanitizeVariableName(variableName);
      totalFixCount++;
      console.log(`🔧 [Pattern1] Fixed: ${variableName.trim()} → ${cleanName}`);
      return `<w:t>{{${cleanName}}}</w:t>`;
    });

    // الگوی 2: متغیرهای ساده شکسته  
    const pattern2 = /\{\{<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>([^<]+)<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>\}\}/g;
    content = content.replace(pattern2, (match, variableName) => {
      const cleanName = this.sanitizeVariableName(variableName);
      totalFixCount++;
      console.log(`🔧 [Pattern2] Fixed: ${variableName.trim()} → ${cleanName}`);
      return `<w:t>{{${cleanName}}}</w:t>`;
    });

    // الگوی 3: متغیرهای تقسیم شده بین تگ‌ها
    const pattern3 = /\{\{([^}]*)<\/w:t>[\s\S]*?<w:t[^>]*>([^}]*)\}\}/g;
    content = content.replace(pattern3, (match, part1, part2) => {
      const fullVariable = (part1 + part2).replace(/<[^>]*>/g, '').trim();
      if (fullVariable && fullVariable.length > 0) {
        const cleanName = this.sanitizeVariableName(fullVariable);
        totalFixCount++;
        console.log(`🔧 [Pattern3] Fixed split: ${fullVariable} → ${cleanName}`);
        return `<w:t>{{${cleanName}}}</w:t>`;
      }
      return match;
    });

    // الگوی 4: پاکسازی متغیرهای دارای تگ‌های اضافی
    const pattern4 = /\{\{[^}]*\}\}/g;
    const matches = content.match(pattern4);
    if (matches) {
      matches.forEach(match => {
        if (match.includes('<') || match.includes('>')) {
          const cleanVariable = match
            .replace(/<[^>]*>/g, '')
            .replace(/\{\{|\}\}/g, '')
            .trim();
          
          if (cleanVariable && cleanVariable.length > 0 && cleanVariable.length < 100) {
            const cleanName = this.sanitizeVariableName(cleanVariable);
            content = content.replace(match, `{{${cleanName}}}`);
            totalFixCount++;
            console.log(`🔧 [Pattern4] Cleaned: ${cleanVariable} → ${cleanName}`);
          }
        }
      });
    }

    // حذف تگ‌های اضافی و نامطلوب
    content = content.replace(/<w:proofErr[^>]*\/?>/g, '');
    content = content.replace(/<w:noProof[^>]*\/?>/g, '');
    content = content.replace(/\s+/g, ' '); // تمیزکاری فضای خالی

    return { fixedContent: content, fixCount: totalFixCount };
  }

  /**
   * استخراج متغیرها از محتوای XML
   */
  private extractVariablesFromXML(xmlContent: string, xmlFile: string): Variable[] {
    const variables: Variable[] = [];
    // Updated regex to handle newlines and spaces better
    const variablePattern = /\{\{([\s\S]+?)\}\}/g;
    const lines = xmlContent.split('\n');

    let match;
    variablePattern.lastIndex = 0; // Reset regex

    while ((match = variablePattern.exec(xmlContent)) !== null) {
      const variableName = match[1].trim();
      
      // فیلتر کردن متغیرهای نامعتبر
      if (!this.isValidVariableName(variableName)) {
        continue;
      }

      // محاسبه موقعیت
      const position = this.calculatePosition(xmlContent, match.index!, lines, xmlFile);
      
      // استخراج context
      const context = this.extractContext(xmlContent, match.index!, match[0].length);

      // تحلیل اولیه متغیر
      const analysis = this.analyzeVariable(variableName, context);

      const variable: Variable = {
        name: this.sanitizeVariableName(variableName),
        originalText: match[0],
        label: this.generatePersianLabel(variableName),
        type: analysis.type,
        source: analysis.source,
        category: analysis.category,
        required: analysis.required,
        confidence: analysis.confidence,
        context: context.replace(/<[^>]*>/g, ''), // حذف تگ‌های XML
        position,
        description: analysis.description,
        placeholder: analysis.placeholder,
        validation: analysis.validation
      };

      variables.push(variable);
    }

    return variables;
  }

  // ================================
  // 🧠 INTELLIGENCE & ANALYSIS  
  // ================================

  /**
   * تحلیل هوشمند متغیر برای تشخیص نوع و منبع
   */
  private analyzeVariable(name: string, context: string) {
    const lowerName = name.toLowerCase();
    let confidence = 0.7;
    let source: VariableSource = 'form';
    let type: VariableType = 'text';
    let category: VariableCategory = 'other';
    let required = false;

    // تشخیص منبع داده
    if (this.patterns.rasmio.some(pattern => pattern.test(lowerName))) {
      source = 'rasmio';
      confidence += 0.2;
      category = 'company';
    } else if (this.patterns.calculated.some(pattern => pattern.test(lowerName))) {
      source = 'calculated';
      confidence += 0.15;
      category = 'financial';
    } else if (this.patterns.system.some(pattern => pattern.test(lowerName))) {
      source = 'system';
      confidence += 0.1;
      category = 'technical';
    } else if (this.patterns.manual.some(pattern => pattern.test(lowerName))) {
      source = 'manual';
      confidence += 0.1;
      category = 'other';
    }

    // تشخیص نوع داده
    if (this.patterns.currency.some(pattern => pattern.test(lowerName))) {
      type = 'currency';
      category = 'financial';
      confidence += 0.1;
    } else if (this.patterns.date.some(pattern => pattern.test(lowerName))) {
      type = 'date';
      category = 'dates';
      confidence += 0.1;
    } else if (this.patterns.email.some(pattern => pattern.test(lowerName))) {
      type = 'email';
      category = 'personal';
      confidence += 0.1;
    } else if (this.patterns.phone.some(pattern => pattern.test(lowerName))) {
      type = 'phone';
      category = 'personal';
      confidence += 0.1;
    } else if (this.patterns.number.some(pattern => pattern.test(lowerName))) {
      type = 'number';
      confidence += 0.05;
    } else if (this.patterns.textarea.some(pattern => pattern.test(lowerName))) {
      type = 'textarea';
      confidence += 0.05;
    }

    // تشخیص اجباری بودن (فقط برای متغیرهای فرم)
    if (source === 'form' && this.patterns.required.some(pattern => pattern.test(lowerName))) {
      required = true;
      confidence += 0.05;
    }

    return {
      source,
      type,
      category,
      required,
      confidence: Math.min(confidence, 1.0),
      description: this.generateDescription(name, type, source),
      placeholder: this.generatePlaceholder(name, type),
      validation: this.generateValidation(name, type)
    };
  }

  /**
   * غنی‌سازی متغیرها با تشخیص منبع داده
   */
  private async enrichVariablesWithSourceDetection(variables: Variable[]): Promise<Variable[]> {
    console.log('🔍 Enriching variables with source detection...');
    
    for (const variable of variables) {
      // بررسی وجود داده در سیستم
      const availability = await this.checkVariableAvailability(variable.name);
      
      if (availability.available) {
        variable.source = this.mapSourceString(availability.source || 'system');
        if (availability.value) {
          variable.defaultValue = String(availability.value);
        }
      } else if (variable.source === 'rasmio') {
        // متغیرهای رسمیو که در دسترس نیستند
        variable.source = 'missing';
      }
    }

    return variables;
  }

  /**
   * بررسی دسترسی به داده متغیر در سیستم
   */
  private async checkVariableAvailability(variableName: string, companyId?: number): Promise<{
    available: boolean;
    source?: string;
    value?: any;
  }> {
    try {
      // بررسی متغیرهای رسمیو
      if (variableName.startsWith('company_') || this.patterns.rasmio.some(p => p.test(variableName))) {
        if (companyId) {
          const company = await storage.getCompany(companyId);
          if (company?.rasmioData) {
            return {
              available: true,
              source: 'rasmio',
              value: this.extractFromRasmio(variableName, company.rasmioData)
            };
          }
        }
        return { available: true, source: 'rasmio' };
      }

      // بررسی متغیرهای سیستم
      if (this.patterns.system.some(p => p.test(variableName))) {
        return { available: true, source: 'system' };
      }

      // بررسی متغیرهای محاسباتی
      if (this.patterns.calculated.some(p => p.test(variableName))) {
        return { available: true, source: 'calculated' };
      }

      // بررسی تنظیمات سیستم
      const settings = await storage.getAllSystemSettings();
      const setting = settings?.find(s => s.key === variableName);
      if (setting) {
        return {
          available: true,
          source: 'system',
          value: setting.value
        };
      }

      // بررسی متغیرهای تعریف شده
      const definedVariables = await storage.getContractVariables();
      const definedVar = definedVariables.find(v => v.name === variableName);
      if (definedVar) {
        return {
          available: true,
          source: definedVar.source,
          value: definedVar.defaultValue
        };
      }

      return { available: false };

    } catch (error) {
      console.warn(`⚠️ Error checking availability for ${variableName}:`, error);
      return { available: false };
    }
  }

  // ================================
  // 🔄 REPLACEMENT & PROCESSING
  // ================================

  /**
   * اعمال متغیرها با داده‌های جایگزین به فایل Word
   */
  async processDocumentWithVariables(
    filePath: string,
    replacementData: ReplacementData,
    options: {
      outputPath?: string;
      preserveOriginal?: boolean;
      fixBrokenVariables?: boolean;
    } = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const { outputPath, preserveOriginal = true, fixBrokenVariables = true } = options;

    try {
      console.log(`🔧 Processing document: ${path.basename(filePath)}`);
      console.log(`📊 Replacement data: ${Object.keys(replacementData).length} variables`);

      // خواندن فایل اصلی
      const templateBuffer = await fs.readFile(filePath);
      
      if (!this.isValidDocxFile(templateBuffer)) {
        throw new Error('فایل Word نامعتبر است');
      }

      // پردازش با Docxtemplater (روش اصلی)
      let processedBuffer: Buffer;
      let replacedCount = 0;

      try {
        const result = await this.processWithDocxtemplater(templateBuffer, replacementData, fixBrokenVariables);
        processedBuffer = result.buffer;
        replacedCount = result.replacedCount;
        
        console.log(`✅ Docxtemplater processing: ${replacedCount} variables replaced`);
        
      } catch (docxError) {
        console.warn('⚠️ Docxtemplater failed, falling back to XML processing:', docxError);
        
        // روش بازگشتی: پردازش XML مستقیم
        const result = await this.processWithDirectXML(templateBuffer, replacementData, fixBrokenVariables);
        processedBuffer = result.buffer;
        replacedCount = result.replacedCount;
        
        console.log(`✅ Direct XML processing: ${replacedCount} variables replaced`);
      }

      // ذخیره فایل (اگر مسیر خروجی مشخص شده)
      let fileName: string | undefined;
      if (outputPath) {
        await fs.writeFile(outputPath, processedBuffer);
        fileName = path.basename(outputPath);
        console.log(`💾 Document saved: ${fileName}`);
      }

      return {
        success: true,
        processedBuffer,
        fileName,
        errors: [],
        warnings: [],
        replacedCount,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Document processing failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'خطای نامشخص در پردازش سند'],
        warnings: [],
        replacedCount: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * پاکسازی نقطه‌های اضافی قبل و بعد از متغیرها
   */
  private cleanDotsAroundVariables(xmlContent: string): string {
    console.log('🧹 Cleaning dots around variables...');
    
    let cleaned = xmlContent;
    let cleanCount = 0;
    
    // Pattern 1: نقطه‌های قبل از متغیر: ....{{variable}}
    const beforePattern = /\.{2,}\s*(<[^>]*>)*\s*\{\{/g;
    cleaned = cleaned.replace(beforePattern, (match) => {
      cleanCount++;
      // فقط {{ رو نگه میداریم
      return match.replace(/\.+/g, '').replace(/\s+/g, ' ').trim() + '{{';
    });
    
    // Pattern 2: نقطه‌های بعد از متغیر: {{variable}}....
    const afterPattern = /\}\}\s*(<[^>]*>)*\s*\.{2,}/g;
    cleaned = cleaned.replace(afterPattern, (match) => {
      cleanCount++;
      // فقط }} رو نگه میداریم
      return '}}' + match.replace(/\.+/g, '').replace(/\s+/g, ' ').trim();
    });
    
    // Pattern 3: نقطه‌های هم قبل هم بعد: ....{{variable}}....
    const bothPattern = /\.{2,}\s*(<[^>]*>)*\s*\{\{([^}]+)\}\}\s*(<[^>]*>)*\s*\.{2,}/g;
    cleaned = cleaned.replace(bothPattern, (match, tag1, varName, tag2) => {
      cleanCount++;
      // فقط متغیر رو نگه میداریم
      const tags = (tag1 || '') + (tag2 || '');
      return tags + `{{${varName}}}`;
    });
    
    if (cleanCount > 0) {
      console.log(`✅ Cleaned ${cleanCount} dot patterns around variables`);
    }
    
    return cleaned;
  }

  /**
   * پردازش با استفاده از Docxtemplater
   */
  private async processWithDocxtemplater(
    templateBuffer: Buffer,
    replacementData: ReplacementData,
    fixBrokenVariables: boolean
  ): Promise<{ buffer: Buffer; replacedCount: number }> {
    
    // تعمیر متغیرهای شکسته قبل از پردازش
    let processedBuffer = templateBuffer;
    if (fixBrokenVariables) {
      processedBuffer = await this.fixDocumentVariables(templateBuffer);
    }

    // اعمال RTL برای متغیرهای فارسی
    processedBuffer = await this.applyRtlToVariables(processedBuffer, replacementData);
    
    // پاکسازی نقطه‌های اضافی
    let zip = new PizZip(processedBuffer);
    const documentXml = zip.file('word/document.xml');
    if (documentXml) {
      let xmlContent = documentXml.asText();
      xmlContent = this.cleanDotsAroundVariables(xmlContent);
      zip.file('word/document.xml', xmlContent);
      processedBuffer = zip.generate({ type: 'nodebuffer' });
    }

    // پردازش با Docxtemplater
    zip = new PizZip(processedBuffer);

    // استفاده از parser سفارشی برای جستجوی هوشمند متغیرها
    const selfRef = this; // برای دسترسی به this در parser
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      errorLogging: true,
      parser: (tag: string) => {
        return {
          get: (scope: any, context: any) => {
            // استفاده از lookupReplacementValue برای جستجوی هوشمند
            const value = selfRef.lookupReplacementValue(tag, replacementData);

            if (value !== undefined) {
              return value;
            }

            // اگر مقدار پیدا نشد، چک کن که آیا در scope هست
            if (scope && tag in scope) {
              return scope[tag];
            }

            // در آخر، متغیر را به شکل اصلی برگردان تا کاربر بفهمد که پر نشده
            // Changed from returning "[MISSING: ${tag}]" to "" to avoid document formatting corruption
            console.warn(`⚠️ Variable not found: {{${tag}}}, returning empty string to prevent docx corruption`);
            return "";
          }
        };
      }
    });

    // تنظیم داده‌ها (حالا parser ما استفاده می‌شود)
    doc.setData(replacementData);

    try {
      doc.render();
    } catch (error: any) {
      console.error('Docxtemplater render error:', error);
      
      // بررسی خطاهای مشخص
      if (error.properties && error.properties.errors) {
        const errorMessages = error.properties.errors.map((e: any) => e.message).join(', ');
        throw new Error(`خطا در رندر کردن قالب: ${errorMessages}`);
      }
      throw error;
    }

    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // تخمین تعداد متغیرهای جایگزین شده
    const replacedCount = Object.keys(replacementData).length;

    return { buffer: outputBuffer, replacedCount };
  }

  /**
   * پردازش مستقیم XML (روش بازگشتی)
   */
  private async processWithDirectXML(
    templateBuffer: Buffer,
    replacementData: ReplacementData,
    fixBrokenVariables: boolean
  ): Promise<{ buffer: Buffer; replacedCount: number }> {
    
    // ابتدا RTL را اعمال می‌کنیم تا اگر متغیر فارسی است، تنظیمات درست شود
    const rtlBuffer = await this.applyRtlToVariables(templateBuffer, replacementData);
    const zip = new PizZip(rtlBuffer);
    let totalReplacedCount = 0;

    // فایل‌های XML که باید پردازش شوند
    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
      'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
      'word/footnotes.xml', 'word/endnotes.xml'
    ];

    for (const xmlFile of xmlFiles) {
      const file = zip.file(xmlFile);
      if (!file) continue;

      let xmlContent = file.asText();

      // تعمیر متغیرهای شکسته
      if (fixBrokenVariables) {
        const { fixedContent } = this.fixBrokenVariables(xmlContent);
        xmlContent = fixedContent;
      }
      
      // پاکسازی نقطه‌های اضافی
      xmlContent = this.cleanDotsAroundVariables(xmlContent);

      // استخراج تمام متغیرهای موجود در XML
      const variablePattern = /\{\{([\s\S]+?)\}\}/g;
      const foundVariables = new Set<string>();
      let match;
      while ((match = variablePattern.exec(xmlContent)) !== null) {
        const varName = match[1].trim(); // trim whitespace
        foundVariables.add(this.sanitizeVariableName(varName));
      }

      console.log(`📝 Found ${foundVariables.size} unique variables in ${xmlFile}`);

      // اعمال جایگزینی‌ها با جستجوی هوشمند و حفظ فاصله‌گذاری
      let fileReplacedCount = 0;
      for (const variableName of foundVariables) {
        // استفاده از جستجوی هوشمند برای پیدا کردن مقدار
        const value = this.lookupReplacementValue(variableName, replacementData);

        let stringValue: string;
        if (value !== undefined) {
          stringValue = this.formatValue(value, variableName);
        } else {
          console.warn(`⚠️ No data found for variable: {{${variableName}}}`);
          stringValue = `[MISSING: ${variableName}]`;
        }

        const placeholder = `{{${variableName}}}`;

        // استفاده از replaceWithSpacing برای حفظ فاصله‌ها
        const beforeContent = xmlContent;
        xmlContent = this.replaceWithSpacing(xmlContent, placeholder, stringValue);

        // شمارش تعداد جایگزینی‌ها
        const matches = beforeContent.match(new RegExp(this.escapeRegex(placeholder), 'g'));
        if (matches) {
          fileReplacedCount += matches.length;
        }
      }

      // به‌روزرسانی محتوای XML
      if (fileReplacedCount > 0) {
        zip.file(xmlFile, xmlContent);
        totalReplacedCount += fileReplacedCount;
        console.log(`📝 ${xmlFile}: ${fileReplacedCount} replacements`);
      }
    }

    const outputBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    return { buffer: outputBuffer, replacedCount: totalReplacedCount };
  }

  // ================================
  // 🛠️ UTILITY METHODS
  // ================================

  /**
   * بررسی معتبر بودن فایل DOCX
   */
  private isValidDocxFile(buffer: Buffer): boolean {
    return buffer.slice(0, 4).toString() === 'PK\x03\x04';
  }

  /**
   * بررسی معتبر بودن نام متغیر
   */
  private isValidVariableName(name: string): boolean {
    if (!name || name.length === 0) return false;
    if (name.length > 100) return false; // خیلی طولانی
    if (name.includes('<') || name.includes('>')) return false; // شامل تگ XML
    if (/^\s*$/.test(name)) return false; // فقط فضای خالی
    
    return true;
  }

  /**
   * پاکسازی نام متغیر
   */
  private sanitizeVariableName(name: string): string {
    return name
      .trim()
      .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9_\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  /**
   * محاسبه موقعیت متغیر در سند
   */
  private calculatePosition(xmlContent: string, matchIndex: number, lines: string[], xmlFile: string) {
    const beforeMatch = xmlContent.substring(0, matchIndex);
    const lineNumber = beforeMatch.split('\n').length;
    
    return {
      xmlFile,
      line: lineNumber,
      start: matchIndex,
      end: matchIndex + xmlContent.length
    };
  }

  /**
   * استخراج context اطراف متغیر
   */
  private extractContext(xmlContent: string, matchIndex: number, matchLength: number): string {
    const contextLength = 150;
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(xmlContent.length, matchIndex + matchLength + contextLength);
    
    return xmlContent.substring(start, end);
  }

  /**
   * تولید برچسب فارسی برای متغیر
   */
  private generatePersianLabel(variableName: string): string {
    const translations: Record<string, string> = {
      // Company info
      'company_name': 'نام شرکت',
      'company_national_id': 'شناسه ملی شرکت',
      'company_registration_number': 'شماره ثبت شرکت',
      'company_address': 'آدرس شرکت',
      'company_phone': 'تلفن شرکت',
      'company_email': 'ایمیل شرکت',
      'company_postal_code': 'کد پستی شرکت',
      
      // Contract info
      'contract_type': 'نوع قرارداد',
      'contract_subject': 'موضوع قرارداد',
      'contract_number': 'شماره قرارداد',
      'contract_date': 'تاریخ قرارداد',
      
      // Financial
      'total_amount': 'مبلغ کل',
      'total_amount_words': 'مبلغ کل (به حروف)',
      'advance_amount': 'مبلغ پیش‌پرداخت',
      
      // Dates
      'start_date': 'تاریخ شروع',
      'end_date': 'تاریخ پایان',
      'duration_days': 'مدت قرارداد (روز)',
      
      // Other
      'guarantees_description': 'شرح تضامین',
      'special_conditions': 'شرایط خاص',
      'fund_representative': 'نماینده صندوق',
      'company_representative': 'نماینده شرکت'
    };

    if (translations[variableName]) {
      return translations[variableName];
    }

    // تولید خودکار از نام انگلیسی
    return variableName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * تولید توضیحات برای متغیر
   */
  private generateDescription(name: string, type: VariableType, source: VariableSource): string {
    const descriptions: Record<string, string> = {
      'company_name': 'نام کامل شرکت طرف قرارداد که از رسمیو دریافت می‌شود',
      'total_amount': 'مبلغ کل قرارداد بر حسب ریال',
      'contract_date': 'تاریخ انعقاد قرارداد',
      'start_date': 'تاریخ شروع اجرای قرارداد',
      'end_date': 'تاریخ پایان قرارداد'
    };

    if (descriptions[name]) {
      return descriptions[name];
    }

    // تولید خودکار بر اساس نوع و منبع
    const sourceText = {
      'rasmio': 'از سامانه رسمیو',
      'form': 'از فرم ورودی مشتری',
      'manual': 'ورود دستی توسط کارمند',
      'calculated': 'محاسبه خودکار',
      'system': 'تولید سیستم',
      'missing': 'نیاز به تعریف'
    };

    return `متغیر ${type} که ${sourceText[source]} دریافت می‌شود`;
  }

  /**
   * تولید placeholder برای متغیر
   */
  private generatePlaceholder(name: string, type: VariableType): string {
    const placeholders: Record<string, string> = {
      'contract_subject': 'مثال: سرمایه‌گذاری در پروژه فناوری',
      'total_amount': 'مثال: 1000000000',
      'company_name': 'مثال: شرکت فناوری پیشرو',
      'start_date': 'مثال: 1403/01/01',
      'guarantees_description': 'شرح کامل تضامین و ضمانت‌نامه‌ها'
    };

    if (placeholders[name]) {
      return placeholders[name];
    }

    // تولید بر اساس نوع
    const typePlaceholders: Record<VariableType, string> = {
      'text': 'متن را وارد کنید',
      'number': 'عدد را وارد کنید',
      'currency': 'مبلغ بر حسب ریال',
      'date': 'تاریخ را انتخاب کنید',
      'email': 'مثال: example@domain.com',
      'phone': 'مثال: 09123456789',
      'textarea': 'متن تفصیلی را وارد کنید',
      'boolean': 'بله یا خیر',
      'select': 'از لیست انتخاب کنید'
    };

    return typePlaceholders[type] || 'مقدار را وارد کنید';
  }

  /**
   * تولید قوانین اعتبارسنجی
   */
  private generateValidation(name: string, type: VariableType): ValidationRules {
    const rules: ValidationRules = {};

    switch (type) {
      case 'currency':
        rules.min = 0;
        rules.pattern = '^[0-9]+$';
        break;
      case 'email':
        rules.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
        break;
      case 'phone':
        rules.pattern = '^09[0-9]{9}$';
        break;
      case 'number':
        rules.pattern = '^[0-9]+$';
        break;
    }

    return rules;
  }

  /**
   * حذف متغیرهای تکراری و بهینه‌سازی
   */
  private removeDuplicatesAndOptimize(variables: Variable[]): { uniqueVariables: Variable[]; duplicatesCount: number } {
    const seen = new Map<string, Variable>();
    let duplicatesCount = 0;

    variables.forEach(variable => {
      const key = variable.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, variable);
      } else {
        // اگر متغیر جدید confidence بالاتری داره، جایگزین کن
        const existing = seen.get(key)!;
        if (variable.confidence > existing.confidence) {
          seen.set(key, variable);
        }
        duplicatesCount++;
      }
    });

    const uniqueVariables = Array.from(seen.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    return { uniqueVariables, duplicatesCount };
  }

  /**
   * محاسبه آمار استخراج
   */
  private calculateStats(variables: Variable[], duplicatesCount: number): ExtractionResult['stats'] {
    const stats = {
      totalVariables: variables.length,
      bySource: {} as Record<VariableSource, number>,
      byType: {} as Record<VariableType, number>,
      byCategory: {} as Record<VariableCategory, number>,
      fixedBrokenVariables: 0,
      duplicatesRemoved: duplicatesCount
    };

    variables.forEach(variable => {
      stats.bySource[variable.source] = (stats.bySource[variable.source] || 0) + 1;
      stats.byType[variable.type] = (stats.byType[variable.type] || 0) + 1;
      stats.byCategory[variable.category] = (stats.byCategory[variable.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * تولید توصیه‌ها برای بهبود
   */
  private generateRecommendations(variables: Variable[], stats: ExtractionResult['stats']): string[] {
    const recommendations: string[] = [];

    // توصیه‌های بر اساس منبع داده
    const missingVariables = variables.filter(v => v.source === 'missing').length;
    if (missingVariables > 0) {
      recommendations.push(`🔗 ${missingVariables} متغیر نیاز به تعریف فرم ورودی دارد`);
    }

    const lowConfidenceVars = variables.filter(v => v.confidence < 0.6).length;
    if (lowConfidenceVars > 0) {
      recommendations.push(`⚠️ ${lowConfidenceVars} متغیر نیاز به بررسی دستی دارد`);
    }

    // توصیه‌های بر اساس نوع داده
    const unknownTypeVars = variables.filter(v => v.type === 'text' && v.name.includes('amount')).length;
    if (unknownTypeVars > 0) {
      recommendations.push(`💰 احتمال وجود متغیرهای مالی که نوع آنها به درستی تشخیص نشده`);
    }

    // توصیه بهینه‌سازی
    if (stats.totalVariables > 20) {
      recommendations.push(`📊 قالب دارای ${stats.totalVariables} متغیر است - در نظر بگیرید آن را به چندین قالب کوچک‌تر تقسیم کنید`);
    }

    return recommendations;
  }

  /**
   * آمار خالی
   */
  private getEmptyStats(): ExtractionResult['stats'] {
    return {
      totalVariables: 0,
      bySource: {} as Record<VariableSource, number>,
      byType: {} as Record<VariableType, number>,
      byCategory: {} as Record<VariableCategory, number>,
      fixedBrokenVariables: 0,
      duplicatesRemoved: 0
    };
  }

  /**
   * جایگزینی با حفظ فاصله‌گذاری
   * این تابع فاصله‌های قبل و بعد از متغیر را حفظ می‌کند
   */
  private replaceWithSpacing(xml: string, placeholder: string, value: string): string {
    const escapedPlaceholder = this.escapeRegex(placeholder);
    
    // Regex برای capture کردن فاصه قبل و بعد
    // \s? = فاصله اختیاری (space, tab, newline)
    const regexWithSpacing = new RegExp(`(\\s?)${escapedPlaceholder}(\\s?)`, 'g');
    
    return xml.replace(regexWithSpacing, (match, spaceBefore, spaceAfter) => {
      // اگر فاصله وجود داره، حفظش کن
      // اگر نداره، یک فاصه اضافه کن
      const before = spaceBefore || '';
      const after = spaceAfter || '';
      
      // فقط اگر value خالی نباشه فاصله اضافه کن
      if (!value || value.trim() === '') {
        return before + value + after;
      }
      
      // اضافه کردن فاصله اگر نیاز باشه
      const needsSpaceBefore = before === '' && /\S$/.test(xml.substring(xml.indexOf(match) - 10, xml.indexOf(match)));
      const needsSpaceAfter = after === '' && /^\S/.test(xml.substring(xml.indexOf(match) + match.length, xml.indexOf(match) + match.length + 10));
      
      const finalBefore = before || (needsSpaceBefore ? ' ' : '');
      const finalAfter = after || (needsSpaceAfter ? ' ' : '');
      
      return finalBefore + value + finalAfter;
    });
  }

  /**
   * فرمت کردن مقدار برای جایگزینی
   */
  private formatValue(value: any, variableName: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Handle zero explicitly
    if (value === 0) {
      if (variableName.includes('amount')) {
        return '۰';
      }
      return '0';
    }

    // فرمت‌های خاص
    if (variableName.includes('amount') && typeof value === 'number') {
      return value.toLocaleString('fa-IR');
    }

    if (variableName.includes('date')) {
      if (value instanceof Date) {
        return value.toLocaleDateString('fa-IR');
      }
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(value).toLocaleDateString('fa-IR');
      }
    }

    return String(value);
  }

  /**
   * Escape کردن کاراکترهای regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * تطبیق هوشمند نام متغیرها - حذف پیشوندهای متداول
   * مثال: beneficiary_company_name → [beneficiary_company_name, company_name]
   */
  private normalizeVariableName(name: string): string[] {
    const normalized = name.toLowerCase().trim();
    const variants = [normalized];

    // لیست پیشوندهای رایج در سیستم
    const prefixes = [
      'beneficiary_',
      'company_',
      'fund_',
      'representative_',
      'guarantor_',
      'witness_',
      'party_a_',
      'party_b_',
      'contractor_',
      'client_'
    ];

    // برای هر پیشوند، اگر نام متغیر با آن شروع می‌شود، نسخه بدون پیشوند را اضافه کن
    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) {
        const withoutPrefix = normalized.replace(prefix, '');
        if (withoutPrefix.length > 0) {
          variants.push(withoutPrefix);
        }
      }
    }

    // همچنین نسخه‌هایی با پیشوندهای دیگر را هم امتحان کن
    // مثلاً اگر company_name جستجو می‌شود، beneficiary_company_name را هم چک کن
    if (!normalized.includes('_')) {
      // نام ساده است، نسخه‌های با پیشوند را هم اضافه کن
      for (const prefix of prefixes) {
        variants.push(prefix + normalized);
      }
    } else {
      // نام ترکیبی است، نسخه‌های با پیشوندهای مختلف را امتحان کن
      const baseName = normalized.split('_').slice(-2).join('_'); // آخرین دو قسمت
      if (baseName !== normalized) {
        variants.push(baseName);
        // با پیشوندهای دیگر هم امتحان کن
        for (const prefix of prefixes) {
          if (!normalized.startsWith(prefix)) {
            variants.push(prefix + baseName);
          }
        }
      }
    }

    // حذف تکراری‌ها
    return [...new Set(variants)];
  }

  /**
   * جستجوی هوشمند متغیر در داده‌های جایگزینی
   * ابتدا دقیقاً جستجو می‌کند، سپس نسخه‌های نرمال شده را امتحان می‌کند
   */
  private lookupReplacementValue(variableName: string, replacementData: ReplacementData): any {
    // 1. جستجوی دقیق (Exact match)
    if (variableName in replacementData) {
      return replacementData[variableName];
    }

    // 2. جستجوی case-insensitive
    const lowerName = variableName.toLowerCase();
    for (const key of Object.keys(replacementData)) {
      if (key.toLowerCase() === lowerName) {
        return replacementData[key];
      }
    }

    // 3. جستجوی با نسخه‌های نرمال شده (با و بدون پیشوند)
    const variants = this.normalizeVariableName(variableName);
    for (const variant of variants) {
      if (variant in replacementData) {
        console.log(`✅ Variable name matched: ${variableName} → ${variant}`);
        return replacementData[variant];
      }

      // چک case-insensitive برای هر variant
      for (const key of Object.keys(replacementData)) {
        if (key.toLowerCase() === variant.toLowerCase()) {
          console.log(`✅ Variable name matched (case-insensitive): ${variableName} → ${key}`);
          return replacementData[key];
        }
      }
    }

    // 4. جستجوی با matching جزئی (partial match)
    // اگر نام متغیر شامل کلمات کلیدی باشد
    const keywords = variableName.toLowerCase().split('_').filter(k => k.length > 2);
    if (keywords.length > 0) {
      for (const key of Object.keys(replacementData)) {
        const keyLower = key.toLowerCase();
        const matchCount = keywords.filter(kw => keyLower.includes(kw)).length;
        // اگر حداقل نیمی از کلمات کلیدی مطابقت داشتند
        if (matchCount >= keywords.length / 2 && matchCount >= 2) {
          console.log(`⚠️ Partial variable match: ${variableName} → ${key} (${matchCount}/${keywords.length} keywords)`);
          return replacementData[key];
        }
      }
    }

    // 5. مقدار پیدا نشد
    return undefined;
  }

  /**
   * تعمیر متغیرهای شکسته در کل سند
   */
  private async fixDocumentVariables(templateBuffer: Buffer): Promise<Buffer> {
    const zip = new PizZip(templateBuffer);
    const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/footer1.xml'];
    
    for (const xmlFile of xmlFiles) {
      const file = zip.file(xmlFile);
      if (!file) continue;
      
      const { fixedContent } = this.fixBrokenVariables(file.asText());
      zip.file(xmlFile, fixedContent);
    }
    
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  /**
   * اعمال تنظیمات RTL برای متغیرهای فارسی
   */
  private async applyRtlToVariables(templateBuffer: Buffer, replacementData: ReplacementData): Promise<Buffer> {
    const zip = new PizZip(templateBuffer);
    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
      'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml'
    ];

    for (const xmlFile of xmlFiles) {
      const file = zip.file(xmlFile);
      if (!file) continue;

      let xmlContent = file.asText();

      // Regex to find runs containing {{...}}
      // We look for <w:r ... </w:r> blocks
      const runRegex = /<w:r(?:>| [^>]*>)([\s\S]*?)<\/w:r>/g;

      let replacedCount = 0;
      xmlContent = xmlContent.replace(runRegex, (fullRun, runContent) => {
        // Check if run contains a variable
        const varMatch = runContent.match(/\{\{([\s\S]+?)\}\}/);
        if (!varMatch) return fullRun;

        const varName = this.sanitizeVariableName(varMatch[1]);

        // Use lookup to find value
        const value = this.lookupReplacementValue(varName, replacementData);

        // Check if value is Persian
        if (value && this.isPersian(String(value))) {
            replacedCount++;

            // Analyze existing w:rPr
            // Matches <w:rPr>...</w:rPr> OR <w:rPr/>
            const rPrRegex = /<w:rPr(?:>| [^>]*>)(?:[\s\S]*?<\/w:rPr>)?/i;
            const rPrMatch = fullRun.match(rPrRegex);

            let newRPr = '';

            if (rPrMatch) {
                // Existing w:rPr found
                let rPrTag = rPrMatch[0];

                // If self-closing <w:rPr/>, expand it
                if (rPrTag.endsWith('/>')) {
                    rPrTag = rPrTag.slice(0, -2) + '></w:rPr>';
                }

                // Parse content inside <w:rPr>...</w:rPr>
                const innerContentMatch = rPrTag.match(/>([\s\S]*?)<\/w:rPr>/);
                let innerContent = innerContentMatch ? innerContentMatch[1] : '';

                // Add <w:rtl/> if missing
                if (!innerContent.includes('<w:rtl') && !innerContent.includes('w:rtl=')) {
                    innerContent += '<w:rtl/>';
                }

                // Add/Update <w:rFonts>
                if (innerContent.includes('<w:rFonts')) {
                    // Update existing tag to add w:cs if missing (preserving existing font if set)
                    innerContent = innerContent.replace(/(<w:rFonts)([^>]*?)(\/?>)/, (match, tag, attrs, close) => {
                        if (attrs.includes('w:cs=')) return match; // Preserve existing
                        return `${tag}${attrs} w:cs="B Nazanin" w:hint="cs"${close}`;
                    });
                } else {
                    // Add new tag if completely missing
                    innerContent += '<w:rFonts w:cs="B Nazanin" w:hint="cs"/>';
                }

                // Add <w:lang> if missing
                if (!innerContent.includes('<w:lang')) {
                    innerContent += '<w:lang w:cs="fa-IR"/>';
                }

                // Reconstruct rPr tag
                const openTagMatch = rPrTag.match(/^<w:rPr(?:>| [^>]*>)/);
                if (openTagMatch) {
                    const openTag = openTagMatch[0];
                    newRPr = `${openTag}${innerContent}</w:rPr>`;
                    return fullRun.replace(rPrMatch[0], newRPr);
                }
                // Fallback (should not happen if regex matched)
                return fullRun;

            } else {
                // No w:rPr found, create new one at start of run content
                newRPr = '<w:rPr><w:rtl/><w:rFonts w:cs="B Nazanin" w:hint="cs"/><w:lang w:cs="fa-IR"/></w:rPr>';

                // Find where run content starts (after <w:r>)
                const openRunTagMatch = fullRun.match(/^<w:r(?:>| [^>]*>)/);
                if (openRunTagMatch) {
                    const openRunTag = openRunTagMatch[0];
                    return openRunTag + newRPr + fullRun.slice(openRunTag.length);
                }
            }
        }
        return fullRun;
      });

      if (replacedCount > 0) {
        console.log(`✅ Applied RTL to ${replacedCount} runs in ${xmlFile}`);
        zip.file(xmlFile, xmlContent);
      }
    }

    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private isPersian(text: string): boolean {
    if (!text) return false;
    // Basic Persian/Arabic range check + Zero Width Non-Joiner
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u200C]/;
    return persianRegex.test(text);
  }

  /**
   * تبدیل رشته منبع به نوع enum
   */
  private mapSourceString(source: string): VariableSource {
    const mapping: Record<string, VariableSource> = {
      'rasmio': 'rasmio',
      'system': 'system',
      'calculated': 'calculated',
      'form': 'form'
    };
    return mapping[source] || 'form';
  }

  /**
   * استخراج مقدار از داده‌های رسمیو
   * ⚠️ DEPRECATED: استفاده از extractFromRasmio مرکزی در rasmio-field-mapping.ts
   */
  private extractFromRasmio(variableName: string, rasmioData: any): any {
    // استفاده از تابع مرکزی
    const { extractFromRasmio } = require('../utils/rasmio-field-mapping');
    return extractFromRasmio(variableName, rasmioData);
  }

  /**
   * پاکسازی cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Variable extraction cache cleared');
  }

  /**
   * 🚀 PERFORMANCE: Cleanup and stop auto-cleanup interval
   * Call this when shutting down the service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Cache auto-cleanup interval stopped');
    }
    this.clearCache();
  }

  /**
   * 🚀 PERFORMANCE: پیدا کردن کم استفاده‌ترین کلید برای حذف (LRU)
   * ترکیبی از قدمت و تعداد دسترسی
   */
  private findLeastRecentlyUsedKey(): string | null {
    let lruKey: string | null = null;
    let minScore = Infinity;

    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      // Score = (age in hours) / (access count + 1)
      // کلیدهایی که قدیمی‌ترند و کمتر استفاده شده‌اند، score بالاتری دارند
      const ageInHours = (now - value.timestamp) / (1000 * 60 * 60);
      const score = ageInHours / (value.accessCount + 1);
      
      if (score < minScore) {
        minScore = score;
        lruKey = key;
      }
    }

    return lruKey;
  }

  /**
   * پیدا کردن قدیمی‌ترین کلید در cache برای حذف (legacy method)
   */
  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * دریافت اطلاعات cache
   */
  getCacheStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * پاکسازی ورودی‌های منقضی شده از cache
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🗑️ Cleaned ${removedCount} expired cache entries`);
    }

    return removedCount;
  }
}

// ================================
// 🎯 PATTERN DEFINITIONS
// ================================

class VariablePatterns {
  // الگوهای متغیرهای رسمیو
  rasmio = [
    /^company_/i, /^شرکت_/,
    /company.*name/i, /نام.*شرکت/,
    /company.*address/i, /آدرس.*شرکت/,
    /national.*id/i, /شناسه.*ملی/, /کد.*ملی/,
    /registration.*number/i, /شماره.*ثبت/,
    /^name$/i, /^نام$/,
    /^address$/i, /^آدرس$/,
    /^phone$/i, /^تلفن$/,
    /^email$/i, /^ایمیل$/,
    // New patterns for board members and gazette
    /^board_member/i, /عضو.*هیئت/,
    /^last_gazette_/i, /روزنامه.*رسمی/,
    /^city$/i, /^شهر$/,
    /^website$/i, /وبسایت/,
    /^postal_code$/i, /کد.*پستی/,
    /^capital$/i, /سرمایه/,
    /company_type/i, /نوع.*شرکت/,
    /registration_date/i, /تاریخ.*ثبت/,
    /established_year/i, /سال.*تاسیس/
  ];

  // الگوهای متغیرهای محاسباتی  
  calculated = [
    /_words$/i, /_word$/i, /حروف$/,
    /contract_number/i, /شماره.*قرارداد/,
    /duration.*days/i, /مدت.*روز/,
    /total.*amount.*words/i, /مبلغ.*حروف/,
    /calc_/i, /محاسبه/
  ];

  // الگوهای متغیرهای سیستم
  system = [
    /^system_/i, /^سیستم_/,
    /current_date/i, /تاریخ.*جاری/,
    /user_name/i, /کاربر/,
    /contract_id/i, /شناسه.*قرارداد/
  ];

  // الگوهای متغیرهای ورود دستی کارمند
  manual = [
    /employee.*notes/i, /یادداشت.*کارشناس/,
    /internal.*reference/i, /مرجع.*داخلی/,
    /risk.*assessment/i, /ارزیابی.*ریسک/,
    /expert.*recommendation/i, /توصیه.*کارشناس/,
    /approval.*status/i, /وضعیت.*تأیید/,
    /reviewer.*comment/i, /نظر.*بررسی/
  ];

  // الگوهای نوع داده - مالی
  currency = [
    /amount/i, /مبلغ/,
    /price/i, /قیمت/,
    /cost/i, /هزینه/,
    /fee/i, /تعرفه/,
    /capital/i, /سرمایه/
  ];

  // الگوهای نوع داده - تاریخ
  date = [
    /date/i, /تاریخ/,
    /time/i, /زمان/,
    /_at$/i, /_on$/i
  ];

  // الگوهای نوع داده - ایمیل
  email = [
    /email/i, /ایمیل/,
    /mail/i, /پست.*الکترونیک/
  ];

  // الگوهای نوع داده - تلفن
  phone = [
    /phone/i, /تلفن/,
    /mobile/i, /موبایل/,
    /tel/i, /شماره.*تماس/
  ];

  // الگوهای نوع داده - عدد
  number = [
    /number/i, /شماره/,
    /count/i, /تعداد/,
    /id$/i, /کد$/i,
    /quantity/i, /مقدار/
  ];

  // الگوهای نوع داده - textarea
  textarea = [
    /description/i, /توضیحات/,
    /conditions/i, /شرایط/,
    /notes/i, /یادداشت/,
    /details/i, /جزئیات/,
    /content/i, /محتوا/
  ];

  // الگوهای متغیرهای اجباری
  required = [
    /contract.*subject/i, /موضوع.*قرارداد/,
    /total.*amount/i, /مبلغ.*کل/,
    /start.*date/i, /تاریخ.*شروع/,
    /end.*date/i, /تاریخ.*پایان/,
    /company.*name/i, /نام.*شرکت/
  ];
}

// ================================
// 🏭 SINGLETON INSTANCE  
// ================================

export const unifiedVariableManager = new UnifiedVariableManager();
