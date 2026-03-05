import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type WebSocketType from 'ws';
import { VOICE_DEFAULTS } from './types';

export interface RealtimeUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface RealtimeProxyOptions {
  apiKey: string;
  model?: string;
  turnDetection?: 'server_vad' | 'semantic_vad';
  onUsage?: (usage: RealtimeUsage) => void;
  onError?: (error: Error) => void;
  onAudioInterrupted?: () => void;
}

function extractUsageFromEvent(data: string): RealtimeUsage | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === 'response.done' && parsed.response?.usage) {
      const { input_tokens, output_tokens } = parsed.response.usage;
      if (typeof input_tokens === 'number' && typeof output_tokens === 'number') {
        return { inputTokens: input_tokens, outputTokens: output_tokens };
      }
    }
  } catch {
    // Not JSON or missing fields — ignore
  }
  return null;
}

function isAudioClearedEvent(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return parsed.type === 'input_audio_buffer.cleared';
  } catch {
    return false;
  }
}

export class RealtimeProxy {
  private currentUpstream: WebSocketType | null = null;

  interrupt(): void {
    if (this.currentUpstream && this.currentUpstream.readyState === 1 /* OPEN */) {
      try {
        this.currentUpstream.send(JSON.stringify({ type: 'response.cancel' }));
      } catch {
        // non-critical
      }
    }
  }

  async upgrade(
    _req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    options: RealtimeProxyOptions,
  ): Promise<void> {
    const { apiKey, model, onUsage, onError } = options;

    if (!apiKey) {
      socket.destroy(new Error('API key required for realtime'));
      return;
    }

    let WS: typeof WebSocketType;
    let WSServer: typeof WebSocketType.Server;
    try {
      const ws = await import('ws');
      WS = (ws.default ?? ws) as unknown as typeof WebSocketType;
      WSServer = (ws.default?.Server ?? ws.Server ?? (ws as Record<string, unknown>).WebSocketServer) as typeof WebSocketType.Server;
    } catch {
      socket.destroy(new Error('ws package not installed — add ws as a dependency'));
      return;
    }

    const realtimeModel = model || VOICE_DEFAULTS.realtime.model;
    const upstreamUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(realtimeModel)}`;

    const upstream = new WS(upstreamUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    this.currentUpstream = upstream;

    const wss = new WSServer({ noServer: true });

    wss.handleUpgrade(_req, socket, head, (clientWs: WebSocketType) => {
      wss.emit('connection', clientWs, _req);

      let upstreamOpen = false;
      let clientOpen = true;

      upstream.on('open', () => {
        upstreamOpen = true;
        if (options.turnDetection) {
          const turnDetectionConfig = options.turnDetection === 'semantic_vad'
            ? { type: 'semantic_vad' }
            : { type: 'server_vad' };
          try {
            upstream.send(JSON.stringify({
              type: 'session.update',
              session: { turn_detection: turnDetectionConfig },
            }));
          } catch {
            // non-critical
          }
        }
      });

      upstream.on('message', (data: Buffer | string) => {
        if (!clientOpen) return;
        try {
          const text = typeof data === 'string' ? data : data.toString('utf-8');

          const usage = extractUsageFromEvent(text);
          if (usage && onUsage) {
            onUsage(usage);
          }

          // Intercept input_audio_buffer.cleared → emit audio_interrupted to client
          if (isAudioClearedEvent(text)) {
            options.onAudioInterrupted?.();
            clientWs.send(JSON.stringify({ type: 'audio_interrupted' }));
            return;
          }

          clientWs.send(text);
        } catch { /* ignored */ }
      });

      upstream.on('close', () => {
        upstreamOpen = false;
        if (this.currentUpstream === upstream) {
          this.currentUpstream = null;
        }
        if (clientOpen) {
          clientWs.close(1000, 'Upstream closed');
        }
      });

      upstream.on('error', (err: Error) => {
        onError?.(err);
        if (clientOpen) {
          clientWs.close(1011, 'Upstream error');
        }
      });

      clientWs.on('message', (data: Buffer | string) => {
        if (!upstreamOpen) return;
        try {
          upstream.send(typeof data === 'string' ? data : data.toString('utf-8'));
        } catch { /* ignored */ }
      });

      clientWs.on('close', () => {
        clientOpen = false;
        if (upstreamOpen) {
          upstream.close();
        }
      });

      clientWs.on('error', (err: Error) => {
        onError?.(err);
        clientOpen = false;
        if (upstreamOpen) {
          upstream.close();
        }
      });
    });
  }
}
