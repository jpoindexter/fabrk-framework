// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tracer: any = null;
let _trace: typeof import("@opentelemetry/api").trace | null = null;
let _initialized = false;

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

export function startSpan<T>(name: string, fn: () => T): T;
export function startSpan<T>(name: string, fn: () => Promise<T>): Promise<T>;
export function startSpan<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
  if (!_tracer) return fn();

  return _tracer.startActiveSpan(name, (span: { end: () => void; setStatus: (s: { code: number }) => void; recordException: (e: unknown) => void }) => {
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
