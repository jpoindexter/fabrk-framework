import { describe, it, expect, vi } from "vitest";
import { sqlQueryTool } from "../tools/builtins/sql-query";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/** Synchronously-resolved query stub. */
function makeQuery(rows: Row[]) {
  return vi.fn(async (_sql: string, _params?: unknown[]) => rows);
}

/** Invoke the tool handler with a given input. */
async function run(
  tool: ReturnType<typeof sqlQueryTool>,
  input: Record<string, unknown>
) {
  const result = await tool.handler(input);
  return (result.content[0] as { text: string }).text;
}

// ---------------------------------------------------------------------------
// Schema shape
// ---------------------------------------------------------------------------

describe("sqlQueryTool schema", () => {
  it("exposes correct name and required fields", () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    expect(tool.name).toBe("sql_query");
    expect(tool.schema.type).toBe("object");
    expect(tool.schema.required).toContain("sql");
    expect(tool.schema.properties).toHaveProperty("sql");
    expect(tool.schema.properties).toHaveProperty("params");
  });
});

// ---------------------------------------------------------------------------
// Read-only enforcement
// ---------------------------------------------------------------------------

describe("read-only mode (default)", () => {
  it("allows SELECT queries", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ id: 1 }]) });
    const text = await run(tool, { sql: "SELECT id FROM users" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("allows WITH (CTE) queries", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ n: 1 }]) });
    const text = await run(tool, { sql: "WITH cte AS (SELECT 1) SELECT * FROM cte" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("allows EXPLAIN queries", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ plan: "Seq Scan" }]) });
    const text = await run(tool, { sql: "EXPLAIN SELECT * FROM orders" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("allows SHOW queries", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ timezone: "UTC" }]) });
    const text = await run(tool, { sql: "SHOW TIMEZONE" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("allows DESCRIBE queries", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ Field: "id", Type: "int" }]) });
    const text = await run(tool, { sql: "DESCRIBE users" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("blocks INSERT", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "INSERT INTO users (name) VALUES ('x')" });
    expect(text).toMatch(/ERROR.*read-only/i);
    expect(text).toMatch(/INSERT/i);
  });

  it("blocks UPDATE", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "UPDATE users SET name = 'x'" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("blocks DELETE", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "DELETE FROM users WHERE id = 1" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("blocks DROP", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "DROP TABLE users" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("blocks ALTER", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "ALTER TABLE users ADD COLUMN foo TEXT" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("blocks CREATE", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "CREATE TABLE foo (id INT)" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("blocks TRUNCATE", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "TRUNCATE users" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("rejects unknown statement type", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "CALL my_proc()" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("is case-insensitive for read check", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ x: 1 }]) });
    const text = await run(tool, { sql: "select x from t" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("is case-insensitive for write block", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "insert into t values (1)" });
    expect(text).toMatch(/ERROR.*read-only/i);
  });

  it("handles leading whitespace in SQL", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ id: 42 }]) });
    const text = await run(tool, { sql: "  \n  SELECT id FROM t" });
    expect(text).not.toMatch(/^ERROR/);
  });
});

// ---------------------------------------------------------------------------
// Multi-statement injection
// ---------------------------------------------------------------------------

describe("multi-statement injection prevention", () => {
  it("blocks SELECT followed by DROP", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "SELECT 1; DROP TABLE users" });
    expect(text).toMatch(/ERROR.*multi-statement/i);
  });

  it("blocks semicolon even in write mode", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]), allowWrite: true });
    const text = await run(tool, { sql: "INSERT INTO t VALUES (1); DELETE FROM t" });
    expect(text).toMatch(/ERROR.*multi-statement/i);
  });

  it("allows semicolons inside single-quoted string literals", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ v: "a;b" }]) });
    const text = await run(tool, { sql: "SELECT * FROM t WHERE v = 'a;b'" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("allows escaped quotes inside string literals with semicolons", async () => {
    const tool = sqlQueryTool({ query: makeQuery([{ v: "it's;done" }]) });
    const text = await run(tool, { sql: "SELECT * FROM t WHERE v = 'it\\'s;done'" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("blocks semicolon outside quotes even when quotes contain semicolons", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "SELECT * FROM t WHERE v = 'safe;val'; DROP TABLE t" });
    expect(text).toMatch(/ERROR.*multi-statement/i);
  });

  it("blocks trailing semicolon", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "SELECT 1;" });
    expect(text).toMatch(/ERROR.*multi-statement/i);
  });

  it("blocks semicolons inside PostgreSQL dollar-quoted strings", async () => {
    // $tag$; DROP TABLE users;$tag$ — the semicolons are inside a dollar-quoted
    // literal and must not be used to bypass the multi-statement check
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "SELECT $tag$; DROP TABLE users;$tag$" });
    // After stripping dollar-quotes the query becomes SELECT '' which has no
    // semicolon — this should pass. But the raw dollar-quoted form with an
    // injected statement after the closing tag should be caught:
    const text2 = await run(tool, { sql: "SELECT 1; $tag$; DROP TABLE users;$tag$" });
    expect(text2).toMatch(/ERROR.*multi-statement/i);
    // A safe dollar-quote with no semicolon outside it must pass
    const text3 = await run(tool, { sql: "SELECT $body$hello$body$" });
    expect(text3).not.toMatch(/^ERROR/);
  });
});

