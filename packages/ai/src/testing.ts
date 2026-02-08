/**
 * AI Testing Framework
 *
 * Utilities for testing AI-generated code at runtime.
 * Validates return types, error handling, null safety, and performance.
 *
 * @example
 * import { AITest } from '@/lib/ai/testing'
 *
 * describe('AI-generated getUser function', () => {
 *   it('should handle all cases', async () => {
 *     await new AITest(getUser)
 *       .isAsync()
 *       .shouldNotThrow(['user-123'])
 *       .shouldReturnType(userSchema, ['user-123'])
 *       .shouldHandleNull()
 *       .shouldCompleteInMs(5000, ['user-123'])
 *       .verify()
 *   })
 * })
 */

import { z } from 'zod';
import { AppError } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

export interface AITestResults {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  results: TestResult[];
  duration: number;
}

type AnyFunction = (...args: unknown[]) => unknown;

// ============================================================================
// AI TEST CLASS
// ============================================================================

/**
 * Fluent API for testing AI-generated functions
 *
 * Chain test conditions and call verify() to run all checks.
 */
export class AITest<T extends AnyFunction> {
  private fn: T;
  private checks: Array<{
    name: string;
    check: () => Promise<void>;
  }> = [];

  constructor(fn: T) {
    this.fn = fn;
  }

  /**
   * Verify function is async
   */
  isAsync(): this {
    this.checks.push({
      name: 'isAsync',
      check: async () => {
        const isAsyncFn =
          this.fn.constructor.name === 'AsyncFunction' ||
          this.fn.toString().includes('async');

        if (!isAsyncFn) {
          throw new Error('Function is not async');
        }
      },
    });
    return this;
  }

  /**
   * Verify function is sync (not async)
   */
  isSync(): this {
    this.checks.push({
      name: 'isSync',
      check: async () => {
        const isAsyncFn =
          this.fn.constructor.name === 'AsyncFunction' ||
          this.fn.toString().includes('async');

        if (isAsyncFn) {
          throw new Error('Function is async, expected sync');
        }
      },
    });
    return this;
  }

