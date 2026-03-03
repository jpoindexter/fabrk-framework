import type { VoiceSTTProvider, STTOptions, STTResult } from './types';
import { VOICE_DEFAULTS, ALLOWED_AUDIO_TYPES } from './types';

function validateAudioSize(size: number, maxMB: number): void {
  const maxBytes = maxMB * 1024 * 1024;
  if (size > maxBytes) {
    throw new Error(`Audio file exceeds maximum size of ${maxMB}MB`);
  }
}

function validateContentType(type: string): void {
  if (!ALLOWED_AUDIO_TYPES.has(type)) {
    throw new Error(
      `Unsupported audio type: ${type}. Allowed: ${Array.from(ALLOWED_AUDIO_TYPES).join(', ')}`
    );
  }
}

export class OpenAISTTProvider implements VoiceSTTProvider {
  private maxFileSizeMB: number;

  constructor(private apiKey: string, maxFileSizeMB?: number) {
    if (!apiKey) throw new Error('OpenAI API key required for STT');
    this.maxFileSizeMB = maxFileSizeMB ?? VOICE_DEFAULTS.stt.maxFileSizeMB;
  }

  async transcribe(audio: Blob | ArrayBuffer, opts?: STTOptions): Promise<STTResult> {
    const blob = audio instanceof Blob
      ? audio
      : new Blob([audio], { type: 'audio/wav' });

    validateAudioSize(blob.size, this.maxFileSizeMB);
    if (blob.type) validateContentType(blob.type);

    const formData = new FormData();
    formData.append('file', blob, 'audio.wav');
    formData.append('model', opts?.model || VOICE_DEFAULTS.stt.model);

    if (opts?.language) {
      formData.append('language', opts.language);
    }
    if (opts?.prompt) {
      formData.append('prompt', opts.prompt.slice(0, 500));
    }
    formData.append('response_format', 'verbose_json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI STT failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as {
      text: string;
      language?: string;
      duration?: number;
    };

    return {
      text: data.text,
      language: data.language,
      duration: data.duration,
    };
  }
}
