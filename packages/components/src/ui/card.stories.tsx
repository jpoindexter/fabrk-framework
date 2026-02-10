import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardContent, CardFooter } from './card'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card style={{ width: 320 }}>
      <CardHeader title="SYSTEM STATUS" />
      <CardContent>
        <p style={{ fontSize: 12 }}>All systems operational. No incidents reported.</p>
      </CardContent>
    </Card>
  ),
}

export const WithTones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {(['neutral', 'primary', 'success', 'danger'] as const).map((tone) => (
        <Card key={tone} tone={tone} style={{ width: 200 }}>
          <CardHeader title={tone.toUpperCase()} />
          <CardContent>
            <p style={{ fontSize: 12 }}>Tone: {tone}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
}

export const Interactive: Story = {
  render: () => (
    <Card interactive style={{ width: 320, cursor: 'pointer' }}>
      <CardHeader title="INTERACTIVE CARD" />
      <CardContent>
        <p style={{ fontSize: 12 }}>Hover over this card to see the interactive state.</p>
      </CardContent>
      <CardFooter>
        <span style={{ fontSize: 12 }}>Click to expand</span>
      </CardFooter>
    </Card>
  ),
}
