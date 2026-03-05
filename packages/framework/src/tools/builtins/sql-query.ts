import { defineTool, textResult } from "../define-tool";
import type { ToolDefinition } from "../define-tool";

const WRITE_PATTERN = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/i;

const READ_PATTERN = /^\s*(SELECT|WITH|EXPLAIN|SHOW|DESCRIBE)\b/i;

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ROWS = 100;
const DEFAULT_MAX_BYTES = 100_000;

export interface SqlQueryOptions {
  query: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  allowWrite?: boolean;
  timeoutMs?: number;
  maxRows?: number;
  maxResultBytes?: number;
}

function toMarkdownTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "_No rows returned._";

  const cols = Object.keys(rows[0]);
  const header = `| ${cols.join(" | ")} |`;
  const divider = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${cols.map((c) => String(row[c] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
    .join("\n");

  return [header, divider, body].join("\n");
}

export function sqlQueryTool(options: SqlQueryOptions): ToolDefinition {
  const {
    query,
    allowWrite = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRows = DEFAULT_MAX_ROWS,
    maxResultBytes = DEFAULT_MAX_BYTES,
  } = options;

  return defineTool({
    name: "sql_query",
    description: [
      "Execute a SQL query against the connected database and return results as a markdown table.",
      allowWrite
        ? "Read and write queries are permitted."
        : "Only read queries (SELECT, WITH, EXPLAIN, SHOW, DESCRIBE) are permitted.",
      `Results are limited to ${maxRows} rows and ${maxResultBytes} bytes.`,
      `Queries time out after ${timeoutMs} ms.`,
    ].join(" "),
    schema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "The SQL query to execute.",
        },
        params: {
          type: "array",
          description: "Optional parameterized query values.",
          items: {},
        },
      },
      required: ["sql"],
    },
    handler: async (input) => {
      const sql = input["sql"];
      const params = input["params"];

      if (typeof sql !== "string" || sql.trim() === "") {
        return textResult("ERROR: sql must be a non-empty string.");
      }

      let safeParams: unknown[] | undefined;
      if (params !== undefined) {
        if (!Array.isArray(params)) {
          return textResult("ERROR: params must be an array.");
        }
        safeParams = params;
      }

      // Hard limit before regex to prevent O(n²) backtracking on unclosed dollar-quotes
      if (sql.length > 64_000) {
        return textResult("ERROR: Query too large (max 64,000 characters).");
      }

      // Strip single-quoted string literals first, then dollar-quoted string
      // literals (PostgreSQL extension). Dollar-quoted strings of the form
      // $tag$...$tag$ can embed semicolons that would bypass the multi-statement
      // check if left in place.
      const noDollarQuotes = sql.replace(/\$[^$]*\$[\s\S]*?\$[^$]*\$/g, "''");
      const stripped = noDollarQuotes.replace(/'(?:[^'\\]|\\.)*'/g, "''");
      if (/;/.test(stripped)) {
        return textResult("ERROR: Multi-statement queries are not allowed.");
      }

      if (!allowWrite) {
        if (WRITE_PATTERN.test(sql)) {
          return textResult(
            "ERROR: Write queries (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE) are not permitted in read-only mode. " +
              "Pass `allowWrite: true` to the sqlQueryTool options to enable them."
          );
        }
        if (!READ_PATTERN.test(sql)) {
          return textResult(
            "ERROR: Only SELECT, WITH, EXPLAIN, SHOW, and DESCRIBE queries are permitted in read-only mode."
          );
        }
      }

      let rows: Record<string, unknown>[];

      try {
        const queryPromise = query(sql, safeParams);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Query timed out after ${timeoutMs} ms.`)),
            timeoutMs
          )
        );

        rows = await Promise.race([queryPromise, timeoutPromise]);
      } catch (err: unknown) {
        console.error("[fabrk] SQL query tool error:", err);
        return textResult("ERROR: Query execution failed.");
      }

      if (!Array.isArray(rows)) {
        return textResult("ERROR: Query function must resolve to an array of row objects.");
      }

      let truncatedRows = false;
      if (rows.length > maxRows) {
        rows = rows.slice(0, maxRows);
        truncatedRows = true;
      }

      let table = toMarkdownTable(rows);
      let truncatedBytes = false;
      const encoder = new TextEncoder();
      if (encoder.encode(table).length > maxResultBytes) {
        // Binary-search the character cutoff that keeps us within the byte limit.
        let lo = 0;
        let hi = table.length;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (encoder.encode(table.slice(0, mid)).length <= maxResultBytes) {
            lo = mid;
          } else {
            hi = mid - 1;
          }
        }
        table = table.slice(0, lo);
        truncatedBytes = true;
      }

      const notices: string[] = [];
      if (truncatedRows) notices.push(`(results truncated to ${maxRows} rows)`);
      if (truncatedBytes) notices.push(`(output truncated to ${maxResultBytes} bytes)`);

      const suffix = notices.length > 0 ? `\n\n_${notices.join(", ")}_` : "";
      return textResult(table + suffix);
    },
  });
}
