import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SegmentedControl } from './segmented-control'

const meta = {
  title: 'Interactive/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    options: [
      { value: 'day', label: 'DAY' },
      { value: 'week', label: 'WEEK' },
      { value: 'month', label: 'MONTH' },
    ],
    value: 'week',
    onChange: () => {},
  },
}

export const WithDisabled: Story = {
  args: {
    options: [
      { value: 'free', label: 'FREE' },
      { value: 'pro', label: 'PRO' },
      { value: 'enterprise', label: 'ENTERPRISE', disabled: true },
    ],
    value: 'free',
    onChange: () => {},
  },
}

function InteractiveRender() {
  const [value, setValue] = useState('list')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SegmentedControl
        options={[
          { value: 'list', label: 'LIST' },
          { value: 'grid', label: 'GRID' },
          { value: 'table', label: 'TABLE' },
        ]}
        value={value}
        onChange={setValue}
      />
      <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>
        View: {value}
      </p>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveRender />,
}

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SegmentedControl
        options={[
          { value: 'a', label: 'SM' },
          { value: 'b', label: 'SIZE' },
        ]}
        value="a"
        onChange={() => {}}
        size="sm"
      />
      <SegmentedControl
        options={[
          { value: 'a', label: 'MD' },
          { value: 'b', label: 'SIZE' },
        ]}
        value="a"
        onChange={() => {}}
        size="md"
      />
      <SegmentedControl
        options={[
          { value: 'a', label: 'LG' },
          { value: 'b', label: 'SIZE' },
        ]}
        value="a"
        onChange={() => {}}
        size="lg"
      />
    </div>
  ),
}
