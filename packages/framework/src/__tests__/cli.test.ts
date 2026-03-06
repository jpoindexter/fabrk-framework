import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli/parse-args";

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
    expect(source).toContain("case \"agents\":");
    expect(source).toContain("case \"check\":");
    expect(source).toContain("case \"test\":");

    expect(source).toContain("runDev");
    expect(source).toContain("runBuild");
    expect(source).toContain("runStart");
    expect(source).toContain("runCheck");
    expect(source).toContain("runTest");
  });

  it("cli.ts has correct version", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const cliPath = path.resolve(__dirname, "../cli.ts");
    const source = fs.readFileSync(cliPath, "utf-8");

    expect(source).toMatch(/VERSION\s*=\s*"/);
  });
});
