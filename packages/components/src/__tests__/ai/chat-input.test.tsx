import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { AiChatInput } from '../../ai/chat-input'

describe('AiChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onStop: vi.fn(),
  }

  it('has no accessibility violations', async () => {
    const { container } = render(<AiChatInput {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the textarea with placeholder', () => {
    render(<AiChatInput {...defaultProps} />)
    expect(screen.getByPlaceholderText('ENTER INSTRUCTION...')).toBeInTheDocument()
  })

  it('renders the send button when not loading', () => {
    render(<AiChatInput {...defaultProps} />)
    expect(screen.getByLabelText('Send message')).toBeInTheDocument()
    expect(screen.queryByLabelText('Stop generating')).not.toBeInTheDocument()
  })

  it('renders the stop button when loading', () => {
    render(<AiChatInput {...defaultProps} isLoading />)
    expect(screen.getByLabelText('Stop generating')).toBeInTheDocument()
    expect(screen.queryByLabelText('Send message')).not.toBeInTheDocument()
  })

  it('calls onStop when stop button is clicked during loading', async () => {
    const onStop = vi.fn()
    const { user } = render(<AiChatInput {...defaultProps} onStop={onStop} isLoading />)

    await user.click(screen.getByLabelText('Stop generating'))
    expect(onStop).toHaveBeenCalledOnce()
  })

  it('calls onSend with input text when send button is clicked', async () => {
    const onSend = vi.fn()
    const { user } = render(<AiChatInput onSend={onSend} onStop={vi.fn()} />)

    const textarea = screen.getByPlaceholderText('ENTER INSTRUCTION...')
    await user.type(textarea, 'Hello world')
    await user.click(screen.getByLabelText('Send message'))

    expect(onSend).toHaveBeenCalledWith('Hello world', [])
  })

  it('clears input after sending', async () => {
    const onSend = vi.fn()
    const { user } = render(<AiChatInput onSend={onSend} onStop={vi.fn()} />)

    const textarea = screen.getByPlaceholderText('ENTER INSTRUCTION...')
    await user.type(textarea, 'Test message')
    await user.click(screen.getByLabelText('Send message'))

    expect(textarea).toHaveValue('')
  })

  it('does not send empty messages', async () => {
    const onSend = vi.fn()
    const { user } = render(<AiChatInput onSend={onSend} onStop={vi.fn()} />)

    // Send button should be disabled when input is empty
    const sendBtn = screen.getByLabelText('Send message')
    await user.click(sendBtn)

    expect(onSend).not.toHaveBeenCalled()
  })

  it('renders the attach file button', () => {
    render(<AiChatInput {...defaultProps} />)
    expect(screen.getByLabelText('Attach file')).toBeInTheDocument()
  })
})
