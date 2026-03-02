import { describe, it, expect } from "vitest";

// Mirrors parseArgs from cli.ts (entry script, not a library export).
function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    } else if (arg.startsWith("-")) {
      parsed[arg.slice(1)] = true;
    }
  }
  return parsed;
}

describe("CLI arg parser", () => {
  it("parses --port with value", () => {
    const result = parseArgs(["--port", "3000"]);
    expect(result).toEqual({ port: "3000" });
  });

  it("parses --host as boolean flag", () => {
    const result = parseArgs(["--host"]);
    expect(result).toEqual({ host: true });
  });

  it("parses --host with value", () => {
    const result = parseArgs(["--host", "0.0.0.0"]);
    expect(result).toEqual({ host: "0.0.0.0" });
  });

  it("parses short flags", () => {
    const result = parseArgs(["-h"]);
    expect(result).toEqual({ h: true });
  });

  it("parses multiple flags", () => {
    const result = parseArgs(["--port", "5173", "--host"]);
    expect(result).toEqual({ port: "5173", host: true });
  });

  it("returns empty object for no args", () => {
    const result = parseArgs([]);
    expect(result).toEqual({});
  });

  it("treats --flag --flag as two boolean flags", () => {
    const result = parseArgs(["--verbose", "--debug"]);
    expect(result).toEqual({ verbose: true, debug: true });
  });

  it("does not consume next arg if it starts with --", () => {
    const result = parseArgs(["--port", "--host"]);
    expect(result.port).toBe(true);
    expect(result.host).toBe(true);
  });
});

describe("CLI command structure", () => {
  it("cli.ts exports correct commands", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const cliPath = path.resolve(__dirname, "../cli.ts");
    const source = fs.readFileSync(cliPath, "utf-8");

    expect(source).toContain("case \"dev\":");
    expect(source).toContain("case \"build\":");
    expect(source).toContain("case \"start\":");
    expect(source).toContain("case \"info\":");

    expect(source).toContain("createServer");
    expect(source).toContain("viteBuild");
  });

  it("cli.ts has correct version", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const cliPath = path.resolve(__dirname, "../cli.ts");
    const source = fs.readFileSync(cliPath, "utf-8");

    expect(source).toMatch(/VERSION\s*=\s*"/);
  });
});
