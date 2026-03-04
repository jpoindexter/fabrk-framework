import { buildSecurityHeaders } from "../middleware/security";

export interface ServerActionRegistry {
  /** Register a server action function by ID. */
  register(id: string, fn: (...args: unknown[]) => Promise<unknown>): void;
  /** Dispatch an action by ID with arguments. */
  dispatch(id: string, args: unknown[]): Promise<unknown>;
  /** Check if an action ID is registered. */
  has(id: string): boolean;
}

/**
 * Server actions are functions marked with `"use server"` that can be
 * called from the client via fetch or form submissions.
 *
 * Each action is identified by a stable ID (typically a hash of
 * the file path + export name).
 */
export function createActionRegistry(): ServerActionRegistry {
  const actions = new Map<string, (...args: unknown[]) => Promise<unknown>>();

  return {
    register(id: string, fn: (...args: unknown[]) => Promise<unknown>): void {
      if (typeof fn !== "function") {
        throw new Error(`[fabrk] Server action "${id}" must be a function`);
      }
      actions.set(id, fn);
    },

    async dispatch(id: string, args: unknown[]): Promise<unknown> {
      const fn = actions.get(id);
      if (!fn) {
        throw new Error(`[fabrk] Unknown server action: ${id}`);
      }
      return fn(...args);
    },

    has(id: string): boolean {
      return actions.has(id);
    },
  };
}

/**
 * Validate that the request Origin matches the Host to prevent CSRF.
 *
 * Returns true if the request passes CSRF validation:
 * - Origin header matches Host header
 * - No Origin header (non-browser client)
 *
 * Returns false if Origin is present but doesn't match Host.
 */
export function validateCsrf(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser requests are allowed

  const host = request.headers.get("host");
  if (!host) return false; // Origin present but no host — reject

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

/**
 * Handle a server action request.
 *
 * Actions are dispatched via:
 * - `x-action-id` header (fetch navigation)
 * - Form submission with hidden `$ACTION_ID` field
 *
 * CSRF validation is performed via Origin vs Host header comparison.
 */
export async function handleServerAction(
  request: Request,
  registry: ServerActionRegistry,
): Promise<Response> {
  if (!validateCsrf(request)) {
    return new Response(
      JSON.stringify({ error: "CSRF validation failed" }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      },
    );
  }

  let actionId = request.headers.get("x-action-id");
  let args: unknown[] = [];

  if (!actionId) {
    const contentType = request.headers.get("content-type") ?? "";
    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      try {
        const formData = await request.formData();
        actionId = formData.get("$ACTION_ID") as string | null;

        if (actionId) {
          const data: Record<string, FormDataEntryValue> = {};
          formData.forEach((value, key) => {
            if (key !== "$ACTION_ID") data[key] = value;
          });
          args = [data];
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid form data" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...buildSecurityHeaders(),
            },
          },
        );
      }
    }
  }

  if (!actionId) {
    try {
      const body = await request.json();
      actionId = body.actionId as string;
      args = Array.isArray(body.args) ? body.args : [];
    } catch {
      return new Response(
        JSON.stringify({ error: "Missing action ID" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...buildSecurityHeaders(),
          },
        },
      );
    }
  }

  if (!actionId || !registry.has(actionId)) {
    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      },
    );
  }

  try {
    const result = await registry.dispatch(actionId, args);
    return new Response(
      JSON.stringify({ result }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      },
    );
  } catch (err) {
    console.error("[fabrk] Server action error:", err);
    return new Response(
      JSON.stringify({ error: "Action failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...buildSecurityHeaders(),
        },
      },
    );
  }
}
