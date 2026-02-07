'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '../ui/input-otp';
import { AlertTriangle, Loader2, Copy, Check, CheckCircle2 } from 'lucide-react';
import { mode } from '@fabrk/design-system';
import { cn } from '../lib/utils';

type SetupStep = 'qr' | 'verify' | 'backup';

export interface MfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeUri: string;
  totpSecret: string;
  backupCodes: string[];
  onVerify: (code: string) => Promise<boolean>;
  onComplete: () => void;
  /** Optional render prop for QR code display. Receives the URI string. */
  renderQrCode?: (uri: string) => React.ReactNode;
}

export function MfaSetupDialog({
  open,
  onOpenChange,
  qrCodeUri,
  totpSecret,
  backupCodes,
  onVerify,
  onComplete,
  renderQrCode,
}: MfaSetupDialogProps) {
  const [setupStep, setSetupStep] = React.useState<SetupStep>('qr');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(totpSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Failed to copy
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const success = await onVerify(verificationCode);
      if (success) {
        setSetupStep('backup');
      } else {
        setVerificationCode('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (setupStep === 'backup') {
      onComplete();
    }
    setSetupStep('qr');
    setVerificationCode('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {setupStep === 'qr' && 'Set Up Two-Factor Authentication'}
            {setupStep === 'verify' && 'Verify Your Authenticator'}
            {setupStep === 'backup' && 'Save Your Backup Codes'}
          </DialogTitle>
          <DialogDescription>
            {setupStep === 'qr' &&
              'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)'}
            {setupStep === 'verify' && 'Enter the 6-digit code from your authenticator app'}
            {setupStep === 'backup' &&
              'Store these codes safely. You can use them to sign in if you lose access to your authenticator.'}
          </DialogDescription>
        </DialogHeader>

        {setupStep === 'qr' && (
          <div className="space-y-4">
            <div
              className={cn('bg-card border-border flex justify-center border p-4', mode.radius)}
            >
              {renderQrCode ? (
                renderQrCode(qrCodeUri)
              ) : (
                <div className={cn('flex h-[200px] w-[200px] items-center justify-center border border-dashed', mode.radius, mode.color.border.default)}>
                  <p className={cn('text-xs text-center px-4', mode.color.text.muted, mode.font)}>
                    QR CODE
                    <br />
                    <span className="text-2xs">Provide renderQrCode prop</span>
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-center text-sm">
                Can&apos;t scan? Enter this code manually:
              </p>
              <div className={cn('bg-muted flex items-center gap-2 p-2', mode.radius)}>
                <code className={cn('flex-1 text-xs break-all', mode.font)}>{totpSecret}</code>
                <Button variant="ghost" size="sm" onClick={handleCopySecret} className="shrink-0">
                  {copiedSecret ? (
                    <Check className="text-success h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setSetupStep('verify')} className="w-full">
                &gt; CONTINUE
              </Button>
            </DialogFooter>
          </div>
        )}

        {setupStep === 'verify' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setSetupStep('qr')} disabled={isVerifying}>
                &gt; BACK
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="flex-1"
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isVerifying ? '> VERIFYING...' : '> VERIFY AND ENABLE'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {setupStep === 'backup' && (
          <div className="space-y-4">
            <div className={cn('bg-muted grid grid-cols-2 gap-2 p-4', mode.radius)}>
              {backupCodes.map((code, i) => (
                <code key={i} className={cn('py-1 text-center text-sm', mode.font)}>
                  {code}
                </code>
              ))}
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Each code can only be used once. Store them in a safe place.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                &gt; DONE
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
