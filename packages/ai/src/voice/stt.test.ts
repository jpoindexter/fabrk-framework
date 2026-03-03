import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAISTTProvider } from './stt';

describe('OpenAISTTProvider', () => {
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
    expect(() => new OpenAISTTProvider('')).toThrow('API key required');
  });

  it('rejects oversized files (default 25MB)', async () => {
    const stt = new OpenAISTTProvider('test-key');
    const largeBlob = new Blob([new Uint8Array(26 * 1024 * 1024)], { type: 'audio/wav' });
    await expect(stt.transcribe(largeBlob)).rejects.toThrow('maximum size of 25MB');
  });

  it('rejects oversized files with custom limit', async () => {
    const stt = new OpenAISTTProvider('test-key', 10);
    const blob = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: 'audio/wav' });
    await expect(stt.transcribe(blob)).rejects.toThrow('maximum size of 10MB');
  });

  it('accepts files within size limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'hello', language: 'en', duration: 1.5 }),
    });

    const stt = new OpenAISTTProvider('test-key');
    const blob = new Blob([new Uint8Array(1024)], { type: 'audio/wav' });
    const result = await stt.transcribe(blob);
    expect(result.text).toBe('hello');
  });

  it('rejects unsupported audio type', async () => {
    const stt = new OpenAISTTProvider('test-key');
    const blob = new Blob([new Uint8Array(100)], { type: 'video/mp4' });
    await expect(stt.transcribe(blob)).rejects.toThrow('Unsupported audio type');
  });

  it('accepts all allowed audio types', async () => {
    const stt = new OpenAISTTProvider('test-key');
    const types = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac'];

    for (const type of types) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'test' }),
      });
      const blob = new Blob([new Uint8Array(100)], { type });
      const result = await stt.transcribe(blob);
      expect(result.text).toBe('test');
    }
  });

  it('calls OpenAI API with correct parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'transcribed text', language: 'en', duration: 3.2 }),
    });

    const stt = new OpenAISTTProvider('test-key');
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    const result = await stt.transcribe(blob, {
      model: 'whisper-1',
      language: 'en',
      prompt: 'context hint',
    });

    expect(result).toEqual({
      text: 'transcribed text',
      language: 'en',
      duration: 3.2,
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer test-key');
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it('handles ArrayBuffer input', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'from buffer' }),
    });

    const stt = new OpenAISTTProvider('test-key');
    const buffer = new ArrayBuffer(100);
    const result = await stt.transcribe(buffer);
    expect(result.text).toBe('from buffer');
  });

  it('truncates prompt to 500 characters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'test' }),
    });

    const stt = new OpenAISTTProvider('test-key');
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    const longPrompt = 'x'.repeat(1000);
    await stt.transcribe(blob, { prompt: longPrompt });

    const formData = mockFetch.mock.calls[0][1].body as FormData;
    const promptValue = formData.get('prompt') as string;
    expect(promptValue.length).toBe(500);
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad request',
    });

    const stt = new OpenAISTTProvider('test-key');
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    await expect(stt.transcribe(blob)).rejects.toThrow('OpenAI STT failed (400)');
  });

  it('uses default model when not specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'test' }),
    });

    const stt = new OpenAISTTProvider('test-key');
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    await stt.transcribe(blob);

    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.get('model')).toBe('whisper-1');
  });

  it('requests verbose_json response format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'test' }),
    });

    const stt = new OpenAISTTProvider('test-key');
    const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    await stt.transcribe(blob);

    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.get('response_format')).toBe('verbose_json');
  });
});
