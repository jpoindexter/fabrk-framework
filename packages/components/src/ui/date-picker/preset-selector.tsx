import { DateRange } from 'react-day-picker';
import { cn } from '@fabrk/core';
import { mode as visualMode } from '@fabrk/design-system';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

interface PresetSelectorProps {
  presets: Array<{ label: string; getValue: () => DateRange }>;
  onPresetSelect: (presetLabel: string) => void;
}

export function PresetSelector({ presets, onPresetSelect }: PresetSelectorProps) {
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
