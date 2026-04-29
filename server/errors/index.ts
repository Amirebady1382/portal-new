/**
 * Centralized Error Classes
 * Import from here for consistent error handling across the application
 * 
 * Usage:
 * import { NotFoundError, ValidationError } from '../errors';
 * throw new NotFoundError('کاربر یافت نشد');
 */

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalAPIError,
  FileSystemError,
} from './AppError';

export { 
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler,
} from '../middleware/errorHandler';

