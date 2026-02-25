/**
 * Tests for @fabrk/mcp helper functions
 */

import { describe, it, expect } from 'vitest'
import { textResult, jsonResult, errorResult, buildSchema, parseArgs } from './helpers'

describe('textResult', () => {
  it('creates a text content result', () => {
    const result = textResult('hello')
    expect(result).toEqual({ content: [{ type: 'text', text: 'hello' }] })
  })
})

describe('jsonResult', () => {
  it('stringifies objects, arrays, and null', () => {
    expect(jsonResult({ name: 'test', count: 42 }).content[0].text).toBe(
      JSON.stringify({ name: 'test', count: 42 }, null, 2)
    )
    expect(jsonResult([1, 2, 3]).content[0].text).toBe('[\n  1,\n  2,\n  3\n]')
    expect(jsonResult(null).content[0].text).toBe('null')
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
  it('builds JSON Schema with required array and omits when no required', () => {
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

    const noRequired = buildSchema({ limit: { type: 'number', description: 'Max results' } })
    expect(noRequired.required).toBeUndefined()
  })
})

describe('parseArgs', () => {
  it('parses valid args and throws formatted error for Zod-style errors', () => {
    const schema = { parse: (data: unknown) => data as { name: string } }
    expect(parseArgs({ name: 'test' }, schema)).toEqual({ name: 'test' })

    const zodSchema = {
      parse: () => {
        const error = new Error('Validation failed')
        ;(error as any).issues = [
          { path: ['name'], message: 'Required' },
          { path: ['age'], message: 'Expected number' },
        ]
        throw error
      },
    }
    expect(() => parseArgs({}, zodSchema)).toThrow('Invalid arguments: name: Required, age: Expected number')

    const genericSchema = { parse: () => { throw new Error('Something else') } }
    expect(() => parseArgs({}, genericSchema)).toThrow('Something else')
  })
})
