import type { VoiceTTSProvider, TTSOptions } from './types';
import {
  VOICE_DEFAULTS,
  TTS_MAX_TEXT_LENGTH,
  TTS_MIN_SPEED,
  TTS_MAX_SPEED,
  ALLOWED_TTS_FORMATS,
} from './types';

function validateTTSInput(text: string, opts?: TTSOptions): void {
  if (!text || text.trim().length === 0) {
    throw new Error('Text must not be empty');
  }
  if (text.length > TTS_MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${TTS_MAX_TEXT_LENGTH} characters`);
  }
  if (opts?.speed !== undefined) {
    if (!Number.isFinite(opts.speed) || opts.speed < TTS_MIN_SPEED || opts.speed > TTS_MAX_SPEED) {
      throw new Error(`Speed must be between ${TTS_MIN_SPEED} and ${TTS_MAX_SPEED}`);
    }
  }
  if (opts?.format && !ALLOWED_TTS_FORMATS.has(opts.format)) {
    throw new Error(`Invalid format: ${opts.format}`);
  }
}

const FORMAT_CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  opus: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  pcm: 'audio/pcm',
};

export function getTTSContentType(format: string): string {
  return FORMAT_CONTENT_TYPES[format] || 'audio/mpeg';
}

export class OpenAITTSProvider implements VoiceTTSProvider {
  constructor(private apiKey: string) {
    if (!apiKey) throw new Error('OpenAI API key required for TTS');
  }

  async synthesize(text: string, opts?: TTSOptions): Promise<ReadableStream<Uint8Array>> {
    validateTTSInput(text, opts);

    const body = {
      model: opts?.model || VOICE_DEFAULTS.tts.model,
      input: text,
      voice: opts?.voice || VOICE_DEFAULTS.tts.voice,
      speed: opts?.speed ?? VOICE_DEFAULTS.tts.speed,
      response_format: opts?.format || VOICE_DEFAULTS.tts.format,
    };

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI TTS failed (${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error('OpenAI TTS returned no body');
    }

    return response.body;
  }
}
