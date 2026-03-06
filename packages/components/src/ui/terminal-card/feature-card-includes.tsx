import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export function FeatureCardIncludes({ includes }: { includes: string[] }) {
  return (
    <div className="p-6 flex flex-col gap-2">
      <p
        className={cn(
          'text-xs font-bold uppercase tracking-wider mb-1',
          mode.font,
          mode.color.text.muted
        )}
      >
        [INCLUDES]:
      </p>
      <ul className="flex flex-col gap-2">
        {includes.slice(0, 3).map((item) => (
          <li key={item} className="flex items-start gap-2 group/item">
            <span className="font-bold text-sm mt-micro text-warning">{'\u2713'}</span>
            <span
              className={cn(
                'text-sm group-hover/item:text-foreground transition-colors line-clamp-1',
                mode.font,
                mode.color.text.muted
              )}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
