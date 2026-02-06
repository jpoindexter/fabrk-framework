/**
 * Type Definitions for AI-Generated Code
 *
 * These types ensure AI-generated code follows consistent patterns.
 * Import from @/types/ai instead of defining your own types.
 *
 * @example
 * import { APIResponse, AsyncState, AppError } from './types'
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response wrapper
 * Forces proper typing of all API responses
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// ASYNC STATE MANAGEMENT
// ============================================================================

/**
 * Async operation states for React components
 * Use with useState for proper loading/error handling
 *
 * @example
 * const [state, setState] = useState<AsyncState<User>>({ status: 'idle' })
 */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

/**
 * Form state management
 * Use for forms with validation
 */
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isDirty: boolean;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Application error with code and status
 * Use for consistent error handling across the app
 *
 * @example
 * throw new AppError('INVALID_INPUT', 'Email is required', 400)
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  /**
   * Convert to API response format
   */
  toResponse(): APIResponse<never> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
      },
    };
  }
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Input validation
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',

  // External services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if value is an APIResponse
 */
export function isAPIResponse<T>(
  obj: unknown,
  dataValidator?: (val: unknown) => val is T
): obj is APIResponse<T> {
  if (typeof obj !== 'object' || obj === null) return false;
  if (!('success' in obj) || typeof obj.success !== 'boolean') return false;

  const response = obj as APIResponse<T>;

  // If success and has data, validate data if validator provided
  if (response.success && 'data' in response && dataValidator) {
    return dataValidator(response.data);
  }

  return true;
}

/**
 * Check if value is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if value is an AsyncState in success state
 */
export function isAsyncSuccess<T>(
  state: AsyncState<T>
): state is { status: 'success'; data: T } {
  return state.status === 'success';
}

/**
 * Check if value is an AsyncState in error state
 */
export function isAsyncError<T>(
  state: AsyncState<T>
): state is { status: 'error'; error: Error } {
  return state.status === 'error';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract the data type from an APIResponse
 */
export type ExtractResponseData<T> = T extends APIResponse<infer U> ? U : never;

/**
 * Extract the data type from an AsyncState
 */
export type ExtractAsyncData<T> = T extends AsyncState<infer U> ? U : never;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIResponse<never> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
  };
}

/**
 * Wrap an async function with proper error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<APIResponse<T>> {
  try {
    const data = await fn();
    return successResponse(data);
  } catch (error) {
    if (isAppError(error)) {
      return error.toResponse();
    }

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
