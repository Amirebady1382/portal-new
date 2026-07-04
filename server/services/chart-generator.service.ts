/**
 * سرویس تولید نمودارها برای گزارش‌های ارزیابی
 * برای پشتیبانی از جداول و نمودارها در گزارش‌های Word
 */

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar' | 'table';
  title: string;
  data: any[];
  labels?: string[];
  colors?: string[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
  title?: string;
}

export class ChartGeneratorService {
  
  /**
   * تبدیل داده‌های تحلیل AI به فرمت جدول برای Word
   */
  generateScoreTable(scores: {
    team: number;
    product: number;
    market: number;
    financial: number;
    risk: number;
    overall: number;
  }): TableData {
    // Validation و default values
    const safeScores = {
      team: this.validateScore(scores?.team),
      product: this.validateScore(scores?.product),
      market: this.validateScore(scores?.market),
      financial: this.validateScore(scores?.financial),
      risk: this.validateScore(scores?.risk),
      overall: this.validateScore(scores?.overall)
    };

    return {
      title: 'جدول امتیازات تحلیل',
      headers: ['بخش', 'امتیاز', 'وضعیت'],
      rows: [
        ['تیم و مدیریت', safeScores.team.toFixed(1), this.getScoreStatus(safeScores.team)],
        ['محصول و فناوری', safeScores.product.toFixed(1), this.getScoreStatus(safeScores.product)],
        ['بازار و رقابت', safeScores.market.toFixed(1), this.getScoreStatus(safeScores.market)],
        ['تحلیل مالی', safeScores.financial.toFixed(1), this.getScoreStatus(safeScores.financial)],
        ['ارزیابی ریسک', safeScores.risk.toFixed(1), this.getScoreStatus(safeScores.risk)],
        ['امتیاز کلی', safeScores.overall.toFixed(1), this.getScoreStatus(safeScores.overall)]
      ]
    };
  }

  /**
   * اعتبارسنجی امتیاز
   */
  private validateScore(score: number | undefined | null): number {
    if (score === undefined || score === null || isNaN(score) || !isFinite(score)) {
      return 0;
    }
    if (score < 0) return 0;
    if (score > 10) return 10;
    return score;
  }

  /**
   * تبدیل جدول به فرمت Word XML
   */
  tableToWordXML(tableData: TableData): string {
    let xml = '<w:tbl>';
    
    // Table properties
    xml += `
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
      </w:tblPr>
    `;
    
    // Header row
    if (tableData.headers && tableData.headers.length > 0) {
      xml += '<w:tr>';
      xml += '<w:trPr><w:tblHeader/></w:trPr>'; // Mark as header row
      
      for (const header of tableData.headers) {
        xml += `
          <w:tc>
            <w:tcPr>
              <w:shd w:val="clear" w:color="auto" w:fill="4472C4"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t>${this.escapeXml(header)}</w:t>
              </w:r>
            </w:p>
          </w:tc>
        `;
      }
      
      xml += '</w:tr>';
    }
    
    // Data rows
    for (const row of tableData.rows) {
      xml += '<w:tr>';
      
      for (const cell of row) {
        xml += `
          <w:tc>
            <w:p>
              <w:pPr>
                <w:jc w:val="right"/>
              </w:pPr>
              <w:r>
                <w:t>${this.escapeXml(cell)}</w:t>
              </w:r>
            </w:p>
          </w:tc>
        `;
      }
      
      xml += '</w:tr>';
    }
    
    xml += '</w:tbl>';
    
    return xml;
  }

  /**
   * ایجاد جدول مقایسه‌ای
   */
  generateComparisonTable(data: Array<{ label: string; current: string; target: string; status: string }>): TableData {
    return {
      title: 'جدول مقایسه شاخص‌ها',
      headers: ['شاخص', 'وضعیت فعلی', 'هدف', 'وضعیت'],
      rows: data.map(item => [item.label, item.current, item.target, item.status])
    };
  }

  /**
   * ایجاد جدول تایم‌لاین
   */
  generateTimelineTable(milestones: Array<{ date: string; event: string; status: string }>): TableData {
    return {
      title: 'جدول برنامه زمانی',
      headers: ['تاریخ', 'رویداد', 'وضعیت'],
      rows: milestones.map(m => [m.date, m.event, m.status])
    };
  }

