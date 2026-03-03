/**
 * Converts a Zod object schema to a plain JSON Schema object.
 * Supports string, number, boolean, array types and optional fields.
 * Descriptions from .describe() are propagated.
 *
 * This module uses structural duck-typing against Zod internals (_def, isOptional)
 * so zod is NOT a hard dependency — callers supply Zod schemas at runtime.
 */

type ZodTypeDef = {
  typeName: string;
  description?: string;
};

type ZodFieldLike = {
  _def: ZodTypeDef;
  isOptional(): boolean;
};

export type ZodObjectLike = {
  shape: Record<string, ZodFieldLike>;
};

export function zodToJsonSchema(schema: ZodObjectLike): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(schema.shape)) {
    const def = field._def;
    const prop: Record<string, unknown> = {};

    switch (def.typeName) {
      case 'ZodString':   prop['type'] = 'string';  break;
      case 'ZodNumber':   prop['type'] = 'number';  break;
      case 'ZodBoolean':  prop['type'] = 'boolean'; break;
      case 'ZodArray':    prop['type'] = 'array';   break;
      case 'ZodEnum':     prop['type'] = 'string';  break;
      case 'ZodOptional':
      case 'ZodNullable': prop['type'] = 'string';  break;
      default:            prop['type'] = 'string';
    }

    if (def.description) prop['description'] = def.description;
    properties[key] = prop;
    if (!field.isOptional()) required.push(key);
  }

  const result: Record<string, unknown> = { type: 'object', properties };
  if (required.length > 0) result['required'] = required;
  return result;
}
