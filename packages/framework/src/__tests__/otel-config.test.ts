import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTracer, _resetTracer } from "../runtime/tracer";
import type { TracingConfig } from "../index.js";

beforeEach(() => {
  _resetTracer();
  vi.restoreAllMocks();
});

describe("OTel Exporter Config (TracingConfig)", () => {
  it("initTracer() with no args does nothing", async () => {
    await expect(initTracer()).resolves.toBeUndefined();
  });

  it("initTracer({ enabled: false }) is a no-op", async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    await initTracer({ enabled: false });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("initTracer({ enabled: true, exporter: 'console' }) runs without throwing", async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(initTracer({ enabled: true, exporter: 'console' })).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('console tracing initialized'));
  });

  it("initTracer({ enabled: true, exporter: 'console', serviceName }) uses the service name", async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await initTracer({ enabled: true, exporter: 'console', serviceName: 'my-svc' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('my-svc'));
  });

  it("initTracer({ enabled: true, exporter: 'otlp' }) runs without throwing", async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(
      initTracer({ enabled: true, exporter: 'otlp', endpoint: 'http://my-collector/traces' })
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://my-collector/traces'),
    );
  });

  it("initTracer({ enabled: true, exporter: 'otlp' }) defaults endpoint to localhost:4318", async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await initTracer({ enabled: true, exporter: 'otlp' });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:4318/v1/traces'),
    );
  });

  it("TracingConfig type is exported and constructable", () => {
    // Type-level test — if this compiles and runs, the export is correct
    const config: TracingConfig = { enabled: true, exporter: 'console', serviceName: 'test' };
    expect(config.enabled).toBe(true);
    expect(config.exporter).toBe('console');
    expect(config.serviceName).toBe('test');
  });

  it("TracingConfig supports all optional fields", () => {
    const config: TracingConfig = {
      enabled: true,
      exporter: 'otlp',
      endpoint: 'http://otel.example.com/v1/traces',
      headers: { Authorization: 'Bearer token' },
      serviceName: 'production-svc',
    };
    expect(config.headers?.['Authorization']).toBe('Bearer token');
  });
});
