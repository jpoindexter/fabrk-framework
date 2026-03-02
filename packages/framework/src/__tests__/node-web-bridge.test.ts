import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import type { ServerResponse } from "node:http";
import { nodeToWebRequest, writeWebResponse } from "../runtime/node-web-bridge";
import type { Connect } from "vite";

function createMockNodeRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: string
): Connect.IncomingMessage {
  const readable = new Readable({
    read() {
      if (body) {
        this.push(Buffer.from(body));
      }
      this.push(null);
    },
  });

  Object.assign(readable, {
    method,
    url,
    headers: { ...headers },
  });

  return readable as unknown as Connect.IncomingMessage;
}

function createMockServerResponse(): {
  res: ServerResponse;
  getOutput: () => { statusCode: number; headers: Record<string, string>; body: string };
} {
  const chunks: Buffer[] = [];
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let _ended = false;

  // Minimal mock that avoids real socket writes
  const res = {
    statusCode: 200,
    setHeader(name: string, value: string | string[] | number) {
      headers[name.toLowerCase()] = String(value);
      return res;
    },
    write(chunk: unknown) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
      } else if (typeof chunk === "string") {
        chunks.push(Buffer.from(chunk));
      }
      return true;
    },
    end(...args: unknown[]) {
      if (args[0] && typeof args[0] === "string") {
        chunks.push(Buffer.from(args[0]));
      }
      _ended = true;
      return res;
    },
  } as unknown as ServerResponse;

  Object.defineProperty(res, "statusCode", {
    get: () => statusCode,
    set: (v: number) => { statusCode = v; },
  });

  return {
    res,
    getOutput: () => ({
      statusCode,
      headers,
      body: Buffer.concat(chunks).toString(),
    }),
  };
}

describe("nodeToWebRequest", () => {
  it("converts GET request", async () => {
    const nodeReq = createMockNodeRequest("GET", "/api/test", {
      "content-type": "application/json",
    });

    const webReq = await nodeToWebRequest(nodeReq, "/api/test");
    expect(webReq.method).toBe("GET");
    expect(webReq.url).toBe("http://localhost/api/test");
    expect(webReq.headers.get("content-type")).toBe("application/json");
  });

  it("converts POST request with body", async () => {
    const body = JSON.stringify({ message: "hello" });
    const nodeReq = createMockNodeRequest("POST", "/api/data", {
      "content-type": "application/json",
    }, body);

    const webReq = await nodeToWebRequest(nodeReq, "/api/data");
    expect(webReq.method).toBe("POST");
    const parsed = await webReq.json();
    expect(parsed.message).toBe("hello");
  });

  it("omits body for GET requests", async () => {
    const nodeReq = createMockNodeRequest("GET", "/api/test");
    const webReq = await nodeToWebRequest(nodeReq, "/api/test");
    expect(webReq.body).toBeNull();
  });

  it("rejects oversized bodies", async () => {
    const largeBody = "x".repeat(1024 * 1024 + 1);
    const readable = new Readable({
      read() {
        this.push(Buffer.from(largeBody));
        this.push(null);
      },
    });

    Object.assign(readable, {
      method: "POST",
      url: "/api/test",
      headers: {},
      destroy: () => {},
    });

    await expect(
      nodeToWebRequest(readable as unknown as Connect.IncomingMessage, "/api/test")
    ).rejects.toThrow("Request body too large");
  });
});

describe("writeWebResponse", () => {
  it("writes status code and headers", async () => {
    const { res, getOutput } = createMockServerResponse();
    const webRes = new Response("hello", {
      status: 201,
      headers: { "X-Custom": "test" },
    });

    await writeWebResponse(res, webRes);
    const output = getOutput();
    expect(output.statusCode).toBe(201);
    expect(output.headers["x-custom"]).toBe("test");
  });

  it("streams body content", async () => {
    const { res, getOutput } = createMockServerResponse();
    const webRes = new Response("streamed content", { status: 200 });

    await writeWebResponse(res, webRes);
    const output = getOutput();
    expect(output.body).toBe("streamed content");
  });

  it("handles empty body", async () => {
    const { res, getOutput } = createMockServerResponse();
    const webRes = new Response(null, { status: 204 });

    await writeWebResponse(res, webRes);
    const output = getOutput();
    expect(output.statusCode).toBe(204);
  });
});
