/**
 * Centralized Cache Key Management
 * 
 * This file provides a consistent way to generate cache keys and tags
 * across the application, making cache invalidation easier and more reliable.
 */

export const CacheKeys = {
  // ====================================
  // User cache keys
  // ====================================
  user: (id: number) => `user:${id}`,
  userByUsername: (username: string) => `user:username:${username}`,
  userByPhone: (phone: string) => `user:phone:${phone}`,
  usersList: () => 'users:list',
  
  // ====================================
  // Company cache keys
  // ====================================
  company: (id: number) => `company:${id}`,
  companyByNationalId: (nationalId: string) => `company:national_id:${nationalId}`,
  companiesList: (filters?: string) => `companies:list${filters ? `:${filters}` : ''}`,
  companyDocuments: (companyId: number) => `company:${companyId}:documents`,
  companyStats: (companyId: number) => `company:${companyId}:stats`,
  
  // ====================================
  // Document cache keys
  // ====================================
  document: (id: number) => `document:${id}`,
  documentsList: (companyId?: number) => companyId ? `documents:company:${companyId}` : 'documents:list',
  
  // ====================================
  // Service cache keys
  // ====================================
  service: (id: number) => `service:${id}`,
  servicesList: (department?: string) => department ? `services:department:${department}` : 'services:list',
  serviceRequest: (id: number) => `service_request:${id}`,
  serviceRequestsList: (filters?: string) => `service_requests:list${filters ? `:${filters}` : ''}`,
  
  // ====================================
  // Conversation cache keys
  // ====================================
  conversation: (id: number) => `conversation:${id}`,
  conversationMessages: (conversationId: number) => `conversation:${conversationId}:messages`,
  
  // ====================================
  // Form submission cache keys
  // ====================================
  formSubmission: (id: number) => `form_submission:${id}`,
  formSubmissionsList: (companyId?: number) => companyId ? `form_submissions:company:${companyId}` : 'form_submissions:list',
  
  // ====================================
  // System settings cache keys
  // ====================================
  systemSetting: (key: string) => `system_setting:${key}`,
  systemSettingsList: () => 'system_settings:list',
};

export const CacheTags = {
  // Entity tags (for invalidating all related caches)
  user: (id: number) => `user:${id}`,
  users: () => 'users',
  
  company: (id: number) => `company:${id}`,
  companies: () => 'companies',
  
  document: (id: number) => `document:${id}`,
  documents: () => 'documents',
  
  service: (id: number) => `service:${id}`,
  services: () => 'services',
  
  serviceRequest: (id: number) => `service_request:${id}`,
  serviceRequests: () => 'service_requests',
  
  conversation: (id: number) => `conversation:${id}`,
  conversations: () => 'conversations',
  
  formSubmission: (id: number) => `form_submission:${id}`,
  formSubmissions: () => 'form_submissions',
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - default
  LONG: 1800,       // 30 minutes - for stable data
  VERY_LONG: 3600,  // 1 hour - for rarely changing data
  DAY: 86400,       // 24 hours - for static data
};

/**
 * Helper to invalidate all caches related to a user
 */
export function invalidateUserCaches(userId: number): void {
  const { cacheService } = require('../services/cache.service');
  
  cacheService.delete(CacheKeys.user(userId));
  cacheService.invalidateByTag(CacheTags.user(userId));
  cacheService.invalidateByTag(CacheTags.users());
  cacheService.invalidateByPattern('user:*');
}

/**
 * Helper to invalidate all caches related to a company
 */
export function invalidateCompanyCaches(companyId: number): void {
  const { cacheService } = require('../services/cache.service');
  
  cacheService.delete(CacheKeys.company(companyId));
  cacheService.invalidateByTag(CacheTags.company(companyId));
  cacheService.invalidateByTag(CacheTags.companies());
  cacheService.invalidateByPattern(`company:${companyId}:*`);
  cacheService.invalidateByPattern('companies:*');
}

/**
 * Helper to invalidate all caches related to documents
 */
export function invalidateDocumentCaches(documentId?: number, companyId?: number): void {
  const { cacheService } = require('../services/cache.service');
  
  if (documentId) {
    cacheService.delete(CacheKeys.document(documentId));
    cacheService.invalidateByTag(CacheTags.document(documentId));
  }
  
  if (companyId) {
    cacheService.invalidateByPattern(`documents:company:${companyId}*`);
    cacheService.invalidateByPattern(`company:${companyId}:documents*`);
  }
  
  cacheService.invalidateByTag(CacheTags.documents());
  cacheService.invalidateByPattern('documents:*');
}

/**
 * Helper to invalidate all caches related to services
 */
export function invalidateServiceCaches(serviceId?: number): void {
  const { cacheService } = require('../services/cache.service');
  
  if (serviceId) {
    cacheService.delete(CacheKeys.service(serviceId));
    cacheService.invalidateByTag(CacheTags.service(serviceId));
  }
  
  cacheService.invalidateByTag(CacheTags.services());
  cacheService.invalidateByPattern('services:*');
  cacheService.invalidateByPattern('service_requests:*');
}

