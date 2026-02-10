import type { Meta, StoryObj } from '@storybook/react'
import { PricingCard } from './pricing-card'

const meta = {
  title: 'UI/PricingCard',
  component: PricingCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof PricingCard>

export default meta
type Story = StoryObj<typeof meta>

export const Free: Story = {
  args: {
    price: '$0',
    title: 'FREE TIER',
    priceSubtext: 'FOREVER FREE',
    headerCode: '0x00',
    highlights: ['5 PROJECTS', 'COMMUNITY SUPPORT', 'BASIC THEMES'],
  },
}

export const Pro: Story = {
  args: {
    price: '$199',
    regularPrice: '$299',
    discountMessage: 'SAVE $100 INSTANTLY',
    title: 'ONE-TIME LIFETIME ACCESS',
    urgencyMessage: 'OFFER ENDS SOON',
    priceSubtext: 'ONE TIME PAYMENT',
    headerCode: '0x41',
    highlights: ['NO SUBSCRIPTION', 'UNLIMITED PROJECTS', 'ALL THEMES', 'PRIORITY SUPPORT'],
    trustLine: '30-day money-back guarantee. No questions asked.',
  },
}

export const Enterprise: Story = {
  args: {
    price: '$499',
    title: 'ENTERPRISE LICENSE',
    priceSubtext: 'PER YEAR',
    headerCode: '0xFF',
    highlights: ['UNLIMITED SEATS', 'SSO INTEGRATION', 'CUSTOM THEMES', 'DEDICATED SUPPORT', 'SLA GUARANTEE'],
    trustLine: 'Volume discounts available for teams of 50+.',
  },
}
