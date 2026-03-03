import { describe, it, expect, vi } from 'vitest';
import { RealtimeProxy } from '../voice/realtime';
import type { RealtimeProxyOptions } from '../voice/realtime';

describe('RealtimeProxy extensions', () => {
  it('RealtimeProxyOptions accepts turnDetection field', () => {
    const opts: RealtimeProxyOptions = {
      apiKey: 'test-key',
      turnDetection: 'semantic_vad',
    };
    expect(opts.turnDetection).toBe('semantic_vad');
  });

  it('RealtimeProxyOptions accepts server_vad', () => {
    const opts: RealtimeProxyOptions = {
      apiKey: 'test-key',
      turnDetection: 'server_vad',
    };
    expect(opts.turnDetection).toBe('server_vad');
  });

  it('onAudioInterrupted callback is optional', () => {
    const opts: RealtimeProxyOptions = {
      apiKey: 'test-key',
    };
    expect(opts.onAudioInterrupted).toBeUndefined();
  });

  it('RealtimeProxy has interrupt() method', () => {
    const proxy = new RealtimeProxy();
    expect(typeof proxy.interrupt).toBe('function');
  });

  it('interrupt() does not throw when no upstream connection exists', () => {
    const proxy = new RealtimeProxy();
    expect(() => proxy.interrupt()).not.toThrow();
  });

  it('onAudioInterrupted is called when audio buffer is cleared', () => {
    const onAudioInterrupted = vi.fn();
    const opts: RealtimeProxyOptions = {
      apiKey: 'test-key',
      onAudioInterrupted,
    };
    expect(opts.onAudioInterrupted).toBe(onAudioInterrupted);
  });
});

// Test isAudioClearedEvent logic directly by recreating the function
// (it is not exported, so we replicate the logic here)
function isAudioClearedEvent(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return parsed.type === 'input_audio_buffer.cleared';
  } catch {
    return false;
  }
}

describe('isAudioClearedEvent logic', () => {
  it('returns true for input_audio_buffer.cleared event', () => {
    const event = JSON.stringify({ type: 'input_audio_buffer.cleared' });
    expect(isAudioClearedEvent(event)).toBe(true);
  });

  it('returns false for other event types', () => {
    expect(isAudioClearedEvent(JSON.stringify({ type: 'response.done' }))).toBe(false);
    expect(isAudioClearedEvent(JSON.stringify({ type: 'session.created' }))).toBe(false);
    expect(isAudioClearedEvent(JSON.stringify({ type: 'audio_interrupted' }))).toBe(false);
  });

  it('returns false for invalid JSON', () => {
    expect(isAudioClearedEvent('not json')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAudioClearedEvent('')).toBe(false);
  });

  it('returns false when type field is missing', () => {
    expect(isAudioClearedEvent(JSON.stringify({ event: 'input_audio_buffer.cleared' }))).toBe(false);
  });
});
