'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  fillColor?: string;
  showArea?: boolean;
  showDots?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  strokeWidth = 2,
  color = 'hsl(var(--primary))',
  fillColor,
  showArea = false,
  showDots = false,
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = strokeWidth * 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  const pathData = points
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `L ${point.x} ${point.y}`;
    })
    .join(' ');

  const areaPathData = showArea
    ? `${pathData} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
    : '';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('sparkline', className)}
    >
      {showArea && areaPathData && (
        <path d={areaPathData} fill={fillColor || color} opacity={0.2} className="sparkline-area" />
      )}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-line"
      />
      {showDots &&
        points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={strokeWidth * 1.5}
            fill={color}
            className="sparkline-dot"
          />
        ))}
    </svg>
  );
}

interface SparklineCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  data: number[];
  sparklineColor?: string;
  showArea?: boolean;
  className?: string;
}

export function SparklineCard({
  title,
  value,
  change,
  data,
  sparklineColor,
  showArea = true,
  className,
}: SparklineCardProps) {
  const isPositive = change && change.value >= 0;
  const changeColor = isPositive ? mode.color.text.success : mode.color.text.danger;

  return (
    <div className={cn('bg-card border p-4', mode.radius, className)}>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground mb-1 text-sm">{title}</p>
          <p className="text-2xl leading-none font-semibold">{value}</p>
          {change && (
            <p className={cn('mt-1 text-xs font-medium', changeColor)}>
              {isPositive ? '+' : ''}
              {change.value}%{change.label && ` ${change.label}`}
            </p>
          )}
        </div>
        <Sparkline data={data} width={80} height={40} color={sparklineColor} showArea={showArea} />
      </div>
    </div>
  );
}

interface SparklineGroupProps {
  items: Array<{
    label: string;
    value: number;
    data: number[];
    color?: string;
  }>;
  className?: string;
}

export function SparklineGroup({ items, className }: SparklineGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'bg-card hover:bg-primary hover:text-primary-foreground flex items-center justify-between gap-4 border p-4 transition-colors',
            mode.radius
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-muted-foreground text-xs">{item.value}</p>
          </div>
          <Sparkline
            data={item.data}
            width={60}
            height={24}
            strokeWidth={2}
            color={item.color || 'hsl(var(--primary))'}
            showArea={true}
          />
        </div>
      ))}
    </div>
  );
}
