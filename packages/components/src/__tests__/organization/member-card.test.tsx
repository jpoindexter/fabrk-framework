// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { MemberCard, Member } from '../../organization/member-card'

const sampleMember: Member = {
  id: 'member-1',
  name: 'Jason Poindexter',
  email: 'jason@example.com',
  role: 'Admin',
  status: 'online',
  bio: 'Full-stack developer',
  skills: ['TypeScript', 'React', 'Node.js'],
  memberSince: new Date('2024-01-15'),
}

describe('MemberCard', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<MemberCard member={sampleMember} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders member name', () => {
    render(<MemberCard member={sampleMember} />)
    expect(screen.getByText('Jason Poindexter')).toBeInTheDocument()
  })

  it('renders member role', () => {
    render(<MemberCard member={sampleMember} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders member bio', () => {
    render(<MemberCard member={sampleMember} />)
    expect(screen.getByText('Full-stack developer')).toBeInTheDocument()
  })

  it('renders skills as badges', () => {
    render(<MemberCard member={sampleMember} />)
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
  })

  it('shows online badge when member status is online', () => {
    render(<MemberCard member={sampleMember} />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders avatar initials', () => {
    render(<MemberCard member={sampleMember} />)
    expect(screen.getByText('JP')).toBeInTheDocument()
  })

  it('renders compact variant', () => {
    render(<MemberCard member={sampleMember} variant="compact" />)
    expect(screen.getByText('Jason Poindexter')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('shows email button when onEmail is provided', () => {
    const onEmail = vi.fn()
    render(<MemberCard member={sampleMember} onEmail={onEmail} />)
    expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument()
  })

  it('shows message button when onMessage is provided', () => {
    const onMessage = vi.fn()
    render(<MemberCard member={sampleMember} onMessage={onMessage} />)
    expect(screen.getByRole('button', { name: /message/i })).toBeInTheDocument()
  })

  it('renders memberSince date', () => {
    render(<MemberCard member={sampleMember} />)
    expect(screen.getByText(/member since jan 2024/i)).toBeInTheDocument()
  })
})
