import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export function FeatureCardHeader({
  hexCode,
  title,
  icon,
}: {
  hexCode: string;
  title: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex h-11 shrink-0 items-center justify-between border-b px-4',
        mode.color.border.default
      )}
    >
      <span className={cn('text-xs tracking-wide', mode.font, mode.color.text.muted)}>
        [{hexCode}] {title}
      </span>
      {icon && <span className={mode.color.text.accent}>{icon}</span>}
    </div>
  );
}
