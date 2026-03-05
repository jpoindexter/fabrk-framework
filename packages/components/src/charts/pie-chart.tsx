'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export interface PieChartDataItem {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartDataItem[];
  size?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  showLegend?: boolean;
  innerRadius?: number;
  className?: string;
  onSegmentClick?: (item: PieChartDataItem, index: number) => void;
}

// Theme-aware chart colors with varied lightness for monochromatic themes
const DEFAULT_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
];

export function PieChart({
  data,
  size = 300,
  showLabels = false,
  showPercentages = true,
  showLegend = true,
  innerRadius = 0,
  className,
  onSegmentClick,
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  const center = size / 2;
  const radius = size / 2 - 10;

  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    return { ...item, percentage, color };
  });

  const getPath = (
    startAngle: number,
    endAngle: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + outerRadius * Math.cos(startAngleRad);
    const y1 = center + outerRadius * Math.sin(startAngleRad);
    const x2 = center + outerRadius * Math.cos(endAngleRad);
    const y2 = center + outerRadius * Math.sin(endAngleRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    if (innerRadius === 0) {
      return `M ${center} ${center} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    } else {
      const x3 = center + innerRadius * Math.cos(endAngleRad);
      const y3 = center + innerRadius * Math.sin(endAngleRad);
      const x4 = center + innerRadius * Math.cos(startAngleRad);
      const y4 = center + innerRadius * Math.sin(startAngleRad);

      return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }
  };

  const getLabelPosition = (startAngle: number, endAngle: number) => {
    const angle = (startAngle + endAngle) / 2;
    const angleRad = (angle * Math.PI) / 180;
    const labelRadius = radius * 0.7;

    return {
      x: center + labelRadius * Math.cos(angleRad),
      y: center + labelRadius * Math.sin(angleRad),
    };
  };

  const segmentsWithAngles = segments.reduce<
    Array<(typeof segments)[0] & { startAngle: number; endAngle: number }>
  >((acc, segment) => {
    const prevEndAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : -90;
    const angle = (segment.value / total) * 360;
    acc.push({
      ...segment,
      startAngle: prevEndAngle,
      endAngle: prevEndAngle + angle,
    });
    return acc;
  }, []);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {segmentsWithAngles.map((segment, index) => {
          const { startAngle, endAngle } = segment;

          const isHovered = hoveredIndex === index;
          const segmentRadius = isHovered ? radius + 5 : radius;

          const path = getPath(startAngle, endAngle, segmentRadius, innerRadius);

          return (
            <g key={index}>
              <path
                d={path}
                fill={segment.color}
                stroke="var(--color-background)"
                strokeWidth={2}
                className={cn('cursor-pointer transition-all', isHovered && 'opacity-80')}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSegmentClick?.(segment, index)}
              />
              {showLabels && segment.percentage > 5 && (
                <text
                  x={getLabelPosition(startAngle, endAngle).x}
                  y={getLabelPosition(startAngle, endAngle).y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-background pointer-events-none text-xs font-medium"
                >
                  {showPercentages ? `${segment.percentage.toFixed(0)}%` : segment.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4">
          {segments.map((segment, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              aria-label={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
              className={cn(
                'flex cursor-pointer items-center gap-2 transition-opacity',
                hoveredIndex !== null && hoveredIndex !== index && mode.state.muted.opacity
              )}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSegmentClick?.(segment, index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSegmentClick?.(segment, index);
                }
              }}
            >
              <div
                className={cn('h-3 w-3 border', mode.radius)}
                style={{ backgroundColor: segment.color }}
              />
              <span className={cn('text-xs font-medium', mode.font)}>
                {segment.label}
                {showPercentages && (
                  <span className="text-muted-foreground ml-1">
                    ({segment.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
