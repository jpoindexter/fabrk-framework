import { describe, it, expect } from 'vitest'
import { PromptBuilder } from './builder'

describe('PromptBuilder', () => {
  it('should build a basic prompt', () => {
    const result = new PromptBuilder()
      .system('You are a helpful assistant.')
      .user('Hello!')
      .build()

    expect(result.system).toBe('You are a helpful assistant.')
    expect(result.user).toBe('Hello!')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('system')
    expect(result.messages[1].role).toBe('user')
  })

  it('should combine system parts', () => {
    const result = new PromptBuilder()
      .system('You are helpful.')
      .system('Be concise.')
      .build()

    expect(result.system).toBe('You are helpful.\nBe concise.')
  })

  it('should add context section', () => {
    const result = new PromptBuilder()
      .context('The user is building a React app.')
      .build()

    expect(result.system).toContain('## Context')
    expect(result.system).toContain('The user is building a React app.')
  })

  it('should add numbered instructions', () => {
    const result = new PromptBuilder()
      .instruction('Parse the input')
      .instruction('Format the output')
      .build()

    expect(result.system).toContain('## Instructions')
    expect(result.system).toContain('1. Parse the input')
    expect(result.system).toContain('2. Format the output')
  })

  it('should add constraints as bullet points', () => {
    const result = new PromptBuilder()
      .constraint('Use TypeScript')
      .constraint('No external deps')
      .build()

    expect(result.system).toContain('## Constraints')
    expect(result.system).toContain('- Use TypeScript')
    expect(result.system).toContain('- No external deps')
  })

  it('should add examples', () => {
    const result = new PromptBuilder()
      .example('2 + 2', '4')
      .example('hello', 'HELLO')
      .build()

    expect(result.system).toContain('## Examples')
    expect(result.system).toContain('### Example 1')
    expect(result.system).toContain('Input: 2 + 2')
    expect(result.system).toContain('Output: 4')
    expect(result.system).toContain('### Example 2')
  })

  it('should add output format', () => {
    const result = new PromptBuilder()
      .outputFormat('Return JSON only.')
      .build()

    expect(result.system).toContain('## Output Format')
    expect(result.system).toContain('Return JSON only.')
  })

  it('should use instruction as user message when no user set', () => {
    const result = new PromptBuilder()
      .instruction('Generate a login form')
      .build()

    expect(result.user).toBe('Generate a login form')
  })

  it('should prefer explicit user message over instruction', () => {
    const result = new PromptBuilder()
      .instruction('Generate a form')
      .user('Make it fancy')
      .build()

    expect(result.user).toBe('Make it fancy')
  })

  it('should handle empty builder', () => {
    const result = new PromptBuilder().build()

    expect(result.system).toBe('')
    expect(result.user).toBe('')
    expect(result.messages).toHaveLength(0)
  })

  it('should support fluent chaining', () => {
    const result = new PromptBuilder()
      .system('System')
      .context('Context')
      .instruction('Instruction')
      .constraint('Constraint')
      .example('in', 'out')
      .outputFormat('Format')
      .user('User message')
      .build()

    expect(result.system).toContain('System')
    expect(result.system).toContain('## Context')
    expect(result.system).toContain('## Instructions')
    expect(result.system).toContain('## Constraints')
    expect(result.system).toContain('## Examples')
    expect(result.system).toContain('## Output Format')
    expect(result.user).toBe('User message')
  })
})