  /**
   * Verify function doesn't throw with given inputs
   */
  shouldNotThrow(inputs: Parameters<T> = [] as unknown as Parameters<T>): this {
    this.checks.push({
      name: `shouldNotThrow(${JSON.stringify(inputs).slice(0, 50)})`,
      check: async () => {
        try {
          const result = this.fn(...inputs);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          throw new Error(
            `Function threw: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    });
    return this;
  }

  /**
   * Verify function throws with given inputs
   */
  shouldThrow(inputs: Parameters<T> = [] as unknown as Parameters<T>): this {
    this.checks.push({
      name: `shouldThrow(${JSON.stringify(inputs).slice(0, 50)})`,
      check: async () => {
        try {
          const result = this.fn(...inputs);
          if (result instanceof Promise) {
            await result;
          }
          throw new Error('Function did not throw as expected');
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Function did not throw as expected'
          ) {
            throw error;
          }
          // Function threw, which is expected
        }
      },
    });
    return this;
  }

  /**
   * Verify function throws AppError with specific code
   */
  shouldThrowAppError(
    expectedCode: string,
    inputs: Parameters<T> = [] as unknown as Parameters<T>
  ): this {
    this.checks.push({
      name: `shouldThrowAppError(${expectedCode})`,
      check: async () => {
        try {
          const result = this.fn(...inputs);
          if (result instanceof Promise) {
            await result;
          }
          throw new Error('Function did not throw as expected');
        } catch (error) {
          if (!(error instanceof AppError)) {
            throw new Error(
              `Expected AppError, got ${error instanceof Error ? error.constructor.name : typeof error}`
            );
          }
          if (error.code !== expectedCode) {
            throw new Error(
              `Expected AppError code "${expectedCode}", got "${error.code}"`
            );
          }
        }
      },
    });
    return this;
  }

  /**
   * Verify function returns correct type (using Zod schema)
   */
  shouldReturnType<R>(
    schema: z.ZodSchema<R>,
    inputs: Parameters<T> = [] as unknown as Parameters<T>
  ): this {
    this.checks.push({
      name: `shouldReturnType(${schema.description || 'schema'})`,
      check: async () => {
        let result = this.fn(...inputs);
        if (result instanceof Promise) {
          result = await result;
        }

        const parsed = schema.safeParse(result);
        if (!parsed.success) {
          throw new Error(`Return type mismatch: ${parsed.error.message}`);
        }
      },
    });
    return this;
  }

  /**
   * Verify function returns specific value
   */
  shouldReturn(
    expected: ReturnType<T> extends Promise<infer R> ? R : ReturnType<T>,
    inputs: Parameters<T> = [] as unknown as Parameters<T>
  ): this {
    this.checks.push({
      name: `shouldReturn(${JSON.stringify(expected).slice(0, 50)})`,
      check: async () => {
        let result = this.fn(...inputs);
        if (result instanceof Promise) {
          result = await result;
        }

        if (JSON.stringify(result) !== JSON.stringify(expected)) {
          throw new Error(
            `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`
          );
        }
      },
    });
    return this;
  }

  /**
   * Verify function handles null input gracefully
   */
  shouldHandleNull(): this {
    this.checks.push({
      name: 'shouldHandleNull',
      check: async () => {
        try {
          const result = this.fn(null as unknown as Parameters<T>[0]);
          if (result instanceof Promise) {
            await result;
          }
          // If it returns without throwing, that's acceptable
        } catch (error) {
          // AppError with validation-related codes is acceptable
          if (error instanceof AppError) {
            const validCodes = [
              'INVALID_INPUT',
              'MISSING_REQUIRED',
              'VALIDATION_FAILED',
            ];
            if (validCodes.includes(error.code)) {
              return; // Acceptable error handling
            }
          }
          throw new Error(
            `Function should handle null gracefully. Got: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
    return this;
  }

  /**
   * Verify function handles undefined input gracefully
   */
  shouldHandleUndefined(): this {
    this.checks.push({
      name: 'shouldHandleUndefined',
      check: async () => {
        try {
          const result = this.fn(undefined as unknown as Parameters<T>[0]);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          if (error instanceof AppError) {
            const validCodes = [
              'INVALID_INPUT',
              'MISSING_REQUIRED',
              'VALIDATION_FAILED',
            ];
            if (validCodes.includes(error.code)) {
              return;
            }
          }
          throw new Error(
            `Function should handle undefined gracefully. Got: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
    return this;
  }

  /**
   * Verify function handles empty string gracefully
   */
  shouldHandleEmptyString(): this {
    this.checks.push({
      name: 'shouldHandleEmptyString',
      check: async () => {
        try {
          const result = this.fn('' as unknown as Parameters<T>[0]);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          if (error instanceof AppError) {
            const validCodes = [
              'INVALID_INPUT',
              'MISSING_REQUIRED',
              'VALIDATION_FAILED',
            ];
            if (validCodes.includes(error.code)) {
              return;
            }
          }
          throw new Error(
            `Function should handle empty string gracefully. Got: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    });
    return this;
  }

  /**
   * Verify function completes within time limit
   */
  shouldCompleteInMs(
    maxMs: number,
    inputs: Parameters<T> = [] as unknown as Parameters<T>
  ): this {
    this.checks.push({
      name: `shouldCompleteInMs(${maxMs})`,
      check: async () => {
        const start = Date.now();
        let result = this.fn(...inputs);
        if (result instanceof Promise) {
          result = await result;
        }
        const duration = Date.now() - start;

        if (duration > maxMs) {
          throw new Error(`Took ${duration}ms, expected < ${maxMs}ms`);
        }
      },
    });
    return this;
  }

  /**
   * Add custom test
   */
  custom(
    name: string,
    check: (fn: T) => Promise<void> | void
  ): this {
    this.checks.push({
      name,
      check: async () => {
        await check(this.fn);
      },
    });
    return this;
  }

  /**
   * Run all checks and return results
   */
  async verify(): Promise<AITestResults> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const { name, check } of this.checks) {
      const checkStart = Date.now();
      try {
        await check();
        results.push({
          name,
          passed: true,
          duration: Date.now() - checkStart,
        });
      } catch (error) {
        results.push({
          name,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - checkStart,
        });
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    return {
      passed: failedCount === 0,
      total: results.length,
      passedCount,
      failedCount,
      results,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Run all checks, throw if any fail (for use in test frameworks)
   */
  async verifyOrThrow(): Promise<void> {
    const results = await this.verify();

    if (!results.passed) {
      const failures = results.results
        .filter((r) => !r.passed)
        .map((r) => `  - ${r.name}: ${r.error}`)
        .join('\n');

      throw new Error(
        `AITest failed (${results.failedCount}/${results.total}):\n${failures}`
      );
    }
  }
}

// ============================================================================
// QUICK TEST HELPERS
// ============================================================================

/**
 * Quick test that function doesn't throw
 */
export async function testDoesNotThrow(
  fn: AnyFunction,
  ...inputs: unknown[]
): Promise<boolean> {
  try {
    const result = fn(...inputs);
    if (result instanceof Promise) {
      await result;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Quick test that function returns valid type
 */
export async function testReturnsType<T>(
  fn: AnyFunction,
  schema: z.ZodSchema<T>,
  ...inputs: unknown[]
): Promise<boolean> {
  try {
    let result = fn(...inputs);
    if (result instanceof Promise) {
      result = await result;
    }
    return schema.safeParse(result).success;
  } catch {
    return false;
  }
}

/**
 * Quick test that function completes in time
 */
export async function testCompletesInMs(
  fn: AnyFunction,
  maxMs: number,
  ...inputs: unknown[]
): Promise<boolean> {
  const start = Date.now();
  try {
    const result = fn(...inputs);
    if (result instanceof Promise) {
      await result;
    }
    return Date.now() - start < maxMs;
  } catch {
    return false;
  }
}

// ============================================================================
// SCHEMA HELPERS
// ============================================================================

/**
 * Common schemas for testing AI-generated code
 */
export const commonSchemas = {
  /** Non-empty string */
  nonEmptyString: z.string().min(1),

  /** Email */
  email: z.string().email(),

  /** UUID */
  uuid: z.string().uuid(),

  /** Positive number */
  positiveNumber: z.number().positive(),

  /** Array of any */
  array: z.array(z.unknown()),

  /** Non-empty array */
  nonEmptyArray: z.array(z.unknown()).min(1),

  /** API response shape */
  apiResponse: z.object({
    success: z.boolean(),
    data: z.unknown().optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
      })
      .optional(),
  }),

  /** Paginated response */
  paginatedResponse: z.object({
    data: z.array(z.unknown()),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
};
