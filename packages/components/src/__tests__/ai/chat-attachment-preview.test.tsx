// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { AiChatAttachmentPreview } from '../../ai/chat-attachment-preview'
import type { Attachment } from '../../ai/chat-types'

const sampleAttachments: Attachment[] = [
  { url: 'https://example.com/report.pdf', name: 'report.pdf', contentType: 'application/pdf' },
  { url: 'https://example.com/photo.png', name: 'photo.png', contentType: 'image/png' },
  { url: 'https://example.com/data.csv', name: 'data.csv', contentType: 'text/csv' },
]

describe('AiChatAttachmentPreview', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AiChatAttachmentPreview attachments={sampleAttachments} onRemove={vi.fn()} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders file names', () => {
    render(<AiChatAttachmentPreview attachments={sampleAttachments} onRemove={vi.fn()} />)
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByText('photo.png')).toBeInTheDocument()
    expect(screen.getByText('data.csv')).toBeInTheDocument()
  })

  it('calls onRemove callback with correct index when remove button is clicked', async () => {
    const onRemove = vi.fn()
    const { user } = render(
      <AiChatAttachmentPreview attachments={sampleAttachments} onRemove={onRemove} />
    )

    // Each attachment has a remove button with the multiplication sign
    const removeButtons = screen.getAllByRole('button')
    await user.click(removeButtons[1]) // Click remove on the second attachment

    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('renders a remove button for each attachment', () => {
    render(<AiChatAttachmentPreview attachments={sampleAttachments} onRemove={vi.fn()} />)
    const removeButtons = screen.getAllByRole('button')
    expect(removeButtons).toHaveLength(3)
  })

  it('renders nothing when attachments array is empty', () => {
    const { container } = render(
      <AiChatAttachmentPreview attachments={[]} onRemove={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders a single attachment correctly', () => {
    const singleAttachment: Attachment[] = [
      { url: 'https://example.com/file.txt', name: 'notes.txt', contentType: 'text/plain' },
    ]
    render(<AiChatAttachmentPreview attachments={singleAttachment} onRemove={vi.fn()} />)
    expect(screen.getByText('notes.txt')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
