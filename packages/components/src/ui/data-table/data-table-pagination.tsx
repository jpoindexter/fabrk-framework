'use client';

import { Table } from '@tanstack/react-table';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import * as React from 'react';

import { Button } from '../button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select';

interface DataTablePaginationProps<TData> extends React.HTMLAttributes<HTMLElement> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export type { DataTablePaginationProps };

/**
 * Data table pagination component
 */
function DataTablePaginationInner<TData>(
  { table, pageSizeOptions = [10, 20, 30, 40, 50], className }: DataTablePaginationProps<TData>,
  ref: React.ForwardedRef<HTMLElement>
) {
  return (
    <nav
      data-slot="data-table-pagination"
      ref={ref}
      className={cn('flex items-center justify-between px-2', className)}
      aria-label="Table pagination"
    >
      <div className="flex items-center space-x-2">
        <p className={cn('text-muted-foreground text-xs', mode.font)}>
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </p>
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className={cn('text-xs font-medium', mode.font)}>Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="focus-visible:ring-ring h-8 w-20 font-semibold focus-visible:ring-2 focus-visible:outline-none">
              <SelectValue placeholder={`${table.getState().pagination.pageSize}`} />
            </SelectTrigger>
            <SelectContent className="min-w-select">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="font-semibold">
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={cn('flex w-24 items-center justify-center text-xs font-medium', mode.font)}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-10 w-10 focus-visible:ring-ring hidden p-0 focus-visible:ring-2 focus-visible:outline-none lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-10 w-10 focus-visible:ring-ring p-0 focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-10 w-10 focus-visible:ring-ring p-0 focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-10 w-10 focus-visible:ring-ring hidden p-0 focus-visible:ring-2 focus-visible:outline-none lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

export const DataTablePagination = React.forwardRef(DataTablePaginationInner) as <TData>(
  props: DataTablePaginationProps<TData> & {
    ref?: React.ForwardedRef<HTMLElement>;
  }
) => ReturnType<typeof DataTablePaginationInner>;

(DataTablePagination as unknown as { displayName: string }).displayName = 'DataTablePagination';
