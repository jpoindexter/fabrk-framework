'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, Copy, Check, RefreshCw, Download } from 'lucide-react';
import { mode } from '@fabrk/design-system';
import { cn } from '../lib/utils';

export interface BackupCodesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codes: string[];
  onRegenerate?: () => Promise<string[]>;
  onCopySuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function BackupCodesModal({
  open,
  onOpenChange,
  codes: initialCodes,
  onRegenerate,
  onCopySuccess,
  onError,
}: BackupCodesModalProps) {
  const [codes, setCodes] = React.useState<string[]>(initialCodes);
  const [isLoading, setIsLoading] = React.useState(false);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    setCodes(initialCodes);
  }, [initialCodes]);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setIsLoading(true);
    try {
      const newCodes = await onRegenerate();
      setCodes(newCodes);
      onCopySuccess?.('Backup codes regenerated. Save these new codes securely.');
    } catch (error: unknown) {
      onError?.(error instanceof Error ? error.message : 'Failed to regenerate backup codes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      onCopySuccess?.('Backup code copied to clipboard');
    } catch {
      onError?.('Failed to copy to clipboard');
    }
  };

  const handleCopyAll = async () => {
    try {
      const allCodes = codes.join('\n');
      await navigator.clipboard.writeText(allCodes);
      onCopySuccess?.('All backup codes copied to clipboard');
    } catch {
      onError?.('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const content = `Backup Codes\n\nThese codes can be used to access your account if you lose your 2FA device.\nEach code can only be used once.\n\n${codes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onCopySuccess?.('Backup codes saved to file');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Backup Codes</DialogTitle>
          <DialogDescription>
            Save these codes in a secure place. Each code can only be used once to access your
            account if you lose your 2FA device.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <div
              className={cn(
                mode.radius,
                'border-primary mx-auto mb-4 h-8 w-8 animate-spin border-b-2'
              )}
            />
            <p className="text-muted-foreground text-sm">Loading backup codes...</p>
          </div>
        ) : codes.length > 0 ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Store these codes in a secure location. Do not share them with anyone. Each code can
                only be used once.
              </AlertDescription>
            </Alert>

            <div className={cn(mode.radius, 'bg-muted grid grid-cols-2 gap-4 p-4')}>
              {codes.map((code, index) => (
                <div
                  key={index}
                  className={cn(
                    mode.radius,
                    'bg-background border-border flex items-center justify-between border p-4'
                  )}
                >
                  <span className={cn(mode.font, 'text-sm font-medium')}>{code}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(code, index)}
                    className="h-8 w-8 p-0"
                  >
                    {copiedIndex === index ? (
                      <Check className="text-success h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyAll} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                &gt; COPY ALL
              </Button>
              <Button variant="outline" onClick={handleDownload} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                &gt; DOWNLOAD
              </Button>
              {onRegenerate && (
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  &gt; REGENERATE
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">No backup codes available</p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>&gt; CLOSE</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