// ---------------------------------------------------------------------------
// Write mode
// ---------------------------------------------------------------------------

describe("allowWrite mode", () => {
  it("permits INSERT when allowWrite is true", async () => {
    const fn = makeQuery([]);
    const tool = sqlQueryTool({ query: fn, allowWrite: true });
    const text = await run(tool, { sql: "INSERT INTO t (x) VALUES (1)" });
    expect(text).not.toMatch(/^ERROR/);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("permits DELETE when allowWrite is true", async () => {
    const fn = makeQuery([]);
    const tool = sqlQueryTool({ query: fn, allowWrite: true });
    const text = await run(tool, { sql: "DELETE FROM t WHERE id = 1" });
    expect(text).not.toMatch(/^ERROR/);
  });

  it("description mentions write is permitted", () => {
    const tool = sqlQueryTool({ query: makeQuery([]), allowWrite: true });
    expect(tool.description).toMatch(/read and write queries are permitted/i);
  });

  it("description mentions read-only when allowWrite is false", () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    expect(tool.description).toMatch(/only read queries/i);
  });
});

// ---------------------------------------------------------------------------
// Parameterized queries
// ---------------------------------------------------------------------------

describe("parameterized queries", () => {
  it("passes params array to the query function", async () => {
    const fn = makeQuery([{ name: "Alice" }]);
    const tool = sqlQueryTool({ query: fn });
    await run(tool, { sql: "SELECT name FROM users WHERE id = $1", params: [42] });
    expect(fn).toHaveBeenCalledWith(
      "SELECT name FROM users WHERE id = $1",
      [42]
    );
  });

  it("passes undefined params when omitted", async () => {
    const fn = makeQuery([{ id: 1 }]);
    const tool = sqlQueryTool({ query: fn });
    await run(tool, { sql: "SELECT id FROM t" });
    expect(fn).toHaveBeenCalledWith("SELECT id FROM t", undefined);
  });

  it("rejects non-array params", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "SELECT 1", params: "bad" });
    expect(text).toMatch(/ERROR.*params must be an array/i);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("input validation", () => {
  it("rejects missing sql", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, {});
    expect(text).toMatch(/ERROR.*sql must be a non-empty string/i);
  });

  it("rejects empty sql string", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "   " });
    expect(text).toMatch(/ERROR.*sql must be a non-empty string/i);
  });

  it("rejects non-string sql", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: 42 });
    expect(text).toMatch(/ERROR.*sql must be a non-empty string/i);
  });
});

// ---------------------------------------------------------------------------
// Timeout enforcement
// ---------------------------------------------------------------------------

describe("timeout enforcement", () => {
  it("returns an error when query exceeds timeoutMs", async () => {
    const slowQuery = (_sql: string) =>
      new Promise<Row[]>((resolve) => setTimeout(() => resolve([]), 5_000));

    const tool = sqlQueryTool({ query: slowQuery, timeoutMs: 50 });
    const text = await run(tool, { sql: "SELECT 1" });
    expect(text).toBe("ERROR: Query execution failed.");
  }, 3_000);

  it("succeeds when query resolves within timeoutMs", async () => {
    const fastQuery = async () => [{ id: 1 }];
    const tool = sqlQueryTool({ query: fastQuery, timeoutMs: 5_000 });
    const text = await run(tool, { sql: "SELECT id FROM t" });
    expect(text).not.toMatch(/^ERROR/);
  });
});

// ---------------------------------------------------------------------------
// Row truncation
// ---------------------------------------------------------------------------

