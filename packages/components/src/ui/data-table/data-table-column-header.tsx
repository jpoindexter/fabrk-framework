'use client';

import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column || !column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="hover:text-primary flex items-center gap-2"
      >
        <span>{title}</span>
        {column.getIsSorted() === 'desc' ? (
          <ArrowDown className="h-4 w-4" />
        ) : column.getIsSorted() === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ChevronsUpDown className={cn('h-4 w-4', mode.state.muted.opacity)} />
        )}
      </button>
    </div>
  );
}
