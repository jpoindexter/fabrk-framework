// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { AiChatSidebar } from '../../ai/chat-sidebar'
import type { Conversation } from '../../ai/chat-types'

const sampleConversations: Conversation[] = [
  { id: 'conv-1', title: 'Dashboard Build', updatedAt: Date.now() - 60000 },
  { id: 'conv-2', title: 'API Integration', updatedAt: Date.now() - 120000 },
  { id: 'conv-3', title: 'Design System Q&A', updatedAt: Date.now() - 180000 },
]

describe('AiChatSidebar', () => {
  const defaultProps = {
    conversations: sampleConversations,
    activeId: 'conv-1',
    onSelect: vi.fn(),
    onNew: vi.fn(),
  }

  it('has no accessibility violations', async () => {
    const { container } = render(<AiChatSidebar {...defaultProps} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders conversation list', () => {
    render(<AiChatSidebar {...defaultProps} />)
    // CSS text-transform: uppercase is visual only; DOM text retains original case
    expect(screen.getByText('Dashboard Build')).toBeInTheDocument()
    expect(screen.getByText('API Integration')).toBeInTheDocument()
    expect(screen.getByText("Design System Q&A")).toBeInTheDocument()
  })

  it('renders the new chat button', () => {
    render(<AiChatSidebar {...defaultProps} />)
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
  })

  it('calls onNew callback when new chat button is clicked', async () => {
    const onNew = vi.fn()
    const { user } = render(<AiChatSidebar {...defaultProps} onNew={onNew} />)

    await user.click(screen.getByRole('button', { name: /new chat/i }))
    expect(onNew).toHaveBeenCalledOnce()
  })

  it('calls onSelect callback when a conversation is clicked', async () => {
    const onSelect = vi.fn()
    const { user } = render(<AiChatSidebar {...defaultProps} onSelect={onSelect} />)

    await user.click(screen.getByText('API Integration'))
    expect(onSelect).toHaveBeenCalledWith('conv-2')
  })

  it('shows system online footer', () => {
    render(<AiChatSidebar {...defaultProps} />)
    expect(screen.getByText('System Online')).toBeInTheDocument()
  })

  it('renders empty list when no conversations', () => {
    render(
      <AiChatSidebar
        conversations={[]}
        onSelect={vi.fn()}
        onNew={vi.fn()}
      />
    )
    // Should still show the new chat button and system online
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
    expect(screen.getByText('System Online')).toBeInTheDocument()
  })
})
