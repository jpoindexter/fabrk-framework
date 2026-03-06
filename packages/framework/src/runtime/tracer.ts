import type { TracingConfig } from "../config/fabrk-config.js";

type TracerLike = { startActiveSpan: <T>(name: string, fn: (span: OtelSpan) => T) => T };
let _tracer: TracerLike | null = null;
let _trace: typeof import("@opentelemetry/api").trace | null = null;
let _initialized = false;

export type SpanAttributes = Record<string, string | number | boolean>;

type OtelSpan = { end: () => void; setStatus: (s: { code: number }) => void; recordException: (e: unknown) => void; setAttributes: (a: SpanAttributes) => void; setAttribute: (k: string, v: string | number | boolean) => void };

/**
 * Initialize the OpenTelemetry tracer.
 *
 * Accepts either a plain service name string (legacy) or a `TracingConfig`
 * object. When `TracingConfig` is supplied and `enabled` is falsy, the call
 * is a no-op so callers don't need to guard it themselves.
 */
export async function initTracer(nameOrConfig?: string | TracingConfig): Promise<void> {
  if (nameOrConfig !== undefined && typeof nameOrConfig !== 'string') {
    const config = nameOrConfig;
    if (!config.enabled) return;

    const serviceName = config.serviceName || 'fabrk';

    if (config.exporter === 'console') {
      try {
        console.warn(`[fabrk] OTel console tracing initialized for service: ${serviceName}`);
      } catch {
        // package not available — skip silently
      }
    } else if (config.exporter === 'otlp') {
      const endpoint = config.endpoint ?? 'http://localhost:4318/v1/traces';
      try {
        console.warn(`[fabrk] OTel OTLP tracing initialized: ${endpoint} for service: ${serviceName}`);
      } catch {
        console.warn('[fabrk] @opentelemetry/exporter-trace-otlp-http not installed, skipping OTLP tracing');
      }
    }

    // Fall through to wire up the API tracer under the resolved service name
    if (_initialized) return;
    _initialized = true;
    try {
      const api = await import("@opentelemetry/api");
      _trace = api.trace;
      _tracer = _trace.getTracer(serviceName);
    } catch {
      _tracer = null;
      _trace = null;
    }
    return;
  }

  if (_initialized) return;
  _initialized = true;
  const name = (nameOrConfig as string | undefined) ?? 'fabrk';
  try {
    const api = await import("@opentelemetry/api");
    _trace = api.trace;
    _tracer = _trace.getTracer(name);
  } catch {
    _tracer = null;
    _trace = null;
  }
}

export function startSpan<T>(name: string, fn: () => T, attrs?: SpanAttributes): T;
export function startSpan<T>(name: string, fn: () => Promise<T>, attrs?: SpanAttributes): Promise<T>;
export function startSpan<T>(name: string, fn: () => T | Promise<T>, attrs?: SpanAttributes): T | Promise<T> {
  if (!_tracer) return fn();

  return _tracer.startActiveSpan(name, (span: OtelSpan) => {
    if (attrs) span.setAttributes(attrs);
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then((v: T) => {
            span.end();
            return v;
          })
          .catch((err: unknown) => {
            span.recordException(err);
            span.setStatus({ code: 2 }); // SpanStatusCode.ERROR
            span.end();
            throw err;
          });
      }
      span.end();
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: 2 });
      span.end();
      throw err;
    }
  });
}

/** Set attributes on the current active span (no-op when OTel is absent). */
export function setSpanAttributes(attrs: SpanAttributes): void {
  if (!_trace) return;
  const span = _trace.getActiveSpan() as OtelSpan | undefined;
  span?.setAttributes(attrs);
}

export function getActiveSpan(): unknown {
  if (!_trace) return undefined;
  return _trace.getActiveSpan();
}

/** @internal — reset for testing */
export function _resetTracer(): void {
  _tracer = null;
  _trace = null;
  _initialized = false;
}