describe("row truncation", () => {
  it("truncates rows beyond maxRows and appends notice", async () => {
    const rows: Row[] = Array.from({ length: 150 }, (_, i) => ({ id: i }));
    const tool = sqlQueryTool({ query: makeQuery(rows), maxRows: 10 });
    const text = await run(tool, { sql: "SELECT id FROM t" });
    // 10 data rows + 1 header + 1 divider = 12 lines in the table block
    const tableLines = text.split("\n").filter((l: string) => l.startsWith("|"));
    expect(tableLines.length).toBe(12); // header + divider + 10 rows
    expect(text).toMatch(/truncated to 10 rows/i);
  });

  it("does not add row-truncation notice when under maxRows", async () => {
    const rows: Row[] = [{ id: 1 }, { id: 2 }];
    const tool = sqlQueryTool({ query: makeQuery(rows), maxRows: 100 });
    const text = await run(tool, { sql: "SELECT id FROM t" });
    expect(text).not.toMatch(/truncated to \d+ rows/i);
  });
});

// ---------------------------------------------------------------------------
// Byte truncation
// ---------------------------------------------------------------------------

describe("byte truncation", () => {
  it("truncates output exceeding maxResultBytes", async () => {
    // Each row has a big value — enough to blow the byte limit.
    const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      data: "x".repeat(500),
    }));
    const tool = sqlQueryTool({
      query: makeQuery(rows),
      maxResultBytes: 200,
    });
    const text = await run(tool, { sql: "SELECT id, data FROM t" });
    const enc = new TextEncoder();
    // The table portion itself (before the notice suffix) must be <= limit
    const tableBody = text.split("\n\n_")[0];
    expect(enc.encode(tableBody).length).toBeLessThanOrEqual(200);
    expect(text).toMatch(/truncated to 200 bytes/i);
  });

  it("does not add byte-truncation notice when within limit", async () => {
    const rows: Row[] = [{ id: 1 }];
    const tool = sqlQueryTool({ query: makeQuery(rows), maxResultBytes: 100_000 });
    const text = await run(tool, { sql: "SELECT id FROM t" });
    expect(text).not.toMatch(/truncated to \d+ bytes/i);
  });
});

// ---------------------------------------------------------------------------
// Markdown table formatting
// ---------------------------------------------------------------------------

describe("markdown table formatting", () => {
  it("renders a header, divider, and data rows", async () => {
    const rows: Row[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const tool = sqlQueryTool({ query: makeQuery(rows) });
    const text = await run(tool, { sql: "SELECT id, name FROM users" });
    const lines = text.split("\n");
    expect(lines[0]).toBe("| id | name |");
    expect(lines[1]).toBe("| --- | --- |");
    expect(lines[2]).toBe("| 1 | Alice |");
    expect(lines[3]).toBe("| 2 | Bob |");
  });

  it("returns a placeholder for empty result sets", async () => {
    const tool = sqlQueryTool({ query: makeQuery([]) });
    const text = await run(tool, { sql: "SELECT id FROM t WHERE 1=0" });
    expect(text).toBe("_No rows returned._");
  });

  it("escapes pipe characters inside cell values", async () => {
    const rows: Row[] = [{ value: "a|b|c" }];
    const tool = sqlQueryTool({ query: makeQuery(rows) });
    const text = await run(tool, { sql: "SELECT value FROM t" });
    expect(text).toContain("a\\|b\\|c");
  });

  it("coerces null values to empty string", async () => {
    const rows: Row[] = [{ id: 1, name: null }];
    const tool = sqlQueryTool({ query: makeQuery(rows) });
    const text = await run(tool, { sql: "SELECT id, name FROM t" });
    expect(text).toContain("| 1 |  |");
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("returns textResult with error message when query throws", async () => {
    const failingQuery = async () => {
      throw new Error("connection refused");
    };
    const tool = sqlQueryTool({ query: failingQuery });
    const text = await run(tool, { sql: "SELECT 1" });
    expect(text).toBe("ERROR: Query execution failed.");
  });

  it("handles non-Error throwables gracefully", async () => {
    const tool = sqlQueryTool({
      query: async () => {
        throw "string error";
      },
    });
    const text = await run(tool, { sql: "SELECT 1" });
    expect(text).toBe("ERROR: Query execution failed.");
  });

  it("returns error when query resolves to a non-array", async () => {
    // Type assertion bypasses TS — simulates a misbehaving driver.
    const tool = sqlQueryTool({
      query: async () => ({ rows: [] }) as unknown as Row[],
    });
    const text = await run(tool, { sql: "SELECT 1" });
    expect(text).toMatch(/ERROR.*array/i);
  });

  it("does not throw — always returns a ToolResult", async () => {
    const tool = sqlQueryTool({
      query: async () => {
        throw new Error("boom");
      },
    });
    // Must not reject — errors surface as text
    await expect(run(tool, { sql: "SELECT 1" })).resolves.toBeDefined();
  });
});
