import { describe, it, expect, vi } from 'vitest';
import { runGuardrailsParallel, maxLength, denyList } from '../agents/guardrails';
import type { AsyncGuardrail } from '../agents/guardrails';

const ctx = { agentName: 'test', sessionId: 's1', direction: 'input' as const };

describe('runGuardrailsParallel', () => {
  it('all pass — returns original content', async () => {
    const result = await runGuardrailsParallel([maxLength(100)], 'hello', ctx);
    expect(result.blocked).toBe(false);
    expect(result.content).toBe('hello');
  });

  it('blocks when any guardrail blocks', async () => {
    const result = await runGuardrailsParallel(
      [maxLength(100), denyList([/banned/])],
      'this is banned',
      ctx
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('banned');
  });

  it('runs all guards in parallel — spy verifies all called', async () => {
    const spy1 = vi.fn(() => ({ pass: true as const }));
    const spy2 = vi.fn(() => ({ pass: true as const }));
    await runGuardrailsParallel([spy1, spy2], 'hello', ctx);
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
  });

  it('accepts async guardrails', async () => {
    const asyncGuard: AsyncGuardrail = async (content) => {
      await Promise.resolve(); // simulate async work
      return content.includes('bad') ? { pass: false, reason: 'bad content' } : { pass: true };
    };
    const r1 = await runGuardrailsParallel([asyncGuard], 'good content', ctx);
    expect(r1.blocked).toBe(false);
    const r2 = await runGuardrailsParallel([asyncGuard], 'bad content', ctx);
    expect(r2.blocked).toBe(true);
  });

  it('applies replacements from passing guards', async () => {
    const redactor: AsyncGuardrail = async (content) => ({
      pass: true,
      replacement: content.replace('secret', '[REDACTED]'),
    });
    const result = await runGuardrailsParallel([redactor], 'my secret is here', ctx);
    expect(result.content).toBe('my [REDACTED] is here');
  });

  it('empty guards array returns original content', async () => {
    const result = await runGuardrailsParallel([], 'hello', ctx);
    expect(result.blocked).toBe(false);
    expect(result.content).toBe('hello');
  });
});
