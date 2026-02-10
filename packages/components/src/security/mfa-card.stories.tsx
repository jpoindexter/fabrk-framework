import type { Meta, StoryObj } from '@storybook/react'
import { MfaCard } from './mfa-card'
import { fn } from '@storybook/test'

const meta = {
  title: 'Security/MfaCard',
  component: MfaCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof MfaCard>

export default meta
type Story = StoryObj<typeof meta>

export const Disabled: Story = {
  args: {
    twoFactorEnabled: false,
    isEnabling2FA: false,
    isDisabling2FA: false,
    onEnable2FA: fn(),
    onDisable2FA: fn(),
    onViewBackupCodes: fn(),
  },
}

export const Enabled: Story = {
  args: {
    twoFactorEnabled: true,
    isEnabling2FA: false,
    isDisabling2FA: false,
    onEnable2FA: fn(),
    onDisable2FA: fn(),
    onViewBackupCodes: fn(),
  },
}

export const Enabling: Story = {
  args: {
    twoFactorEnabled: false,
    isEnabling2FA: true,
    isDisabling2FA: false,
    onEnable2FA: fn(),
    onDisable2FA: fn(),
    onViewBackupCodes: fn(),
  },
}
