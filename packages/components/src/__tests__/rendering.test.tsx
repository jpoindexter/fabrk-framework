// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock ResizeObserver for recharts ResponsiveContainer
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// ---------------------------------------------------------------------------
// Import components from individual files (avoid barrel export)
// ---------------------------------------------------------------------------
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Label } from '../ui/label'
import { Container } from '../ui/container'
import { StatsGrid } from '../ui/stats-grid'
import { KpiCard } from '../ui/kpi-card'
import { EmptyState } from '../ui/empty-state'
import { DashboardHeader } from '../ui/dashboard-header'
import { DataTable } from '../ui/data-table/data-table'
import { Spinner, LoadingSpinner, Skeleton } from '../ui/loading'
import { Progress, SolidProgress } from '../ui/progress'
import { BarChart } from '../charts/bar-chart'
import { LineChart } from '../charts/line-chart'
import { AiChatInput } from '../ai/chat-input'

// ============================================================================
// 1. Button
// ============================================================================
describe('Button', () => {
  it('renders without crashing', () => {
    render(<Button>SUBMIT</Button>)
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('renders as a button element', () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole('button')).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders loading state', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})

// ============================================================================
// 2. Input
// ============================================================================
describe('Input', () => {
  it('renders without crashing', () => {
    render(<Input placeholder="Enter email" />)
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
  })

  it('renders as an input element', () => {
    render(<Input data-testid="input-test" />)
    expect(screen.getByTestId('input-test')).toBeInstanceOf(HTMLInputElement)
  })

  it('marks error state with aria-invalid', () => {
    render(<Input error data-testid="err-input" />)
    expect(screen.getByTestId('err-input')).toHaveAttribute('aria-invalid', 'true')
  })
})

// ============================================================================
// 3. Badge
// ============================================================================
describe('Badge', () => {
  it('renders without crashing', () => {
    render(<Badge>NEW</Badge>)
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">ERROR</Badge>)
    expect(screen.getByText('ERROR')).toBeInTheDocument()
  })
})

// ============================================================================
// 4. Card (CardHeader, CardContent)
// ============================================================================
describe('Card', () => {
  it('renders Card with children', () => {
    render(
      <Card data-testid="card">
        <CardHeader title="CARD TITLE" />
        <CardContent>Card body content</CardContent>
      </Card>
    )
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('CARD TITLE')).toBeInTheDocument()
    expect(screen.getByText('Card body content')).toBeInTheDocument()
  })

  it('renders CardHeader with meta', () => {
    render(<CardHeader title="HEADER" meta="8 items" />)
    expect(screen.getByText('HEADER')).toBeInTheDocument()
    expect(screen.getByText('8 items')).toBeInTheDocument()
  })
})

// ============================================================================
// 5. Label
// ============================================================================
describe('Label', () => {
  it('renders without crashing', () => {
    render(<Label>Email Address</Label>)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
  })

  it('renders as a label element', () => {
    render(<Label data-testid="label-test">Name</Label>)
    expect(screen.getByTestId('label-test').tagName).toBe('LABEL')
  })

  it('shows required indicator', () => {
    render(<Label required>Email</Label>)
    expect(screen.getByLabelText('required')).toBeInTheDocument()
  })
})

// ============================================================================
// 6. Container
// ============================================================================
describe('Container', () => {
  it('renders without crashing', () => {
    render(<Container data-testid="container">Page content</Container>)
    expect(screen.getByTestId('container')).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('renders with custom size', () => {
    render(<Container size="md" data-testid="container-md">Content</Container>)
    expect(screen.getByTestId('container-md')).toBeInTheDocument()
  })
})

// ============================================================================
// 7. StatsGrid
// ============================================================================
describe('StatsGrid', () => {
  it('renders without crashing', () => {
    render(
      <StatsGrid
        items={[
          { label: 'Files', value: 1572 },
          { label: 'Components', value: 279, change: '+12%' },
          { label: 'Routes', value: 46 },
        ]}
      />
    )
    expect(screen.getByText('Files')).toBeInTheDocument()
    expect(screen.getByText('1.6K')).toBeInTheDocument()
    expect(screen.getByText('Components')).toBeInTheDocument()
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('Routes')).toBeInTheDocument()
  })

  it('formats large numbers with K suffix', () => {
    render(
      <StatsGrid items={[{ label: 'Users', value: 15000 }]} />
    )
    expect(screen.getByText('15.0K')).toBeInTheDocument()
  })
})

// ============================================================================
// 8. KpiCard
// ============================================================================
describe('KpiCard', () => {
  it('renders without crashing', () => {
    render(<KpiCard title="Revenue" value="$45,231" />)
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$45,231')).toBeInTheDocument()
  })

  it('renders with trend indicator', () => {
    render(<KpiCard title="Users" value={500} change={12} trend="up" />)
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
  })
})

// ============================================================================
// 9. EmptyState
// ============================================================================
describe('EmptyState', () => {
  it('renders without crashing', () => {
    render(
      <EmptyState title="NO DATA" description="Nothing to display yet." />
    )
    expect(screen.getByText('NO DATA')).toBeInTheDocument()
    expect(screen.getByText('Nothing to display yet.')).toBeInTheDocument()
  })

  it('renders action button', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="EMPTY"
        action={{ label: 'ADD ITEM', onClick }}
      />
    )
    expect(screen.getByText('EMPTY')).toBeInTheDocument()
    // The button text is formatted by formatButtonText
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

// ============================================================================
// 10. DashboardHeader
// ============================================================================
describe('DashboardHeader', () => {
  it('renders without crashing', () => {
    render(<DashboardHeader title="Repositories" />)
    expect(screen.getByText('Repositories')).toBeInTheDocument()
  })

  it('renders with subtitle', () => {
    render(<DashboardHeader title="Overview" subtitle="3 connected" />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('3 connected')).toBeInTheDocument()
  })

  it('renders with code prefix', () => {
    render(<DashboardHeader title="Dashboard" code="0xA1" />)
    expect(screen.getByText('[ [0xA1] Dashboard ]')).toBeInTheDocument()
  })
})

// ============================================================================
// 11. DataTable
// ============================================================================
describe('DataTable', () => {
  const columns = [
    {
      accessorKey: 'name' as const,
      header: 'Name',
    },
    {
      accessorKey: 'status' as const,
      header: 'Status',
    },
  ]

  const data = [
    { name: 'Alice', status: 'Active' },
    { name: 'Bob', status: 'Inactive' },
  ]

  it('renders without crashing', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} />)
    expect(screen.getByText('No results found.')).toBeInTheDocument()
  })
})

// ============================================================================
// 12. Spinner / LoadingSpinner
// ============================================================================
describe('Spinner', () => {
  it('renders without crashing', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })
})

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('renders without crashing', () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true')
  })
})