  /**
   * ایجاد جدول نقاط قوت و ضعف
   */
  generateSWOTTable(strengths: string[], weaknesses: string[], opportunities: string[], threats: string[]): TableData {
    const maxLength = Math.max(strengths.length, weaknesses.length, opportunities.length, threats.length);
    
    const rows: string[][] = [];
    for (let i = 0; i < maxLength; i++) {
      rows.push([
        strengths[i] || '',
        weaknesses[i] || '',
        opportunities[i] || '',
        threats[i] || ''
      ]);
    }
    
    return {
      title: 'تحلیل SWOT',
      headers: ['نقاط قوت', 'نقاط ضعف', 'فرصت‌ها', 'تهدیدها'],
      rows
    };
  }

  /**
   * ایجاد جدول برای اطلاعات مالی
   */
  generateFinancialTable(data: {
    revenue?: string;
    costs?: string;
    profit?: string;
    margin?: string;
    growth?: string;
  }): TableData {
    const rows: string[][] = [];
    
    if (data.revenue) rows.push(['درآمد', data.revenue]);
    if (data.costs) rows.push(['هزینه‌ها', data.costs]);
    if (data.profit) rows.push(['سود', data.profit]);
    if (data.margin) rows.push(['حاشیه سود', data.margin]);
    if (data.growth) rows.push(['نرخ رشد', data.growth]);
    
    return {
      title: 'اطلاعات مالی',
      headers: ['شاخص', 'مقدار'],
      rows
    };
  }

  /**
   * دریافت وضعیت بر اساس امتیاز
   */
  private getScoreStatus(score: number): string {
    if (score >= 9) return '🟢 عالی';
    if (score >= 7) return '🟡 خوب';
    if (score >= 5) return '🟠 متوسط';
    if (score >= 3) return '🔴 ضعیف';
    return '⛔ بسیار ضعیف';
  }

  /**
   * Escape XML characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * تبدیل داده به فرمت ASCII chart (برای متن ساده)
   */
  generateASCIIBarChart(data: { label: string; value: number }[], maxWidth: number = 50): string {
    const maxValue = Math.max(...data.map(d => d.value));
    let chart = '';
    
    for (const item of data) {
      const barWidth = Math.round((item.value / maxValue) * maxWidth);
      const bar = '█'.repeat(barWidth) + '░'.repeat(maxWidth - barWidth);
      chart += `${item.label.padEnd(20)} ${bar} ${item.value}\n`;
    }
    
    return chart;
  }

  /**
   * تولید جدول HTML برای پیش‌نمایش
   */
  generateHTMLTable(tableData: TableData): string {
    let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    
    // Title
    if (tableData.title) {
      html += `<caption style="font-weight: bold; margin-bottom: 10px;">${tableData.title}</caption>`;
    }
    
    // Headers
    if (tableData.headers && tableData.headers.length > 0) {
      html += '<thead><tr>';
      for (const header of tableData.headers) {
        html += `<th style="background-color: #4472C4; color: white; padding: 8px; text-align: center;">${header}</th>`;
      }
      html += '</tr></thead>';
    }
    
    // Rows
    html += '<tbody>';
    for (const row of tableData.rows) {
      html += '<tr>';
      for (const cell of row) {
        html += `<td style="padding: 8px; text-align: right;">${cell}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
    
    html += '</table>';
    return html;
  }

  /**
   * درج جدول در موقعیت مشخص در سند Word
   */
  insertTableInDocument(documentXML: string, placeholder: string, tableXML: string): string {
    // Find the placeholder and replace with table
    const placeholderPattern = new RegExp(`<w:t[^>]*>${this.escapeRegex(placeholder)}</w:t>`, 'g');
    
    if (placeholderPattern.test(documentXML)) {
      // Replace the entire paragraph containing the placeholder with the table
      const paragraphPattern = new RegExp(
        `<w:p[^>]*>.*?<w:t[^>]*>${this.escapeRegex(placeholder)}</w:t>.*?</w:p>`,
        's'
      );
      
      return documentXML.replace(paragraphPattern, tableXML);
    }
    
    return documentXML;
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const chartGeneratorService = new ChartGeneratorService();

