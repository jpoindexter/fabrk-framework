/**
 * BarChart - Configurable bar chart with support for stacked, horizontal, and color-by-index modes.
 * Built on Recharts with theme-aware tooltip and grid styling via CSS custom properties.
 * Also exports BarChartCard (wrapped in a terminal-style card) and StackedBarChart.
 *
 * @example
 * ```tsx
 * <BarChart
 *   data={[
 *     { month: 'Jan', revenue: 4000, costs: 2400 },
 *     { month: 'Feb', revenue: 3000, costs: 1398 },
 *   ]}
 *   xAxisKey="month"
 *   series={[
 *     { dataKey: 'revenue', name: 'Revenue' },
 *     { dataKey: 'costs', name: 'Costs' },
 *   ]}
 *   showLegend
 * />
 * ```
 */

'use client';

import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { cn } from '@fabrk/core';
import { CHART_COLORS } from './chart-theme';
import { useChartTooltip } from './chart-tooltip';
import { ChartCard } from './chart-card';

export interface BarChartDataPoint {
  [key: string]: string | number;
}

export interface BarChartSeries {
  /** Data key in the data points */
  dataKey: string;
  /** Display name for the legend */
  name?: string;
  /** Bar color (CSS color or HSL variable) */
  color?: string;
  /** Stack ID for stacked bars */
  stackId?: string;
  /** Bar radius [topLeft, topRight, bottomRight, bottomLeft] */
  radius?: number | [number, number, number, number];
}

export interface BarChartProps {
  /** Chart data */
  data: BarChartDataPoint[];
  /** X-axis data key */
  xAxisKey: string;
  /** Bar series configuration */
  series: BarChartSeries[];
  /** Chart height */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  /** Horizontal layout */
  horizontal?: boolean;
  /** Bar size */
  barSize?: number;
  /** Gap between bars */
  barGap?: number;
  /** Y-axis formatter */
  yAxisFormatter?: (value: number) => string;
  /** X-axis formatter */
  xAxisFormatter?: (value: string) => string;
  /** Tooltip formatter */
  tooltipFormatter?: (value: number, name: string) => string;
  /** Margin */
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Color each bar differently based on index */
  colorByIndex?: boolean;
  /** Custom colors array for colorByIndex */
  colors?: string[];
  /** Additional className */
  className?: string;
}

export function BarChart({
  data,
  xAxisKey,
  series,
  height = 300,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  horizontal = false,
  barSize,
  barGap = 4,
  yAxisFormatter,
  xAxisFormatter,
  tooltipFormatter,
  margin = { top: 10, right: 30, left: 0, bottom: 0 },
  colorByIndex = false,
  colors: customColors,
  className,
}: BarChartProps) {
  const colors = customColors || CHART_COLORS.chart;
  const CustomTooltip = useChartTooltip({ xAxisFormatter, tooltipFormatter, colorKey: 'fill' });

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={margin}
          layout={horizontal ? 'vertical' : 'horizontal'}
          barGap={barGap}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.border}
              opacity={0.5}
              horizontal={!horizontal}
              vertical={horizontal}
            />
          )}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                tickLine={{ stroke: CHART_COLORS.border }}
                axisLine={{ stroke: CHART_COLORS.border }}
                tickFormatter={yAxisFormatter}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                tickLine={{ stroke: CHART_COLORS.border }}
                axisLine={{ stroke: CHART_COLORS.border }}
                tickFormatter={xAxisFormatter}
                width={80}
              />
            </>
          ) : (
            <>
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
            </>
          )}
          {showTooltip && (
            <Tooltip content={CustomTooltip} cursor={{ fill: CHART_COLORS.border, opacity: 0.3 }} />
          )}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />}
          {series.map((s, seriesIndex) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={colorByIndex ? undefined : s.color || colors[seriesIndex % colors.length]}
              stackId={s.stackId}
              barSize={barSize}
              radius={s.radius ?? 0}
            >
              {colorByIndex &&
                data.map((_, dataIndex) => (
                  <Cell key={`cell-${dataIndex}`} fill={colors[dataIndex % colors.length]} />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ----- Bar Chart Card Wrapper ----- */

export interface BarChartCardProps extends BarChartProps {
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

export function BarChartCard({
  title,
  description,
  code,
  icon,
  headerActions,
  cardClassName,
  className,
  ...chartProps
}: BarChartCardProps) {
  return (
    <ChartCard title={title} description={description} code={code} icon={icon} headerActions={headerActions} cardClassName={cardClassName}>
      <BarChart className={className} {...chartProps} />
    </ChartCard>
  );
}

/* ----- Stacked Bar Chart Variant ----- */

export interface StackedBarChartProps extends Omit<BarChartProps, 'series'> {
  /** Data keys for each stack segment */
  stackKeys: string[];
  /** Labels for each stack segment */
  stackLabels?: string[];
  /** Colors for each stack segment */
  stackColors?: string[];
}

export function StackedBarChart({
  stackKeys,
  stackLabels,
  stackColors,
  ...props
}: StackedBarChartProps) {
  const colors = stackColors || CHART_COLORS.chart;

  const series: BarChartSeries[] = stackKeys.map((key, index) => ({
    dataKey: key,
    name: stackLabels?.[index] || key,
    color: colors[index % colors.length],
    stackId: 'stack',
    radius: index === stackKeys.length - 1 ? [4, 4, 0, 0] : 0,
  }));

  return <BarChart {...props} series={series} showLegend />;
}
