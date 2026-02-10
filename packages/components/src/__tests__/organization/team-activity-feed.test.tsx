// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { TeamActivityFeed, TeamActivity } from '../../organization/team-activity-feed'

const now = new Date()
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

const sampleActivities: TeamActivity[] = [
  {
    id: 'act-1',
    type: 'created',
    user: { name: 'Jason Poindexter', email: 'jason@example.com' },
    action: 'created a new project',
    target: 'FABRK Framework',
    timestamp: fiveMinutesAgo,
  },
  {
    id: 'act-2',
    type: 'commented',
    user: { name: 'Alice Smith' },
    action: 'commented on',
    target: 'PR #42',
    timestamp: oneHourAgo,
  },
  {
    id: 'act-3',
    type: 'invited',
    user: { name: 'Bob Johnson' },
    action: 'invited a new member',
    timestamp: oneHourAgo,
    metadata: { role: 'developer' },
  },
]

describe('TeamActivityFeed', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<TeamActivityFeed activities={sampleActivities} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the team activity heading', () => {
    render(<TeamActivityFeed activities={sampleActivities} />)
    expect(screen.getByText('TEAM ACTIVITY')).toBeInTheDocument()
  })

  it('renders activity items with user names', () => {
    render(<TeamActivityFeed activities={sampleActivities} />)
    expect(screen.getByText('Jason Poindexter')).toBeInTheDocument()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
  })

  it('renders action descriptions', () => {
    render(<TeamActivityFeed activities={sampleActivities} />)
    expect(screen.getByText('created a new project')).toBeInTheDocument()
    expect(screen.getByText('commented on')).toBeInTheDocument()
    expect(screen.getByText('invited a new member')).toBeInTheDocument()
  })

  it('renders target names', () => {
    render(<TeamActivityFeed activities={sampleActivities} />)
    expect(screen.getByText('FABRK Framework')).toBeInTheDocument()
    expect(screen.getByText('PR #42')).toBeInTheDocument()
  })

  it('shows timestamps by default', () => {
    const { container } = render(<TeamActivityFeed activities={sampleActivities} />)
    // formatDistanceToNow renders relative timestamps in <time> elements
    const timeElements = container.querySelectorAll('time')
    expect(timeElements.length).toBe(3)
  })

  it('renders metadata as badges', () => {
    render(<TeamActivityFeed activities={sampleActivities} />)
    expect(screen.getByText('role: developer')).toBeInTheDocument()
  })

  it('renders event count in meta', () => {
    render(<TeamActivityFeed activities={sampleActivities} />)
    expect(screen.getByText('3 events')).toBeInTheDocument()
  })

  it('shows empty state when no activities', () => {
    render(<TeamActivityFeed activities={[]} />)
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('shows singular event label for single activity', () => {
    render(<TeamActivityFeed activities={[sampleActivities[0]]} />)
    expect(screen.getByText('1 event')).toBeInTheDocument()
  })
})
