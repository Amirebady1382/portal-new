/**
 * کتابخانه ابزارهای یکپارچه برای مدیریت متغیرهای قرارداد
 * استفاده در هر دو سمت client و server
 */

export type VariableType = 'text' | 'number' | 'date' | 'currency' | 'email' | 'phone' | 'textarea' | 'boolean' | 'select';
export type VariableSource = 'rasmio' | 'form' | 'manual' | 'calculated' | 'system' | 'missing';
export type VariableCategory = 'company' | 'financial' | 'dates' | 'personal' | 'legal' | 'technical' | 'other';

// ================================
// 🎯 PATTERN DEFINITIONS  
// ================================

export const VARIABLE_PATTERNS = {
  // الگوهای متغیرهای رسمیو
  rasmio: [
    /^company_/i, /^شرکت_/,
    /^beneficiary_(company_name|national_id|registration_number|registration_office)$/i, // 🆕 مضمون‌عنه
    /^gazette_/i, /^last_gazette_/i, /روزنامه.*رسمی/i, // 🆕 روزنامه رسمی
    /company.*name/i, /نام.*شرکت/,
    /company.*address/i, /آدرس.*شرکت/,
    /national.*id/i, /شناسه.*ملی/, /کد.*ملی/,
    /registration.*number/i, /شماره.*ثبت/,
    /^name$/i, /^نام$/,
    /^address$/i, /^آدرس$/,
    /^phone$/i, /^تلفن$/,
    /^email$/i, /^ایمیل$/,
    /postal.*code/i, /کد.*پستی/, /کدپستی/
  ],

  // الگوهای متغیرهای محاسباتی  
  calculated: [
    /_words$/i, /_word$/i, /حروف$/,
    /contract_number/i, /شماره.*قرارداد/,
    /duration.*days/i, /مدت.*روز/,
    /total.*amount.*words/i, /مبلغ.*حروف/,
    /calc_/i, /محاسبه/,
    /^current_date$/i, /تاریخ.*امروز/
  ],

  // الگوهای متغیرهای سیستم
  system: [
    /^system_/i, /^سیستم_/,
    /current_date/i, /تاریخ.*جاری/,
    /user_name/i, /کاربر/,
    /contract_id/i, /شناسه.*قرارداد/,
    /generated_/i
  ],

  // الگوهای متغیرهای ورود دستی کارمند
  manual: [
    /employee.*notes/i, /یادداشت.*کارشناس/,
    /internal.*reference/i, /مرجع.*داخلی/,
    /risk.*assessment/i, /ارزیابی.*ریسک/,
    /expert.*recommendation/i, /توصیه.*کارشناس/,
    /approval.*status/i, /وضعیت.*تأیید/,
    /reviewer.*comment/i, /نظر.*بررسی/
  ],

  // الگوهای نوع داده - مالی
  currency: [
    /amount/i, /مبلغ/,
    /price/i, /قیمت/,
    /cost/i, /هزینه/,
    /fee/i, /تعرفه/,
    /capital/i, /سرمایه/,
    /budget/i, /بودجه/
  ],

  // الگوهای نوع داده - تاریخ
  date: [
    /date/i, /تاریخ/,
    /time/i, /زمان/,
    /_at$/i, /_on$/i,
    /start.*date/i, /end.*date/i,
    /expire/i, /انقضا/
  ],

  // الگوهای نوع داده - ایمیل
  email: [
    /email/i, /ایمیل/,
    /mail/i, /پست.*الکترونیک/
  ],

  // الگوهای نوع داده - تلفن
  phone: [
    /phone/i, /تلفن/,
    /mobile/i, /موبایل/,
    /tel/i, /شماره.*تماس/,
    /contact/i
  ],

  // الگوهای نوع داده - عدد
  number: [
    /number/i, /شماره/,
    /count/i, /تعداد/,
    /id$/i, /کد$/i,
    /quantity/i, /مقدار/,
    /index/i, /ایندکس/
  ],

  // الگوهای نوع داده - textarea
  textarea: [
    /description/i, /توضیحات/,
    /conditions/i, /شرایط/,
    /notes/i, /یادداشت/,
    /details/i, /جزئیات/,
    /content/i, /محتوا/,
    /comment/i, /نظر/,
    /reason/i, /دلیل/
  ],

  // الگوهای متغیرهای اجباری
  required: [
    /contract.*subject/i, /موضوع.*قرارداد/,
    /total.*amount/i, /مبلغ.*کل/,
    /start.*date/i, /تاریخ.*شروع/,
    /end.*date/i, /تاریخ.*پایان/,
    /company.*name/i, /نام.*شرکت/,
    /subject/i, /موضوع/
  ]
};

