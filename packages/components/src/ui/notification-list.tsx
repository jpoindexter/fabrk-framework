/**
 * ✅ FABRK COMPONENT
 * - Component under 150 lines ✓
 * - No hardcoded styles ✓
 * - Design tokens only ✓
 * - Error/loading states ✓
 *
 * @example
 * ```tsx
 * <NotificationList />
 * ```
 */

'use client';

import { Button } from './button';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { AlertCircle, Bell, Check, X } from 'lucide-react';
import * as React from 'react';

export interface Notification {
  id: string;
  title: string;
  description?: string;
  time: string;
  read?: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface NotificationListProps {
  className?: string;
  loading?: boolean;
  error?: boolean;
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export const NotificationList = React.forwardRef<HTMLDivElement, NotificationListProps>(
  (
    {
      className,
      loading = false,
      error = false,
      notifications = [],
      onMarkAsRead,
      onDismiss,
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <div data-slot="notification-list" ref={ref} className={cn(`space-y-2`, className, '')}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`animate-pulse`}>
              <div className={`flex gap-6`}>
                <div className={cn(`"h-8 w-8"`, mode.color.border.default, mode.color.bg.surface, 'border', mode.radius)} />
                <div className={`flex-1 space-y-2`}>
                  <div className={cn(mode.color.border.default, mode.color.bg.surface, 'h-4 w-3/4 border', mode.radius)} />
                  <div className={cn(mode.color.border.default, mode.color.bg.surface, 'h-3 w-1/2 border', mode.radius)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className={cn(mode.color.text.danger, 'p-6', className, '')}>Error loading notifications</div>
      );
    }

    const getIcon = (type?: string) => {
      switch (type) {
        case 'success':
          return <Check className={`"h-4 w-4" text-primary`} />;
        case 'warning':
          return (
            <AlertCircle
              className={`"h-4 w-4" text-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`}
            />
          );
        case 'error':
          return <X className={cn(`"h-4 w-4"`, mode.color.text.danger)} />;
        default:
          return <Bell className="h-4 w-4 text-primary" />;
      }
    };

    return (
      <div ref={ref} className={cn('', className, '')} {...props}>
        {notifications.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center">
            No notifications
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'cursor-pointer p-6 transition-all duration-200',
                  'hover:bg-primary/50 hover:translate-x-1',
                  'focus-within:ring-ring focus-within:ring-2 focus-visible:outline-none',
                  !notification.read && mode.color.bg.primaryLight,
                  ''
                )}
                onClick={() => onMarkAsRead?.(notification.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onMarkAsRead?.(notification.id);
                  }
                }}
                aria-label={`Notification: ${notification.title}${!notification.read ? ' (unread)' : ''}`}
              >
                <div className={`flex gap-6`}>
                  <div
                    className={cn(
                      `"h-8 w-8"`,
                      mode.color.border.default,
                      mode.color.bg.surface,
                      'flex items-center justify-center border transition-transform hover:scale-110',
                      mode.radius
                    )}
                  >
                    {getIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="hover:text-primary line-clamp-1 font-medium transition-colors">
                      {notification.title}
                    </p>
                    {notification.description && (
                      <p
                        className="text-sm text-muted-foreground line-clamp-2 transition-colors"
                      >
                        {notification.description}
                      </p>
                    )}
                    <p
                      className="text-xs text-muted-foreground mt-2 transition-colors"
                    >
                      {notification.time}
                    </p>
                  </div>
                  {onDismiss && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(notification.id);
                      }}
                      className={cn(mode.color.text.muted, 'hover:text-destructive focus-visible:ring-ring transition-all hover:scale-110 focus-visible:ring-2 focus-visible:outline-none')}
                      aria-label="Dismiss notification"
                    >
                      <X className={`"h-4 w-4"`} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
NotificationList.displayName = 'NotificationList';
