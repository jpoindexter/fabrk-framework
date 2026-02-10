import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { UpgradeCTA } from './upgrade-cta'

const meta = {
  title: 'UI/UpgradeCTA',
  component: UpgradeCTA,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof UpgradeCTA>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    hiddenCount: 42,
    contentType: 'templates',
    onUpgrade: fn(),
  },
}

export const Inline: Story = {
  args: {
    hiddenCount: 15,
    contentType: 'components',
    variant: 'inline',
    onUpgrade: fn(),
  },
}

export const Banner: Story = {
  args: {
    hiddenCount: 30,
    contentType: 'themes',
    variant: 'banner',
    onUpgrade: fn(),
  },
}
