import type { Meta, StoryObj } from '@storybook/react'
import { Progress, SolidProgress, ProgressWithInfo } from './progress'

const meta = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 66,
    variant: 'block',
  },
}

export const HashVariant: Story = {
  args: {
    value: 45,
    variant: 'hash',
    showPercentage: true,
  },
}

export const ArrowVariant: Story = {
  args: {
    value: 80,
    variant: 'arrow',
    showPercentage: true,
    label: 'DL',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Progress value={72} variant="block" showPercentage />
      <Progress value={72} variant="hash" showPercentage />
      <Progress value={72} variant="pipe" showPercentage />
      <Progress value={72} variant="dots" showPercentage />
      <Progress value={72} variant="arrow" showPercentage />
      <Progress value={72} variant="braille" showPercentage />
    </div>
  ),
}

export const Solid: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
      <SolidProgress value={30} label="UPLOADING" size="sm" />
      <SolidProgress value={65} label="PROCESSING" size="md" />
      <SolidProgress value={100} label="COMPLETE" size="lg" />
    </div>
  ),
}

export const WithInfo: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <ProgressWithInfo
        value={48}
        variant="block"
        showPercentage
        loaded="24 MB"
        total="50 MB"
        speed="2.5 MB/s"
        eta="10s"
      />
    </div>
  ),
}
