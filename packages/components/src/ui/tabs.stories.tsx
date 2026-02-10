import type { Meta, StoryObj } from '@storybook/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" style={{ width: 400 }}>
      <TabsList>
        <TabsTrigger value="overview">OVERVIEW</TabsTrigger>
        <TabsTrigger value="analytics">ANALYTICS</TabsTrigger>
        <TabsTrigger value="settings">SETTINGS</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p style={{ fontSize: 12, padding: 8 }}>Overview content goes here.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p style={{ fontSize: 12, padding: 8 }}>Analytics content goes here.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p style={{ fontSize: 12, padding: 8 }}>Settings content goes here.</p>
      </TabsContent>
    </Tabs>
  ),
}
