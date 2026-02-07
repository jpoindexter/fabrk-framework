'use client';

import * as React from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import type { Message } from './chat-types';

interface AiChatMessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export function AiChatMessageList({ messages, isLoading, className }: AiChatMessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className={cn('flex-1 overflow-y-auto p-4 space-y-6', mode.color.bg.base, className)}
    >
      {messages.length === 0 && (
        <div className={cn('flex h-full flex-col items-center justify-center gap-4', mode.state.muted.opacity)}>
          <Terminal className="size-12" />
          <p className={cn('text-sm uppercase tracking-widest', mode.font)}>System Ready</p>
        </div>
      )}

      {messages.map((msg, index) => (
        <MessageItem key={msg.id || index} message={msg} />
      ))}

      {isLoading && <ThinkingMessage />}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('mx-auto flex max-w-3xl gap-4 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className={cn("size-8 border text-xs font-bold", mode.radius)}>
        <AvatarFallback className={cn(
          isUser ? mode.color.bg.accentMuted : mode.color.bg.surfaceRaised,
          isUser ? mode.color.text.accent : mode.color.text.primary
        )}>
          {isUser ? 'US' : 'AI'}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 px-1">
          <span className={cn('text-2xs font-bold uppercase tracking-wider', mode.state.secondary.opacity, mode.font)}>
            {isUser ? 'OPERATOR' : 'SYSTEM'}
          </span>
          <span className={cn('text-2xs', mode.state.subtle.opacity, mode.font)}>
             {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className={cn(
          'relative w-full max-w-full overflow-hidden px-4 py-3 text-sm whitespace-pre-wrap border',
          mode.radius,
          mode.font,
          isUser
            ? cn(mode.color.bg.accentMuted, mode.color.border.accent, mode.color.text.primary)
            : cn(mode.color.bg.surface, mode.color.border.default, mode.color.text.secondary)
        )}>
          {message.content}

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att, i) => (
                <Badge key={i} variant="outline" className={mode.state.secondary.opacity}>
                  FILE: {att.name}
                </Badge>
              ))}
            </div>
          )}

          {!isUser && (
             <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 flex gap-1">
               <button onClick={copyToClipboard} className={cn('p-1', mode.state.hover.card)}>
                 {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThinkingMessage() {
  return (
    <div className="mx-auto flex max-w-3xl gap-4 animate-pulse">
      <Avatar className="size-8">
        <AvatarFallback><Terminal className="size-4" /></AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
         <div className="h-4 w-24 bg-muted/20" />
         <div className={cn("h-10 w-64 bg-muted/10 border border-dashed border-muted/20", mode.radius)} />
      </div>
    </div>
  );
}
