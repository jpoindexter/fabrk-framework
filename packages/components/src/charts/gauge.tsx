/**
 * Gauge - SVG arc gauge with needle indicator for displaying a value within a range.
 * Supports segments, min/max labels, and custom angle ranges.
 * Also exports ScoreGauge with automatic color grading based on percentage.
 *
 * @example
 * ```tsx
 * <Gauge value={72} max={100} label="CPU USAGE" unit="%" />
 * <ScoreGauge score={85} maxScore={100} label="HEALTH SCORE" />
 * ```
 */

'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';

interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  thickness?: number;
  startAngle?: number;
  endAngle?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  showMinMax?: boolean;
  label?: string;
  unit?: string;
  className?: string;
  segments?: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
}

export function Gauge({
  value,
  min = 0,
  max = 100,
  size = 200,
  thickness = 20,
  startAngle = -135,
  endAngle = 135,
  color = 'hsl(var(--primary))',
  backgroundColor = 'var(--color-muted)',
  showValue = true,
  showMinMax = false,
  label,
  unit,
  className,
  segments,
}: GaugeProps) {
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  const angleRange = endAngle - startAngle;
  const currentAngle = startAngle + (angleRange * percentage) / 100;

  const getArcPath = (radius: number, startAngle: number, endAngle: number, thickness: number) => {
    const innerRadius = radius - thickness / 2;
    const outerRadius = radius + thickness / 2;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + outerRadius * Math.cos(startRad);
    const y1 = center + outerRadius * Math.sin(startRad);
    const x2 = center + outerRadius * Math.cos(endRad);
    const y2 = center + outerRadius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  const getNeedlePoints = () => {
    const needleLength = radius * 0.8;
    const needleWidth = thickness * 0.3;
    const angleRad = (currentAngle * Math.PI) / 180;

    const tipX = center + needleLength * Math.cos(angleRad);
    const tipY = center + needleLength * Math.sin(angleRad);

    const baseAngle1 = angleRad - Math.PI / 2;
    const baseAngle2 = angleRad + Math.PI / 2;

    const base1X = center + needleWidth * Math.cos(baseAngle1);
    const base1Y = center + needleWidth * Math.sin(baseAngle1);
    const base2X = center + needleWidth * Math.cos(baseAngle2);
    const base2Y = center + needleWidth * Math.sin(baseAngle2);

    return `${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`;
  };

  const getTextPosition = (angle: number, distance: number) => {
    const angleRad = (angle * Math.PI) / 180;
    return {
      x: center + distance * Math.cos(angleRad),
      y: center + distance * Math.sin(angleRad),
    };
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={getArcPath(radius, startAngle, endAngle, thickness)}
          fill={backgroundColor}
          className="gauge-background"
        />

        {/* Segments or single value arc */}
        {segments ? (
          segments.map((segment, index) => {
            const prevValue = segments.slice(0, index).reduce((sum, s) => sum + s.value, 0);
            const segmentStart = startAngle + (angleRange * prevValue) / (max - min);
            const segmentEnd =
              startAngle + (angleRange * (prevValue + segment.value)) / (max - min);

            return (
              <path
                key={index}
                d={getArcPath(radius, segmentStart, segmentEnd, thickness)}
                fill={segment.color}
                className="gauge-segment transition-all"
              />
            );
          })
        ) : (
          <path
            d={getArcPath(radius, startAngle, currentAngle, thickness)}
            fill={color}
            className="gauge-value transition-all"
          />
        )}

        {/* Needle */}
        <polygon
          points={getNeedlePoints()}
          fill="hsl(var(--foreground))"
          className="gauge-needle transition-all"
        />

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={thickness * 0.6}
          fill="hsl(var(--foreground))"
          stroke="var(--color-background)"
          strokeWidth={2}
          className="gauge-center"
        />

        {/* Min/Max labels */}
        {showMinMax && (
          <>
            <text
              x={getTextPosition(startAngle, radius + thickness).x}
              y={getTextPosition(startAngle, radius + thickness).y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs font-medium"
            >
              {min}
            </text>
            <text
              x={getTextPosition(endAngle, radius + thickness).x}
              y={getTextPosition(endAngle, radius + thickness).y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs font-medium"
            >
              {max}
            </text>
          </>
        )}
      </svg>

      {/* Value and label below gauge */}
      {showValue && (
        <div className="text-center">
          <p className="text-3xl leading-none font-semibold">
            {normalizedValue.toFixed(0)}
            {unit && <span className="text-sm">{unit}</span>}
          </p>
          {label && <p className="text-muted-foreground mt-1 text-xs">{label}</p>}
        </div>
      )}
    </div>
  );
}

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  label?: string;
  className?: string;
}

export function ScoreGauge({
  score,
  maxScore = 100,
  size = 180,
  label,
  className,
}: ScoreGaugeProps) {
  const getColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'hsl(var(--success))';
    if (percentage >= 60) return 'hsl(var(--chart-4))';
    return 'hsl(var(--destructive))';
  };

  return (
    <Gauge
      value={score}
      max={maxScore}
      size={size}
      thickness={18}
      color={getColor(score, maxScore)}
      label={label}
      className={className}
    />
  );
}
