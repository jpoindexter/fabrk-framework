'use client';

import * as React from 'react';
import { MessageSquare, Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Button } from '../ui/button';
import type { Conversation } from './chat-types';

interface AiChatSidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  className?: string;
}

export function AiChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  className,
}: AiChatSidebarProps) {
  return (
    <div className={cn('flex w-64 flex-col border-r', mode.color.border.default, mode.color.bg.base, className)}>
      {/* Header */}
      <div className={cn('flex items-center p-2 border-b', mode.color.border.default)}>
        <Button
          onClick={onNew}
          variant="outline"
          className="w-full justify-start gap-2 text-xs uppercase"
        >
          <Plus className="size-3.5" />
          New Chat
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              'group flex w-full items-center gap-2 px-2 py-2 text-left text-xs transition-colors border border-transparent',
              mode.radius,
              mode.font,
              activeId === conv.id
                ? cn(mode.color.bg.surfaceRaised, mode.color.border.default)
                : cn(mode.state.hover.card, 'hover:border-border/50')
            )}
          >
            <MessageSquare className={cn('size-3.5 shrink-0', mode.state.secondary.opacity)} />
            <span className="flex-1 truncate uppercase">{conv.title}</span>
            {activeId === conv.id && (
              <MoreHorizontal className={cn('size-3.5', mode.state.muted.opacity)} />
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className={cn('p-2 border-t', mode.color.border.default)}>
        <div className={cn('flex items-center gap-2 px-2 py-2 text-xs', mode.color.text.muted)}>
          <div className={cn('size-2', mode.radius, mode.color.bg.success)} />
          <span className="uppercase">System Online</span>
        </div>
      </div>
    </div>
  );
}
