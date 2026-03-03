import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAITTSProvider, getTTSContentType } from './tts';

describe('OpenAITTSProvider', () => {
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
    expect(() => new OpenAITTSProvider('')).toThrow('API key required');
  });

  it('rejects empty text', async () => {
    const tts = new OpenAITTSProvider('test-key');
    await expect(tts.synthesize('')).rejects.toThrow('must not be empty');
  });

  it('rejects whitespace-only text', async () => {
    const tts = new OpenAITTSProvider('test-key');
    await expect(tts.synthesize('   ')).rejects.toThrow('must not be empty');
  });

  it('rejects text exceeding max length', async () => {
    const tts = new OpenAITTSProvider('test-key');
    const longText = 'a'.repeat(4097);
    await expect(tts.synthesize(longText)).rejects.toThrow('maximum length');
  });

  it('rejects invalid speed below minimum', async () => {
    const tts = new OpenAITTSProvider('test-key');
    await expect(tts.synthesize('hello', { speed: 0.1 })).rejects.toThrow('Speed must be');
  });

  it('rejects invalid speed above maximum', async () => {
    const tts = new OpenAITTSProvider('test-key');
    await expect(tts.synthesize('hello', { speed: 5.0 })).rejects.toThrow('Speed must be');
  });

  it('rejects NaN speed', async () => {
    const tts = new OpenAITTSProvider('test-key');
    await expect(tts.synthesize('hello', { speed: NaN })).rejects.toThrow('Speed must be');
  });

  it('rejects Infinity speed', async () => {
    const tts = new OpenAITTSProvider('test-key');
    await expect(tts.synthesize('hello', { speed: Infinity })).rejects.toThrow('Speed must be');
  });

  it('rejects invalid format', async () => {
    const tts = new OpenAITTSProvider('test-key');
    await expect(
      tts.synthesize('hello', { format: 'wav' as 'mp3' })
    ).rejects.toThrow('Invalid format');
  });

  it('calls OpenAI API with correct parameters', async () => {
    const stream = new ReadableStream();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const tts = new OpenAITTSProvider('test-key');
    const result = await tts.synthesize('Hello world', {
      voice: 'nova',
      model: 'tts-1-hd',
      speed: 1.5,
      format: 'opus',
    });

    expect(result).toBe(stream);
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/audio/speech');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer test-key');

    const body = JSON.parse(opts.body);
    expect(body.model).toBe('tts-1-hd');
    expect(body.input).toBe('Hello world');
    expect(body.voice).toBe('nova');
    expect(body.speed).toBe(1.5);
    expect(body.response_format).toBe('opus');
  });

  it('uses default values when options not provided', async () => {
    const stream = new ReadableStream();
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const tts = new OpenAITTSProvider('test-key');
    await tts.synthesize('Hello');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('tts-1');
    expect(body.voice).toBe('alloy');
    expect(body.speed).toBe(1.0);
    expect(body.response_format).toBe('mp3');
  });

  it('throws on API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const tts = new OpenAITTSProvider('bad-key');
    await expect(tts.synthesize('Hello')).rejects.toThrow('OpenAI TTS failed (401)');
  });

  it('throws when response has no body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: null,
    });

    const tts = new OpenAITTSProvider('test-key');
    await expect(tts.synthesize('Hello')).rejects.toThrow('returned no body');
  });

  it('accepts boundary speed values', async () => {
    const stream = new ReadableStream();
    mockFetch.mockResolvedValue({ ok: true, body: stream });

    const tts = new OpenAITTSProvider('test-key');
    await tts.synthesize('test', { speed: 0.25 });
    await tts.synthesize('test', { speed: 4.0 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('getTTSContentType', () => {
  it('returns correct MIME types', () => {
    expect(getTTSContentType('mp3')).toBe('audio/mpeg');
    expect(getTTSContentType('opus')).toBe('audio/ogg');
    expect(getTTSContentType('aac')).toBe('audio/aac');
    expect(getTTSContentType('flac')).toBe('audio/flac');
    expect(getTTSContentType('pcm')).toBe('audio/pcm');
  });

  it('defaults to audio/mpeg for unknown format', () => {
    expect(getTTSContentType('unknown')).toBe('audio/mpeg');
  });
});
