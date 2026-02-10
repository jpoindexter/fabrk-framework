import type { Meta, StoryObj } from '@storybook/react'
import {
  FeaturesCard,
  MetricCard,
  FeatureCard,
  Stat,
  StatGroup,
  StyledLabel,
  FeatureItem,
  FeatureList,
  InfoNote,
  PageBadge,
} from './terminal-card'

const meta = {
  title: 'UI/TerminalCard',
  component: FeaturesCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FeaturesCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'TEMPLATE FEATURES',
    features: [
      'Multi-step form wizard',
      'Real-time validation',
      'Auto-save to localStorage',
      'Keyboard navigation',
    ],
    note: 'Connect to your API to persist data.',
  },
}

export const WithActions: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '500px' }}>
      <MetricCard
        title="UI_COMPONENTS"
        value="77+"
        label="UI Components"
      />
      <FeatureCard
        title="EMAIL_SYSTEM"
        headline="Transactional emails that just work"
        description="Resend integration with React Email templates. Send beautiful emails with zero configuration."
        stats={[
          { label: 'TIME SAVED', value: '30+ HRS' },
          { label: 'COST SAVED', value: '$3K' },
        ]}
        includes={['Resend Integration', 'React Email Templates', 'Transactional Emails']}
        ctaLabel="EMAIL TEMPLATES"
        ctaHref="/docs/features/email"
      />
    </div>
  ),
}

export const Primitives: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <PageBadge>SIGN IN</PageBadge>
      <StyledLabel>SYSTEM STATUS</StyledLabel>
      <StatGroup>
        <Stat label="Speed" value="OPTIMIZED" />
        <Stat label="Integration" value="SEAMLESS" />
        <Stat label="Uptime" value="99.9%" />
      </StatGroup>
      <FeatureList>
        <FeatureItem>Multi-step form wizard</FeatureItem>
        <FeatureItem icon="check">Real-time validation</FeatureItem>
        <FeatureItem icon="dot">Keyboard navigation</FeatureItem>
      </FeatureList>
      <InfoNote>Connect to your API to persist data.</InfoNote>
    </div>
  ),
}
