/**
 * ================================================
 * 🗺️ RASMIO FIELD MAPPING - CENTRAL SOURCE OF TRUTH
 * ================================================
 * 
 * این فایل تنها منبع معتبر برای نگاشت فیلدهای Rasmio است.
 * تمام بخش‌های سیستم باید از این mapping استفاده کنند.
 */

/**
 * ساختار استاندارد داده‌های Rasmio
 * این interface بر اساس API واقعی Rasmio تعریف شده است
 */
export interface RasmioCompanyData {
  // اطلاعات پایه
  title: string;                    // نام شرکت
  nationalId: string;               // شناسه ملی 11 رقمی
  registrationNumber?: string;      // شماره ثبت
  registrationDate?: string;        // تاریخ ثبت
  
  // اطلاعات تماس
  address?: string;                 // آدرس کامل
  city?: string;                    // شهر
  postalCode?: string;              // کد پستی
  phone?: string;                   // تلفن
  email?: string;                   // ایمیل
  website?: string;                 // وبسایت
  
  // اطلاعات مالی و قانونی
  capital?: number | string;        // سرمایه ثبت شده
  type?: string;                    // نوع شرکت (سهامی خاص، با مسئولیت محدود، ...)
  
  // اطلاعات تکمیلی
  establishedYear?: number;         // سال تاسیس
  status?: string;                  // وضعیت (فعال، غیرفعال، منحل شده)
  
  // اعضای هیئت مدیره و مدیران
  boardMembers?: Array<{
    name: string;
    position?: string;
    nationalId?: string;
  }>;
  
  // آگهی‌های روزنامه رسمی
  news?: Array<{
    title: string;
    newspaperDate?: string;
    newspaperNumber?: string;
    description?: string;
    capitalTo?: number;
  }>;
  
  // داده‌های خام (برای موارد خاص)
  [key: string]: any;
}

/**
 * ================================================
 * 📋 MAPPING TABLE - نگاشت متغیرها به فیلدهای Rasmio
 * ================================================
 */

/**
 * نگاشت اصلی متغیرها به فیلدهای Rasmio
 * 
 * Key: نام متغیر در قالب قرارداد
 * Value: نام فیلد در داده‌های Rasmio
 */
export const RASMIO_FIELD_MAPPING: Record<string, string> = {
  // نام شرکت
  'company_name': 'title',
  'beneficiary_company_name': 'title', // 🆕 برای مضمون‌عنه
  'name': 'title',

  // شناسه ملی
  'company_national_id': 'nationalId',
  'beneficiary_national_id': 'nationalId', // 🆕 برای مضمون‌عنه
  'national_id': 'nationalId',
  'nationalId': 'nationalId',

  // شماره ثبت
  'company_registration_number': 'registrationNumber',
  'beneficiary_registration_number': 'registrationNumber', // 🆕 برای مضمون‌عنه
  'registration_number': 'registrationNumber',
  'registrationNumber': 'registrationNumber',
  
  // تاریخ ثبت
  'registration_date': 'registrationDate',
  'company_registration_date': 'registrationDate',
  
  // آدرس
  'company_address': 'address',
  'address': 'address',
  
  // شهر
  'city': 'city',
  'company_city': 'city',
  
  // کد پستی
  'company_postal_code': 'postalCode',
  'postal_code': 'postalCode',
  'postalCode': 'postalCode',
  
  // تلفن
  'company_phone': 'phone',
  'phone': 'phone',
  
  // ایمیل
  'company_email': 'email',
  'email': 'email',
  
  // وبسایت
  'website': 'website',
  'company_website': 'website',
  
  // سرمایه
  'capital': 'capital',
  'company_capital': 'capital',
  
  // نوع شرکت
  'company_type': 'type',
  'type': 'type',
  
  // سال تاسیس
  'established_year': 'establishedYear',
  'company_established_year': 'establishedYear',
};

/**
 * ================================================
 * 🔍 EXTRACTION FUNCTIONS
 * ================================================
 */