// ============================================================================
// 13. Progress
// ============================================================================
describe('Progress', () => {
  it('renders without crashing', () => {
    render(<Progress value={66} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '66')
  })

  it('clamps values to 0-100', () => {
    render(<Progress value={150} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('shows percentage when enabled', () => {
    render(<Progress value={42} showPercentage />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })
})

describe('SolidProgress', () => {
  it('renders without crashing', () => {
    render(<SolidProgress value={75} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
  })
})

// ============================================================================
// 14. BarChart
// ============================================================================
describe('BarChart', () => {
  const chartData = [
    { month: 'Jan', value: 100 },
    { month: 'Feb', value: 200 },
    { month: 'Mar', value: 150 },
  ]

  it('renders without crashing', () => {
    const { container } = render(
      <BarChart
        data={chartData}
        xAxisKey="month"
        series={[{ dataKey: 'value', name: 'Revenue' }]}
      />
    )
    // Recharts renders inside a div wrapper
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})

// ============================================================================
// 15. LineChart
// ============================================================================
describe('LineChart', () => {
  const chartData = [
    { day: 'Mon', users: 10 },
    { day: 'Tue', users: 20 },
    { day: 'Wed', users: 15 },
  ]

  it('renders without crashing', () => {
    const { container } = render(
      <LineChart
        data={chartData}
        xAxisKey="day"
        series={[{ dataKey: 'users', name: 'Users' }]}
      />
    )
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})

// ============================================================================
// 16. AiChatInput
// ============================================================================
describe('AiChatInput', () => {
  it('renders without crashing', () => {
    const onSend = vi.fn()
    const onStop = vi.fn()
    render(<AiChatInput onSend={onSend} onStop={onStop} />)
    // The textarea has placeholder text
    expect(screen.getByPlaceholderText('ENTER INSTRUCTION...')).toBeInTheDocument()
  })

  it('renders send button', () => {
    const onSend = vi.fn()
    const onStop = vi.fn()
    render(<AiChatInput onSend={onSend} onStop={onStop} />)
    expect(screen.getByLabelText('Send message')).toBeInTheDocument()
  })

  it('renders stop button when loading', () => {
    const onSend = vi.fn()
    const onStop = vi.fn()
    render(<AiChatInput onSend={onSend} onStop={onStop} isLoading />)
    expect(screen.getByLabelText('Stop generating')).toBeInTheDocument()
  })

  it('renders attach file button', () => {
    const onSend = vi.fn()
    const onStop = vi.fn()
    render(<AiChatInput onSend={onSend} onStop={onStop} />)
    expect(screen.getByLabelText('Attach file')).toBeInTheDocument()
  })
})
