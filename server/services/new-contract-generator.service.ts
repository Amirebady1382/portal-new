import * as fs from 'fs/promises';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { contractFormData } from '../../shared/schema';
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import util from 'util';
import { numberToWords } from '../../shared/variable-utils';

const execAsync = util.promisify(exec);

export class NewContractGeneratorService {

  /**
   * Main entry point to generate the legal Guaranty Contract
   */
  async generateGuarantyContract(contractFormDataId: number): Promise<string> {
    // 1. Fetch Data via Drizzle ORM (JSON extraction)
    const data = await this.fetchContractData(contractFormDataId);

    // 2. Prepare Data (Persian Numbers & RTL formatting)
    const templateData = this.prepareTemplateData(data);

    // 3. Generate DOCX using Docxtemplater
    const docxPath = await this.generateDocxBuffer(templateData, data.template.filePath);

    // 4. Convert DOCX to PDF via Headless LibreOffice
    const pdfPath = await this.convertToPdf(docxPath);

    return pdfPath;
  }

  /**
   * Fetches data using Drizzle ORM, utilizing `with:` for related tables
   */
  private async fetchContractData(id: number) {
    const record = await db.query.contractFormData.findFirst({
      where: eq(contractFormData.id, id),
      with: {
        company: true,
        template: true,
      }
    });

    if (!record) throw new Error("Contract data not found");
    return record;
  }

  /**
   * Formats numbers to Persian words and applies RTL marks to prevent punctuation flipping
   */
  private prepareTemplateData(dbRecord: any) {
    const formData = dbRecord.formData || {};

    // Handle Guarantors Loop dynamically
    const guarantors = Array.isArray(formData.guarantors)
      ? formData.guarantors
      : [];

    const formattedGuarantors = guarantors.map((g: any, index: number) => ({
      index: index + 1,
      name: this.enforceRTL(g.name || ''),
      nationalId: g.nationalId,
      address: this.enforceRTL(g.address || '')
    }));

    return {
      companyName: this.enforceRTL(dbRecord.company.name),
      contractDate: this.enforceRTL(formData.date || ''),
      guaranteeAmountNumber: formData.guaranteeAmount,
      guaranteeAmountText: this.enforceRTL(numberToWords(formData.guaranteeAmount || 0)),
      guarantors: formattedGuarantors,
    };
  }

  /**
   * Generates the MS Word document using docxtemplater
   */
  private async generateDocxBuffer(templateData: any, templatePath: string): Promise<string> {
    const content = await fs.readFile(templatePath, 'binary');
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(templateData);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    const contractsDir = path.resolve(process.cwd(), 'uploads', 'contracts');
    await fs.mkdir(contractsDir, { recursive: true });

    const outputPath = path.resolve(contractsDir, `contract_${Date.now()}.docx`);
    await fs.writeFile(outputPath, buf);

    return outputPath;
  }

  /**
   * Converts the DOCX to PDF using LibreOffice via CLI
   */
  private async convertToPdf(docxPath: string): Promise<string> {
    const outputDir = path.dirname(docxPath);

    try {
      // Run the headless libreoffice command
      // In production (Docker), this assumes `soffice` is available and fonts are mounted.
      const { stdout, stderr } = await execAsync(
        `soffice --headless --convert-to pdf "${docxPath}" --outdir "${outputDir}"`
      );

      logger.info('PDF Conversion successful', 'contracts', { stdout });

      const pdfPath = docxPath.replace('.docx', '.pdf');
      return pdfPath;

    } catch (error) {
      logger.error('PDF Conversion failed', 'contracts', error);
      throw new Error('Failed to convert contract to PDF');
    }
  }

  // --- Utility Methods ---

  /**
   * Enforces RTL text direction by wrapping strings with RLM (Right-to-Left Mark)
   * This prevents parentheses () and slashes / from flipping in Persian contexts.
   */
  private enforceRTL(text: string): string {
    const RLM = '\u200F';
    return `${RLM}${text}${RLM}`;
  }
}

export const newContractGeneratorService = new NewContractGeneratorService();
