import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export type InfoNoteProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  /** Label text. Defaults to "NOTE" */
  label?: string;
};

const InfoNote = React.forwardRef<HTMLDivElement, InfoNoteProps>(
  ({ children, label = 'NOTE', className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="info-note"
      className={cn(mode.color.text.muted, 'mt-4', mode.typography.caption, mode.font, className)}
      {...props}
    >
      [{label}]: {children}
    </div>
  )
);
InfoNote.displayName = 'InfoNote';

export { InfoNote };
