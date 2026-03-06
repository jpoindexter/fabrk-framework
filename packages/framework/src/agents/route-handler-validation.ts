export const ALLOWED_ROLES = new Set(["user", "assistant"]);
export const MAX_PARTS = 20;
export const MAX_BASE64_BYTES = 2 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

export function validateMessages(
  messages: Array<{ role: unknown; content: unknown }>
): string | null {
  if (messages.length > 200) return "Too many messages (max 200)";

  for (const msg of messages) {
    if (typeof msg.role !== "string") return "Each message must have a role string";
    if (!ALLOWED_ROLES.has(msg.role)) return `Invalid role: ${msg.role}`;

    if (typeof msg.content === "string") {
      if (msg.content.length > 100_000) return "Message content too large";
    } else if (Array.isArray(msg.content)) {
      if (msg.content.length > MAX_PARTS) {
        return `Message content array exceeds max parts (${MAX_PARTS})`;
      }
      for (const part of msg.content) {
        if (typeof part !== "object" || part === null || typeof (part as Record<string, unknown>).type !== "string") {
          return "Each content part must have a type field";
        }
        const p = part as Record<string, unknown>;
        if (typeof p.base64 === "string" && p.base64.length > MAX_BASE64_BYTES) {
          return "base64 image content exceeds 2MB limit";
        }
      }
    } else {
      return "Each message must have content as a string or array of parts";
    }
  }

  return null;
}
