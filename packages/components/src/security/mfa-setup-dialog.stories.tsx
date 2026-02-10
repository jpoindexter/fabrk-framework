import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { MfaSetupDialog } from './mfa-setup-dialog'

const meta = {
  title: 'Security/MfaSetupDialog',
  component: MfaSetupDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof MfaSetupDialog>

export default meta
type Story = StoryObj<typeof meta>

const sampleBackupCodes = [
  'ABRK-7F2E-9D1C',
  'XKCD-4A8B-3E7F',
  'MNOP-6C9D-2B5A',
  'QRST-8E1F-4D7C',
  'UVWX-3A6B-9F2E',
  'YZAB-5D8E-1C4A',
  'CDEF-7B3F-6A9D',
  'GHIJ-2E5C-8F1B',
]

export const QRStep: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    qrCodeUri: 'otpauth://totp/FABRK:jason@fabrk.dev?secret=JBSWY3DPEHPK3PXP&issuer=FABRK',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    backupCodes: sampleBackupCodes,
    onVerify: () => Promise.resolve(true),
    onComplete: fn(),
  },
}

export const VerifyStep: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    qrCodeUri: 'otpauth://totp/FABRK:jason@fabrk.dev?secret=JBSWY3DPEHPK3PXP&issuer=FABRK',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    backupCodes: sampleBackupCodes,
    onVerify: () => Promise.resolve(true),
    onComplete: fn(),
  },
}
