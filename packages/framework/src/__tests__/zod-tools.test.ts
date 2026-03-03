import { describe, it, expect } from 'vitest';
import { zodToJsonSchema } from '../tools/zod-schema';

// Minimal Zod-like mock for testing without requiring zod as a hard dep
function mockField(typeName: string, opts?: { description?: string; optional?: boolean }) {
  return {
    _def: { typeName, description: opts?.description },
    isOptional: () => opts?.optional ?? false,
  };
}

function mockSchema(shape: Record<string, ReturnType<typeof mockField>>) {
  return { shape };
}

describe('zodToJsonSchema()', () => {
  it('returns a valid JSON Schema object shape', () => {
    const schema = mockSchema({ city: mockField('ZodString') });
    const result = zodToJsonSchema(schema as never);
    expect(result.type).toBe('object');
    expect(result.properties).toBeDefined();
  });

  it('maps ZodString to { type: "string" }', () => {
    const result = zodToJsonSchema(mockSchema({ name: mockField('ZodString') }) as never);
    expect((result.properties as Record<string, unknown>)['name']).toMatchObject({ type: 'string' });
  });

  it('maps ZodNumber to { type: "number" }', () => {
    const result = zodToJsonSchema(mockSchema({ age: mockField('ZodNumber') }) as never);
    expect((result.properties as Record<string, unknown>)['age']).toMatchObject({ type: 'number' });
  });

  it('maps ZodBoolean to { type: "boolean" }', () => {
    const result = zodToJsonSchema(mockSchema({ active: mockField('ZodBoolean') }) as never);
    expect((result.properties as Record<string, unknown>)['active']).toMatchObject({ type: 'boolean' });
  });

  it('maps ZodArray to { type: "array" }', () => {
    const result = zodToJsonSchema(mockSchema({ tags: mockField('ZodArray') }) as never);
    expect((result.properties as Record<string, unknown>)['tags']).toMatchObject({ type: 'array' });
  });

  it('maps ZodEnum to { type: "string" }', () => {
    const result = zodToJsonSchema(mockSchema({ status: mockField('ZodEnum') }) as never);
    expect((result.properties as Record<string, unknown>)['status']).toMatchObject({ type: 'string' });
  });

  it('required fields appear in required array', () => {
    const result = zodToJsonSchema(mockSchema({
      city: mockField('ZodString'),
      count: mockField('ZodNumber'),
    }) as never);
    expect(result.required).toContain('city');
    expect(result.required).toContain('count');
  });

  it('optional fields omitted from required', () => {
    const result = zodToJsonSchema(mockSchema({
      city: mockField('ZodString'),
      extra: mockField('ZodString', { optional: true }),
    }) as never);
    expect(result.required).toContain('city');
    expect((result.required as string[]).includes('extra')).toBe(false);
  });

  it('description propagated to property', () => {
    const result = zodToJsonSchema(mockSchema({
      city: mockField('ZodString', { description: 'The city name' }),
    }) as never);
    expect((result.properties as Record<string, { description?: string }>)['city']?.description).toBe('The city name');
  });

  it('no required array when all fields optional', () => {
    const result = zodToJsonSchema(mockSchema({
      a: mockField('ZodString', { optional: true }),
    }) as never);
    expect(result.required).toBeUndefined();
  });

  it('unknown typeName falls back to { type: "string" }', () => {
    const result = zodToJsonSchema(mockSchema({ x: mockField('ZodUnknown') }) as never);
    expect((result.properties as Record<string, unknown>)['x']).toMatchObject({ type: 'string' });
  });
});

describe('toolDefinition .zod() integration', () => {
  it('toolDefinition builder has a .zod() method', async () => {
    const { toolDefinition } = await import('../tools/tool-definition');
    const builder = toolDefinition('test').description('test tool');
    expect(typeof (builder as unknown as Record<string, unknown>)['zod']).toBe('function');
  });

  it('.zod() sets schema from mock zod object and returns builder for chaining', async () => {
    const { toolDefinition } = await import('../tools/tool-definition');
    const mockZodSchema = mockSchema({ city: mockField('ZodString') });

    const built = toolDefinition('weather')
      .description('Get current weather')
      .zod(mockZodSchema as never)
      .server(async () => ({ content: [{ type: 'text', text: 'sunny' }] }))
      .build();

    expect(built.name).toBe('weather');
    expect(built.schema.type).toBe('object');
    expect(built.schema.properties['city']).toMatchObject({ type: 'string' });
    expect(built.schema.required).toContain('city');
  });

  it('.zod() with optional field produces no required entry for that field', async () => {
    const { toolDefinition } = await import('../tools/tool-definition');
    const mockZodSchema = mockSchema({
      city: mockField('ZodString'),
      units: mockField('ZodString', { optional: true }),
    });

    const built = toolDefinition('weather')
      .description('Get current weather')
      .zod(mockZodSchema as never)
      .server(async () => ({ content: [{ type: 'text', text: 'sunny' }] }))
      .build();

    expect(built.schema.required).toContain('city');
    expect((built.schema.required ?? []).includes('units')).toBe(false);
  });

  it('.zod() description is preserved in built schema', async () => {
    const { toolDefinition } = await import('../tools/tool-definition');
    const mockZodSchema = mockSchema({
      city: mockField('ZodString', { description: 'City name' }),
    });

    const built = toolDefinition('weather')
      .description('Get current weather')
      .zod(mockZodSchema as never)
      .server(async () => ({ content: [{ type: 'text', text: 'sunny' }] }))
      .build();

    expect((built.schema.properties['city'] as { description?: string })?.description).toBe('City name');
  });
});
