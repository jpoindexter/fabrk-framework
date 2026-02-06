/**
 * AI Code Validation
 *
 * Validate AI-generated code for common issues:
 * - Security vulnerabilities (SQL injection, XSS, hardcoded secrets)
 * - Design system violations (hardcoded colors, arbitrary values)
 * - Type safety issues (any types, missing null checks)
 *
 * @example
 * const validator = new CodeValidator()
 * const issues = validator.validateAll(code)
 */

import { z } from 'zod';
import { AppError } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationIssue {
  type: 'security' | 'design' | 'type-safety' | 'quality';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

// ============================================================================
// PATTERNS TO DETECT
// ============================================================================

const SECURITY_PATTERNS = {
  // SQL injection - template literals in queries
  sqlInjection: {
    pattern: /(?:query|execute|raw)\s*\(\s*`[^`]*\$\{/g,
    message: 'Potential SQL injection: using template literals in query',
    severity: 'error' as const,
    suggestion: 'Use parameterized queries instead',
  },

  // Hardcoded secrets
  hardcodedSecrets: {
    pattern:
      /(?:password|token|secret|api[_-]?key|private[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/gi,
    message: 'Potential hardcoded secret detected',
    severity: 'error' as const,
    suggestion: 'Use environment variables for secrets',
  },

  // eval() usage
  evalUsage: {
    pattern: /\beval\s*\(/g,
    message: 'eval() usage detected - security risk',
    severity: 'error' as const,
    suggestion: 'Avoid eval(), use safer alternatives',
  },

  // innerHTML assignment (XSS risk)
  innerHtml: {
    pattern: /\.innerHTML\s*=/g,
    message: 'innerHTML assignment - potential XSS vulnerability',
    severity: 'warning' as const,
    suggestion: 'Use textContent or sanitize HTML before assignment',
  },

  // dangerouslySetInnerHTML without sanitization
  dangerouslySetInnerHTML: {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:/g,
    message: 'dangerouslySetInnerHTML usage - ensure HTML is sanitized',
    severity: 'warning' as const,
    suggestion: 'Sanitize HTML with DOMPurify or similar library',
  },

  // Unvalidated redirect
  unvalidatedRedirect: {
    pattern: /(?:window\.location|location\.href)\s*=\s*(?:req|request|params|query)/g,
    message: 'Potential unvalidated redirect',
    severity: 'warning' as const,
    suggestion: 'Validate redirect URLs against allowlist',
  },
};

const DESIGN_PATTERNS = {
  // Hex colors
  hexColors: {
    pattern: /#[0-9a-fA-F]{3,8}(?=["'\s;,)}])/g,
    message: 'Hardcoded hex color detected',
    severity: 'error' as const,
    suggestion: 'Use CSS variables or design tokens (e.g., text-primary, bg-muted)',
  },

  // Tailwind color classes (not semantic)
  tailwindColors: {
    pattern:
      /(?:text|bg|border|ring|fill|stroke)-(?:red|blue|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d+/g,
    message: 'Tailwind color class instead of semantic token',
    severity: 'error' as const,
    suggestion:
      'Use semantic tokens: text-primary, text-muted-foreground, bg-card, border-border',
  },

  // Arbitrary Tailwind values
  arbitraryValues: {
    pattern: /(?:w|h|p|m|gap|text|rounded)-\[\d+(?:px|rem|em|%|vh|vw)\]/g,
    message: 'Arbitrary Tailwind value detected',
    severity: 'warning' as const,
    suggestion: 'Use design scale values (4, 6, 8, 12, 16, 20, 24, 32)',
  },

  // Custom button element with styling
  customButton: {
    pattern: /<button\s+(?:[^>]*\s)?className\s*=\s*["'][^"']*(?:bg-|text-|rounded|px-|py-)/g,
    message: 'Custom styled button - use Button component',
    severity: 'warning' as const,
    suggestion: 'Import and use a Button component from your UI library',
  },

  // Custom input element
  customInput: {
    pattern: /<input\s+(?:[^>]*\s)?className\s*=\s*["']/g,
    message: 'Custom styled input - use Input component',
    severity: 'warning' as const,
    suggestion: 'Import and use an Input component from your UI library',
  },

  // Inline styles with colors
  inlineStyleColors: {
    pattern: /style\s*=\s*\{\s*\{[^}]*(?:color|background|border)[^}]*#[0-9a-fA-F]/g,
    message: 'Inline style with hardcoded color',
    severity: 'error' as const,
    suggestion: 'Use CSS variables or Tailwind classes',
  },
};

const TYPE_SAFETY_PATTERNS = {
  // any type usage
  anyType: {
    pattern: /:\s*any(?:\s*[;,\)\]\}]|\s*$)/gm,
    message: '"any" type usage detected',
    severity: 'error' as const,
    suggestion: 'Use specific types instead of "any"',
  },

  // TypeScript ignore comments
  tsIgnore: {
    pattern: /@ts-ignore|@ts-nocheck/g,
    message: 'TypeScript ignore directive',
    severity: 'warning' as const,
    suggestion: 'Fix the type error instead of ignoring it',
  },

  // Missing await on fetch/async
  missingAwait: {
    pattern: /(?:const|let|var)\s+\w+\s*=\s*(?:fetch|axios)\s*\([^)]*\)\s*(?:;|\n)/g,
    message: 'Async function may not be awaited',
    severity: 'warning' as const,
    suggestion: 'Add await keyword or handle the promise',
  },

  // Object access without null check
  unsafePropertyAccess: {
    pattern: /(?:params|query|body|data)\.\w+\.\w+(?!\?)/g,
    message: 'Potential unsafe property access without null check',
    severity: 'info' as const,
    suggestion: 'Use optional chaining (?.) for safer access',
  },
};

const QUALITY_PATTERNS = {
  // console.log in production code
  consoleLog: {
    pattern: /console\.(?:log|debug|info)\s*\(/g,
    message: 'console.log statement found',
    severity: 'warning' as const,
    suggestion: 'Use proper logging (e.g., console.log or a logging library)',
  },

  // TODO/FIXME comments
  todoComments: {
    pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX):/gi,
    message: 'TODO/FIXME comment found',
    severity: 'info' as const,
    suggestion: 'Address or track this in issue tracker',
  },

  // Empty catch blocks
  emptyCatch: {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    message: 'Empty catch block - errors silently ignored',
    severity: 'warning' as const,
    suggestion: 'Handle or log the error in catch block',
  },

  // var usage (prefer const/let)
  varUsage: {
    pattern: /\bvar\s+\w+/g,
    message: '"var" usage - prefer const or let',
    severity: 'info' as const,
    suggestion: 'Use const for immutable values, let for mutable',
  },
};

// ============================================================================
// VALIDATOR CLASS
// ============================================================================

export class CodeValidator {
  /**
   * Run all validations on code
   */
  validateAll(code: string): ValidationResult {
    const issues: ValidationIssue[] = [
      ...this.scanForSecurityIssues(code),
      ...this.scanForDesignIssues(code),
      ...this.scanForTypeSafetyIssues(code),
      ...this.scanForQualityIssues(code),
    ];

    return this.createResult(issues);
  }

  /**
   * Scan for security vulnerabilities
   */
  scanForSecurityIssues(code: string): ValidationIssue[] {
    return this.scanPatterns(code, SECURITY_PATTERNS, 'security');
  }

  /**
   * Scan for design system violations
   */
  scanForDesignIssues(code: string): ValidationIssue[] {
    return this.scanPatterns(code, DESIGN_PATTERNS, 'design');
  }

  /**
   * Scan for type safety issues
   */
  scanForTypeSafetyIssues(code: string): ValidationIssue[] {
    return this.scanPatterns(code, TYPE_SAFETY_PATTERNS, 'type-safety');
  }

  /**
   * Scan for code quality issues
   */
  scanForQualityIssues(code: string): ValidationIssue[] {
    return this.scanPatterns(code, QUALITY_PATTERNS, 'quality');
  }

  /**
   * Validate function returns correct type at runtime
   */
  validateFunctionReturns<T>(
    fn: (...args: unknown[]) => T | Promise<T>,
    schema: z.ZodSchema<T>,
    testInputs: unknown[][]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const inputs of testInputs) {
      try {
        const result = fn(...inputs);

        // Handle async functions
        if (result instanceof Promise) {
          // Can't validate sync - would need async test runner
          continue;
        }

        const parsed = schema.safeParse(result);
        if (!parsed.success) {
          errors.push(
            `Invalid return for inputs [${inputs.join(', ')}]: ${parsed.error.message}`
          );
        }
      } catch (error) {
        if (error instanceof AppError) {
          // AppError is expected for invalid inputs
          continue;
        }
        errors.push(
          `Function threw unexpected error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate component JSX follows design system
   */
  validateComponentDesign(jsxCode: string): ValidationIssue[] {
    return this.scanForDesignIssues(jsxCode);
  }

  /**
   * Quick check if code has critical issues
   */
  hasCriticalIssues(code: string): boolean {
    const result = this.validateAll(code);
    return result.summary.errors > 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private scanPatterns(
    code: string,
    patterns: Record<
      string,
      {
        pattern: RegExp;
        message: string;
        severity: 'error' | 'warning' | 'info';
        suggestion?: string;
      }
    >,
    type: ValidationIssue['type']
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const [, config] of Object.entries(patterns)) {
      // Reset regex lastIndex
      config.pattern.lastIndex = 0;

      let match;
      while ((match = config.pattern.exec(code)) !== null) {
        // Calculate line number
        const beforeMatch = code.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        // Calculate column
        const lastNewline = beforeMatch.lastIndexOf('\n');
        const column = match.index - lastNewline;

        issues.push({
          type,
          severity: config.severity,
          message: config.message,
          line: lineNumber,
          column,
          suggestion: config.suggestion,
        });
      }
    }

    return issues;
  }

  private createResult(issues: ValidationIssue[]): ValidationResult {
    const errors = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;
    const info = issues.filter((i) => i.severity === 'info').length;

    return {
      valid: errors === 0,
      issues,
      summary: { errors, warnings, info },
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultValidator: CodeValidator | null = null;

/**
 * Get the default validator instance
 */
export function getValidator(): CodeValidator {
  if (!defaultValidator) {
    defaultValidator = new CodeValidator();
  }
  return defaultValidator;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick validation of code
 */
export function validateCode(code: string): ValidationResult {
  return getValidator().validateAll(code);
}

/**
 * Check if code is safe to use
 */
export function isCodeSafe(code: string): boolean {
  return !getValidator().hasCriticalIssues(code);
}

/**
 * Get security issues only
 */
export function getSecurityIssues(code: string): ValidationIssue[] {
  return getValidator().scanForSecurityIssues(code);
}

/**
 * Get design violations only
 */
export function getDesignViolations(code: string): ValidationIssue[] {
  return getValidator().scanForDesignIssues(code);
}
