import type { Meta, StoryObj } from '@storybook/react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion'

const meta = {
  title: 'UI/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    type: 'single',
    collapsible: true,
  },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="item-1">
        <AccordionTrigger>WHAT IS FABRK?</AccordionTrigger>
        <AccordionContent>
          A UI framework designed specifically for AI coding agents. Import pre-built components
          instead of writing everything from scratch.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>HOW DO I INSTALL?</AccordionTrigger>
        <AccordionContent>
          Run pnpm add @fabrk/components to install the components package.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>WHAT THEMES ARE AVAILABLE?</AccordionTrigger>
        <AccordionContent>
          FABRK includes 18 themes with runtime-dynamic CSS variables. Switch themes without
          rebuilding your application.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Multiple: Story = {
  args: {
    type: 'multiple',
  },
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="item-1">
        <AccordionTrigger>COMPONENTS</AccordionTrigger>
        <AccordionContent>
          70+ UI components including charts, dashboard shell, AI chat, and admin panels.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>DESIGN SYSTEM</AccordionTrigger>
        <AccordionContent>
          Terminal-inspired aesthetic with monospace fonts, uppercase labels, and bracket patterns.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>PACKAGES</AccordionTrigger>
        <AccordionContent>
          16 packages covering auth, payments, email, storage, security, AI, and more.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
