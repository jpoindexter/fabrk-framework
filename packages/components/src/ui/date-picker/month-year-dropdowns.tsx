import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { MONTHS } from './constants';

interface MonthYearDropdownsProps {
  month: Date;
  years: number[];
  onMonthChange: (monthIndex: string) => void;
  onYearChange: (year: string) => void;
}

export function MonthYearDropdowns({
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
