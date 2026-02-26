'use client';

import * as React from 'react';
import { format, setMonth, setYear, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

// Default presets for range mode
const DEFAULT_PRESETS = [
  {
    label: 'Today',
    getValue: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      from: subDays(new Date(), 1),
      to: subDays(new Date(), 1),
    }),
  },
  {
    label: 'Last 7 days',
    getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: 'This month',
    getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    label: 'Last month',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type DatePickerMode = 'single' | 'range' | 'multiple';

interface DatePickerProps {
  /** Selection mode */
  mode?: DatePickerMode;
  /** Selected date (single mode) */
  value?: Date;
  /** Selected date range (range mode) */
  rangeValue?: DateRange;
  /** Selected dates (multiple mode) */
  multipleValue?: Date[];
  /** Callback when date changes (single mode) */
  onChange?: (date: Date | undefined) => void;
  /** Callback when range changes (range mode) */
  onRangeChange?: (range: DateRange | undefined) => void;
  /** Callback when multiple dates change */
  onMultipleChange?: (dates: Date[] | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  disabled?: boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Show time picker (single mode only) */
  showTime?: boolean;
  /** Use 24-hour format for time */
  use24Hour?: boolean;
  /** Show preset quick selects (range mode) */
  showPresets?: boolean;
  /** Custom presets */
  presets?: Array<{ label: string; getValue: () => DateRange }>;
  /** Show month/year dropdown pickers */
  showMonthYearPicker?: boolean;
  /** Month-only picker (no day grid) */
  monthOnly?: boolean;
  /** Number of months to display */
  numberOfMonths?: 1 | 2;
  /** Additional CSS classes */
  className?: string;
}

/* ----- Sub-Components ----- */

interface MonthYearDropdownsProps {
  month: Date;
  years: number[];
  onMonthChange: (monthIndex: string) => void;
  onYearChange: (year: string) => void;
}

function MonthYearDropdowns({
  month,
  years,
  onMonthChange,
  onYearChange,
}: MonthYearDropdownsProps) {
  return (
    <div className={cn(visualMode.color.border.default, 'flex gap-2 border-b p-4')}>
      <Select value={month.getMonth().toString()} onValueChange={onMonthChange}>
        <SelectTrigger className={cn('h-8 flex-1 text-xs', visualMode.radius, visualMode.font)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={visualMode.radius}>
          {MONTHS.map((m, i) => (
            <SelectItem
              key={m}
              value={i.toString()}
              className={cn('text-left text-xs', visualMode.font)}
            >
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month.getFullYear().toString()} onValueChange={onYearChange}>
        <SelectTrigger className={cn('h-8 w-24 text-xs', visualMode.radius, visualMode.font)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={cn('max-h-60', visualMode.radius)}>
          {years.map((y) => (
            <SelectItem
              key={y}
              value={y.toString()}
              className={cn('text-left text-xs', visualMode.font)}
            >
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface PresetSelectorProps {
  presets: Array<{ label: string; getValue: () => DateRange }>;
  onPresetSelect: (presetLabel: string) => void;
}

function PresetSelector({ presets, onPresetSelect }: PresetSelectorProps) {
  return (
    <div className={cn(visualMode.color.border.default, 'border-b p-4')}>
      <Select onValueChange={onPresetSelect}>
        <SelectTrigger className={cn('h-8 w-full text-xs', visualMode.radius, visualMode.font)}>
          <SelectValue placeholder="Quick select..." />
        </SelectTrigger>
        <SelectContent className={visualMode.radius}>
          {presets.map((preset) => (
            <SelectItem
              key={preset.label}
              value={preset.label}
              className={cn('text-left text-xs', visualMode.font)}
            >
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface MonthOnlyGridProps {
  month: Date;
  value?: Date;
  onMonthChange: (date: Date) => void;
  onMonthSelect: (monthIndex: number) => void;
  isMonthDisabled: (monthIndex: number) => boolean;
  isSelectedMonth: (monthIndex: number) => boolean;
}

function MonthOnlyGrid({
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

interface TimePickerProps {
  hours: string;
  minutes: string;
  period: 'AM' | 'PM';
  use24Hour: boolean;
  onHoursChange: (hours: string) => void;
  onMinutesChange: (minutes: string) => void;
  onPeriodChange: (period: 'AM' | 'PM') => void;
  onIncrement: {
    hours: () => void;
    minutes: () => void;
  };
  onDecrement: {
    hours: () => void;
    minutes: () => void;
  };
}

function TimePicker({
  hours,
  minutes,
  period,
  use24Hour,
  onHoursChange,
  onMinutesChange,
  onPeriodChange,
  onIncrement,
  onDecrement,
}: TimePickerProps) {
  return (
    <div className="flex items-start justify-center gap-2">
      {/* Hours */}
      <div className="flex flex-col items-center gap-1">
        <span className={cn('text-muted-foreground mb-1 text-xs', visualMode.font)}>[HRS]</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onIncrement.hours}
          className={cn('h-8 w-12 p-0 text-xs', visualMode.radius, visualMode.font)}
        >
          +
        </Button>
        <Input
          type="text"
          value={hours}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            const max = use24Hour ? 23 : 12;
            const min = use24Hour ? 0 : 1;
            if (!isNaN(val) && val >= min && val <= max) {
              onHoursChange(val.toString().padStart(2, '0'));
            }
          }}
          className={cn('h-8 w-12 text-center text-xs', visualMode.radius, visualMode.font)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onDecrement.hours}
          className={cn('h-8 w-12 p-0 text-xs', visualMode.radius, visualMode.font)}
        >
          -
        </Button>
      </div>

      {/* Separator */}
      <span className={cn('mt-6 pt-1 text-xs font-semibold', visualMode.font)}>:</span>

      {/* Minutes */}
      <div className="flex flex-col items-center gap-1">
        <span className={cn('text-muted-foreground mb-1 text-xs', visualMode.font)}>[MIN]</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onIncrement.minutes}
          className={cn('h-8 w-12 p-0 text-xs', visualMode.radius, visualMode.font)}
        >
          +
        </Button>
        <Input
          type="text"
          value={minutes}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 0 && val <= 59) {
              onMinutesChange(val.toString().padStart(2, '0'));
            }
          }}
          className={cn('h-8 w-12 text-center text-xs', visualMode.radius, visualMode.font)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onDecrement.minutes}
          className={cn('h-8 w-12 p-0 text-xs', visualMode.radius, visualMode.font)}
        >
          -
        </Button>
      </div>

      {/* AM/PM Toggle */}
      {!use24Hour && (
        <div className="ml-2 flex flex-col items-center gap-1">
          <span className={cn('text-muted-foreground mb-1 text-xs', visualMode.font)}>
            [PERIOD]
          </span>
          <Button
            variant={period === 'AM' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('AM')}
            className={cn('h-8 w-12 text-xs', visualMode.radius, visualMode.font)}
          >
            AM
          </Button>
          <Button
            variant={period === 'PM' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('PM')}
            className={cn('h-8 w-12 text-xs', visualMode.radius, visualMode.font)}
          >
            PM
          </Button>
        </div>
      )}
    </div>
  );
}

interface DatePickerFooterProps {
  mode: DatePickerMode;
  showTime: boolean;
  value?: Date;
  onClear: () => void;
  onApply: () => void;
}

function DatePickerFooter({ mode: _mode, showTime, value, onClear, onApply }: DatePickerFooterProps) {
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
    if (monthOnly && value) {
      return format(value, 'MMMM yyyy');
    }
    if (mode === 'single' && value) {
      if (showTime) {
        return format(value, use24Hour ? 'PPP HH:mm' : 'PPP hh:mm a');
      }
      return format(value, 'PPP');
    }
    if (mode === 'range' && rangeValue?.from) {
      if (rangeValue.to) {
        return `${format(rangeValue.from, 'LLL dd, y')} - ${format(rangeValue.to, 'LLL dd, y')}`;
      }
      return format(rangeValue.from, 'LLL dd, y');
    }
    if (mode === 'multiple' && multipleValue?.length) {
      return `${multipleValue.length} dates selected`;
    }
    return null;
  };

  const handleSingleSelect = (date: Date | undefined) => {
    if (showTime && date) {
      // Don't close, let user pick time
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
      if (period === 'PM' && hoursValue !== 12) {
        hoursValue += 12;
      } else if (period === 'AM' && hoursValue === 12) {
        hoursValue = 0;
      }
    }

    newDateTime.setHours(hoursValue);
    newDateTime.setMinutes(parseInt(minutes));
    newDateTime.setSeconds(0);

    onChange?.(newDateTime);
    setOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    onRangeChange?.(range);
  };

  const handlePresetSelect = (presetLabel: string) => {
    const preset = presets.find((p) => p.label === presetLabel);
    if (preset) {
      onRangeChange?.(preset.getValue());
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(new Date(), month.getFullYear()), monthIndex);
    onChange?.(newDate);
    setOpen(false);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(monthIndex));
    setMonthState(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(year));
    setMonthState(newDate);
  };

  const incrementHours = () => {
    const maxHours = use24Hour ? 23 : 12;
    const minHours = use24Hour ? 0 : 1;
    const newHours = parseInt(hours) + 1;
    setHours((newHours > maxHours ? minHours : newHours).toString().padStart(2, '0'));
  };

  const decrementHours = () => {
    const maxHours = use24Hour ? 23 : 12;
    const minHours = use24Hour ? 0 : 1;
    const newHours = parseInt(hours) - 1;
    setHours((newHours < minHours ? maxHours : newHours).toString().padStart(2, '0'));
  };

  const incrementMinutes = () => {
    const newMinutes = parseInt(minutes) + 1;
    if (newMinutes > 59) {
      setMinutes('00');
      incrementHours();
    } else {
      setMinutes(newMinutes.toString().padStart(2, '0'));
    }
  };

  const decrementMinutes = () => {
    const newMinutes = parseInt(minutes) - 1;
    if (newMinutes < 0) {
      setMinutes('59');
      decrementHours();
    } else {
      setMinutes(newMinutes.toString().padStart(2, '0'));
    }
  };

  // Check if month is disabled (monthOnly mode)
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
        {/* Month/Year Dropdowns */}
        {showMonthYearPicker && !monthOnly && (
          <MonthYearDropdowns
            month={month}
            years={years}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
          />
        )}

        {/* Presets (range mode) */}
        {mode === 'range' && showPresets && (
          <PresetSelector presets={presets} onPresetSelect={handlePresetSelect} />
        )}

        {/* Month-Only Picker */}
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
          /* Date + Time Picker */
          <Tabs defaultValue="date" className="w-full">
            <TabsList
              className={cn(visualMode.color.border.default, 'bg-muted/50 w-full border-b', visualMode.radius)}
            >
              <TabsTrigger
                value="date"
                className={cn('flex-1 text-xs', visualMode.radius, visualMode.font)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                DATE
              </TabsTrigger>
              <TabsTrigger
                value="time"
                className={cn('flex-1 text-xs', visualMode.radius, visualMode.font)}
              >
                <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
                TIME
              </TabsTrigger>
            </TabsList>

            <TabsContent value="date" className="m-0 p-0">
              <Calendar
                mode="single"
                selected={value}
                onSelect={(date) => {
                  if (date) setMonthState(date);
                  onChange?.(date);
                }}
                month={month}
                onMonthChange={setMonthState}
                hideNavigation={showMonthYearPicker}
                disabled={(d) => {
                  if (minDate && d < minDate) return true;
                  if (maxDate && d > maxDate) return true;
                  return false;
                }}
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
          /* Range Calendar */
          <Calendar
            mode="range"
            selected={rangeValue}
            onSelect={handleRangeSelect}
            numberOfMonths={numberOfMonths}
            defaultMonth={rangeValue?.from}
            disabled={(d) => {
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            initialFocus
          />
        ) : mode === 'multiple' ? (
          /* Multiple Calendar */
          <Calendar
            mode="multiple"
            selected={multipleValue}
            onSelect={(dates) => onMultipleChange?.(dates)}
            month={month}
            onMonthChange={setMonthState}
            hideNavigation={showMonthYearPicker}
            disabled={(d) => {
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            initialFocus
          />
        ) : (
          /* Single Calendar */
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSingleSelect}
            month={month}
            onMonthChange={setMonthState}
            hideNavigation={showMonthYearPicker}
            disabled={(d) => {
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            initialFocus
          />
        )}

        {/* Footer Actions */}
        {(showTime || mode === 'range') && !monthOnly && (
          <DatePickerFooter
            mode={mode}
            showTime={showTime}
            value={value}
            onClear={() => {
              if (mode === 'range') {
                onRangeChange?.(undefined);
              } else {
                onChange?.(undefined);
              }
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
export type { DatePickerProps, DatePickerMode };
