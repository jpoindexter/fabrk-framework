'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, DayPickerProps, useDayPicker } from 'react-day-picker';
import { format, addMonths, subMonths } from 'date-fns';

import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Button } from './button';

export type CalendarProps = DayPickerProps & {
  showTodayButton?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
};

// Custom caption component with integrated nav buttons
function CustomMonthCaption({ calendarMonth }: { calendarMonth: { date: Date } }) {
  const { goToMonth, nextMonth, previousMonth } = useDayPicker();

  return (
    <div className="mb-4 flex h-8 w-full items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(subMonths(calendarMonth.date, 1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span className={cn('text-sm font-semibold', mode.font)}>
        {format(calendarMonth.date, 'MMMM yyyy')}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(addMonths(calendarMonth.date, 1))}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showTodayButton = false,
  showClearButton = false,
  onClear,
  ...props
}: CalendarProps) {
  const handleTodayClick = () => {
    if (props.mode === 'single' && 'onSelect' in props) {
      const onSelect = props.onSelect as ((date: Date | undefined) => void) | undefined;
      onSelect?.(new Date());
    }
  };

  const handleClearClick = () => {
    if (props.mode === 'single' && 'onSelect' in props) {
      const onSelect = props.onSelect as ((date: Date | undefined) => void) | undefined;
      onSelect?.(undefined);
    }
    onClear?.();
  };

  return (
    <div className="flex flex-col">
      <DayPicker
        showOutsideDays={showOutsideDays}
        data-slot="calendar"
        className={cn('p-4', mode.radius, className)}
        classNames={{
          // Layout
          months: 'flex flex-col sm:flex-row gap-4',
          month: 'flex flex-col',

          // Hide default nav (we use custom caption with nav)
          nav: 'hidden',
          button_previous: 'hidden',
          button_next: 'hidden',

          // Grid
          month_grid: 'w-full',
          weekdays: 'grid grid-cols-7 place-items-center',
          weekday: cn('w-9 text-xs font-semibold text-center', mode.color.text.muted, mode.font),
          week: 'grid grid-cols-7 place-items-center mt-2',

          // Day cells
          day: cn('w-9 h-9 text-center text-xs p-0 relative flex items-center justify-center', mode.font),
          day_button: cn(
            'h-9 w-9 p-0 text-xs font-normal',
            mode.radius,
            mode.font,
            'hover:bg-muted hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-ring',
            'disabled:pointer-events-none disabled:opacity-50'
          ),

          // States
          selected: cn(
            mode.color.bg.accent,
            mode.color.text.inverse,
            'hover:bg-accent hover:text-accent-foreground'
          ),
          today: cn(mode.color.bg.muted, mode.color.text.primary, 'font-semibold'),
          outside: cn(mode.color.text.muted, mode.state.muted.opacity),
          disabled: cn(mode.color.text.muted, mode.state.muted.opacity),
          hidden: 'invisible',

          // Range selection
          range_middle: cn(mode.color.bg.muted, mode.color.text.primary),
          range_start: cn(mode.color.bg.accent, mode.color.text.inverse, mode.radius),
          range_end: cn(mode.color.bg.accent, mode.color.text.inverse, mode.radius),

          ...classNames,
        }}
        components={{
          MonthCaption: CustomMonthCaption,
        }}
        {...props}
      />
      {(showTodayButton || showClearButton) && (
        <div className={cn('flex gap-2 border-t p-4', mode.color.border.default)}>
          {showTodayButton && (
            <Button
              variant="outline"
              size="sm"
              className={cn('flex-1 text-xs', mode.radius, mode.font)}
              onClick={handleTodayClick}
            >
              {'> TODAY'}
            </Button>
          )}
          {showClearButton && (
            <Button
              variant="ghost"
              size="sm"
              className={cn('flex-1 text-xs', mode.radius, mode.font)}
              onClick={handleClearClick}
            >
              {'> CLEAR'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
