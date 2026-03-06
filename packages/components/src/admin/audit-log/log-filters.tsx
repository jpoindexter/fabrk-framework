'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Search, Download } from 'lucide-react';
import type { AuditAction } from './types';

export function LogFilters({
  searchQuery,
  actionFilter,
  isExporting,
  onSearchChange,
  onActionFilterChange,
  onExport,
}: {
  searchQuery: string;
  actionFilter: AuditAction | 'all';
  isExporting: boolean;
  onSearchChange: (query: string) => void;
  onActionFilterChange: (action: AuditAction | 'all') => void;
  onExport?: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={cn('text-sm font-semibold tracking-tight', mode.font)}>[ AUDIT LOG ]</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Track all user actions for security and compliance
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          disabled={isExporting || !onExport}
          className={cn(mode.radius, mode.font)}
        >
          <Download className="h-4 w-4" />
          {isExporting ? '> EXPORTING...' : '> EXPORT CSV'}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by user, resource, or action..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn('pl-10', mode.radius, mode.font)}
          />
        </div>

        <Select
          value={actionFilter}
          onValueChange={(value) => onActionFilterChange(value as AuditAction | 'all')}
        >
          <SelectTrigger aria-label="Filter audit log by action" className={cn('w-full sm:w-52', mode.radius, mode.font)}>
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent className={cn(mode.radius)}>
            <SelectItem value="all" className={cn(mode.font)}>[ALL ACTIONS]</SelectItem>
            <SelectItem value="user.login" className={cn(mode.font)}>[USER LOGIN]</SelectItem>
            <SelectItem value="user.logout" className={cn(mode.font)}>[USER LOGOUT]</SelectItem>
            <SelectItem value="user.created" className={cn(mode.font)}>[USER CREATED]</SelectItem>
            <SelectItem value="user.deleted" className={cn(mode.font)}>[USER DELETED]</SelectItem>
            <SelectItem value="settings.updated" className={cn(mode.font)}>[SETTINGS UPDATED]</SelectItem>
            <SelectItem value="api key.created" className={cn(mode.font)}>[API KEY CREATED]</SelectItem>
            <SelectItem value="api key.revoked" className={cn(mode.font)}>[API KEY REVOKED]</SelectItem>
            <SelectItem value="data.exported" className={cn(mode.font)}>[DATA EXPORTED]</SelectItem>
            <SelectItem value="data.deleted" className={cn(mode.font)}>[DATA DELETED]</SelectItem>
            <SelectItem value="security.breach" className={cn(mode.font)}>[SECURITY BREACH]</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
