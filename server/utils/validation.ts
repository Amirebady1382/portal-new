/**
 * Validation Utilities
 * توابع کمکی برای اعتبارسنجی داده‌ها
 */

/**
 * اعتبارسنجی شماره موبایل ایرانی
 * فرمت: 09xxxxxxxxx (11 رقم)
 */
export function validateIranianMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  // حذف کاراکترهای اضافی
  const cleanPhone = phone.toString().replace(/[\s\-()]/g, '');
  
  // بررسی فرمت: 09xxxxxxxxx
  const mobileRegex = /^09\d{9}$/;
  
  return mobileRegex.test(cleanPhone);
}

/**
 * نرمال‌سازی شماره موبایل ایرانی
 * خروجی: 09xxxxxxxxx
 */
export function normalizeIranianMobile(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // حذف کاراکترهای اضافی
  const cleanPhone = phone.toString().replace(/[\s\-()]/g, '');
  
  // اگر با 9 شروع می‌شود، 0 اضافه کن
  if (cleanPhone.length === 10 && cleanPhone.startsWith('9')) {
    return '0' + cleanPhone;
  }
  
  // اگر با +98 شروع می‌شود، به 09 تبدیل کن
  if (cleanPhone.startsWith('+98') && cleanPhone.length === 13) {
    return '0' + cleanPhone.substring(3);
  }
  
  if (cleanPhone.startsWith('98') && cleanPhone.length === 12) {
    return '0' + cleanPhone.substring(2);
  }
  
  // اگر already صحیح است
  if (validateIranianMobile(cleanPhone)) {
    return cleanPhone;
  }
  
  return null;
}

/**
 * فرمت کردن شماره موبایل برای نمایش
 * خروجی: 0912-345-6789
 */
export function formatIranianMobile(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizeIranianMobile(phone);
  if (!normalized) return phone;
  
  // فرمت: 0912-345-6789
  return normalized.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
}

/**
 * اعتبارسنجی کد ملی ایرانی
 */
export function validateIranianNationalId(nationalId: string | null | undefined): boolean {
  if (!nationalId) return false;
  
  const cleanId = nationalId.toString().replace(/\D/g, '');
  
  // باید 10 رقمی باشد
  if (cleanId.length !== 10) return false;
  
  // الگوریتم بررسی کد ملی
  const check = parseInt(cleanId[9]);
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanId[i]) * (10 - i);
  }
  
  const remainder = sum % 11;
  
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

/**
 * اعتبارسنجی شناسه ملی شرکت (11 رقمی)
 */
export function validateCompanyNationalId(nationalId: string | null | undefined): boolean {
  if (!nationalId) return false;
  
  const cleanId = nationalId.toString().replace(/\D/g, '');
  
  // باید 11 رقمی باشد
  return cleanId.length === 11;
}

/**
 * اعتبارسنجی ایمیل
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * اعتبارسنجی کد پستی ایرانی (10 رقمی)
 */
export function validateIranianPostalCode(postalCode: string | null | undefined): boolean {
  if (!postalCode) return false;
  
  const cleanCode = postalCode.toString().replace(/\D/g, '');
  
  // باید 10 رقمی باشد
  return cleanCode.length === 10;
}

/**
 * اعتبارسنجی شماره حساب بانکی (شبا)
 */
export function validateIranianSheba(sheba: string | null | undefined): boolean {
  if (!sheba) return false;
  
  const cleanSheba = sheba.toString().replace(/\s/g, '').toUpperCase();
  
  // باید با IR شروع شود و 24 کاراکتر باشد
  if (!cleanSheba.startsWith('IR') || cleanSheba.length !== 26) {
    return false;
  }
  
  // فقط بررسی فرمت (الگوریتم IBAN برای validation دقیق‌تر نیاز است)
  const numberPart = cleanSheba.substring(2);
  return /^\d{24}$/.test(numberPart);
}

/**
 * Sanitize user input (جلوگیری از XSS)
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .toString()
    .trim()
    .replace(/[<>]/g, '') // حذف تگ‌های HTML
    .replace(/javascript:/gi, '') // حذف javascript: links
    .replace(/on\w+=/gi, ''); // حذف event handlers
}

/**
 * اعتبارسنجی رنج عددی
 */
export function validateNumberRange(
  value: number | string | null | undefined,
  min?: number,
  max?: number
): { valid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: 'مقدار الزامی است' };
  }
  
  const num = typeof value === 'number' ? value : parseFloat(value);
  
  if (isNaN(num)) {
    return { valid: false, error: 'مقدار باید عدد باشد' };
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `مقدار نباید کمتر از ${min} باشد` };
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, error: `مقدار نباید بیشتر از ${max} باشد` };
  }
  
  return { valid: true };
}

/**
 * اعتبارسنجی طول متن
 */
export function validateStringLength(
  value: string | null | undefined,
  minLength?: number,
  maxLength?: number
): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: 'مقدار الزامی است' };
  }
  
  const length = value.length;
  
  if (minLength !== undefined && length < minLength) {
    return { valid: false, error: `حداقل طول: ${minLength} کاراکتر` };
  }
  
  if (maxLength !== undefined && length > maxLength) {
    return { valid: false, error: `حداکثر طول: ${maxLength} کاراکتر` };
  }
  
  return { valid: true };
}

/**
 * اعتبارسنجی تاریخ شمسی
 */
export function validatePersianDate(date: string | null | undefined): boolean {
  if (!date) return false;
  
  // فرمت: 1403/01/01 یا 1403-01-01
  const persianDateRegex = /^13\d{2}[\/\-](0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])$/;
  
  return persianDateRegex.test(date);
}

