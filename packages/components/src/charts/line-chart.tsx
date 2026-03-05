/**
 * LineChart - Multi-series line chart with configurable stroke styles, dots, and dashed lines.
 * Built on Recharts with theme-aware tooltip and grid styling via CSS custom properties.
 * Also exports LineChartCard wrapped in a terminal-style card header.
 *
 * @example
 * ```tsx
 * <LineChart
 *   data={[
 *     { date: 'Mon', users: 120, sessions: 340 },
 *     { date: 'Tue', users: 180, sessions: 420 },
 *   ]}
 *   xAxisKey="date"
 *   series={[
 *     { dataKey: 'users', name: 'Users', color: 'var(--color-chart-1)' },
 *     { dataKey: 'sessions', name: 'Sessions', dashed: true },
 *   ]}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@fabrk/core';
import { CHART_COLORS } from './chart-theme';
import { useChartTooltip } from './chart-tooltip';
import { ChartCard } from './chart-card';

export interface LineChartDataPoint {
  [key: string]: string | number;
}

export interface LineChartSeries {
  /** Data key in the data points */
  dataKey: string;
  /** Display name for the legend */
  name?: string;
  /** Line color (CSS color or HSL variable) */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Line type */
  type?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
  /** Show dots on the line */
  showDots?: boolean;
  /** Dot size */
  dotSize?: number;
  /** Dashed line */
  dashed?: boolean;
}

export interface LineChartProps {
  /** Chart data */
  data: LineChartDataPoint[];
  /** X-axis data key */
  xAxisKey: string;
  /** Line series configuration */
  series: LineChartSeries[];
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
  /** Additional className */
  className?: string;
}

export function LineChart({
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
  className,
}: LineChartProps) {
  const colors = CHART_COLORS.chart;
  const CustomTooltipContent = useChartTooltip({ xAxisFormatter, tooltipFormatter, colorKey: 'stroke' });

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={margin}>
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
          {showTooltip && <Tooltip content={CustomTooltipContent} />}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} iconType="line" />}
          {series.map((s, index) => (
            <Line
              key={s.dataKey}
              type={s.type || 'monotone'}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stroke={s.color || colors[index % colors.length]}
              strokeWidth={s.strokeWidth || 2}
              strokeDasharray={s.dashed ? '5 5' : undefined}
              dot={
                s.showDots !== false
                  ? {
                      fill: s.color || colors[index % colors.length],
                      r: s.dotSize || 4,
                    }
                  : false
              }
              activeDot={{ r: (s.dotSize || 4) + 2 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface LineChartCardProps extends LineChartProps {
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

export function LineChartCard({
  title,
  description,
  code,
  icon,
  headerActions,
  cardClassName,
  className,
  ...chartProps
}: LineChartCardProps) {
  return (
    <ChartCard title={title} description={description} code={code} icon={icon} headerActions={headerActions} cardClassName={cardClassName}>
      <LineChart className={className} {...chartProps} />
    </ChartCard>
  );
}
