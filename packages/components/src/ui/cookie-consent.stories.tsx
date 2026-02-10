import type { Meta, StoryObj } from '@storybook/react'
import { CookieConsent } from './cookie-consent'
import { fn } from '@storybook/test'

const meta = {
  title: 'Interactive/CookieConsent',
  component: CookieConsent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CookieConsent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onAcceptAll: fn(),
    onAcceptSelected: fn(),
    onRejectAll: fn(),
    cookieKey: 'storybook-cookie-demo',
  },
  // Clear localStorage before each render so the banner shows
  render: (args) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(args.cookieKey || 'cookie-consent')
    }
    return <CookieConsent {...args} />
  },
}

export const AllCallbacks: Story = {
  args: {
    onAcceptAll: fn(),
    onAcceptSelected: fn(),
    onRejectAll: fn(),
    cookieKey: 'storybook-cookie-all',
  },
  render: (args) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(args.cookieKey || 'cookie-consent')
    }
    return <CookieConsent {...args} />
  },
}
