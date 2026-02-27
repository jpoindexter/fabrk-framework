import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../button';
import { MONTHS_SHORT } from './constants';

interface MonthOnlyGridProps {
  month: Date;
  value?: Date;
  onMonthChange: (date: Date) => void;
  onMonthSelect: (monthIndex: number) => void;
  isMonthDisabled: (monthIndex: number) => boolean;
  isSelectedMonth: (monthIndex: number) => boolean;
}

export function MonthOnlyGrid({
  month,
  onMonthChange,
  onMonthSelect,
  isMonthDisabled,
  isSelectedMonth,
}: MonthOnlyGridProps) {
  return (
    <>
      <div className={cn(visualMode.color.border.default, 'flex items-center justify-between border-b p-4')}>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 w-8 p-0', visualMode.radius)}
          onClick={() => onMonthChange(new Date(month.getFullYear() - 1, month.getMonth()))}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className={cn('text-sm font-semibold', visualMode.font)}>{month.getFullYear()}</span>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 w-8 p-0', visualMode.radius)}
          onClick={() => onMonthChange(new Date(month.getFullYear() + 1, month.getMonth()))}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4">
        {MONTHS_SHORT.map((m, index) => (
          <Button
            key={m}
            variant={isSelectedMonth(index) ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-9 text-xs',
              visualMode.radius,
              visualMode.font,
              isSelectedMonth(index) && 'bg-primary text-primary-foreground'
            )}
            disabled={isMonthDisabled(index)}
            onClick={() => onMonthSelect(index)}
          >
            {m}
          </Button>
        ))}
      </div>
    </>
  );
}
