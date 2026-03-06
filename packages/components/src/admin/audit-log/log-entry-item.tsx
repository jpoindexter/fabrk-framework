'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { getInitials, sanitizeSrc } from '../../utils';
import { ChevronDown, Clock } from 'lucide-react';
import { getActionIcon, getActionBadgeVariant, getActionLabel } from './action-helpers';
import type { AuditLogEntry } from './types';

export function LogEntryItem({
  log,
  isLast,
  onShowDetails,
}: {
  log: AuditLogEntry;
  isLast: boolean;
  onShowDetails: (log: AuditLogEntry) => void;
}) {
  return (
    <div className="relative p-4">
      {!isLast && <div className={cn(mode.color.border.default, 'absolute top-13 left-13 h-full w-px border-l')} />}

      <div className="flex items-start gap-4">
        <Avatar className="border-border h-10 w-10 border-2">
          <AvatarImage src={sanitizeSrc(log.userAvatar)} alt={log.userName} />
          <AvatarFallback className={cn('text-xs', mode.font)}>
            {getInitials(log.userName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={cn('text-sm font-medium', mode.font)}>{log.userName}</p>
                <Badge
                  variant={getActionBadgeVariant(log.action)}
                  className={cn('gap-1 px-2 py-0.5 text-xs', mode.font)}
                >
                  {getActionIcon(log.action)}
                  {getActionLabel(log.action)}
                </Badge>
              </div>

              <p className={cn('text-muted-foreground mt-1 text-xs', mode.font)}>{log.resource}</p>

              <div className={cn('text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs', mode.font)}>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span>{'\u2022'} {log.ipAddress}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onShowDetails(log)}
              className={cn('text-xs', mode.radius, mode.font)}
            >
              DETAILS
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
