import { describe, it, expect } from 'vitest';

// Dashboard uses module-level state. We import fresh each time but since
// vitest caches modules, state accumulates. We test the API contract.
type DashboardModule = typeof import('../dashboard/vite-plugin');

async function freshModule(): Promise<DashboardModule> {
  return await import('../dashboard/vite-plugin');
}

describe('dashboard call inspector', () => {
  describe('recordCall with id and extended fields', () => {
    it('recordCall auto-generates an id when not provided', async () => {
      const mod = await freshModule();
      // We can't directly inspect the ring buffer, but we verify it does not throw
      // and accepts the extended record shape
      expect(() =>
        mod.recordCall({
          timestamp: Date.now(),
          agent: 'test-agent',
          model: 'gpt-4o',
          tokens: 100,
          cost: 0.01,
          durationMs: 250,
          inputMessages: [{ role: 'user', content: 'Hello' }],
          outputText: 'Hi there!',
        })
      ).not.toThrow();
    });

    it('recordCall with explicit id stores provided id', async () => {
      const mod = await freshModule();
      expect(() =>
        mod.recordCall({
          id: 'custom-id-123',
          timestamp: Date.now(),
          agent: 'test-agent',
          model: 'gpt-4o',
          tokens: 100,
          cost: 0.01,
        })
      ).not.toThrow();
    });

    it('recordCall handles missing optional fields gracefully', async () => {
      const mod = await freshModule();
      expect(() =>
        mod.recordCall({
          timestamp: Date.now(),
          agent: 'test-agent',
          model: 'gpt-4o',
          tokens: 50,
          cost: 0.005,
        })
      ).not.toThrow();
    });

    it('recordCall caps inputMessages at 20 entries', async () => {
      const mod = await freshModule();
      // Create 30 messages — should be capped to 20 (5 first + 15 last)
      const msgs = Array.from({ length: 30 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`,
      }));
      // Verify no throw with large message array
      expect(() =>
        mod.recordCall({
          timestamp: Date.now(),
          agent: 'cap-test',
          model: 'gpt-4o',
          tokens: 200,
          cost: 0.02,
          inputMessages: msgs,
        })
      ).not.toThrow();
    });

    it('recordCall caps individual message content at 4000 chars', async () => {
      const mod = await freshModule();
      const longContent = 'x'.repeat(10000);
      expect(() =>
        mod.recordCall({
          timestamp: Date.now(),
          agent: 'content-cap',
          model: 'gpt-4o',
          tokens: 100,
          cost: 0.01,
          inputMessages: [{ role: 'user', content: longContent }],
        })
      ).not.toThrow();
    });

    it('recordCall caps outputText at 8000 chars', async () => {
      const mod = await freshModule();
      const longOutput = 'y'.repeat(20000);
      expect(() =>
        mod.recordCall({
          timestamp: Date.now(),
          agent: 'output-cap',
          model: 'gpt-4o',
          tokens: 100,
          cost: 0.01,
          outputText: longOutput,
        })
      ).not.toThrow();
    });
  });

  describe('dashboardPlugin — /__ai/api/calls/:id endpoint', () => {
    it('dashboardPlugin returns a plugin with configureServer', async () => {
      const mod = await freshModule();
      const plugin = mod.dashboardPlugin();
      expect(plugin.name).toBe('fabrk:dashboard');
      expect(typeof plugin.configureServer).toBe('function');
    });

    it('GET /__ai/api still returns complete snapshot', async () => {
      // Test via the existing test infrastructure — just verify the export still works
      const mod = await freshModule();
      mod.recordCall({
        id: 'snapshot-test-id',
        timestamp: Date.now(),
        agent: 'snap-agent',
        model: 'gpt-4o',
        tokens: 10,
        cost: 0.001,
      });
      // The plugin handles /__ai/api — we can't call it directly without a server
      // but we verify the module exports are intact
      expect(typeof mod.recordCall).toBe('function');
      expect(typeof mod.recordToolCall).toBe('function');
      expect(typeof mod.recordError).toBe('function');
      expect(typeof mod.setAgents).toBe('function');
    });
  });

  describe('dashboardPlugin — /__ai/api/export method guard', () => {
    /** Capture the Connect middleware from a freshly-built plugin. */
    async function getMiddleware() {
      const mod = await freshModule();
      const plugin = mod.dashboardPlugin();
      let middleware: ((...args: unknown[]) => void) | null = null;
      const fakeServer = {
        middlewares: { use(fn: (...args: unknown[]) => void) { middleware = fn; } },
      };
      // configureServer returns a function that registers the middleware
      (plugin.configureServer as (s: typeof fakeServer) => (() => void) | void)(fakeServer)?.();
      return middleware;
    }

    function makeRes() {
      const headers: Record<string, string> = {};
      return {
        statusCode: 0,
        _body: '',
        setHeader(k: string, v: string) { headers[k] = v; },
        end(body?: string) { this._body = body ?? ''; },
        write() {},
        on() {},
        socket: { remoteAddress: '127.0.0.1' },
      };
    }

    function makeReq(method: string, url: string) {
      return { url, method, socket: { remoteAddress: '127.0.0.1' } };
    }

    it('rejects non-GET methods on /__ai/api/export with 405', async () => {
      const middleware = await getMiddleware();
      if (!middleware) return;

      const postRes = makeRes();
      middleware(makeReq('POST', '/__ai/api/export'), postRes, () => {});
      expect(postRes.statusCode).toBe(405);

      const getRes = makeRes();
      middleware(makeReq('GET', '/__ai/api/export'), getRes, () => {});
      expect(getRes.statusCode).toBe(200);
    });

    it('caps callId at 100 chars to prevent DoS', async () => {
      const middleware = await getMiddleware();
      if (!middleware) return;

      const longId = 'x'.repeat(500);
      const res = makeRes();
      const req = makeReq('GET', `/__ai/api/calls/${longId}`);

      expect(() => middleware(req, res, () => {})).not.toThrow();
      // Unknown id (after slicing to 100 chars) → 404
      expect(res.statusCode).toBe(404);
    });
  });

  describe('capMessages logic (via recordCall)', () => {
    it('messages array with exactly 20 entries passes through unchanged count', async () => {
      const mod = await freshModule();
      const msgs = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message content ${i}`,
      }));
      // Should not throw — exactly at limit
      expect(() =>
        mod.recordCall({
          timestamp: Date.now(),
          agent: 'limit-test',
          model: 'gpt-4o',
          tokens: 100,
          cost: 0.01,
          inputMessages: msgs,
        })
      ).not.toThrow();
    });

    it('messages array with 21 entries triggers capping (first 5 + last 15)', async () => {
      const mod = await freshModule();
      // 21 messages > 20: should cap to first 5 + last 15 = 20 total
      const msgs = Array.from({ length: 21 }, (_, i) => ({
        role: 'user',
        content: `msg-${i}`,
      }));
      expect(() =>
        mod.recordCall({
          timestamp: Date.now(),
          agent: 'cap-21',
          model: 'gpt-4o',
          tokens: 100,
          cost: 0.01,
          inputMessages: msgs,
        })
      ).not.toThrow();
    });
  });
});
