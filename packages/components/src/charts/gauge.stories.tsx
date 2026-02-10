import type { Meta, StoryObj } from '@storybook/react'
import { Gauge, ScoreGauge } from './gauge'

const meta = {
  title: 'Charts/Gauge',
  component: Gauge,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Gauge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 72,
    max: 100,
    label: 'CPU USAGE',
    unit: '%',
    size: 200,
  },
}

export const WithMinMax: Story = {
  args: {
    value: 65,
    min: 0,
    max: 100,
    label: 'MEMORY',
    unit: '%',
    showMinMax: true,
    size: 200,
  },
}

export const WithSegments: Story = {
  args: {
    value: 75,
    max: 100,
    label: 'HEALTH',
    size: 200,
    segments: [
      { value: 33, color: 'oklch(60% 0.20 25)' },
      { value: 34, color: 'oklch(70% 0.15 60)' },
      { value: 33, color: 'oklch(70% 0.15 160)' },
    ],
  },
}

export const Score: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <ScoreGauge score={92} label="EXCELLENT" size={160} />
      <ScoreGauge score={68} label="GOOD" size={160} />
      <ScoreGauge score={45} label="FAIR" size={160} />
      <ScoreGauge score={22} label="POOR" size={160} />
    </div>
  ),
}
