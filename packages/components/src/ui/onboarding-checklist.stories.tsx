import type { Meta, StoryObj } from '@storybook/react'
import { OnboardingChecklist } from './onboarding-checklist'
import { fn } from '@storybook/test'

const meta = {
  title: 'Interactive/OnboardingChecklist',
  component: OnboardingChecklist,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof OnboardingChecklist>

export default meta
type Story = StoryObj<typeof meta>

const sampleTasks = [
  {
    id: '1',
    title: 'Create your account',
    description: 'Sign up with your email or GitHub to get started.',
    completed: true,
    link: { text: 'Go to signup', href: '#' },
  },
  {
    id: '2',
    title: 'Install the CLI',
    description: 'Run npm install -g create-fabrk-app to install the scaffolding tool.',
    completed: true,
  },
  {
    id: '3',
    title: 'Create your first project',
    description: 'Use the CLI to scaffold a new FABRK project with your preferred template.',
    completed: false,
    link: { text: 'View templates', href: '#' },
  },
  {
    id: '4',
    title: 'Deploy to production',
    description: 'Connect your repository and deploy with one click.',
    completed: false,
  },
]

export const Default: Story = {
  args: {
    tasks: sampleTasks,
    onTaskToggle: fn(),
    onDismiss: fn(),
  },
}

export const AllComplete: Story = {
  args: {
    tasks: sampleTasks.map((t) => ({ ...t, completed: true })),
    onTaskToggle: fn(),
    onDismiss: fn(),
  },
}

export const NoDismiss: Story = {
  args: {
    tasks: sampleTasks,
    onTaskToggle: fn(),
  },
}
