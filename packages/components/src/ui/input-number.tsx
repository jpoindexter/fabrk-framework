'use client';

import { Button } from './button';
import { Input } from './input';
import { isSharpMode } from '@fabrk/design-system';
import { cn } from '@fabrk/core';
import { ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

export interface InputNumberProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'value'
> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  showControls?: boolean;
}

const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  (
    {
      value: controlledValue,
      defaultValue = 0,
      onValueChange,
      min,
      max,
      step = 1,
      precision,
      showControls = true,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState<number | undefined>(
      defaultValue
    );
    const value = controlledValue ?? uncontrolledValue;

    const updateValue = (newValue: number | undefined) => {
      if (newValue === undefined) {
        if (controlledValue === undefined) {
          setUncontrolledValue(undefined);
        }
        onValueChange?.(undefined);
        return;
      }

      let finalValue = newValue;

      // Apply min/max constraints
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;

      // Apply precision
      if (precision !== undefined) {
        finalValue = parseFloat(finalValue.toFixed(precision));
      }

      if (controlledValue === undefined) {
        setUncontrolledValue(finalValue);
      }
      onValueChange?.(finalValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (inputValue === '') {
        updateValue(undefined);
        return;
      }

      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        updateValue(parsed);
      }
    };

    const increment = () => {
      const currentValue = value ?? 0;
      updateValue(currentValue + step);
    };

    const decrement = () => {
      const currentValue = value ?? 0;
      updateValue(currentValue - step);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        increment();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        decrement();
      }
    };

    return (
      <div data-slot="input-number" className={cn('relative inline-flex', className)}>
        <Input
          ref={ref}
          type="number"
          value={value ?? ''}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(showControls && 'pr-8', className)}
          role="spinbutton"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          {...props}
        />
        {showControls && (
          <div className="absolute top-1 right-1 flex h-[calc(100%-8px)] flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('h-4 w-6 p-0', isSharpMode() && 'rounded-b-none')}
              onClick={increment}
              disabled={disabled || (max !== undefined && value !== undefined && value >= max)}
              tabIndex={-1}
              aria-label="Increment value"
            >
              <ChevronUp className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('h-4 w-6 p-0', isSharpMode() && 'rounded-t-none')}
              onClick={decrement}
              disabled={disabled || (min !== undefined && value !== undefined && value <= min)}
              tabIndex={-1}
              aria-label="Decrement value"
            >
              <ChevronDown className="size-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);
InputNumber.displayName = 'InputNumber';

export { InputNumber };
