/**
 * Standard API response wrapper
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
 * Application error with code and status
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
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${crypto.randomUUID()}`
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
