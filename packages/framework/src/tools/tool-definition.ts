import type { ToolDefinition, ToolResult } from "./define-tool.js";
import { zodToJsonSchema, type ZodObjectLike } from "./zod-schema.js";

export interface ClientToolDescriptor {
  name: string;
  description: string;
  schema: ToolDefinition["schema"];
}

export interface IsomorphicToolDefinition extends ToolDefinition {
  /** If true, the client descriptor is safe to expose to the browser */
  clientExposed: boolean;
  clientDescriptor: ClientToolDescriptor;
}

class IsomorphicToolBuilder {
  private _name: string;
  private _description: string;
  private _schema: ToolDefinition["schema"];
  private _handler: ToolDefinition["handler"];
  private _clientExposed = false;

  constructor(name: string) {
    this._name = name;
    this._description = "";
    this._schema = { type: "object", properties: {} };
    this._handler = async () => ({ content: [{ type: "text", text: "" }] });
  }

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  schema(schema: ToolDefinition["schema"]): this {
    this._schema = schema;
    return this;
  }

  /**
   * Set the input schema from a Zod object schema.
   * The schema is converted to JSON Schema for LLM tool-calling.
   * Mirrors Vercel AI SDK's Zod-based tool definition.
   *
   * @example
   *   toolDefinition('weather')
   *     .description('Get current weather')
   *     .zod(z.object({ city: z.string().describe('City name') }))
   *     .server(async ({ city }) => textResult(`Weather in ${city as string}: sunny`))
   *     .build()
   */
  zod(schema: ZodObjectLike): this {
    this._schema = zodToJsonSchema(schema) as ToolDefinition["schema"];
    return this;
  }

  /** Register the server-side handler. Required for tool execution. */
  server(handler: (input: Record<string, unknown>) => Promise<ToolResult>): this {
    this._handler = handler;
    return this;
  }

  /** Mark the tool as safe to expose to the browser (client descriptor only, not handler). */
  client(): this {
    this._clientExposed = true;
    return this;
  }

  build(): IsomorphicToolDefinition {
    const descriptor: ClientToolDescriptor = {
      name: this._name,
      description: this._description,
      schema: this._schema,
    };
    return {
      name: this._name,
      description: this._description,
      schema: this._schema,
      handler: this._handler,
      clientExposed: this._clientExposed,
      clientDescriptor: descriptor,
    };
  }
}

/**
 * Create an isomorphic tool with explicit server/client split.
 *
 * @example
 * const searchTool = toolDefinition('search')
 *   .description('Search the web')
 *   .schema({ type: 'object', properties: { query: { type: 'string' } }, required: ['query'] })
 *   .server(async ({ query }) => {
 *     const results = await fetchSearch(query as string);
 *     return { content: [{ type: 'text', text: results }] };
 *   })
 *   .client()  // safe to expose descriptor to browser
 *   .build();
 */
export function toolDefinition(name: string): IsomorphicToolBuilder {
  return new IsomorphicToolBuilder(name);
}

/**
 * Extract client-safe descriptors from a list of tools.
 * Only includes tools that were marked with .client().
 */
export function clientTools(
  tools: Array<ToolDefinition | IsomorphicToolDefinition>
): ClientToolDescriptor[] {
  return tools
    .filter(
      (t): t is IsomorphicToolDefinition =>
        "clientExposed" in t && (t as IsomorphicToolDefinition).clientExposed
    )
    .map((t) => t.clientDescriptor);
}