// ================================
// 🎯 CORE DETECTION FUNCTIONS
// ================================

/**
 * تشخیص منبع داده متغیر
 */
export function getVariableSource(variableName: string): VariableSource {
  const lowerName = variableName.toLowerCase();

  // بررسی الگوهای رسمیو
  if (VARIABLE_PATTERNS.rasmio.some(pattern => pattern.test(lowerName))) {
    return 'rasmio';
  }

  // بررسی الگوهای محاسباتی
  if (VARIABLE_PATTERNS.calculated.some(pattern => pattern.test(lowerName))) {
    return 'calculated';
  }

  // بررسی الگوهای سیستم
  if (VARIABLE_PATTERNS.system.some(pattern => pattern.test(lowerName))) {
    return 'system';
  }

  // بررسی الگوهای ورود دستی کارمند
  if (VARIABLE_PATTERNS.manual.some(pattern => pattern.test(lowerName))) {
    return 'manual';
  }

  // پیش‌فرض: فرم ورودی
  return 'form';
}

/**
 * تشخیص نوع داده متغیر
 */
export function getVariableType(variableName: string): VariableType {
  const lowerName = variableName.toLowerCase();

  // بررسی الگوها به ترتیب اولویت
  if (VARIABLE_PATTERNS.currency.some(pattern => pattern.test(lowerName))) {
    return 'currency';
  }
  
  if (VARIABLE_PATTERNS.date.some(pattern => pattern.test(lowerName))) {
    return 'date';
  }
  
  if (VARIABLE_PATTERNS.email.some(pattern => pattern.test(lowerName))) {
    return 'email';
  }
  
  if (VARIABLE_PATTERNS.phone.some(pattern => pattern.test(lowerName))) {
    return 'phone';
  }
  
  if (VARIABLE_PATTERNS.textarea.some(pattern => pattern.test(lowerName))) {
    return 'textarea';
  }
  
  if (VARIABLE_PATTERNS.number.some(pattern => pattern.test(lowerName))) {
    return 'number';
  }

  // پیش‌فرض: متن
  return 'text';
}

/**
 * تشخیص دسته‌بندی متغیر
 */
export function getVariableCategory(variableName: string, source: VariableSource): VariableCategory {
  const lowerName = variableName.toLowerCase();

  // بر اساس منبع
  if (source === 'rasmio') return 'company';
  if (source === 'system') return 'technical';

  // بر اساس نام
  if (VARIABLE_PATTERNS.currency.some(pattern => pattern.test(lowerName))) {
    return 'financial';
  }
  
  if (VARIABLE_PATTERNS.date.some(pattern => pattern.test(lowerName))) {
    return 'dates';
  }
  
  if (VARIABLE_PATTERNS.email.some(pattern => pattern.test(lowerName)) ||
      VARIABLE_PATTERNS.phone.some(pattern => pattern.test(lowerName))) {
    return 'personal';
  }
  
  if (/legal|law|contract|agreement/i.test(lowerName)) {
    return 'legal';
  }

  return 'other';
}

/**
 * تشخیص اجباری بودن متغیر
 */
export function isVariableRequired(variableName: string, source: VariableSource): boolean {
  // متغیرهای رسمیو، محاسباتی و سیستم اجباری نیستند چون خودکار پر می‌شوند
  if (source !== 'form') {
    return false;
  }

  const lowerName = variableName.toLowerCase();
  return VARIABLE_PATTERNS.required.some(pattern => pattern.test(lowerName));
}

// ================================
// 🏷️ LABELS & DESCRIPTIONS
// ================================

/**
 * تولید برچسب فارسی برای متغیر
 */
