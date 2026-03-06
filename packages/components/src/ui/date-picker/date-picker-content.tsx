import * as React from 'react';

import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Calendar } from '../calendar';
import { MonthYearDropdowns } from './month-year-dropdowns';
import { PresetSelector } from './preset-selector';
import { MonthOnlyGrid } from './month-only-grid';
import { DatePickerFooter } from './date-picker-footer';
import { DateTimeTabView } from './date-time-tab-view';
import type { DatePickerProps } from './date-picker';
import type { DatePickerState } from './use-date-picker';

interface DatePickerContentProps {
  props: DatePickerProps;
  state: DatePickerState;
}

export function DatePickerContent({ props, state }: DatePickerContentProps) {
  const {
    mode = 'single', value, rangeValue, multipleValue,
    onRangeChange, onMultipleChange, onChange,
    showTime = false, use24Hour = false, showPresets = false,
    presets = [], showMonthYearPicker = false, monthOnly = false,
    numberOfMonths = 1,
  } = props;

  const {
    month, setMonthState, years,
    hours, setHours, minutes, setMinutes, period, setPeriod,
    handleSingleSelect, handleTimeApply, handlePresetSelect, handleMonthSelect,
    incrementHours, decrementHours, incrementMinutes, decrementMinutes,
    isMonthDisabled, isSelectedMonth, isDateDisabled, setOpen,
  } = state;

  return (
    <>
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
        <DateTimeTabView
          value={value}
          month={month}
          setMonthState={setMonthState}
          onChange={onChange}
          showMonthYearPicker={showMonthYearPicker}
          isDateDisabled={isDateDisabled}
          hours={hours}
          minutes={minutes}
          period={period}
          use24Hour={use24Hour}
          setHours={setHours}
          setMinutes={setMinutes}
          setPeriod={setPeriod}
          incrementHours={incrementHours}
          decrementHours={decrementHours}
          incrementMinutes={incrementMinutes}
          decrementMinutes={decrementMinutes}
        />
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
    </>
  );
}
