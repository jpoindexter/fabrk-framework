import * as React from 'react';
import { Check, X, Info, AlertTriangle, CheckCircle, XCircle, AtSign } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Button } from '../ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { sanitizeSrc } from '../utils';
import type { NotificationCenterItem } from './notification-center';

export interface NotificationItemProps {
  notification: NotificationCenterItem;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  autoMarkAsRead?: boolean;
}

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

export const formatTimestamp = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const NotificationItem = React.forwardRef<HTMLDivElement, NotificationItemProps>(
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
        {!notification.read && (
          <div
            className={cn(
              'bg-primary absolute top-1/2 left-1 h-2 w-2 -translate-y-1/2',
              mode.radius
            )}
          />
        )}

        <div className="ml-4 flex-shrink-0">
          {notification.avatar && sanitizeSrc(notification.avatar) ? (
            <Avatar className="h-10 w-10">
              <AvatarImage src={sanitizeSrc(notification.avatar)} alt={notification.title} />
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

          {notification.actionLabel && notification.onAction && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={handleAction}>
              {notification.actionLabel}
            </Button>
          )}
        </div>

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