export function getVariableLabel(variableName: string): string {
  const translations: Record<string, string> = {
    // Company info
    'company_name': 'نام شرکت',
    'company_national_id': 'شناسه ملی شرکت', 
    'company_registration_number': 'شماره ثبت شرکت',
    'company_address': 'آدرس شرکت',
    'company_phone': 'تلفن شرکت',
    'company_email': 'ایمیل شرکت',
    'company_postal_code': 'کد پستی شرکت',
    'company_representative': 'نماینده قانونی شرکت',
    'representative_national_id': 'کد ملی نماینده',
    
    // Contract info
    'contract_type': 'نوع قرارداد',
    'contract_subject': 'موضوع قرارداد',
    'contract_number': 'شماره قرارداد',
    'contract_date': 'تاریخ قرارداد',
    'contract_id': 'شناسه قرارداد',
    
    // Financial
    'total_amount': 'مبلغ کل',
    'total_amount_words': 'مبلغ کل (به حروف)',
    'advance_amount': 'مبلغ پیش‌پرداخت',
    'remaining_amount': 'مبلغ باقیمانده',
    
    // Dates
    'start_date': 'تاریخ شروع',
    'end_date': 'تاریخ پایان',
    'duration_days': 'مدت قرارداد (روز)',
    'current_date': 'تاریخ جاری',
    'signature_date': 'تاریخ امضا',
    
    // Other
    'guarantees_description': 'شرح تضامین',
    'special_conditions': 'شرایط خاص',
    'fund_representative': 'نماینده صندوق',
    'company_signature': 'امضای شرکت',
    'fund_signature': 'امضای صندوق'
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
 * تولید placeholder فارسی مناسب برای متغیر
 */
export function getVariablePlaceholder(variableName: string, type: VariableType): string {
  const customPlaceholders: Record<string, string> = {
    // اطلاعات شرکت (Rasmio)
    'company_name': 'نام کامل شرکت - خودکار از رسمیو',
    'company_national_id': 'شناسه ملی 11 رقمی - خودکار',
    'national_id': 'شناسه ملی - خودکار',
    'company_registration_number': 'شماره ثبت - خودکار از رسمیو',
    'registration_number': 'شماره ثبت - خودکار',
    'company_address': 'آدرس کامل - خودکار از رسمیو',
    'address': 'آدرس - خودکار',
    'company_phone': 'تلفن - خودکار از رسمیو',
    'phone': '021-12345678 - خودکار',
    'company_email': 'ایمیل - خودکار از رسمیو',
    'email': 'info@company.com - خودکار',
    'capital': 'سرمایه - خودکار از رسمیو',
    'city': 'شهر - خودکار',
    'postal_code': 'کد پستی - خودکار',
    
    // اطلاعات قرارداد (Form)
    'contract_type': 'نوع قرارداد (ضمانت‌نامه، سرمایه‌گذاری، وام)',
    'contract_subject': 'موضوع قرارداد (مثال: سرمایه‌گذاری در پروژه فناوری)',
    'contract_number': 'GF-2025-001 - خودکار',
    
    // مبالغ مالی (Form)
    'total_amount': 'مبلغ کل به ریال (مثال: 1000000000)',
    'guarantee_amount': 'مبلغ ضمانت‌نامه به ریال',
    'cash_deposit_amount': 'مبلغ سپرده نقدی به ریال',
    'commission_rate': 'نرخ کمیسیون (مثال: 2)',
    'commission_amount': 'محاسبه خودکار از نرخ',
    'annual_fee_numbers': 'محاسبه خودکار',
    
    // تاریخ‌ها (Form/System)
    'start_date': 'تاریخ شروع (مثال: 1403/01/01)',
    'end_date': 'تاریخ پایان (مثال: 1404/01/01)',
    'contract_date': 'تاریخ تنظیم - خودکار',
    'current_date': 'تاریخ امروز - خودکار',
    'duration_days': '365 روز - محاسبه خودکار',
    
    // اطلاعات نماینده (Form)
    'company_representative_name': 'نام و نام خانوادگی نماینده شرکت',
    'company_representative_national_id': 'کد ملی 10 رقمی نماینده',
    'company_representative_father_name': 'نام پدر نماینده',
    'company_representative_birth_date': 'تاریخ تولد (مثال: 1360/05/15)',
    'company_representative_position': 'سمت (مدیرعامل، رئیس هیئت مدیره)',
    
    // حق امضاداران (Form/Rasmio)
    'signatory_1_name': 'نام حق امضای اول',
    'signatory_1_national_id': 'کد ملی 10 رقمی',
    'signatory_1_position': 'سمت (مدیرعامل، عضو هیئت مدیره)',
    'signatory_2_name': 'نام حق امضای دوم (اختیاری)',
    'signatory_2_national_id': 'کد ملی 10 رقمی (اختیاری)',
    'signatory_2_position': 'سمت (عضو هیئت مدیره)',
    
    // متغیرهای محاسباتی (Calculated)
    'total_amount_words': 'محاسبه خودکار - مبلغ به حروف',
    'guarantee_amount_words': 'محاسبه خودکار - ضمانت به حروف',
    'commission_amount_words': 'محاسبه خودکار - کمیسیون به حروف',
    'cash_deposit_amount_words': 'محاسبه خودکار - سپرده به حروف',
    'cash_deposit_percentage': 'محاسبه خودکار - درصد سپرده',
    'annual_fee_words': 'محاسبه خودکار - هزینه سالانه به حروف',
    
    // متغیرهای صندوق (System)
    'fund_name': 'نام صندوق - خودکار از تنظیمات',
    'fund_address': 'آدرس صندوق - خودکار از تنظیمات',
    'fund_phone': 'تلفن صندوق - خودکار',
    'fund_email': 'ایمیل صندوق - خودکار',
    'fund_registration_number': 'شماره ثبت صندوق - خودکار',
    'fund_national_id': 'شناسه ملی صندوق - خودکار',
    'fund_representative_name': 'نام نماینده صندوق - خودکار',
    'fund_representative_position': 'سمت نماینده صندوق - خودکار',
    
    // سایر (Form)
    'employee_notes': 'یادداشت و نکات کارشناسی',
    'internal_reference_number': 'شماره مرجع داخلی (مثال: REF-2025-001)',
    'risk_assessment': 'ارزیابی ریسک‌ها و نکات مهم',
    'expert_recommendation': 'توصیه‌ها و نظرات کارشناسی',
    'approval_status': 'تأیید شده / در انتظار / رد شده',
    
    // قراردادها
    'guarantees_description': 'شرح کامل تضامین و ضمانت‌نامه‌ها',
    'special_conditions': 'شرایط و مقررات خاص این قرارداد'
  };

  if (customPlaceholders[variableName]) {
    return customPlaceholders[variableName];
  }

  // بر اساس نوع
  const typePlaceholders: Record<VariableType, string> = {
    'text': 'متن را وارد کنید',
    'number': 'عدد را وارد کنید', 
    'currency': 'مبلغ به ریال (مثال: 1000000)',
    'date': 'تاریخ شمسی (مثال: 1403/01/01)',
    'email': 'ایمیل (مثال: info@company.com)',
    'phone': 'شماره تلفن (مثال: 021-12345678)',
    'textarea': 'متن تفصیلی را در چند خط وارد کنید',
    'boolean': 'بله یا خیر',
    'select': 'از لیست انتخاب کنید'
  };

  return typePlaceholders[type] || 'مقدار را وارد کنید';
}

/**
 * تولید مقدار پیش‌فرض برای متغیرها
 */
export function getDefaultValue(variableName: string): string {
  const defaults: Record<string, string> = {
    'contract_date': new Date().toISOString().split('T')[0],
    'current_date': new Date().toLocaleDateString('fa-IR'),
    'fund_representative': 'دانیال صابر سمیعی',
    'contract_number': '', // خودکار تولید می‌شود
  };

  return defaults[variableName] || '';
}

// ================================
// 🏢 COMPANY DATA EXTRACTION
// ================================

export interface CompanyData {
  id: number;
  name: string;
  nationalId: string;
  registrationNumber: string;
  registrationDate?: string;
  address: string;
  city?: string;
  phone: string;
  email: string;
  website?: string;
  postalCode: string;
  capital?: string;
  type?: string;
  establishedYear?: number;
  employeeCount?: number;
  // JSON fields
  signatories?: string; // JSON: [{name, nationalId, position}]
  teamInfo?: string; // JSON: {members: [...]}
  rasmioData?: string; // JSON: {boardMembers, news, ...}
}

/**
 * استخراج مقدار از داده‌های شرکت
 */
export function getCompanyDataValue(variableName: string, company: CompanyData | null): string {
  if (!company) {
    return '';
  }

  // اول سعی می‌کنیم از Rasmio بخونیم (اگر موجود باشه)
  if (company.rasmioData) {
    try {
      // استفاده از Node.js require فقط در سمت سرور
      if (typeof require !== 'undefined') {
        const { extractFromRasmio } = require('../server/utils/rasmio-field-mapping');
        const rasmioValue = extractFromRasmio(variableName, company.rasmioData);
        if (rasmioValue) {
          return rasmioValue;
        }
      }
    } catch (error) {
      // در صورت خطا، ادامه می‌دهیم با logic قدیمی
      console.warn('Could not use central Rasmio mapping:', error);
    }
  }

  // === Signatories (حق امضاداران) ===
  if (variableName.startsWith('signatory_')) {
    try {
      const signatories = company.signatories ? JSON.parse(company.signatories) : [];
      const match = variableName.match(/^signatory_(\d+)_(name|national_id|position)$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const field = match[2];
        if (signatories[index]) {
          const fieldMap: Record<string, string> = {
            'name': 'name',
            'national_id': 'nationalId',
            'position': 'position'
          };
          return signatories[index][fieldMap[field]] || '';
        }
      }
    } catch (e) {
      console.warn('Error parsing signatories:', e);
    }
    return '';
  }

  // === Team Members (اعضای تیم) ===
  if (variableName.startsWith('team_member_')) {
    try {
      const teamInfo = company.teamInfo ? JSON.parse(company.teamInfo) : {};
      const members = teamInfo.members || [];
      const match = variableName.match(/^team_member_(\d+)_(name|position)$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const field = match[2];
        if (members[index]) {
          return members[index][field] || '';
        }
      }
    } catch (e) {
      console.warn('Error parsing teamInfo:', e);
    }
    return '';
  }

  // === Board Members (اعضای هیئت مدیره) ===
  if (variableName.startsWith('board_member')) {
    try {
      const rasmioData = company.rasmioData ? JSON.parse(company.rasmioData) : {};
      const boardMembers = rasmioData.boardMembers || [];
      
      if (variableName === 'board_members_list') {
        return boardMembers.join('، ');
      }
      if (variableName === 'board_members_count') {
        return boardMembers.length.toString();
      }
      
      const match = variableName.match(/^board_member_(\d+)_name$/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        return boardMembers[index] || '';
      }
    } catch (e) {
      console.warn('Error parsing rasmioData for board members:', e);
    }
    return '';
  }

  // === Gazette (روزنامه رسمی) ===
  if (variableName.startsWith('last_gazette_') || variableName.startsWith('gazette_')) {
    try {
      const rasmioData = company.rasmioData ? JSON.parse(company.rasmioData) : {};
      const news = rasmioData.news || [];

      if (news.length > 0) {
        // Sort by newspaperDate (correct field name from Rasmio API)
        const sortedNews = [...news].sort((a, b) => {
          const dateA = new Date(a.newspaperDate || 0).getTime();
          const dateB = new Date(b.newspaperDate || 0).getTime();
          return dateB - dateA;
        });

        const lastNews = sortedNews[0];

        if (variableName === 'last_gazette_number' || variableName === 'gazette_number') {
          return lastNews.newspaperNumber || '';
        }
        if (variableName === 'last_gazette_date' || variableName === 'gazette_date') {
          return lastNews.newspaperDate || '';
        }
        if (variableName === 'gazette_page_number') {
          return lastNews.pageNumber ? String(lastNews.pageNumber) : '';
        }
      }
    } catch (e) {
      console.warn('Error parsing rasmioData for gazette:', e);
    }
    return '';
  }

  // نگاشت مستقیم نام‌های متغیر به فیلدهای شرکت
  const directMapping: Record<string, string> = {
    // انگلیسی - basic
    'company_name': 'name',
    'name': 'name',
    'company_national_id': 'nationalId',
    'national_id': 'nationalId',
    'nationalId': 'nationalId',
    'company_registration_number': 'registrationNumber',
    'registration_number': 'registrationNumber',
    'registrationNumber': 'registrationNumber',
    'registration_date': 'registrationDate',
    'company_address': 'address',
    'address': 'address',
    'city': 'city',
    'company_phone': 'phone',
    'phone': 'phone',
    'company_email': 'email',
    'email': 'email',
    'website': 'website',
    'company_postal_code': 'postalCode',
    'postal_code': 'postalCode',
    'postalCode': 'postalCode',
    'capital': 'capital',
    'company_type': 'type',
    'established_year': 'establishedYear',
    'employee_count': 'employeeCount',
    // فارسی
    'نام_شرکت': 'name',
    'شناسه_ملی': 'nationalId',
    'شماره_ثبت': 'registrationNumber',
    'آدرس': 'address',
    'تلفن': 'phone',
    'ایمیل': 'email',
    'کد_پستی': 'postalCode'
  };

  // بررسی نگاشت مستقیم
  const directField = directMapping[variableName.toLowerCase()];
  if (directField) {
    const value = (company as any)[directField];
    return value ? String(value) : '';
  }

  // نگاشت با الگوهای regex
  const mappingPatterns: Array<{ regex: RegExp, field: string }> = [
    { regex: /company.*name|name.*company|^name$/i, field: 'name' },
    { regex: /company.*national|national.*id|شناسه.*ملی|کد.*ملی/i, field: 'nationalId' },
    { regex: /registration.*number|شماره.*ثبت|کد.*ثبت/i, field: 'registrationNumber' },
    { regex: /company.*address|^address$|آدرس|نشانی/i, field: 'address' },
    { regex: /company.*phone|^phone$|تلفن|شماره.*تماس/i, field: 'phone' },
    { regex: /company.*email|^email$|ایمیل|پست.*الکترونیک/i, field: 'email' },
    { regex: /postal.*code|کد.*پستی|کدپستی/i, field: 'postalCode' }
  ];

  // پیدا کردن فیلد مناسب براساس الگو
  const matchingPattern = mappingPatterns.find(pattern => pattern.regex.test(variableName));
  
  if (matchingPattern) {
    const value = (company as any)[matchingPattern.field];
    return value ? String(value) : '';
  }

  return '';
}

// ================================
// 🧮 CALCULATED VALUES
// ================================

/**
 * محاسبه مقدار متغیرهای محاسباتی
 */
export function calculateVariableValue(variableName: string, data: Record<string, any>): string {
  switch (variableName) {
    case 'total_amount_words':
      return numberToWords(parseInt(data.total_amount) || 0);
      
    case 'duration_days':
      if (data.start_date && data.end_date) {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)).toString();
      }
      return '';
      
    case 'contract_number':
      return generateContractNumber();
      
    case 'current_date':
      return new Date().toLocaleDateString('fa-IR');
      
    default:
      return '';
  }
}

