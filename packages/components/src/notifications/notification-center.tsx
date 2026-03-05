/**
 * NotificationCenter - Bell icon dropdown with grouped notifications, read/unread states, and actions.
 * Supports date grouping, mark-as-read, delete, clear-all, and per-notification action buttons.
 *
 * @example
 * ```tsx
 * <NotificationCenter
 *   notifications={[
 *     { id: '1', type: 'info', title: 'Deploy complete', message: 'v2.1.0 is live', timestamp: new Date(), read: false },
 *     { id: '2', type: 'warning', title: 'Rate limit', message: 'API nearing quota', timestamp: new Date(), read: true },
 *   ]}
 *   onMarkAsRead={(id) => markRead(id)}
 *   onMarkAllAsRead={() => markAllRead()}
 *   onDelete={(id) => deleteNotification(id)}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { Bell, Check, X } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import { NotificationItem } from './notification-item';

export interface NotificationCenterItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'mention';
  title: string;
  message: string;
  timestamp: Date | string;
  read: boolean;
  avatar?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface NotificationCenterProps {
  notifications: NotificationCenterItem[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
  maxHeight?: number;
  groupByDate?: boolean;
  autoMarkAsRead?: boolean;
  className?: string;
}

const groupNotificationsByDate = (
  notifications: NotificationCenterItem[]
): Record<string, NotificationCenterItem[]> => {
  const now = new Date();
  const groups: Record<string, NotificationCenterItem[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  notifications.forEach((notification) => {
    const date =
      typeof notification.timestamp === 'string'
        ? new Date(notification.timestamp)
        : notification.timestamp;
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      groups.Today.push(notification);
    } else if (diffInDays === 1) {
      groups.Yesterday.push(notification);
    } else if (diffInDays <= 7) {
      groups['This Week'].push(notification);
    } else {
      groups.Older.push(notification);
    }
  });

  return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
};

function NotificationCenterHeader({
  unreadCount,
  hasNotifications,
  onMarkAllAsRead,
  onClearAll,
}: {
  unreadCount: number;
  hasNotifications: boolean;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <h3 className={cn('text-sm font-semibold', mode.font)}>Notifications</h3>
      <div className="flex items-center gap-2">
        {unreadCount > 0 && onMarkAllAsRead && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onMarkAllAsRead}>
            <Check className="mr-1 h-3 w-3" />
            Mark all read
          </Button>
        )}
        {hasNotifications && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(mode.color.text.danger, 'hover:text-destructive h-8 text-xs')}
            onClick={onClearAll}
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyNotificationsState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className={cn(mode.color.bg.muted, 'mb-4 flex h-16 w-16 items-center justify-center', mode.radius)}>
        <Bell className="text-muted-foreground h-8 w-8" />
      </div>
      <p className="text-foreground mb-1 font-semibold">You're all caught up!</p>
      <p className={cn('text-muted-foreground text-center text-xs', mode.font)}>
        No new notifications at the moment
      </p>
    </div>
  );
}

export const NotificationCenter = React.forwardRef<HTMLDivElement, NotificationCenterProps>(
  (
    {
      notifications,
      onMarkAsRead,
      onMarkAllAsRead,
      onDelete,
      onClearAll,
      maxHeight = 600,
      groupByDate = true,
      autoMarkAsRead = false,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const unreadCount = notifications.filter((n) => !n.read).length;
    const sortedNotifications = [...notifications].sort((a, b) => {
      const dateA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
      const dateB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
      return dateB.getTime() - dateA.getTime();
    });

    const groupedNotifications = groupByDate
      ? groupNotificationsByDate(sortedNotifications)
      : { All: sortedNotifications };

    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative', className)}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  mode.color.bg.danger,
                  mode.color.text.dangerOnColor,
                  'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center border text-xs font-semibold',
                  mode.radius
                )}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          ref={ref}
          align="end"
          className="w-full max-w-md p-0"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          <NotificationCenterHeader
            unreadCount={unreadCount}
            hasNotifications={notifications.length > 0}
            onMarkAllAsRead={onMarkAllAsRead}
            onClearAll={onClearAll}
          />

          {notifications.length === 0 ? (
            <EmptyNotificationsState />
          ) : (
            <ScrollArea className="h-full" style={{ maxHeight: `${maxHeight - 73}px` }}>
              <div className="space-y-1 p-2">
                {Object.entries(groupedNotifications).map(([group, items]) => (
                  <div key={group}>
                    {groupByDate && (
                      <div className={cn(mode.color.bg.muted, 'sticky top-0 z-10 mb-2 px-4 py-2', mode.radius)}>
                        <span className={cn(mode.color.text.muted, 'text-xs font-semibold tracking-wide uppercase')}>
                          {group}
                        </span>
                      </div>
                    )}
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={onMarkAsRead}
                        onDelete={onDelete}
                        autoMarkAsRead={autoMarkAsRead}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);
NotificationCenter.displayName = 'NotificationCenter';
