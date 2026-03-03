import { describe, it, expect } from "vitest";
import {
  generateActionId,
  _hasFileLevelDirective,
  _findInlineServerFunctions,
  _extractExports,
  _transformClient,
  _transformServer,
} from "../runtime/server-action-transform";

// ---------------------------------------------------------------------------
// generateActionId
// ---------------------------------------------------------------------------

describe("generateActionId", () => {
  it("produces stable IDs for same input", () => {
    const id1 = generateActionId("/app/actions.ts", "saveUser");
    const id2 = generateActionId("/app/actions.ts", "saveUser");
    expect(id1).toBe(id2);
  });

  it("produces different IDs for different functions", () => {
    const id1 = generateActionId("/app/actions.ts", "saveUser");
    const id2 = generateActionId("/app/actions.ts", "deleteUser");
    expect(id1).not.toBe(id2);
  });

  it("produces different IDs for different files", () => {
    const id1 = generateActionId("/app/actions.ts", "save");
    const id2 = generateActionId("/app/other.ts", "save");
    expect(id1).not.toBe(id2);
  });

  it("returns 16-char hex string", () => {
    const id = generateActionId("/file.ts", "fn");
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ---------------------------------------------------------------------------
// hasFileLevelDirective
// ---------------------------------------------------------------------------

describe("hasFileLevelDirective", () => {
  it("detects double-quoted directive", () => {
    expect(_hasFileLevelDirective('"use server"\n\nexport function a() {}')).toBe(true);
  });

  it("detects single-quoted directive with semicolon", () => {
    expect(_hasFileLevelDirective("'use server';\n\nexport function a() {}")).toBe(true);
  });

  it("skips leading comments and blank lines", () => {
    const code = `// comment\n\n"use server"\n\nexport function a() {}`;
    expect(_hasFileLevelDirective(code)).toBe(true);
  });

  it("returns false when no directive", () => {
    expect(_hasFileLevelDirective("export function a() {}")).toBe(false);
  });

  it("returns false when directive is not first statement", () => {
    expect(_hasFileLevelDirective('import x from "y"\n"use server"')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findInlineServerFunctions
// ---------------------------------------------------------------------------

describe("findInlineServerFunctions", () => {
  it("finds function with inline directive", () => {
    const code = `
export async function saveUser(data) {
  "use server";
  await db.save(data);
}

export function other() {
  return 1;
}`;
    const result = _findInlineServerFunctions(code);
    expect(result.has("saveUser")).toBe(true);
    expect(result.has("other")).toBe(false);
  });

  it("finds multiple inline server functions", () => {
    const code = `
export async function save(d) {
  "use server";
  return d;
}

export function del(id) {
  "use server";
  return id;
}`;
    const result = _findInlineServerFunctions(code);
    expect(result.size).toBe(2);
    expect(result.has("save")).toBe(true);
    expect(result.has("del")).toBe(true);
  });

  it("returns empty set when no inline directives", () => {
    expect(_findInlineServerFunctions("export function a() { return 1; }").size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// extractExports
// ---------------------------------------------------------------------------

describe("extractExports", () => {
  it("extracts named function exports", () => {
    const code = "export function save() {}\nexport async function load() {}";
    const exports = _extractExports(code);
    expect(exports).toEqual([
      { name: "save", isDefault: false, isAsync: false },
      { name: "load", isDefault: false, isAsync: true },
    ]);
  });

  it("extracts export const arrow functions", () => {
    const code = "export const handler = async () => {}";
    const exports = _extractExports(code);
    expect(exports.some((e) => e.name === "handler" && e.isAsync)).toBe(true);
  });

  it("extracts named default export", () => {
    const code = "export default async function submitForm() {}";
    const exports = _extractExports(code);
    expect(exports.some((e) => e.name === "submitForm" && e.isDefault)).toBe(true);
  });

  it("extracts anonymous default export", () => {
    const code = "export default async function() {}";
    const exports = _extractExports(code);
    expect(exports.some((e) => e.name === "default" && e.isDefault)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Client transform
// ---------------------------------------------------------------------------

describe("transformClient", () => {
  it("replaces server functions with fetch proxies", () => {
    const code = `"use server"

export async function save(data) {
  await db.save(data);
}`;
    const fns = [{ name: "save", isDefault: false, isAsync: true }];
    const result = _transformClient(code, "/app/actions.ts", fns);

    expect(result).toContain("/_fabrk/action");
    expect(result).toContain("x-action-id");
    expect(result).not.toContain("db.save");
  });

  it("preserves non-server code", () => {
    const code = `"use server"

const API_URL = "https://api.example.com";

export async function save(data) {
  await db.save(data);
}`;
    const fns = [{ name: "save", isDefault: false, isAsync: true }];
    const result = _transformClient(code, "/f.ts", fns);

    expect(result).toContain("API_URL");
    expect(result).not.toContain("db.save");
  });

  it("generates correct action ID in proxy", () => {
    const code = `"use server"\nexport async function myFn() {}`;
    const fns = [{ name: "myFn", isDefault: false, isAsync: true }];
    const result = _transformClient(code, "/app/actions.ts", fns);
    const expectedId = generateActionId("/app/actions.ts", "myFn");
    expect(result).toContain(expectedId);
  });

  it("handles default exports", () => {
    const code = `"use server"\nexport default async function submit() { return 1; }`;
    const fns = [{ name: "submit", isDefault: true, isAsync: true }];
    const result = _transformClient(code, "/f.ts", fns);
    expect(result).toContain("export default async function submit");
    expect(result).toContain("/_fabrk/action");
  });
});

// ---------------------------------------------------------------------------
// Server transform
// ---------------------------------------------------------------------------

describe("transformServer", () => {
  it("appends registry calls for named exports", () => {
    const code = `"use server"\n\nexport async function save(data) {\n  await db.save(data);\n}`;
    const fns = [{ name: "save", isDefault: false, isAsync: true }];
    const result = _transformServer(code, "/app/actions.ts", fns);

    const expectedId = generateActionId("/app/actions.ts", "save");
    expect(result).toContain(`__FABRK_ACTION_REGISTRY__?.register("${expectedId}", save)`);
    expect(result).toContain("db.save"); // original code preserved
  });

  it("registers multiple functions", () => {
    const code = `"use server"\nexport function a() {}\nexport function b() {}`;
    const fns = [
      { name: "a", isDefault: false, isAsync: false },
      { name: "b", isDefault: false, isAsync: false },
    ];
    const result = _transformServer(code, "/f.ts", fns);

    expect(result).toContain(`register("${generateActionId("/f.ts", "a")}", a)`);
    expect(result).toContain(`register("${generateActionId("/f.ts", "b")}", b)`);
  });

  it("handles named default export", () => {
    const code = `"use server"\nexport default async function submit() {}`;
    const fns = [{ name: "submit", isDefault: true, isAsync: true }];
    const result = _transformServer(code, "/f.ts", fns);

    const expectedId = generateActionId("/f.ts", "default");
    expect(result).toContain(`register("${expectedId}", submit)`);
  });
});

// ---------------------------------------------------------------------------
// Non-server files pass through
// ---------------------------------------------------------------------------

describe("non-server files", () => {
  it("file without directive has no file-level detection", () => {
    expect(_hasFileLevelDirective('export function save() { return 1; }')).toBe(false);
  });

  it("file without directive has no inline detection", () => {
    expect(_findInlineServerFunctions('export function save() { return 1; }').size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Function-level directive (only marked functions become actions)
// ---------------------------------------------------------------------------

describe("function-level directive", () => {
  it("only marks annotated function as server action", () => {
    const code = `
export async function serverFn() {
  "use server";
  return "server";
}

export function clientFn() {
  return "client";
}`;

    const inline = _findInlineServerFunctions(code);
    expect(inline.has("serverFn")).toBe(true);
    expect(inline.has("clientFn")).toBe(false);

    const allExports = _extractExports(code);
    const serverFns = allExports.filter((e) => inline.has(e.name));

    const clientResult = _transformClient(code, "/f.ts", serverFns);
    // serverFn replaced with proxy
    expect(clientResult).toContain("/_fabrk/action");
    // clientFn preserved
    expect(clientResult).toContain("clientFn");
    expect(clientResult).toContain('"client"');
  });
});
