/**
 * AiChatInput - Chat message input with auto-resize, file attachments, model selector, and stop button.
 * Sends on Enter (Shift+Enter for newline). Integrates with AI chat flow via onSend/onStop callbacks.
 *
 * @example
 * ```tsx
 * <AiChatInput
 *   onSend={(message, attachments) => sendMessage(message, attachments)}
 *   onStop={() => abortStream()}
 *   isLoading={isStreaming}
 *   models={[{ id: 'gpt-4', name: 'GPT-4' }]}
 *   selectedModelId="gpt-4"
 *   onModelChange={setModelId}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { Paperclip, Square, ArrowUp, ChevronDown } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { AiChatAttachmentPreview } from './chat-attachment-preview';
import type { Attachment, Model } from './chat-types';

interface AiChatInputProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isLoading?: boolean;
  models?: Model[];
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
}

export function AiChatInput({
  onSend,
  onStop,
  isLoading,
  models = [],
  selectedModelId,
  onModelChange,
  className,
}: AiChatInputProps) {
  const [input, setInput] = React.useState('');
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    onSend(input, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const currentModel = models.find((m) => m.id === selectedModelId) || models[0];

  return (
    <div className={cn('relative flex w-full flex-col gap-2 p-4', className)}>
      <div
        className={cn(
          'relative flex w-full flex-col border transition-all',
          mode.radius,
          mode.color.bg.base,
          mode.color.border.default,
          'focus-within:border-primary/50'
        )}
      >
        <AiChatAttachmentPreview
          attachments={attachments}
          onRemove={(i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
        />

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="ENTER INSTRUCTION..."
          className={cn(
            'max-h-textarea min-h-touch w-full resize-none border-0 bg-transparent px-3 py-3 shadow-none focus-visible:ring-0',
            mode.font,
            'placeholder:text-muted-foreground/50'
          )}
          rows={1}
        />

        <div
          className={cn(
            'border-border/50 bg-muted/5 flex items-center justify-between border-t border-dashed p-2'
          )}
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn('size-8', mode.state.hover.card)}
              aria-label="Attach file"
            >
              <Paperclip className="size-4" aria-hidden="true" />
            </Button>

            {models.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('h-8 gap-2 text-xs uppercase', mode.state.hover.card)}
                  >
                    <span>{currentModel?.name || 'SELECT MODEL'}</span>
                    <ChevronDown className={cn('size-3', mode.state.muted.opacity)} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => onModelChange?.(model.id)}
                      className="text-xs uppercase"
                    >
                      {model.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isLoading ? (
            <Button
              onClick={onStop}
              size="icon"
              variant="destructive"
              className="size-8"
              aria-label="Stop generating"
            >
              <Square className="size-3 fill-current" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim() && attachments.length === 0}
              size="icon"
              variant="default"
              className="size-8"
              aria-label="Send message"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <span className={cn('text-2xs uppercase', mode.state.subtle.opacity, mode.font)}>
          AI can make mistakes. Verify important information.
        </span>
      </div>
    </div>
  );
}
