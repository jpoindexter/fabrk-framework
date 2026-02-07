/**
 * Tests for @fabrk/mcp helper functions
 */

import { describe, it, expect } from 'vitest'
import { defineTool, textResult, jsonResult, errorResult, buildSchema, parseArgs } from './helpers'

describe('defineTool', () => {
  it('returns the tool definition unchanged', () => {
    const tool = {
      name: 'test',
      description: 'A test tool',
      inputSchema: { type: 'object' as const, properties: {} },
      handler: async () => textResult('ok'),
    }
    expect(defineTool(tool)).toBe(tool)
  })
})

describe('textResult', () => {
  it('creates a text content result', () => {
    const result = textResult('hello')
    expect(result).toEqual({
      content: [{ type: 'text', text: 'hello' }],
    })
  })

  it('handles empty string', () => {
    const result = textResult('')
    expect(result.content[0].text).toBe('')
  })
})

describe('jsonResult', () => {
  it('stringifies objects with formatting', () => {
    const result = jsonResult({ name: 'test', count: 42 })
    expect(result.content[0].text).toBe(JSON.stringify({ name: 'test', count: 42 }, null, 2))
  })

  it('handles arrays', () => {
    const result = jsonResult([1, 2, 3])
    expect(result.content[0].text).toBe('[\n  1,\n  2,\n  3\n]')
  })

  it('handles null', () => {
    const result = jsonResult(null)
    expect(result.content[0].text).toBe('null')
  })
})

describe('errorResult', () => {
  it('creates an error result with isError flag', () => {
    const result = errorResult('something went wrong')
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: something went wrong' }],
      isError: true,
    })
  })
})

describe('buildSchema', () => {
  it('builds JSON Schema from field map', () => {
    const schema = buildSchema({
      name: { type: 'string', description: 'User name', required: true },
      age: { type: 'number', description: 'User age' },
    })

    expect(schema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string', description: 'User name' },
        age: { type: 'number', description: 'User age' },
      },
      required: ['name'],
    })
  })

  it('omits required array when no fields are required', () => {
    const schema = buildSchema({
      limit: { type: 'number', description: 'Max results' },
    })

    expect(schema).toEqual({
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results' },
      },
    })
    expect(schema.required).toBeUndefined()
  })

  it('supports enum fields', () => {
    const schema = buildSchema({
      status: { type: 'string', enum: ['active', 'inactive'], required: true },
    })

    expect(schema.properties!.status).toEqual({
      type: 'string',
      enum: ['active', 'inactive'],
    })
  })

  it('supports array items', () => {
    const schema = buildSchema({
      tags: { type: 'array', items: { type: 'string' } },
    })

    expect(schema.properties!.tags).toEqual({
      type: 'array',
      items: { type: 'string' },
    })
  })

  it('supports default values', () => {
    const schema = buildSchema({
      limit: { type: 'number', default: 10 },
    })

    expect(schema.properties!.limit).toEqual({
      type: 'number',
      default: 10,
    })
  })
})

describe('parseArgs', () => {
  it('parses valid args through schema', () => {
    const schema = {
      parse: (data: unknown) => data as { name: string },
    }
    const result = parseArgs({ name: 'test' }, schema)
    expect(result).toEqual({ name: 'test' })
  })

  it('throws formatted error for Zod-style errors', () => {
    const schema = {
      parse: () => {
        const error = new Error('Validation failed')
        ;(error as any).issues = [
          { path: ['name'], message: 'Required' },
          { path: ['age'], message: 'Expected number, received string' },
        ]
        throw error
      },
    }

    expect(() => parseArgs({}, schema)).toThrow(
      'Invalid arguments: name: Required, age: Expected number, received string'
    )
  })

  it('re-throws non-Zod errors', () => {
    const schema = {
      parse: () => {
        throw new Error('Something else')
      },
    }

    expect(() => parseArgs({}, schema)).toThrow('Something else')
  })
})
