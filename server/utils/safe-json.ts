/**
 * Safe JSON Parsing Utilities
 * برای جلوگیری از crash در parse کردن JSON
 */

/**
 * Parse JSON به صورت امن
 */
export function safeJsonParse<T = any>(
  jsonString: string | object | null | undefined,
  defaultValue: T | null = null,
  logError: boolean = true
): T | null {
  // اگر already object است
  if (typeof jsonString === 'object' && jsonString !== null) {
    return jsonString as T;
  }

  // اگر null یا undefined است
  if (jsonString === null || jsonString === undefined) {
    return defaultValue;
  }

  // اگر string خالی است
  if (typeof jsonString === 'string' && jsonString.trim() === '') {
    return defaultValue;
  }

  // تلاش برای parse
  try {
    const parsed = JSON.parse(jsonString as string);
    return parsed as T;
  } catch (error) {
    if (logError) {
      console.warn('⚠️ Safe JSON parse failed:', {
        input: typeof jsonString === 'string' ? jsonString.substring(0, 100) : jsonString,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    return defaultValue;
  }
}

/**
 * Parse JSON array به صورت امن
 */
export function safeJsonParseArray<T = any>(
  jsonString: string | any[] | null | undefined,
  defaultValue: T[] = []
): T[] {
  const result = safeJsonParse<T[]>(jsonString, defaultValue, true);
  
  // اطمینان از اینکه نتیجه array است
  if (!Array.isArray(result)) {
    console.warn('⚠️ Expected array but got:', typeof result);
    return defaultValue;
  }
  
  return result;
}

/**
 * Parse JSON object به صورت امن
 */
export function safeJsonParseObject<T extends Record<string, any> = Record<string, any>>(
  jsonString: string | T | null | undefined,
  defaultValue: T | Record<string, any> = {}
): T | Record<string, any> {
  const result = safeJsonParse<T>(jsonString, defaultValue as T, true);
  
  // اطمینان از اینکه نتیجه object است
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    console.warn('⚠️ Expected object but got:', typeof result);
    return defaultValue;
  }
  
  return result;
}

/**
 * Stringify JSON به صورت امن
 */
export function safeJsonStringify(
  value: any,
  defaultValue: string = '{}',
  pretty: boolean = false
): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // اگر already string است
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, pretty ? 2 : 0);
  } catch (error) {
    console.warn('⚠️ Safe JSON stringify failed:', error);
    return defaultValue;
  }
}

/**
 * Parse Rasmio data با validation
 */
export function parseRasmioData(rasmioData: any): {
  title?: string;
  nationalId?: string;
  registrationNumber?: string;
  address?: string;
  capital?: string;
  managers?: any[];
  boardMembers?: any[];
  activities?: any[];
  news?: any[];
  ads?: any[];
} {
  const parsed = safeJsonParseObject(rasmioData, {});
  
  // Validation و normalization
  return {
    title: parsed.title || parsed.name || undefined,
    nationalId: parsed.nationalId || parsed.national_id || undefined,
    registrationNumber: parsed.registrationNumber || parsed.registration_number || undefined,
    address: parsed.address || undefined,
    capital: parsed.capital?.toString() || undefined,
    managers: Array.isArray(parsed.managers) ? parsed.managers : [],
    boardMembers: Array.isArray(parsed.boardMembers) ? parsed.boardMembers : [],
    activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    news: Array.isArray(parsed.news) ? parsed.news : [],
    ads: Array.isArray(parsed.ads) ? parsed.ads : []
  };
}

