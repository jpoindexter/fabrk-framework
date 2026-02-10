import type { Preview } from '@storybook/react'
import './storybook-globals.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'terminal',
      values: [
        { name: 'terminal', value: 'hsl(0, 0%, 3%)' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    layout: 'centered',
  },
}

export default preview
