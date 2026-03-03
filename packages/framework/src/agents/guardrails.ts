export interface GuardrailContext {
  agentName: string;
  sessionId: string;
  direction: "input" | "output";
}

export interface GuardrailResult {
  pass: boolean;
  reason?: string;
  replacement?: string;
}

export type Guardrail = (content: string, ctx: GuardrailContext) => GuardrailResult;

export function runGuardrails(
  guardrails: Guardrail[],
  content: string,
  ctx: GuardrailContext,
): { content: string; blocked: boolean; reason?: string } {
  let current = content;
  for (const guard of guardrails) {
    const result = guard(current, ctx);
    if (!result.pass) {
      if (result.replacement !== undefined) {
        current = result.replacement;
        continue;
      }
      return { content: current, blocked: true, reason: result.reason };
    }
    if (result.replacement !== undefined) {
      current = result.replacement;
    }
  }
  return { content: current, blocked: false };
}

export function maxLength(n: number): Guardrail {
  return (content) => {
    if (content.length > n) {
      return { pass: false, reason: `Content exceeds max length of ${n} characters (got ${content.length})` };
    }
    return { pass: true };
  };
}

export function denyList(patterns: RegExp[]): Guardrail {
  return (content) => {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return { pass: false, reason: `Content matches denied pattern: ${pattern.source}` };
      }
    }
    return { pass: true };
  };
}

export function requireJsonSchema(schema: Record<string, unknown>): Guardrail {
  return (content) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { pass: false, reason: "Content is not valid JSON" };
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { pass: false, reason: "Content must be a JSON object" };
    }

    const obj = parsed as Record<string, unknown>;
    const required = schema.required as string[] | undefined;
    if (required) {
      for (const key of required) {
        if (!(key in obj)) {
          return { pass: false, reason: `Missing required field: ${key}` };
        }
      }
    }

    const properties = schema.properties as Record<string, { type?: string }> | undefined;
    if (properties) {
      for (const [key, spec] of Object.entries(properties)) {
        if (key in obj && spec.type) {
          const actual = Array.isArray(obj[key]) ? "array" : typeof obj[key];
          if (actual !== spec.type) {
            return { pass: false, reason: `Field "${key}" expected type "${spec.type}", got "${actual}"` };
          }
        }
      }
    }

    return { pass: true };
  };
}

const PII_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, label: "email" },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, label: "phone" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: "SSN" },
];

export function piiRedactor(): Guardrail {
  return (content) => {
    let redacted = content;
    let changed = false;
    for (const { pattern } of PII_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      if (regex.test(redacted)) {
        changed = true;
        redacted = redacted.replace(new RegExp(pattern.source, pattern.flags), "[REDACTED]");
      }
    }
    if (changed) {
      return { pass: true, replacement: redacted };
    }
    return { pass: true };
  };
}
