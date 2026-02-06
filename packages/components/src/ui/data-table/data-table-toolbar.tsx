'use client';

import { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Input } from '../input';
import { Button } from '../button';
import { cn } from '../../lib/utils';
import { mode } from '@fabrk/design-system';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = 'Search...',
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
            onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
            className={cn(mode.color.border.default, 'h-10 w-full max-w-sm border', mode.radius)}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-10 px-2 lg:px-4"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Add export, column visibility controls here if needed */}
      </div>
    </div>
  );
}
