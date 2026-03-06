import * as React from 'react';
import { format, setMonth, setYear } from 'date-fns';
import type { DatePickerProps } from './date-picker';

export function useDatePicker(props: DatePickerProps) {
  const {
    mode = 'single', value, rangeValue, multipleValue,
    onChange, onRangeChange, placeholder, showTime = false,
    use24Hour = false, presets = [], monthOnly = false, minDate, maxDate,
  } = props;

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

  const getDisplayValue = (): string | null => {
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
    const newHrs = parseInt(hours) + 1;
    setHours((newHrs > max ? min : newHrs).toString().padStart(2, '0'));
  };

  const decrementHours = () => {
    const max = use24Hour ? 23 : 12;
    const min = use24Hour ? 0 : 1;
    const newHrs = parseInt(hours) - 1;
    setHours((newHrs < min ? max : newHrs).toString().padStart(2, '0'));
  };

  const incrementMinutes = () => {
    const newMins = parseInt(minutes) + 1;
    if (newMins > 59) { setMinutes('00'); incrementHours(); }
    else setMinutes(newMins.toString().padStart(2, '0'));
  };

  const decrementMinutes = () => {
    const newMins = parseInt(minutes) - 1;
    if (newMins < 0) { setMinutes('59'); decrementHours(); }
    else setMinutes(newMins.toString().padStart(2, '0'));
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

  return {
    open, setOpen, month, setMonthState,
    hours, setHours, minutes, setMinutes, period, setPeriod,
    years, displayValue: getDisplayValue(), getPlaceholder,
    handleSingleSelect, handleTimeApply, handlePresetSelect, handleMonthSelect,
    incrementHours, decrementHours, incrementMinutes, decrementMinutes,
    isMonthDisabled, isSelectedMonth, isDateDisabled,
  };
}

export type DatePickerState = ReturnType<typeof useDatePicker>;
