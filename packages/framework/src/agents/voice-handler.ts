import type { VoiceConfig } from "@fabrk/ai";
import { buildSecurityHeaders } from "../middleware/security";

const MAX_TTS_TEXT_LENGTH = 4096;
const MAX_STT_FILE_SIZE_MB = 25;
const MAX_STT_BODY_BYTES = MAX_STT_FILE_SIZE_MB * 1024 * 1024 + 4096; // file + form overhead

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
]);

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

export async function handleTTSRequest(
  req: Request,
  config: { voice?: VoiceConfig; openaiApiKey?: string; elevenlabsApiKey?: string },
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { text?: string; voice?: string; model?: string; speed?: number; format?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return jsonResponse({ error: "text field required" }, 400);
  }

  if (body.text.length > MAX_TTS_TEXT_LENGTH) {
    return jsonResponse({ error: `Text exceeds maximum length of ${MAX_TTS_TEXT_LENGTH}` }, 400);
  }

  if (body.speed !== undefined) {
    if (!Number.isFinite(body.speed) || body.speed < 0.25 || body.speed > 4.0) {
      return jsonResponse({ error: "Speed must be between 0.25 and 4.0" }, 400);
    }
  }

  const provider = config.voice?.tts?.provider || "openai";
  const ttsOpts = {
    voice: body.voice || config.voice?.tts?.defaultVoice,
    model: body.model || config.voice?.tts?.defaultModel,
    speed: body.speed,
    format: body.format as "mp3" | "opus" | "aac" | "flac" | "pcm" | undefined,
  };

  try {
    if (provider === "elevenlabs") {
      const apiKey = config.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;
      if (!apiKey) return jsonResponse({ error: "ElevenLabs API key not configured" }, 500);

      const { ElevenLabsTTSProvider } = await import("@fabrk/ai");
      const tts = new ElevenLabsTTSProvider(apiKey);
      const stream = await tts.synthesize(body.text, ttsOpts);

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked",
          ...buildSecurityHeaders(),
        },
      });
    }

    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return jsonResponse({ error: "OpenAI API key not configured" }, 500);

    const { OpenAITTSProvider, getTTSContentType } = await import("@fabrk/ai");
    const tts = new OpenAITTSProvider(apiKey);
    const stream = await tts.synthesize(body.text, ttsOpts);
    const contentType = getTTSContentType(ttsOpts.format || "mp3");

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Transfer-Encoding": "chunked",
        ...buildSecurityHeaders(),
      },
    });
  } catch (err) {
    console.error("[fabrk] TTS error:", err);
    return jsonResponse({ error: "TTS processing failed" }, 500);
  }
}

export async function handleSTTRequest(
  req: Request,
  config: { voice?: VoiceConfig; openaiApiKey?: string },
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse({ error: "Content-Type must be multipart/form-data" }, 400);
  }

  // Check content-length before reading body
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_STT_BODY_BYTES) {
    return jsonResponse({ error: `File too large (max ${MAX_STT_FILE_SIZE_MB}MB)` }, 413);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonResponse({ error: "Invalid multipart form data" }, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return jsonResponse({ error: "file field required (audio file)" }, 400);
  }

  const maxSizeMB = config.voice?.stt?.maxFileSizeMB ?? MAX_STT_FILE_SIZE_MB;
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return jsonResponse({ error: `File too large (max ${maxSizeMB}MB)` }, 413);
  }

  if (file.type && !ALLOWED_AUDIO_TYPES.has(file.type)) {
    return jsonResponse({
      error: `Unsupported audio type: ${file.type}`,
    }, 415);
  }

  const language = formData.get("language");
  const prompt = formData.get("prompt");
  const model = formData.get("model");

  try {
    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return jsonResponse({ error: "OpenAI API key not configured" }, 500);

    const { OpenAISTTProvider } = await import("@fabrk/ai");
    const stt = new OpenAISTTProvider(apiKey, maxSizeMB);
    const result = await stt.transcribe(file, {
      model: typeof model === "string" ? model : undefined,
      language: typeof language === "string" ? language : undefined,
      prompt: typeof prompt === "string" ? prompt : undefined,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
    });
  } catch (err) {
    console.error("[fabrk] STT error:", err);
    return jsonResponse({ error: "STT processing failed" }, 500);
  }
}
