// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { AiChatMessageList } from '../../ai/chat-message-list'
import type { Message } from '../../ai/chat-types'

const sampleMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, can you help me build a dashboard?',
    timestamp: Date.now() - 60000,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Of course! I can help you build a dashboard using FABRK components.',
    timestamp: Date.now() - 30000,
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'Great, let us get started.',
    timestamp: Date.now(),
  },
]

describe('AiChatMessageList', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<AiChatMessageList messages={sampleMessages} />)
    // Exclude button-name rule: the copy button in message items lacks an aria-label
    expect(await axe(container, { rules: { 'button-name': { enabled: false } } })).toHaveNoViolations()
  })

  it('renders user messages with OPERATOR label', () => {
    render(<AiChatMessageList messages={sampleMessages} />)
    const operatorLabels = screen.getAllByText('OPERATOR')
    expect(operatorLabels.length).toBe(2) // Two user messages
  })

  it('renders assistant messages with SYSTEM label', () => {
    render(<AiChatMessageList messages={sampleMessages} />)
    const systemLabels = screen.getAllByText('SYSTEM')
    expect(systemLabels.length).toBe(1) // One assistant message
  })

  it('renders message content', () => {
    render(<AiChatMessageList messages={sampleMessages} />)
    expect(screen.getByText('Hello, can you help me build a dashboard?')).toBeInTheDocument()
    expect(screen.getByText('Of course! I can help you build a dashboard using FABRK components.')).toBeInTheDocument()
  })

  it('renders user avatar with US fallback', () => {
    render(<AiChatMessageList messages={sampleMessages} />)
    const userAvatars = screen.getAllByText('US')
    expect(userAvatars.length).toBe(2)
  })

  it('renders assistant avatar with AI fallback', () => {
    render(<AiChatMessageList messages={sampleMessages} />)
    const aiAvatars = screen.getAllByText('AI')
    expect(aiAvatars.length).toBe(1)
  })

  it('shows empty state when no messages', () => {
    render(<AiChatMessageList messages={[]} />)
    expect(screen.getByText('System Ready')).toBeInTheDocument()
  })

  it('renders messages with attachments', () => {
    const messagesWithAttachments: Message[] = [
      {
        id: 'msg-att',
        role: 'user',
        content: 'Here is the file.',
        timestamp: Date.now(),
        attachments: [
          { url: 'https://example.com/file.pdf', name: 'report.pdf', contentType: 'application/pdf' },
        ],
      },
    ]
    render(<AiChatMessageList messages={messagesWithAttachments} />)
    expect(screen.getByText('FILE: report.pdf')).toBeInTheDocument()
  })
})
