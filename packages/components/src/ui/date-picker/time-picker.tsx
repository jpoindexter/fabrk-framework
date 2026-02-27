import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Button } from '../button';
import { Input } from '../input';

interface TimePickerProps {
  hours: string;
  minutes: string;
  period: 'AM' | 'PM';
  use24Hour: boolean;
  onHoursChange: (hours: string) => void;
  onMinutesChange: (minutes: string) => void;
  onPeriodChange: (period: 'AM' | 'PM') => void;
  onIncrement: { hours: () => void; minutes: () => void };
  onDecrement: { hours: () => void; minutes: () => void };
}

export function TimePicker({
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

      <span className={cn('mt-6 pt-1 text-xs font-semibold', visualMode.font)}>:</span>

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
