/**
 * JSON.stringify that escapes characters dangerous in `<script>` tags.
 * Prevents XSS when inlining data into HTML.
 *
 * Escapes: <, >, &, \u2028 (line separator), \u2029 (paragraph separator)
 */
export function safeJsonStringify(data: unknown): string {
  const json = JSON.stringify(data);
  if (json === undefined) return "undefined";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
