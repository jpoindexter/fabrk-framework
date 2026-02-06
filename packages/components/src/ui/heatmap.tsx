'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

export interface HeatmapDataItem {
  x: string | number;
  y: string | number;
  value: number;
}

interface HeatmapProps {
  data: HeatmapDataItem[];
  cellSize?: number;
  gap?: number;
  colorScale?: string[];
  showValues?: boolean;
  showLabels?: boolean;
  className?: string;
  onCellClick?: (item: HeatmapDataItem) => void;
}

export function Heatmap({
  data,
  cellSize = 40,
  gap = 4,
  colorScale = [
    'var(--color-muted)',
    'oklch(80% 0.1 240)',
    'oklch(70% 0.15 240)',
    'oklch(60% 0.20 240)',
    'oklch(50% 0.25 240)',
  ],
  showValues = false,
  showLabels = true,
  className,
  onCellClick,
}: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = React.useState<HeatmapDataItem | null>(null);

  const xLabels = Array.from(new Set(data.map((d) => d.x))).sort();
  const yLabels = Array.from(new Set(data.map((d) => d.y))).sort();

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const getColor = (value: number) => {
    const normalized = (value - minValue) / range;
    const index = Math.min(Math.floor(normalized * colorScale.length), colorScale.length - 1);
    return colorScale[index];
  };

  const getCellData = (x: string | number, y: string | number) => {
    return data.find((d) => d.x === x && d.y === y);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex">
        {showLabels && (
          <div className="flex flex-col justify-between pr-2">
            <div style={{ height: cellSize }} /> {/* Spacer for x-labels */}
            {yLabels.map((label) => (
              <div
                key={String(label)}
                className="flex items-center justify-end text-xs font-medium"
                style={{ height: cellSize, marginBottom: gap }}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        <div>
          {showLabels && (
            <div className="mb-2 flex">
              {xLabels.map((label) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-center text-xs font-medium"
                  style={{ width: cellSize, marginRight: gap }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col" style={{ gap: `${gap}px` }}>
            {yLabels.map((yLabel) => (
              <div key={String(yLabel)} className="flex" style={{ gap: `${gap}px` }}>
                {xLabels.map((xLabel) => {
                  const cellData = getCellData(xLabel, yLabel);
                  const isHovered = hoveredCell === cellData;

                  if (!cellData) {
                    return (
                      <div
                        key={String(xLabel)}
                        className={cn('bg-muted border', mode.radius)}
                        style={{ width: cellSize, height: cellSize }}
                      />
                    );
                  }

                  return (
                    <div
                      key={String(xLabel)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${cellData.y} × ${cellData.x}: ${cellData.value}`}
                      className={cn(
                        'flex cursor-pointer items-center justify-center border transition-all',
                        mode.radius,
                        isHovered && 'scale-110'
                      )}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: getColor(cellData.value),
                      }}
                      onMouseEnter={() => setHoveredCell(cellData)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onCellClick?.(cellData)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onCellClick?.(cellData);
                        }
                      }}
                    >
                      {showValues && <span className="text-xs font-medium">{cellData.value}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {hoveredCell && (
        <div
          className={cn('bg-card absolute right-0 bottom-0 left-0 mt-4 border p-4', mode.radius)}
        >
          <p className="text-xs font-medium">
            {hoveredCell.y} × {hoveredCell.x}
          </p>
          <p className="text-2xl font-semibold">{hoveredCell.value}</p>
        </div>
      )}
    </div>
  );
}