/**
 * تولید شماره قرارداد
 */
export function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}${month}${day}-${random}`;
}

/**
 * تبدیل عدد به حروف فارسی (ساده)
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'صفر';
  
  // پیاده‌سازی ساده - در آینده باید کامل‌تر شود
  return num.toLocaleString('fa-IR') + ' ریال';
}

// ================================
// 🔧 UTILITY FUNCTIONS
// ================================

/**
 * پاکسازی نام متغیر
 */
export function sanitizeVariableName(name: string): string {
  return name
    .trim()
    .replace(/-/g, '_') // Replace hyphens with underscores
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9_\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * بررسی معتبر بودن نام متغیر
 */
export function isValidVariableName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name.length > 100) return false;
  if (name.includes('<') || name.includes('>')) return false;
  if (/^\s*$/.test(name)) return false;
  
  return true;
}

/**
 * فرمت کردن مقدار برای نمایش
 */
export function formatVariableValue(value: any, variableName: string, type: VariableType): string {
  if (value === null || value === undefined) {
    return '';
  }

  // فرمت‌های خاص بر اساس نوع
  switch (type) {
    case 'currency':
      if (typeof value === 'number') {
        return value.toLocaleString('fa-IR') + ' ریال';
      }
      break;
      
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('fa-IR');
      }
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(value).toLocaleDateString('fa-IR');
      }
      break;
      
    case 'phone':
      // فرمت تلفن ایرانی
      if (typeof value === 'string' && value.match(/^09\d{9}$/)) {
        return value.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
      }
      break;
  }

  return String(value);
}

/**
 * اعتبارسنجی مقدار متغیر
 */
export function validateVariableValue(value: any, variableName: string, type: VariableType, required: boolean): { 
  valid: boolean; 
  error?: string; 
} {
  // بررسی اجباری بودن
  if (required && (!value || String(value).trim() === '')) {
    return { valid: false, error: 'این فیلد اجباری است' };
  }

  if (!value) {
    return { valid: true }; // مقدار خالی مجاز است (اگر اجباری نباشد)
  }

  const stringValue = String(value);

  // اعتبارسنجی بر اساس نوع
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return { valid: false, error: 'فرمت ایمیل نامعتبر است' };
      }
      break;
      
    case 'phone':
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(stringValue.replace(/[-\s]/g, ''))) {
        return { valid: false, error: 'شماره تلفن باید ۱۱ رقم و با ۰۹ شروع شود' };
      }
      break;
      
    case 'currency':
    case 'number':
      if (isNaN(Number(stringValue))) {
        return { valid: false, error: 'مقدار باید عدد باشد' };
      }
      if (type === 'currency' && Number(stringValue) < 0) {
        return { valid: false, error: 'مبلغ نمی‌تواند منفی باشد' };
      }
      break;
      
    case 'date':
      if (stringValue && !Date.parse(stringValue)) {
        return { valid: false, error: 'فرمت تاریخ نامعتبر است' };
      }
      break;
  }

  return { valid: true };
}
