import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { BackupCodesModal } from './backup-codes-modal'

const meta = {
  title: 'Security/BackupCodesModal',
  component: BackupCodesModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof BackupCodesModal>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    codes: [
      'ABRK-7F2E-9D1C',
      'XKCD-4A8B-3E7F',
      'MNOP-6C9D-2B5A',
      'QRST-8E1F-4D7C',
      'UVWX-3A6B-9F2E',
      'YZAB-5D8E-1C4A',
      'CDEF-7B3F-6A9D',
      'GHIJ-2E5C-8F1B',
    ],
    onRegenerate: () => Promise.resolve([
      'NEW1-AAAA-BBBB',
      'NEW2-CCCC-DDDD',
      'NEW3-EEEE-FFFF',
      'NEW4-GGGG-HHHH',
      'NEW5-IIII-JJJJ',
      'NEW6-KKKK-LLLL',
      'NEW7-MMMM-NNNN',
      'NEW8-OOOO-PPPP',
    ]),
    onCopySuccess: fn(),
    onError: fn(),
  },
}
