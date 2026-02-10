import type { Meta, StoryObj } from '@storybook/react'
import { StatsGrid } from './stats-grid'

const meta = {
  title: 'Data/StatsGrid',
  component: StatsGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof StatsGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: [
      { label: 'Files', value: 1572 },
      { label: 'Components', value: 279, change: '+12%' },
      { label: 'API Routes', value: 46 },
      { label: 'Complexity', value: 'B+' },
    ],
  },
}
