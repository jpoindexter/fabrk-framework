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
import { Bell, Check, X, Info, AlertTriangle, CheckCircle, XCircle, AtSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

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

/* ----- Helper Functions ----- */

const getNotificationIcon = (type: NotificationCenterItem['type']) => {
  const iconClass = 'h-5 w-5';

  switch (type) {
    case 'info':
      return <Info className={cn(iconClass, 'text-primary')} />;
    case 'success':
      return <CheckCircle className={cn(iconClass, 'text-success')} />;
    case 'warning':
      return <AlertTriangle className={cn(iconClass, 'text-accent')} />;
    case 'error':
      return <XCircle className={cn(iconClass, mode.color.text.danger)} />;
    case 'mention':
      return <AtSign className={cn(iconClass, 'text-primary')} />;
    default:
      return <Info className={cn(iconClass, 'text-primary')} />;
  }
};

const formatTimestamp = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

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

/* ----- Sub-Components ----- */

interface NotificationItemProps {
  notification: NotificationCenterItem;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  autoMarkAsRead?: boolean;
}

const NotificationItem = React.forwardRef<HTMLDivElement, NotificationItemProps>(
  ({ notification, onMarkAsRead, onDelete, autoMarkAsRead }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const handleClick = () => {
      if (autoMarkAsRead && !notification.read && onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
    };

    const handleMarkAsRead = (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkAsRead?.(notification.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(notification.id);
    };

    const handleAction = (e: React.MouseEvent) => {
      e.stopPropagation();
      notification.onAction?.();
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={notification.title}
        className={cn(
          'relative flex gap-4 border border-transparent p-4 transition-all',
          mode.radius,
          'cursor-pointer hover:border',
          mode.state.hover.card,
          !notification.read && 'bg-primary/5'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Unread indicator */}
        {!notification.read && (
          <div
            className={cn(
              'bg-primary absolute top-1/2 left-1 h-2 w-2 -translate-y-1/2',
              mode.radius
            )}
          />
        )}

        {/* Avatar or icon */}
        <div className="ml-4 flex-shrink-0">
          {notification.avatar ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={notification.avatar} alt={notification.title} />
              <AvatarFallback>{notification.title.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : (
            <div
              className={cn(
                'bg-background flex h-10 w-10 items-center justify-center border',
                mode.radius
              )}
            >
              {getNotificationIcon(notification.type)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-foreground text-xs font-semibold', mode.font)}>
              {notification.title}
            </p>
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {formatTimestamp(notification.timestamp)}
            </span>
          </div>
          <p className={cn('text-muted-foreground mt-0.5 line-clamp-2 text-xs', mode.font)}>
            {notification.message}
          </p>

          {/* Action button */}
          {notification.actionLabel && notification.onAction && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={handleAction}>
              {notification.actionLabel}
            </Button>
          )}
        </div>

        {/* Actions (visible on hover) */}
        {isHovered && (
          <div className="flex flex-shrink-0 items-start gap-1">
            {!notification.read && onMarkAsRead && (
              <button
                onClick={handleMarkAsRead}
                className={cn(mode.state.hover.card, 'p-1 transition-colors', mode.radius)}
                aria-label="Mark as read"
              >
                <Check className={cn('h-4 w-4', mode.color.text.success)} aria-hidden="true" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className={cn(mode.state.hover.card, 'p-1 transition-colors', mode.radius)}
                aria-label="Delete notification"
              >
                <X className={cn('h-4 w-4', mode.color.text.danger)} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);
NotificationItem.displayName = 'NotificationItem';

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
