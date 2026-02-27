'use client';

import * as React from 'react';
import { format, setMonth, setYear } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Button } from '../button';
import { Calendar } from '../calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { DEFAULT_PRESETS } from './constants';
import { MonthYearDropdowns } from './month-year-dropdowns';
import { PresetSelector } from './preset-selector';
import { MonthOnlyGrid } from './month-only-grid';
import { TimePicker } from './time-picker';
import { DatePickerFooter } from './date-picker-footer';

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

function DatePicker({
  mode = 'single',
  value,
  rangeValue,
  multipleValue,
  onChange,
  onRangeChange,
  onMultipleChange,
  placeholder,
  disabled = false,
  minDate,
  maxDate,
  showTime = false,
  use24Hour = false,
  showPresets = false,
  presets = DEFAULT_PRESETS,
  showMonthYearPicker = false,
  monthOnly = false,
  numberOfMonths = 1,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonthState] = React.useState<Date>(value || rangeValue?.from || new Date());

  const [hours, setHours] = React.useState<string>(
    value ? format(value, use24Hour ? 'HH' : 'hh') : '12'
  );
  const [minutes, setMinutes] = React.useState<string>(value ? format(value, 'mm') : '00');
  const [period, setPeriod] = React.useState<'AM' | 'PM'>(
    value && !use24Hour ? (format(value, 'a').toUpperCase() as 'AM' | 'PM') : 'AM'
  );

  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => {
    const minYear = minDate?.getFullYear() || currentYear - 50;
    const maxYear = maxDate?.getFullYear() || currentYear + 50;
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  }, [minDate, maxDate, currentYear]);

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (monthOnly) return 'Pick a month';
    if (mode === 'range') return 'Pick a date range';
    if (showTime) return 'Pick date and time';
    return 'Pick a date';
  };

  const getDisplayValue = () => {
    if (monthOnly && value) return format(value, 'MMMM yyyy');
    if (mode === 'single' && value) {
      return showTime
        ? format(value, use24Hour ? 'PPP HH:mm' : 'PPP hh:mm a')
        : format(value, 'PPP');
    }
    if (mode === 'range' && rangeValue?.from) {
      return rangeValue.to
        ? `${format(rangeValue.from, 'LLL dd, y')} - ${format(rangeValue.to, 'LLL dd, y')}`
        : format(rangeValue.from, 'LLL dd, y');
    }
    if (mode === 'multiple' && multipleValue?.length) {
      return `${multipleValue.length} dates selected`;
    }
    return null;
  };

  const handleSingleSelect = (date: Date | undefined) => {
    if (showTime && date) {
      setMonthState(date);
    } else {
      onChange?.(date);
      if (date) setOpen(false);
    }
  };

  const handleTimeApply = () => {
    if (!month) return;
    const newDateTime = new Date(month);
    let hoursValue = parseInt(hours);
    if (!use24Hour) {
      if (period === 'PM' && hoursValue !== 12) hoursValue += 12;
      else if (period === 'AM' && hoursValue === 12) hoursValue = 0;
    }
    newDateTime.setHours(hoursValue);
    newDateTime.setMinutes(parseInt(minutes));
    newDateTime.setSeconds(0);
    onChange?.(newDateTime);
    setOpen(false);
  };

  const handlePresetSelect = (presetLabel: string) => {
    const preset = presets.find((p) => p.label === presetLabel);
    if (preset) onRangeChange?.(preset.getValue());
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(new Date(), month.getFullYear()), monthIndex);
    onChange?.(newDate);
    setOpen(false);
  };

  const incrementHours = () => {
    const max = use24Hour ? 23 : 12;
    const min = use24Hour ? 0 : 1;
    const newHours = parseInt(hours) + 1;
    setHours((newHours > max ? min : newHours).toString().padStart(2, '0'));
  };

  const decrementHours = () => {
    const max = use24Hour ? 23 : 12;
    const min = use24Hour ? 0 : 1;
    const newHours = parseInt(hours) - 1;
    setHours((newHours < min ? max : newHours).toString().padStart(2, '0'));
  };

  const incrementMinutes = () => {
    const newMinutes = parseInt(minutes) + 1;
    if (newMinutes > 59) { setMinutes('00'); incrementHours(); }
    else setMinutes(newMinutes.toString().padStart(2, '0'));
  };

  const decrementMinutes = () => {
    const newMinutes = parseInt(minutes) - 1;
    if (newMinutes < 0) { setMinutes('59'); decrementHours(); }
    else setMinutes(newMinutes.toString().padStart(2, '0'));
  };

  const isMonthDisabled = (monthIndex: number) => {
    const date = setMonth(setYear(new Date(), month.getFullYear()), monthIndex);
    if (minDate && date < setMonth(minDate, minDate.getMonth())) return true;
    if (maxDate && date > setMonth(maxDate, maxDate.getMonth())) return true;
    return false;
  };

  const isSelectedMonth = (monthIndex: number) => {
    if (!value) return false;
    return value.getMonth() === monthIndex && value.getFullYear() === month.getFullYear();
  };

  const isDateDisabled = (d: Date) => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const displayValue = getDisplayValue();

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
        {showMonthYearPicker && !monthOnly && (
          <MonthYearDropdowns
            month={month}
            years={years}
            onMonthChange={(i) => { const d = new Date(month); d.setMonth(parseInt(i)); setMonthState(d); }}
            onYearChange={(y) => { const d = new Date(month); d.setFullYear(parseInt(y)); setMonthState(d); }}
          />
        )}

        {mode === 'range' && showPresets && (
          <PresetSelector presets={presets} onPresetSelect={handlePresetSelect} />
        )}

        {monthOnly ? (
          <MonthOnlyGrid
            month={month}
            value={value}
            onMonthChange={setMonthState}
            onMonthSelect={handleMonthSelect}
            isMonthDisabled={isMonthDisabled}
            isSelectedMonth={isSelectedMonth}
          />
        ) : showTime && mode === 'single' ? (
          <Tabs defaultValue="date" className="w-full">
            <TabsList
              className={cn(visualMode.color.border.default, 'bg-muted/50 w-full border-b', visualMode.radius)}
            >
              <TabsTrigger value="date" className={cn('flex-1 text-xs', visualMode.radius, visualMode.font)}>
                <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                DATE
              </TabsTrigger>
              <TabsTrigger value="time" className={cn('flex-1 text-xs', visualMode.radius, visualMode.font)}>
                <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
                TIME
              </TabsTrigger>
            </TabsList>
            <TabsContent value="date" className="m-0 p-0">
              <Calendar
                mode="single"
                selected={value}
                onSelect={(date) => { if (date) setMonthState(date); onChange?.(date); }}
                month={month}
                onMonthChange={setMonthState}
                hideNavigation={showMonthYearPicker}
                disabled={isDateDisabled}
                initialFocus
              />
            </TabsContent>
            <TabsContent value="time" className="m-0 p-4">
              <TimePicker
                hours={hours}
                minutes={minutes}
                period={period}
                use24Hour={use24Hour}
                onHoursChange={setHours}
                onMinutesChange={setMinutes}
                onPeriodChange={setPeriod}
                onIncrement={{ hours: incrementHours, minutes: incrementMinutes }}
                onDecrement={{ hours: decrementHours, minutes: decrementMinutes }}
              />
            </TabsContent>
          </Tabs>
        ) : mode === 'range' ? (
          <Calendar
            mode="range"
            selected={rangeValue}
            onSelect={(range) => onRangeChange?.(range)}
            numberOfMonths={numberOfMonths}
            defaultMonth={rangeValue?.from}
            disabled={isDateDisabled}
            initialFocus
          />
        ) : mode === 'multiple' ? (
          <Calendar
            mode="multiple"
            selected={multipleValue}
            onSelect={(dates) => onMultipleChange?.(dates)}
            month={month}
            onMonthChange={setMonthState}
            hideNavigation={showMonthYearPicker}
            disabled={isDateDisabled}
            initialFocus
          />
        ) : (
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSingleSelect}
            month={month}
            onMonthChange={setMonthState}
            hideNavigation={showMonthYearPicker}
            disabled={isDateDisabled}
            initialFocus
          />
        )}

        {(showTime || mode === 'range') && !monthOnly && (
          <DatePickerFooter
            showTime={showTime}
            value={value}
            onClear={() => {
              if (mode === 'range') onRangeChange?.(undefined);
              else onChange?.(undefined);
            }}
            onApply={showTime ? handleTimeApply : () => setOpen(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

DatePicker.displayName = 'DatePicker';

export { DatePicker };
