import type { Meta, StoryObj } from '@storybook/react'
import { LineChart } from './line-chart'

const meta = {
  title: 'Charts/LineChart',
  component: LineChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof LineChart>

export default meta
type Story = StoryObj<typeof meta>

const sampleData = [
  { day: 'Mon', users: 120, sessions: 240 },
  { day: 'Tue', users: 180, sessions: 310 },
  { day: 'Wed', users: 150, sessions: 280 },
  { day: 'Thu', users: 210, sessions: 390 },
  { day: 'Fri', users: 260, sessions: 420 },
]

export const Default: Story = {
  args: {
    data: sampleData,
    xAxisKey: 'day',
    series: [
      { dataKey: 'users', name: 'Users' },
      { dataKey: 'sessions', name: 'Sessions' },
    ],
    height: 300,
  },
}
