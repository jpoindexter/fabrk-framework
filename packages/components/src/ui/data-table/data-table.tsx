'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '../../lib/utils';
import { mode } from '@fabrk/design-system';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';

import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} searchKey={searchKey} searchPlaceholder={searchPlaceholder} />
      <div
        className={cn(
          mode.color.border.default,
          'bg-card overflow-x-auto scroll-smooth border [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-border',
          mode.radius,
          `[&::-webkit-scrollbar-thumb]:${mode.radius}`
        )}
      >
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={cn(mode.color.border.default, 'border-b hover:bg-transparent')}
              >
                {headerGroup.headers.map((header) => {
                  if (!header || !header.column) return null;
                  return (
                    <TableHead key={header.id} className="text-foreground font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'border-foreground/10 border-b',
                    index % 2 === 0 ? 'bg-card' : mode.color.bg.muted,
                    onRowClick && cn(mode.state.hover.card, 'cursor-pointer'),
                    row.getIsSelected() && 'bg-primary/10'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className={cn('text-muted-foreground text-xs', mode.font)}>
                      No results found.
                    </p>
                    {searchKey && !!table.getColumn(searchKey)?.getFilterValue() && (
                      <button
                        onClick={() => table.getColumn(searchKey)?.setFilterValue('')}
                        className="text-primary text-xs hover:underline"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
