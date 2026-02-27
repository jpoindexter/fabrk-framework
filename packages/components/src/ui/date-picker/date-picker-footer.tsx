import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Button } from '../button';

interface DatePickerFooterProps {
  showTime: boolean;
  value?: Date;
  onClear: () => void;
  onApply: () => void;
}

export function DatePickerFooter({ showTime, value, onClear, onApply }: DatePickerFooterProps) {
  return (
    <div className={cn(visualMode.color.border.default, 'flex gap-2 border-t p-4')}>
      <Button
        variant="outline"
        size="sm"
        className={cn('flex-1 text-xs', visualMode.radius, visualMode.font)}
        onClick={onClear}
      >
        {'> CLEAR'}
      </Button>
      <Button
        size="sm"
        className={cn('flex-1 text-xs', visualMode.radius, visualMode.font)}
        onClick={onApply}
        disabled={showTime && !value}
      >
        {'> APPLY'}
      </Button>
    </div>
  );
}
