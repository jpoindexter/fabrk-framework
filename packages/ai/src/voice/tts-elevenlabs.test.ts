import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElevenLabsTTSProvider } from './tts-elevenlabs';

describe('ElevenLabsTTSProvider', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws if API key is empty', () => {
    expect(() => new ElevenLabsTTSProvider('')).toThrow('API key required');
  });

  it('rejects empty text', async () => {
    const tts = new ElevenLabsTTSProvider('test-key');
    await expect(tts.synthesize('')).rejects.toThrow('must not be empty');
  });

  it('rejects text exceeding max length', async () => {
    const tts = new ElevenLabsTTSProvider('test-key');
    const longText = 'a'.repeat(4097);
    await expect(tts.synthesize(longText)).rejects.toThrow('maximum length');
  });

  it('calls ElevenLabs API with correct parameters', async () => {
    const stream = new ReadableStream();
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const tts = new ElevenLabsTTSProvider('test-key');
    const result = await tts.synthesize('Hello world', { voice: 'my-voice-id', model: 'eleven_multilingual_v2' });

    expect(result).toBe(stream);
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/my-voice-id');
    expect(opts.method).toBe('POST');
    expect(opts.headers['xi-api-key']).toBe('test-key');

    const body = JSON.parse(opts.body);
    expect(body.text).toBe('Hello world');
    expect(body.model_id).toBe('eleven_multilingual_v2');
  });

  it('uses default voice ID when none provided', async () => {
    const stream = new ReadableStream();
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const tts = new ElevenLabsTTSProvider('test-key');
    await tts.synthesize('Hello');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/v1/text-to-speech/');
  });

  it('URL-encodes voice ID', async () => {
    const stream = new ReadableStream();
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const tts = new ElevenLabsTTSProvider('test-key');
    await tts.synthesize('Hello', { voice: 'voice/with spaces' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('voice%2Fwith%20spaces');
  });

  it('includes speed in voice_settings when provided', async () => {
    const stream = new ReadableStream();
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const tts = new ElevenLabsTTSProvider('test-key');
    await tts.synthesize('Hello', { speed: 1.5 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.voice_settings).toBeDefined();
    expect(body.voice_settings.speed).toBe(1.5);
  });

  it('rejects invalid speed', async () => {
    const tts = new ElevenLabsTTSProvider('test-key');
    await expect(tts.synthesize('test', { speed: 5.0 })).rejects.toThrow('Speed must be');
    await expect(tts.synthesize('test', { speed: 0.1 })).rejects.toThrow('Speed must be');
  });

  it('throws on API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const tts = new ElevenLabsTTSProvider('bad-key');
    await expect(tts.synthesize('Hello')).rejects.toThrow('ElevenLabs TTS failed (401)');
  });

  it('throws when response has no body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, body: null });

    const tts = new ElevenLabsTTSProvider('test-key');
    await expect(tts.synthesize('Hello')).rejects.toThrow('returned no body');
  });
});
