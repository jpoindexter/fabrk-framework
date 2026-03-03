import type { VoiceTTSProvider, TTSOptions } from './types';
import { TTS_MAX_TEXT_LENGTH } from './types';

const ELEVENLABS_DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const ELEVENLABS_DEFAULT_MODEL = 'eleven_monolingual_v1';

function validateInput(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new Error('Text must not be empty');
  }
  if (text.length > TTS_MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${TTS_MAX_TEXT_LENGTH} characters`);
  }
}

export class ElevenLabsTTSProvider implements VoiceTTSProvider {
  constructor(private apiKey: string) {
    if (!apiKey) throw new Error('ElevenLabs API key required for TTS');
  }

  async synthesize(text: string, opts?: TTSOptions): Promise<ReadableStream<Uint8Array>> {
    validateInput(text);

    const voiceId = opts?.voice || ELEVENLABS_DEFAULT_VOICE_ID;
    const modelId = opts?.model || ELEVENLABS_DEFAULT_MODEL;

    const body: Record<string, unknown> = {
      text,
      model_id: modelId,
    };

    if (opts?.speed !== undefined) {
      if (!Number.isFinite(opts.speed) || opts.speed < 0.25 || opts.speed > 4.0) {
        throw new Error('Speed must be between 0.25 and 4.0');
      }
      body.voice_settings = { stability: 0.5, similarity_boost: 0.75, speed: opts.speed };
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ElevenLabs TTS failed (${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error('ElevenLabs TTS returned no body');
    }

    return response.body;
  }
}
