'use client';

import * as React from 'react';
import { Badge } from '../ui/badge';
import type { Attachment } from './chat-types';

interface AiChatAttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
}

export function AiChatAttachmentPreview({ attachments, onRemove }: AiChatAttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 p-2 overflow-x-auto border-b border-dashed border-border/50">
      {attachments.map((att, i) => (
        <Badge
          key={i}
          variant="secondary"
          className="gap-2 pr-1"
        >
          <span className="truncate max-w-24">{att.name}</span>
          <button
            onClick={() => onRemove(i)}
            className="hover:text-destructive transition-colors"
          >
            ×
          </button>
        </Badge>
      ))}
    </div>
  );
}
