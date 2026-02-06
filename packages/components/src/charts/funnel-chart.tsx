'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

export interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
  height?: number;
  width?: number;
  gap?: number;
  showValues?: boolean;
  showPercentages?: boolean;
  direction?: 'vertical' | 'horizontal';
  className?: string;
  onStageClick?: (stage: FunnelStage, index: number) => void;
}

export function FunnelChart({
  data,
  height = 400,
  width = 600,
  gap = 8,
  showValues = true,
  showPercentages = true,
  direction = 'vertical',
  className,
  onStageClick,
}: FunnelChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => d.value));
  const isVertical = direction === 'vertical';

  const DEFAULT_COLORS = [
    'oklch(70% 0.15 240)',
    'oklch(70% 0.15 210)',
    'oklch(70% 0.15 180)',
    'oklch(70% 0.15 150)',
    'oklch(70% 0.15 120)',
  ];

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn('relative', isVertical ? 'flex flex-col' : 'flex flex-row')}
        style={{
          width: isVertical ? width : '100%',
          height: isVertical ? height : 'auto',
          gap: `${gap}px`,
        }}
      >
        {data.map((stage, index) => {
          const percentage = (stage.value / maxValue) * 100;
          const conversionRate = index > 0 ? (stage.value / data[index - 1].value) * 100 : 100;
          const isHovered = hoveredIndex === index;
          const color = stage.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

          if (isVertical) {
            const stageHeight = (height - gap * (data.length - 1)) / data.length;
            return (
              <div
                key={index}
                role="button"
                tabIndex={0}
                aria-label={`${stage.label}: ${stage.value}`}
                className={cn('relative cursor-pointer transition-all', isHovered && 'scale-105')}
                style={{ height: stageHeight }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onStageClick?.(stage, index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onStageClick?.(stage, index);
                  }
                }}
              >
                <svg width={width} height={stageHeight} viewBox={`0 0 ${width} ${stageHeight}`}>
                  <path
                    d={`M ${(width * (100 - percentage)) / 200} 0 L ${width - (width * (100 - percentage)) / 200} 0 L ${width - (width * (100 - (index < data.length - 1 ? (data[index + 1].value / maxValue) * 100 : percentage))) / 200} ${stageHeight} L ${(width * (100 - (index < data.length - 1 ? (data[index + 1].value / maxValue) * 100 : percentage))) / 200} ${stageHeight} Z`}
                    fill={color}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                    className="transition-all"
                  />
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-medium">{stage.label}</p>
                    {showValues && (
                      <p className="text-2xl font-semibold">{stage.value.toLocaleString()}</p>
                    )}
                    {showPercentages && index > 0 && (
                      <p className="text-foreground/70 text-xs">
                        {conversionRate.toFixed(1)}% conversion
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          } else {
            const stageWidth = (width - gap * (data.length - 1)) / data.length;
            return (
              <div
                key={index}
                role="button"
                tabIndex={0}
                aria-label={`${stage.label}: ${stage.value}`}
                className={cn('relative cursor-pointer transition-all', isHovered && 'scale-105')}
                style={{ width: stageWidth }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onStageClick?.(stage, index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onStageClick?.(stage, index);
                  }
                }}
              >
                <svg width={stageWidth} height={height} viewBox={`0 0 ${stageWidth} ${height}`}>
                  <path
                    d={`M 0 ${(height * (100 - percentage)) / 200} L ${stageWidth} ${(height * (100 - (index < data.length - 1 ? (data[index + 1].value / maxValue) * 100 : percentage))) / 200} L ${stageWidth} ${height - (height * (100 - (index < data.length - 1 ? (data[index + 1].value / maxValue) * 100 : percentage))) / 200} L 0 ${height - (height * (100 - percentage)) / 200} Z`}
                    fill={color}
                    stroke="var(--color-background)"
                    strokeWidth={2}
                    className="transition-all"
                  />
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-medium">{stage.label}</p>
                    {showValues && (
                      <p className="text-2xl font-semibold">{stage.value.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {data.map((stage, index) => (
          <div
            key={index}
            role="presentation"
            className={cn(
              'flex items-center gap-2 transition-opacity',
              hoveredIndex !== null && hoveredIndex !== index && mode.state.muted.opacity
            )}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={cn('border-border h-3 w-3 border', mode.radius)}
              style={{
                backgroundColor: stage.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
