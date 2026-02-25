'use client';

import * as React from 'react';
import {
  FileText,
  MessageSquare,
  UserPlus,
  Settings,
  Upload,
  Trash2,
  Edit,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { getInitials } from '../utils';

export type ActivityType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'commented'
  | 'uploaded'
  | 'invited'
  | 'completed'
  | 'configured';

export interface TeamActivity {
  id: string;
  type: ActivityType;
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
  action: string;
  target?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface TeamActivityFeedProps {
  activities: TeamActivity[];
  maxHeight?: number;
  showTimestamp?: boolean;
  className?: string;
}

const activityConfig: Record<
  ActivityType,
  { icon: React.ElementType; colorClass: string; bgColorClass: string }
> = {
  created: {
    icon: FileText,
    colorClass: mode.color.text.accent,
    bgColorClass: 'bg-primary/10',
  },
  updated: {
    icon: Edit,
    colorClass: mode.color.text.accent,
    bgColorClass: 'bg-accent/10',
  },
  deleted: {
    icon: Trash2,
    colorClass: mode.color.text.danger,
    bgColorClass: 'bg-destructive/10',
  },
  commented: {
    icon: MessageSquare,
    colorClass: mode.color.text.accent,
    bgColorClass: 'bg-primary/10',
  },
  uploaded: {
    icon: Upload,
    colorClass: mode.color.text.accent,
    bgColorClass: 'bg-accent/10',
  },
  invited: {
    icon: UserPlus,
    colorClass: mode.color.text.accent,
    bgColorClass: 'bg-primary/10',
  },
  completed: {
    icon: CheckCircle2,
    colorClass: mode.color.text.accent,
    bgColorClass: 'bg-primary/10',
  },
  configured: {
    icon: Settings,
    colorClass: mode.color.text.muted,
    bgColorClass: mode.color.bg.muted,
  },
};

export function TeamActivityFeed({
  activities,
  maxHeight = 400,
  showTimestamp = true,
  className,
}: TeamActivityFeedProps) {
  const formatTimestamp = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title="TEAM ACTIVITY"
        icon={<Activity className="h-4 w-4" />}
        meta={`${activities.length} event${activities.length !== 1 ? 's' : ''}`}
      />

      <CardContent padding="md" className="p-0">
        <ScrollArea className="h-full" style={{ maxHeight }}>
          <div className="space-y-0 p-6 pt-0">
            {activities.length === 0 ? (
              <div
                className={cn(
                  'flex flex-col items-center justify-center py-12',
                  mode.color.text.muted
                )}
              >
                <Activity className="mb-2 h-8 w-8" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="relative space-y-4">
                <div
                  className={cn('absolute top-0 bottom-0 left-activity w-0.5', mode.color.bg.muted)}
                />

                {activities.map((activity) => {
                  const config = activityConfig[activity.type];
                  const Icon = config.icon;

                  return (
                    <div key={activity.id} className="group relative flex gap-4">
                      <div className="relative flex-shrink-0">
                        <Avatar className={cn('h-10 w-10 border', mode.color.border.default, mode.radius)}>
                          <AvatarFallback
                            className={cn(
                              mode.font,
                              'text-xs font-semibold',
                              mode.color.bg.accent,
                              mode.color.text.inverse
                            )}
                          >
                            {getInitials(activity.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            'absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center border',
                            mode.color.border.default,
                            mode.radius,
                            config.bgColorClass
                          )}
                        >
                          <Icon className={cn('h-3 w-3', config.colorClass)} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1 pt-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={cn(mode.font, 'text-sm', mode.color.text.primary)}>
                              <span className="font-semibold">{activity.user.name}</span>{' '}
                              <span className={mode.color.text.muted}>{activity.action}</span>
                              {activity.target && (
                                <span className={cn('font-medium', mode.color.text.primary)}>
                                  {' '}
                                  {activity.target}
                                </span>
                              )}
                            </p>
                          </div>
                          {showTimestamp && (
                            <time className={cn('flex-shrink-0 text-xs', mode.color.text.muted)}>
                              {formatTimestamp(activity.timestamp)}
                            </time>
                          )}
                        </div>

                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(activity.metadata).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs font-normal">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
