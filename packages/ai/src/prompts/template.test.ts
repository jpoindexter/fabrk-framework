import { describe, it, expect } from 'vitest'
import { createPromptTemplate, composePrompts, createMessagePair } from './template'

describe('createPromptTemplate', () => {
  it('should render with default values', () => {
    const tpl = createPromptTemplate(
      'You are a {{role}} assistant.',
      { role: 'helpful' }
    )

    expect(tpl.render()).toBe('You are a helpful assistant.')
  })

  it('should override defaults with provided values', () => {
    const tpl = createPromptTemplate(
      'Respond in {{language}}.',
      { language: 'English' }
    )

    expect(tpl.render({ language: 'Spanish' })).toBe('Respond in Spanish.')
  })

  it('should handle multiple variables', () => {
    const tpl = createPromptTemplate(
      '{{greeting}}, {{name}}!',
      { greeting: 'Hello', name: 'World' }
    )

    expect(tpl.render()).toBe('Hello, World!')
    expect(tpl.render({ name: 'Alice' })).toBe('Hello, Alice!')
  })

  it('should handle variables with whitespace in braces', () => {
    const tpl = createPromptTemplate(
      'Value: {{ key }}.',
      { key: 'test' }
    )

    expect(tpl.render()).toBe('Value: test.')
  })

  it('should replace all occurrences of a variable', () => {
    const tpl = createPromptTemplate(
      '{{name}} says hi. {{name}} waves.',
      { name: 'Bob' }
    )

    expect(tpl.render()).toBe('Bob says hi. Bob waves.')
  })

  it('should list template variables', () => {
    const tpl = createPromptTemplate(
      '{{greeting}}, {{name}}! Your role is {{role}}.'
    )

    const vars = tpl.variables()
    expect(vars).toContain('greeting')
    expect(vars).toContain('name')
    expect(vars).toContain('role')
    expect(vars).toHaveLength(3)
  })

  it('should deduplicate variable names', () => {
    const tpl = createPromptTemplate('{{x}} and {{x}} and {{y}}')
    const vars = tpl.variables()
    expect(vars.filter((v) => v === 'x')).toHaveLength(1)
  })

  it('should expose raw template string', () => {
    const tpl = createPromptTemplate('Hello {{name}}', { name: 'World' })
    expect(tpl.template).toBe('Hello {{name}}')
  })
})

describe('composePrompts', () => {
  it('should join non-empty sections', () => {
    const result = composePrompts('Section 1', 'Section 2')
    expect(result).toBe('Section 1\n\nSection 2')
  })

  it('should filter out null, undefined, false, and empty strings', () => {
    const result = composePrompts('Keep', null, undefined, false, '', 'Also keep')
    expect(result).toBe('Keep\n\nAlso keep')
  })

  it('should return empty string when all filtered', () => {
    const result = composePrompts(null, undefined, false)
    expect(result).toBe('')
  })
})

describe('createMessagePair', () => {
  it('should create system/user pair from string', () => {
    const messages = createMessagePair('You are helpful.', 'Hello')

    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual({ role: 'system', content: 'You are helpful.' })
    expect(messages[1]).toEqual({ role: 'user', content: 'Hello' })
  })

  it('should create system/user pair from template', () => {
    const tpl = createPromptTemplate('You speak {{lang}}.', { lang: 'English' })
    const messages = createMessagePair(tpl, 'Hi', { lang: 'French' })

    expect(messages[0].content).toBe('You speak French.')
    expect(messages[1].content).toBe('Hi')
  })

  it('should use template defaults when no variables provided', () => {
    const tpl = createPromptTemplate('Mode: {{mode}}.', { mode: 'chat' })
    const messages = createMessagePair(tpl, 'Test')

    expect(messages[0].content).toBe('Mode: chat.')
  })
})