/**
 * استخراج مقدار یک متغیر از داده‌های Rasmio
 * 
 * @param variableName - نام متغیر (مثلاً company_name)
 * @param rasmioData - داده‌های Rasmio (string یا object)
 * @returns مقدار متغیر یا null
 */
export function extractFromRasmio(
  variableName: string, 
  rasmioData: string | RasmioCompanyData | null | undefined
): string | null {
  if (!rasmioData) {
    return null;
  }

  try {
    // Parse JSON string to object
    const data: RasmioCompanyData = typeof rasmioData === 'string' 
      ? JSON.parse(rasmioData) 
      : rasmioData;

    if (!data || typeof data !== 'object') {
      return null;
    }

    // === اعضای هیئت مدیره (Board Members) ===
    if (variableName.startsWith('board_member_')) {
      const match = variableName.match(/^board_member_(\d+)_name$/);
      if (match && data.boardMembers && Array.isArray(data.boardMembers)) {
        const index = parseInt(match[1]) - 1;
        if (data.boardMembers[index]) {
          return data.boardMembers[index].name || null;
        }
      }
      
      // لیست کامل اعضا
      if (variableName === 'board_members_list' && data.boardMembers) {
        return data.boardMembers.map(m => m.name).join('، ');
      }
      
      // تعداد اعضا
      if (variableName === 'board_members_count' && data.boardMembers) {
        return data.boardMembers.length.toString();
      }
      
      return null;
    }

    // === آگهی‌های روزنامه رسمی (Gazette) ===
    if (variableName.startsWith('last_gazette_') || variableName.startsWith('gazette_')) {
      if (data.news && Array.isArray(data.news) && data.news.length > 0) {
        const lastNews = data.news[0];

        if (variableName === 'last_gazette_number' || variableName === 'gazette_number') {
          return lastNews.newspaperNumber || null;
        }
        if (variableName === 'last_gazette_date' || variableName === 'gazette_date') {
          return lastNews.newspaperDate || null;
        }
        if (variableName === 'gazette_page_number') { // 🆕 شماره صفحه روزنامه
          return (lastNews as any).pageNumber ? String((lastNews as any).pageNumber) : null;
        }
      }
      return null;
    }

    // === نگاشت مستقیم فیلدها ===
    const mappedField = RASMIO_FIELD_MAPPING[variableName];
    
    if (mappedField && data[mappedField] !== undefined && data[mappedField] !== null) {
      const value = data[mappedField];
      
      // فرمت کردن سرمایه به عدد با کاما
      if (mappedField === 'capital' && typeof value === 'number') {
        return value.toLocaleString('en-US');
      }
      
      return String(value);
    }

    // اگر mapping پیدا نشد، سعی می‌کنیم مستقیم از data بخونیم
    if (data[variableName] !== undefined && data[variableName] !== null) {
      return String(data[variableName]);
    }

    return null;

  } catch (error) {
    console.warn(`⚠️ Error extracting '${variableName}' from Rasmio data:`, error);
    return null;
  }
}

/**
 * استخراج چندین متغیر به صورت دسته‌ای
 * 
 * @param variableNames - آرایه نام متغیرها
 * @param rasmioData - داده‌های Rasmio
 * @returns Object شامل نام متغیر و مقدار آن
 */
export function extractMultipleFromRasmio(
  variableNames: string[], 
  rasmioData: string | RasmioCompanyData | null | undefined
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  
  for (const variableName of variableNames) {
    result[variableName] = extractFromRasmio(variableName, rasmioData);
  }
  
  return result;
}

/**
 * بررسی اینکه آیا یک متغیر از Rasmio قابل دریافت است
 * 
 * @param variableName - نام متغیر
 * @returns true اگر متغیر از Rasmio قابل دریافت باشد
 */
