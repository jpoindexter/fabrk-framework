'use client';

import * as React from 'react';
import { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Button } from '../button';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { DEFAULT_PRESETS } from './constants';
import { useDatePicker } from './use-date-picker';
import { DatePickerContent } from './date-picker-content';

export type DatePickerMode = 'single' | 'range' | 'multiple';

export interface DatePickerProps {
  mode?: DatePickerMode;
  value?: Date;
  rangeValue?: DateRange;
  multipleValue?: Date[];
  onChange?: (date: Date | undefined) => void;
  onRangeChange?: (range: DateRange | undefined) => void;
  onMultipleChange?: (dates: Date[] | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
  use24Hour?: boolean;
  showPresets?: boolean;
  presets?: Array<{ label: string; getValue: () => DateRange }>;
  showMonthYearPicker?: boolean;
  monthOnly?: boolean;
  numberOfMonths?: 1 | 2;
  className?: string;
}

function DatePicker(props: DatePickerProps) {
  const {
    disabled = false,
    presets = DEFAULT_PRESETS,
    className,
  } = props;

  const propsWithDefaults = { ...props, presets };
  const state = useDatePicker(propsWithDefaults);
  const { open, setOpen, displayValue, getPlaceholder } = state;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left text-xs',
            visualMode.radius,
            visualMode.font,
            !displayValue && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {displayValue || <span>{getPlaceholder()}</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent className={cn('w-auto p-0', visualMode.radius)} align="start">
        <DatePickerContent props={propsWithDefaults} state={state} />
      </PopoverContent>
    </Popover>
  );
}

DatePicker.displayName = 'DatePicker';

export { DatePicker };
