'use client';

import * as React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { CHART_COLORS } from './chart-theme';

export interface AreaChartDataPoint {
  [key: string]: string | number;
}

export interface AreaChartSeries {
  /** Data key in the data points */
  dataKey: string;
  /** Display name for the legend */
  name?: string;
  /** Area color (CSS color or HSL variable) */
  color?: string;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Line type */
  type?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
  /** Stack ID for stacked areas */
  stackId?: string;
  /** Show dots on the line */
  showDots?: boolean;
  /** Dot size */
  dotSize?: number;
}

export interface AreaChartProps {
  /** Chart data */
  data: AreaChartDataPoint[];
  /** X-axis data key */
  xAxisKey: string;
  /** Area series configuration */
  series: AreaChartSeries[];
  /** Chart height */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  /** Y-axis formatter */
  yAxisFormatter?: (value: number) => string;
  /** X-axis formatter */
  xAxisFormatter?: (value: string) => string;
  /** Tooltip formatter */
  tooltipFormatter?: (value: number, name: string) => string;
  /** Margin */
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Use gradient fill */
  gradient?: boolean;
  /** Additional className */
  className?: string;
}

export function AreaChart({
  data,
  xAxisKey,
  series,
  height = 300,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  yAxisFormatter,
  xAxisFormatter,
  tooltipFormatter,
  margin = { top: 10, right: 30, left: 0, bottom: 0 },
  gradient = true,
  className,
}: AreaChartProps) {
  const colors = CHART_COLORS.chart;

  // Memoize tooltip to prevent recreation on every render
  const CustomTooltip = React.useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts TooltipContentProps is complex
      ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className={cn(mode.color.border.default, 'bg-card border px-4 py-2', mode.radius)}>
              <p className={cn('text-foreground mb-2 text-xs font-semibold', mode.font)}>
                {xAxisFormatter ? xAxisFormatter(String(label ?? '')) : label}
              </p>
              <div className="space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {payload.map((entry: any, index: number) => (
                  <p key={index} className={cn('text-muted-foreground text-xs', mode.font)}>
                    <span
                      className="mr-2 inline-block h-2 w-2"
                      style={{ backgroundColor: entry.stroke }}
                    />
                    {entry.name}:{' '}
                    <span className="text-foreground font-semibold">
                      {tooltipFormatter ? tooltipFormatter(entry.value, entry.name) : entry.value}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          );
        }
        return null;
      },
    [xAxisFormatter, tooltipFormatter]
  );

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={margin}>
          {/* Gradient definitions */}
          {gradient && (
            <defs>
              {series.map((s, index) => {
                const color = s.color || colors[index % colors.length];
                return (
                  <linearGradient
                    key={`gradient-${s.dataKey}`}
                    id={`gradient-${s.dataKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
          )}

          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} opacity={0.5} />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
            tickLine={{ stroke: CHART_COLORS.border }}
            axisLine={{ stroke: CHART_COLORS.border }}
            tickFormatter={xAxisFormatter}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
            tickLine={{ stroke: CHART_COLORS.border }}
            axisLine={{ stroke: CHART_COLORS.border }}
            tickFormatter={yAxisFormatter}
          />
          {showTooltip && <Tooltip content={CustomTooltip} />}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} iconType="rect" />}
          {series.map((s, index) => {
            const color = s.color || colors[index % colors.length];
            return (
              <Area
                key={s.dataKey}
                type={s.type || 'monotone'}
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                stroke={color}
                strokeWidth={s.strokeWidth || 2}
                fill={gradient ? `url(#gradient-${s.dataKey})` : color}
                fillOpacity={gradient ? 1 : (s.fillOpacity ?? 0.2)}
                stackId={s.stackId}
                dot={
                  s.showDots
                    ? {
                        fill: color,
                        r: s.dotSize || 4,
                      }
                    : false
                }
                activeDot={{ r: (s.dotSize || 4) + 2 }}
              />
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ----- Area Chart Card Wrapper ----- */

export interface AreaChartCardProps extends AreaChartProps {
  /** Card title */
  title: string;
  /** Card description */
  description?: string;
  /** Terminal code for header */
  code?: string;
  /** Icon for header */
  icon?: React.ReactNode;
  /** Additional actions in header */
  headerActions?: React.ReactNode;
  /** Card className */
  cardClassName?: string;
}

export function AreaChartCard({
  title,
  description,
  code = '0x00',
  icon,
  headerActions,
  cardClassName,
  className,
  ...chartProps
}: AreaChartCardProps) {
  return (
    <div className={cn('border-border bg-card border', mode.radius, cardClassName)}>
      {/* Terminal Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <span className={cn('text-muted-foreground text-xs', mode.font)}>
              [{code}] {title.toUpperCase()}
            </span>
            {description && (
              <p className={cn('text-muted-foreground mt-0.5 text-xs', mode.font)}>{description}</p>
            )}
          </div>
        </div>
        {headerActions}
      </div>

      {/* Chart */}
      <div className="p-4">
        <AreaChart className={className} {...chartProps} />
      </div>
    </div>
  );
}

/* ----- Stacked Area Chart Variant ----- */

export interface StackedAreaChartProps extends Omit<AreaChartProps, 'series'> {
  /** Data keys for each stack segment */
  stackKeys: string[];
  /** Labels for each stack segment */
  stackLabels?: string[];
  /** Colors for each stack segment */
  stackColors?: string[];
}

export function StackedAreaChart({
  stackKeys,
  stackLabels,
  stackColors,
  ...props
}: StackedAreaChartProps) {
  const colors = stackColors || CHART_COLORS.chart;

  const series: AreaChartSeries[] = stackKeys.map((key, index) => ({
    dataKey: key,
    name: stackLabels?.[index] || key,
    color: colors[index % colors.length],
    stackId: 'stack',
    fillOpacity: 0.6,
  }));

  return <AreaChart {...props} series={series} showLegend gradient={false} />;
}
