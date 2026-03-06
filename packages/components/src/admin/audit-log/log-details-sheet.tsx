'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../ui/sheet';
import { getInitials, sanitizeSrc } from '../../utils';
import { getActionBadgeVariant, getActionLabel } from './action-helpers';
import type { AuditLogEntry } from './types';

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className={cn('text-xs font-semibold', mode.font)}>[{label}]:</p>
      {children}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-xs">
      <span className={cn('text-muted-foreground', mode.font)}>[{label}]:</span>
      <span className={cn(mode.font)}>{children}</span>
    </div>
  );
}

function DetailBox({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(mode.color.bg.muted, mode.color.border.default, 'space-y-1 border px-4 py-2', mode.radius)}>
      {children}
    </div>
  );
}

export function LogDetailsSheet({ log, onClose }: { log: AuditLogEntry | null; onClose: () => void }) {
  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className={cn('w-full overflow-y-auto sm:max-w-2xl', mode.radius)}>
        {log && (
          <>
            <SheetHeader>
              <SheetTitle className={cn(mode.font)}>[ AUDIT LOG DETAILS ]</SheetTitle>
              <SheetDescription>Complete information about this action</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <DetailSection label="USER">
                <div className="flex items-center gap-4">
                  <Avatar className="border-border h-12 w-12 border-2">
                    <AvatarImage src={sanitizeSrc(log.userAvatar)} alt={log.userName} />
                    <AvatarFallback className={cn('text-sm', mode.font)}>
                      {getInitials(log.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className={cn('text-sm font-medium', mode.font)}>{log.userName}</p>
                    <p className={cn('text-muted-foreground text-xs', mode.font)}>{log.userEmail}</p>
                  </div>
                </div>
              </DetailSection>

              <DetailSection label="ACTION">
                <DetailBox>
                  <div className="flex justify-between text-xs">
                    <span className={cn('text-muted-foreground', mode.font)}>[TYPE]:</span>
                    <Badge variant={getActionBadgeVariant(log.action)} className={cn(mode.font)}>
                      {getActionLabel(log.action)}
                    </Badge>
                  </div>
                  <DetailRow label="RESOURCE">{log.resource}</DetailRow>
                  <DetailRow label="TIMESTAMP">{new Date(log.timestamp).toISOString()}</DetailRow>
                </DetailBox>
              </DetailSection>

              <DetailSection label="SECURITY">
                <DetailBox>
                  <DetailRow label="IP ADDRESS">{log.ipAddress}</DetailRow>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className={cn('text-muted-foreground', mode.font)}>[USER AGENT]:</span>
                    <span className={cn('text-muted-foreground break-all', mode.font)}>{log.userAgent}</span>
                  </div>
                </DetailBox>
              </DetailSection>

              {Object.keys(log.metadata).length > 0 && (
                <DetailSection label="METADATA">
                  <DetailBox>
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <DetailRow key={key} label={key.toUpperCase()}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </DetailRow>
                    ))}
                  </DetailBox>
                </DetailSection>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
