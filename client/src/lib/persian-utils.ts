/**
 * Utility functions for Persian/Farsi language support
 */

// Persian digit mapping
const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Convert English digits to Persian digits
 */
export function toPersianNumber(input: string | number | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  const str = input.toString();
  return str.replace(/[0-9]/g, (digit) => persianDigits[parseInt(digit)]);
}

/**
 * Convert English digits to Persian digits (alias for toPersianNumber)
 */
export function toPersianDigits(input: string | number | null | undefined): string {
  return toPersianNumber(input);
}

/**
 * Convert Persian digits to English digits
 */
export function toEnglishNumber(input: string): string {
  return input.replace(/[۰-۹]/g, (digit) => {
    const index = persianDigits.indexOf(digit);
    return index !== -1 ? englishDigits[index] : digit;
  });
}

/**
 * Format Persian numbers with thousand separators
 */
export function formatPersianNumber(input: string | number | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  const str = input.toString();
  const englishNumber = toEnglishNumber(str);
  const formattedNumber = parseInt(englishNumber).toLocaleString();
  return toPersianNumber(formattedNumber);
}

/**
 * Convert Gregorian date to Jalali (Persian) date
 * Note: This is a simplified version. For production use, consider using a library like moment-jalaali
 */
export function toJalaliDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // Simplified Jalali conversion (approximate)
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  
  // This is a very basic approximation - use proper library for accurate conversion
  const jalaliYear = year - 621;
  const jalaliMonth = month;
  const jalaliDay = day;
  
  return toPersianNumber(`${jalaliYear}/${jalaliMonth.toString().padStart(2, "0")}/${jalaliDay.toString().padStart(2, "0")}`);
}

/**
 * Get Persian month names
 */
export const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

/**
 * Get Persian day names
 */
export const persianDays = [
  "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"
];

/**
 * Format Persian date with day name
 */
export function formatPersianDate(date: Date | string, includeTime = false): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  const dayName = persianDays[dateObj.getDay()];
  const jalaliDate = toJalaliDate(dateObj);
  
  if (includeTime) {
    const hours = toPersianNumber(dateObj.getHours().toString().padStart(2, "0"));
    const minutes = toPersianNumber(dateObj.getMinutes().toString().padStart(2, "0"));
    return `${dayName} ${jalaliDate} ساعت ${hours}:${minutes}`;
  }
  
  return `${dayName} ${jalaliDate}`;
}

/**
 * Format relative time in Persian
 */
export function formatPersianRelativeTime(date: Date | string): string {
  if (!date) return "--";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "--";
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return "چند لحظه پیش";
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${toPersianNumber(diffInMinutes)} دقیقه پیش`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${toPersianNumber(diffInHours)} ساعت پیش`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${toPersianNumber(diffInDays)} روز پیش`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${toPersianNumber(diffInMonths)} ماه پیش`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${toPersianNumber(diffInYears)} سال پیش`;
}

/**
 * Validate Persian National ID (Melli Code)
 */
export function validatePersianNationalId(nationalId: string): boolean {
  const englishNationalId = toEnglishNumber(nationalId);
  
  if (!/^\d{10}$/.test(englishNationalId)) {
    return false;
  }
  
  // Check for invalid patterns
  const invalidPatterns = [
    "0000000000", "1111111111", "2222222222", "3333333333", "4444444444",
    "5555555555", "6666666666", "7777777777", "8888888888", "9999999999"
  ];
  
  if (invalidPatterns.includes(englishNationalId)) {
    return false;
  }
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(englishNationalId[i]) * (10 - i);
  }
  
  const remainder = sum % 11;
  const checkDigit = parseInt(englishNationalId[9]);
  
  if (remainder < 2) {
    return checkDigit === remainder;
  } else {
    return checkDigit === 11 - remainder;
  }
}

/**
 * Validate Persian Company National ID (11 digits)
 */
export function validatePersianCompanyId(companyId: string): boolean {
  const englishCompanyId = toEnglishNumber(companyId);
  return /^\d{11}$/.test(englishCompanyId);
}

/**
 * Format Persian phone number
 */
export function formatPersianPhoneNumber(phoneNumber: string): string {
  const englishPhone = toEnglishNumber(phoneNumber);
  
  // Remove any non-digit characters
  const digitsOnly = englishPhone.replace(/\D/g, "");
  
  // Format Iranian mobile numbers
  if (digitsOnly.length === 11 && digitsOnly.startsWith("09")) {
    const formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;
    return toPersianNumber(formatted);
  }
  
  // Format landline numbers (with area code)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 11)}`;
    return toPersianNumber(formatted);
  }
  
  return toPersianNumber(phoneNumber);
}

/**
 * Format Persian currency (Rial)
 */
export function formatPersianCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '';
  }
  
  const numericAmount = typeof amount === "string" ? parseFloat(toEnglishNumber(amount)) : amount;
  
  if (isNaN(numericAmount)) {
    return "نامعتبر";
  }
  
  const formatted = numericAmount.toLocaleString();
  return `${toPersianNumber(formatted)} ریال`;
}

/**
 * Convert Persian text to proper case
 */
export function toPersianProperCase(text: string): string {
  return text.split(" ").map(word => {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

/**
 * Check if text contains Persian characters
 */
export function containsPersian(text: string): boolean {
  const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return persianRegex.test(text);
}

/**
 * Remove Persian diacritics (harakat)
 */
export function removePersianDiacritics(text: string): string {
  const diacritics = /[\u064B-\u0652\u0670\u0640]/g;
  return text.replace(diacritics, "");
}

/**
 * Sort Persian text array
 */
export function sortPersianText(array: string[]): string[] {
  return array.sort((a, b) => {
    const cleanA = removePersianDiacritics(a);
    const cleanB = removePersianDiacritics(b);
    return cleanA.localeCompare(cleanB, "fa");
  });
}
