export interface VoiceTTSProvider {
  synthesize(text: string, opts?: TTSOptions): Promise<ReadableStream<Uint8Array>>;
}

export interface VoiceSTTProvider {
  transcribe(audio: Blob | ArrayBuffer, opts?: STTOptions): Promise<STTResult>;
}

export interface TTSOptions {
  voice?: string;
  model?: string;
  speed?: number;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'pcm';
}

export interface STTOptions {
  model?: string;
  language?: string;
  prompt?: string;
}

export interface STTResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface VoiceConfig {
  enabled?: boolean;
  tts?: {
    provider?: 'openai' | 'elevenlabs';
    defaultVoice?: string;
    defaultModel?: string;
  };
  stt?: {
    provider?: 'openai';
    maxFileSizeMB?: number;
  };
  realtime?: {
    enabled?: boolean;
    model?: string;
  };
}

export const VOICE_DEFAULTS = {
  tts: {
    voice: 'alloy',
    model: 'tts-1',
    speed: 1.0,
    format: 'mp3' as const,
  },
  stt: {
    model: 'whisper-1',
    maxFileSizeMB: 25,
  },
  realtime: {
    model: 'gpt-4o-realtime-preview',
  },
} as const;

export const ALLOWED_TTS_FORMATS = new Set(['mp3', 'opus', 'aac', 'flac', 'pcm']);

export const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
]);

export const TTS_MAX_TEXT_LENGTH = 4096;
export const TTS_MIN_SPEED = 0.25;
export const TTS_MAX_SPEED = 4.0;
