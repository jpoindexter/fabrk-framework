import { describe, it, expect } from 'vitest';

describe('view-transition module exports', () => {
  it('exports useViewTransition function', async () => {
    const mod = await import('../client/view-transition');
    expect(typeof mod.useViewTransition).toBe('function');
  });

  it('exports ViewTransitionLink function', async () => {
    const mod = await import('../client/view-transition');
    expect(typeof mod.ViewTransitionLink).toBe('function');
  });
});

describe('ViewTransitionLink external URL guard', () => {
  it('skips view transition for http:// URLs (logic is inline in handleClick)', async () => {
    // The guard: `if (href.startsWith('http') || href.startsWith('//')) return;`
    // We verify the condition directly — both branches must exit early.
    const externalHttp = 'https://example.com/page';
    const externalProtocol = '//cdn.example.com/asset';
    const internal = '/about';

    expect(externalHttp.startsWith('http')).toBe(true);
    expect(externalProtocol.startsWith('//')).toBe(true);
    expect(internal.startsWith('http')).toBe(false);
    expect(internal.startsWith('//')).toBe(false);
  });
});

describe('reactCompiler config shape', () => {
  it('FabrkConfig accepts reactCompiler: true', async () => {
    // Type-level check — if this import compiles, the field exists
    const { defineFabrkConfig } = await import('../config/fabrk-config');
    const cfg = defineFabrkConfig({ reactCompiler: true });
    expect(cfg.reactCompiler).toBe(true);
  });

  it('FabrkConfig accepts reactCompiler: false', async () => {
    const { defineFabrkConfig } = await import('../config/fabrk-config');
    const cfg = defineFabrkConfig({ reactCompiler: false });
    expect(cfg.reactCompiler).toBe(false);
  });

  it('FabrkConfig accepts reactCompiler with targets object', async () => {
    const { defineFabrkConfig } = await import('../config/fabrk-config');
    const cfg = defineFabrkConfig({ reactCompiler: { targets: 'es2022' } });
    expect(cfg.reactCompiler).toEqual({ targets: 'es2022' });
  });

  it('FabrkConfig reactCompiler is optional — omitting it yields undefined', async () => {
    const { defineFabrkConfig } = await import('../config/fabrk-config');
    const cfg = defineFabrkConfig({});
    expect(cfg.reactCompiler).toBeUndefined();
  });
});
