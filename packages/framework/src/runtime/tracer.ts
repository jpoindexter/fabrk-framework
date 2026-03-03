// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tracer: any = null;
let _trace: typeof import("@opentelemetry/api").trace | null = null;
let _initialized = false;

export type SpanAttributes = Record<string, string | number | boolean>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OtelSpan = { end: () => void; setStatus: (s: { code: number }) => void; recordException: (e: unknown) => void; setAttributes: (a: SpanAttributes) => void; setAttribute: (k: string, v: string | number | boolean) => void };

export async function initTracer(name: string): Promise<void> {
  if (_initialized) return;
  _initialized = true;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getActiveSpan(): any | undefined {
  if (!_trace) return undefined;
  return _trace.getActiveSpan();
}

/** @internal — reset for testing */
export function _resetTracer(): void {
  _tracer = null;
  _trace = null;
  _initialized = false;
}
