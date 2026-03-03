import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleTTSRequest, handleSTTRequest } from "../agents/voice-handler";

// Mock @fabrk/ai to avoid real API calls
vi.mock("@fabrk/ai", () => {
  const mockSynthesize = vi.fn().mockResolvedValue(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    }),
  );

  const mockTranscribe = vi.fn().mockResolvedValue({
    text: "transcribed text",
    language: "en",
    duration: 1.5,
  });

  return {
    OpenAITTSProvider: vi.fn().mockImplementation(() => ({
      synthesize: mockSynthesize,
    })),
    ElevenLabsTTSProvider: vi.fn().mockImplementation(() => ({
      synthesize: mockSynthesize,
    })),
    OpenAISTTProvider: vi.fn().mockImplementation(() => ({
      transcribe: mockTranscribe,
    })),
    getTTSContentType: vi.fn().mockReturnValue("audio/mpeg"),
    __mockSynthesize: mockSynthesize,
    __mockTranscribe: mockTranscribe,
  };
});

describe("handleTTSRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects non-POST requests", async () => {
    const req = new Request("http://localhost/__ai/tts", { method: "GET" });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(405);
  });

  it("rejects invalid JSON body", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid JSON");
  });

  it("rejects missing text field", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("text field required");
  });

  it("rejects empty text", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(400);
  });

  it("rejects text exceeding max length", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "a".repeat(4097) }),
    });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("maximum length");
  });

  it("rejects invalid speed", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello", speed: 5.0 }),
    });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Speed must be");
  });

  it("rejects NaN speed", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello", speed: "invalid" }),
    });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(400);
  });

  it("returns audio stream with OpenAI provider", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello world" }),
    });
    const res = await handleTTSRequest(req, { voice: { enabled: true } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.body).toBeTruthy();
  });

  it("returns audio stream with ElevenLabs provider", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello world" }),
    });
    const res = await handleTTSRequest(req, {
      voice: { enabled: true, tts: { provider: "elevenlabs" } },
      elevenlabsApiKey: "el-key",
    });
    expect(res.status).toBe(200);
  });

  it("returns 500 when no API key configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello" }),
    });
    const res = await handleTTSRequest(req, {});
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("not configured");
  });

  it("includes security headers on all responses", async () => {
    const req = new Request("http://localhost/__ai/tts", { method: "GET" });
    const res = await handleTTSRequest(req, {});
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("includes security headers on success response", async () => {
    const req = new Request("http://localhost/__ai/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello" }),
    });
    const res = await handleTTSRequest(req, { voice: { enabled: true } });
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});

describe("handleSTTRequest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects non-POST requests", async () => {
    const req = new Request("http://localhost/__ai/stt", { method: "GET" });
    const res = await handleSTTRequest(req, {});
    expect(res.status).toBe(405);
  });

  it("rejects non-multipart content type", async () => {
    const req = new Request("http://localhost/__ai/stt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await handleSTTRequest(req, {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("multipart/form-data");
  });

  it("returns transcription on valid request", async () => {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(100)], { type: "audio/wav" }), "audio.wav");

    const req = new Request("http://localhost/__ai/stt", {
      method: "POST",
      body: formData,
    });
    const res = await handleSTTRequest(req, { voice: { enabled: true } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe("transcribed text");
    expect(data.language).toBe("en");
    expect(data.duration).toBe(1.5);
  });

  it("includes security headers on all responses", async () => {
    const req = new Request("http://localhost/__ai/stt", { method: "GET" });
    const res = await handleSTTRequest(req, {});
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("returns 500 when no API key configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(100)], { type: "audio/wav" }), "audio.wav");

    const req = new Request("http://localhost/__ai/stt", {
      method: "POST",
      body: formData,
    });
    const res = await handleSTTRequest(req, {});
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("not configured");
  });
});
