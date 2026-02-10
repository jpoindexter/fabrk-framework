/**
 * MfaCard - Two-factor authentication management card with enable/disable controls.
 * Shows current 2FA status with a badge and provides access to backup codes when enabled.
 *
 * @example
 * ```tsx
 * <MfaCard
 *   twoFactorEnabled={user.mfaEnabled}
 *   isEnabling2FA={isPending}
 *   isDisabling2FA={false}
 *   onEnable2FA={() => startMfaSetup()}
 *   onDisable2FA={() => disableMfa()}
 *   onViewBackupCodes={() => openBackupCodesDialog()}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Shield, Smartphone, CheckCircle2, XCircle } from 'lucide-react';

export interface MfaCardProps {
  twoFactorEnabled: boolean;
  isEnabling2FA: boolean;
  isDisabling2FA: boolean;
  onEnable2FA: () => void;
  onDisable2FA: () => void;
  onViewBackupCodes: () => void;
}

export function MfaCard({
  twoFactorEnabled,
  isEnabling2FA,
  isDisabling2FA,
  onEnable2FA,
  onDisable2FA,
  onViewBackupCodes,
}: MfaCardProps) {
  return (
    <Card tone={twoFactorEnabled ? 'success' : 'warning'}>
      <CardHeader code="0x02" title="TWO FACTOR AUTH" icon={<Smartphone className="h-4 w-4" />} />
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={cn(mode.font, 'text-muted-foreground', 'text-xs')}>
            Add an extra layer of security to your account
          </p>
          {twoFactorEnabled ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>
        <p className={cn(mode.font, 'text-muted-foreground', 'text-xs')}>
          Two-factor authentication (2FA) adds an additional layer of security by requiring a second
          form of verification when you sign in.
        </p>

        {twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-success h-4 w-4" />
              <span className={cn(mode.font, 'text-xs')}>
                2FA is currently protecting your account
              </span>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={onViewBackupCodes}>
                &gt; VIEW BACKUP CODES
              </Button>
              <Button variant="destructive" onClick={onDisable2FA} disabled={isDisabling2FA}>
                {isDisabling2FA ? '> DISABLING...' : '> DISABLE 2FA'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onEnable2FA} disabled={isEnabling2FA}>
            <Shield className="mr-2 h-4 w-4" />
            {isEnabling2FA ? '> SETTING UP...' : '> ENABLE 2FA'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
