/**
 * DonutChart - Ring chart with optional center content, built on PieChart.
 * Also exports MetricDonutChart (with center metric display) and ProgressDonutChart (single-value progress ring).
 *
 * @example
 * ```tsx
 * <DonutChart
 *   data={[
 *     { label: 'Desktop', value: 65, color: 'var(--color-chart-1)' },
 *     { label: 'Mobile', value: 35, color: 'var(--color-chart-2)' },
 *   ]}
 *   thickness={60}
 *   centerContent={<span className="text-2xl font-bold">100</span>}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { PieChart, PieChartDataItem } from './pie-chart';
import { cn } from '@fabrk/core';

interface DonutChartProps {
  data: PieChartDataItem[];
  size?: number;
  thickness?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  showLegend?: boolean;
  centerContent?: React.ReactNode;
  className?: string;
  onSegmentClick?: (item: PieChartDataItem, index: number) => void;
}

export function DonutChart({
  data,
  size = 300,
  thickness = 60,
  showLabels = false,
  showPercentages = true,
  showLegend = true,
  centerContent,
  className,
  onSegmentClick,
}: DonutChartProps) {
  const radius = size / 2 - 10;
  const innerRadius = radius - thickness;

  return (
    <div className={cn('relative', className)}>
      <PieChart
        data={data}
        size={size}
        innerRadius={innerRadius}
        showLabels={showLabels}
        showPercentages={showPercentages}
        showLegend={showLegend}
        onSegmentClick={onSegmentClick}
      />
      {centerContent && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center"
          style={{
            width: innerRadius * 2,
            height: innerRadius * 2,
          }}
        >
          {centerContent}
        </div>
      )}
    </div>
  );
}

interface MetricDonutChartProps {
  data: PieChartDataItem[];
  size?: number;
  thickness?: number;
  metric: {
    value: string | number;
    label: string;
    sublabel?: string;
  };
  showLegend?: boolean;
  className?: string;
  onSegmentClick?: (item: PieChartDataItem, index: number) => void;
}

export function MetricDonutChart({
  data,
  size = 300,
  thickness = 60,
  metric,
  showLegend = true,
  className,
  onSegmentClick,
}: MetricDonutChartProps) {
  return (
    <DonutChart
      data={data}
      size={size}
      thickness={thickness}
      showLegend={showLegend}
      onSegmentClick={onSegmentClick}
      centerContent={
        <div className="px-4 text-center">
          <p className="mb-1 text-3xl leading-none font-semibold">{metric.value}</p>
          <p className="text-muted-foreground text-xs font-medium">{metric.label}</p>
          {metric.sublabel && (
            <p className="text-muted-foreground mt-0.5 text-xs">{metric.sublabel}</p>
          )}
        </div>
      }
      className={className}
    />
  );
}

interface ProgressDonutChartProps {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  className?: string;
}

export function ProgressDonutChart({
  value,
  max = 100,
  size = 200,
  thickness = 30,
  label,
  showPercentage = true,
  color = 'var(--color-primary)',
  backgroundColor = 'var(--color-muted)',
  className,
}: ProgressDonutChartProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const data: PieChartDataItem[] = [
    { label: 'Progress', value: percentage, color },
    { label: 'Remaining', value: 100 - percentage, color: backgroundColor },
  ];

  return (
    <DonutChart
      data={data}
      size={size}
      thickness={thickness}
      showLegend={false}
      centerContent={
        <div className="px-4 text-center">
          {showPercentage && (
            <p className="mb-1 text-3xl leading-none font-semibold">{percentage.toFixed(0)}%</p>
          )}
          {label && <p className="text-muted-foreground text-xs font-medium">{label}</p>}
        </div>
      }
      className={className}
    />
  );
}
