import * as React from 'react';
import { CalendarIcon, Clock } from 'lucide-react';

import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Calendar } from '../calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { TimePicker } from './time-picker';

interface DateTimeTabViewProps {
  value: Date | undefined;
  month: Date;
  setMonthState: (d: Date) => void;
  onChange: ((date: Date | undefined) => void) | undefined;
  showMonthYearPicker: boolean;
  isDateDisabled: (d: Date) => boolean;
  hours: string;
  minutes: string;
  period: 'AM' | 'PM';
  use24Hour: boolean;
  setHours: (v: string) => void;
  setMinutes: (v: string) => void;
  setPeriod: (v: 'AM' | 'PM') => void;
  incrementHours: () => void;
  decrementHours: () => void;
  incrementMinutes: () => void;
  decrementMinutes: () => void;
}

export function DateTimeTabView(p: DateTimeTabViewProps) {
  return (
    <Tabs defaultValue="date" className="w-full">
      <TabsList className={cn(visualMode.color.border.default, 'bg-muted/50 w-full border-b', visualMode.radius)}>
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
          selected={p.value}
          onSelect={(date) => { if (date) p.setMonthState(date); p.onChange?.(date); }}
          month={p.month}
          onMonthChange={p.setMonthState}
          hideNavigation={p.showMonthYearPicker}
          disabled={p.isDateDisabled}
          initialFocus
        />
      </TabsContent>
      <TabsContent value="time" className="m-0 p-4">
        <TimePicker
          hours={p.hours}
          minutes={p.minutes}
          period={p.period}
          use24Hour={p.use24Hour}
          onHoursChange={p.setHours}
          onMinutesChange={p.setMinutes}
          onPeriodChange={p.setPeriod}
          onIncrement={{ hours: p.incrementHours, minutes: p.incrementMinutes }}
          onDecrement={{ hours: p.decrementHours, minutes: p.decrementMinutes }}
        />
      </TabsContent>
    </Tabs>
  );
}