export function isRasmioVariable(variableName: string): boolean {
  // الگوهای متغیرهای Rasmio
  const rasmioPatterns = [
    /^company_/,
    /^beneficiary_(company_name|national_id|registration_number)$/,  // 🆕 برای مضمون‌عنه
    /^national_id$/,
    /^registration/,
    /^address$/,
    /^phone$/,
    /^email$/,
    /^capital$/,
    /^postal_code$/,
    /^city$/,
    /^website$/,
    /^established_year$/,
    /^type$/,
    /^board_member/,
    /^last_gazette/,
    /^gazette_(number|date|page_number)$/,  // 🆕 برای روزنامه رسمی
  ];

  // چک کردن mapping مستقیم
  if (RASMIO_FIELD_MAPPING[variableName]) {
    return true;
  }

  // چک کردن الگوها
  return rasmioPatterns.some(pattern => pattern.test(variableName));
}

/**
 * دریافت لیست تمام متغیرهای قابل دریافت از Rasmio
 * 
 * @returns آرایه نام متغیرهای Rasmio
 */
export function getAllRasmioVariables(): string[] {
  return Object.keys(RASMIO_FIELD_MAPPING);
}

/**
 * فرمت کردن داده‌های Rasmio برای نمایش
 * 
 * @param rasmioData - داده‌های Rasmio
 * @returns Object فرمت شده برای نمایش
 */
export function formatRasmioDataForDisplay(
  rasmioData: string | RasmioCompanyData | null | undefined
): Record<string, string> | null {
  if (!rasmioData) {
    return null;
  }

  try {
    const data: RasmioCompanyData = typeof rasmioData === 'string' 
      ? JSON.parse(rasmioData) 
      : rasmioData;

    return {
      'نام شرکت': data.title || '-',
      'شناسه ملی': data.nationalId || '-',
      'شماره ثبت': data.registrationNumber || '-',
      'آدرس': data.address || '-',
      'شهر': data.city || '-',
      'تلفن': data.phone || '-',
      'ایمیل': data.email || '-',
      'سرمایه': data.capital ? data.capital.toLocaleString() : '-',
      'نوع شرکت': data.type || '-',
    };
  } catch (error) {
    console.warn('Error formatting Rasmio data:', error);
    return null;
  }
}

/**
 * ================================================
 * 📊 VALIDATION FUNCTIONS
 * ================================================
 */

/**
 * اعتبارسنجی داده‌های Rasmio
 * 
 * @param rasmioData - داده‌های Rasmio
 * @returns true اگر داده‌ها معتبر باشند
 */
export function validateRasmioData(
  rasmioData: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rasmioData) {
    errors.push('داده‌های Rasmio موجود نیست');
    return { valid: false, errors };
  }

  try {
    const data: RasmioCompanyData = typeof rasmioData === 'string' 
      ? JSON.parse(rasmioData) 
      : rasmioData;

    // فیلدهای الزامی
    if (!data.title) {
      errors.push('نام شرکت موجود نیست');
    }
    if (!data.nationalId) {
      errors.push('شناسه ملی موجود نیست');
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push('فرمت داده‌های Rasmio نامعتبر است');
    return { valid: false, errors };
  }
}

/**
 * ================================================
 * 🔄 MIGRATION HELPERS
 * ================================================
 */

/**
 * تبدیل داده‌های قدیمی به فرمت جدید
 * این تابع برای backward compatibility است
 */
export function migrateOldRasmioData(oldData: any): RasmioCompanyData | null {
  if (!oldData) {
    return null;
  }

  try {
    // اگر از قبل فرمت جدید داشته باشد
    if (oldData.title && oldData.nationalId) {
      return oldData as RasmioCompanyData;
    }

    // تبدیل فرمت قدیمی به جدید
    return {
      title: oldData.name || oldData.title || oldData.companyName,
      nationalId: oldData.nationalId || oldData.nationalCode,
      registrationNumber: oldData.registrationNumber || oldData.regNumber,
      address: oldData.address,
      city: oldData.city,
      phone: oldData.phone,
      email: oldData.email,
      capital: oldData.capital,
      type: oldData.type || oldData.companyType,
      registrationDate: oldData.registrationDate,
      postalCode: oldData.postalCode,
      website: oldData.website,
      boardMembers: oldData.boardMembers || oldData.managers,
      news: oldData.news || oldData.gazette,
    };
  } catch (error) {
    console.warn('Error migrating old Rasmio data:', error);
    return null;
  }
}

