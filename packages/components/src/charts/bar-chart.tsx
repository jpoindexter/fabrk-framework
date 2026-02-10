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
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

// Theme colors using CSS custom properties directly
const THEME_COLORS = {
  chart: [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
    'var(--color-chart-6)',
  ],
  muted: 'var(--color-muted-foreground)',
  border: 'var(--color-border)',
};

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
  /** Show legend */
  showLegend?: boolean;
  /** Show tooltip */
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
  const colors = customColors || THEME_COLORS.chart;
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
                { }
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {payload.map((entry: any, index: number) => (
                  <p key={index} className={cn('text-muted-foreground text-xs', mode.font)}>
                    <span
                      className="mr-2 inline-block h-2 w-2"
                      style={{ backgroundColor: entry.fill }}
                    />
                    {entry.name}:{' '}
                    <span className="text-foreground font-semibold">
                      {tooltipFormatter ? tooltipFormatter(entry.value, entry.name) : entry.value}
                    </span>
                  </p>
                ))}
                { }
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
        <RechartsBarChart
          data={data}
          margin={margin}
          layout={horizontal ? 'vertical' : 'horizontal'}
          barGap={barGap}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={THEME_COLORS.border}
              opacity={0.5}
              horizontal={!horizontal}
              vertical={horizontal}
            />
          )}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: THEME_COLORS.muted, fontSize: 12 }}
                tickLine={{ stroke: THEME_COLORS.border }}
                axisLine={{ stroke: THEME_COLORS.border }}
                tickFormatter={yAxisFormatter}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                tick={{ fill: THEME_COLORS.muted, fontSize: 12 }}
                tickLine={{ stroke: THEME_COLORS.border }}
                axisLine={{ stroke: THEME_COLORS.border }}
                tickFormatter={xAxisFormatter}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xAxisKey}
                tick={{ fill: THEME_COLORS.muted, fontSize: 12 }}
                tickLine={{ stroke: THEME_COLORS.border }}
                axisLine={{ stroke: THEME_COLORS.border }}
                tickFormatter={xAxisFormatter}
              />
              <YAxis
                tick={{ fill: THEME_COLORS.muted, fontSize: 12 }}
                tickLine={{ stroke: THEME_COLORS.border }}
                axisLine={{ stroke: THEME_COLORS.border }}
                tickFormatter={yAxisFormatter}
              />
            </>
          )}
          {showTooltip && (
            <Tooltip content={CustomTooltip} cursor={{ fill: THEME_COLORS.border, opacity: 0.3 }} />
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
  code = '0x00',
  icon,
  headerActions,
  cardClassName,
  className,
  ...chartProps
}: BarChartCardProps) {
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
        <BarChart className={className} {...chartProps} />
      </div>
    </div>
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
  const colors = stackColors || THEME_COLORS.chart;

  const series: BarChartSeries[] = stackKeys.map((key, index) => ({
    dataKey: key,
    name: stackLabels?.[index] || key,
    color: colors[index % colors.length],
    stackId: 'stack',
    radius: index === stackKeys.length - 1 ? [4, 4, 0, 0] : 0,
  }));

  return <BarChart {...props} series={series} showLegend />;
}
