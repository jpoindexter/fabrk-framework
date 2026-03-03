import { describe, it, expect } from 'vitest';
import { buildHref } from '../client/typed-navigation';

describe('buildHref', () => {
  it('returns pattern unchanged when no params provided', () => {
    expect(buildHref('/about')).toBe('/about');
    expect(buildHref('/blog')).toBe('/blog');
  });

  it('substitutes [param] with string value', () => {
    expect(buildHref('/blog/[slug]', { slug: 'hello-world' })).toBe('/blog/hello-world');
  });

  it('substitutes [param] with multiple params', () => {
    expect(buildHref('/users/[id]/posts/[postId]', { id: '42', postId: '99' }))
      .toBe('/users/42/posts/99');
  });

  it('substitutes [...param] with joined array', () => {
    expect(buildHref('/docs/[...path]', { path: ['guide', 'intro'] })).toBe('/docs/guide/intro');
  });

  it('substitutes [[...param]] (optional catch-all) with joined array', () => {
    expect(buildHref('/docs/[[...path]]', { path: ['a', 'b', 'c'] })).toBe('/docs/a/b/c');
  });

  it('substitutes [[...param]] before [...param] to avoid partial match', () => {
    // The pattern has [[...key]] which must be replaced, not [key] leftover
    const result = buildHref('/x/[[...slug]]', { slug: ['foo', 'bar'] });
    expect(result).toBe('/x/foo/bar');
    expect(result).not.toContain('[');
  });

  it('handles string value for catch-all param', () => {
    expect(buildHref('/[...rest]', { rest: 'single' })).toBe('/single');
  });

  it('leaves unmatched segments intact', () => {
    // Only 'id' is provided; '[name]' remains in the output
    const result = buildHref('/[id]/[name]', { id: '5' });
    expect(result).toBe('/5/[name]');
  });

  it('returns pattern unchanged when params is empty object', () => {
    expect(buildHref('/blog/[slug]', {})).toBe('/blog/[slug]');
  });

  it('handles numeric-looking string values', () => {
    expect(buildHref('/items/[id]', { id: '123' })).toBe('/items/123');
  });
});
