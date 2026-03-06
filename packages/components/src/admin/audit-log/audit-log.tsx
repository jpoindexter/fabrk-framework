'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Card } from '../../ui/card';
import { LogFilters } from './log-filters';
import { LogEntryItem } from './log-entry-item';
import { LogDetailsSheet } from './log-details-sheet';
import type { AuditAction, AuditLogEntry, AuditLogProps } from './types';

export function AuditLog({ className, onExport, initialLogs = [] }: AuditLogProps) {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>(initialLogs);

  React.useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  const [filteredLogs, setFilteredLogs] = React.useState<AuditLogEntry[]>(initialLogs);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState<AuditAction | 'all'>('all');
  const [selectedLog, setSelectedLog] = React.useState<AuditLogEntry | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    let filtered = logs;

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.userName.toLowerCase().includes(query) ||
          log.userEmail.toLowerCase().includes(query) ||
          log.resource.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, actionFilter]);

  const handleExport = async () => {
    if (!onExport) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <LogFilters
        searchQuery={searchQuery}
        actionFilter={actionFilter}
        isExporting={isExporting}
        onSearchChange={setSearchQuery}
        onActionFilterChange={setActionFilter}
        onExport={handleExport}
      />

      <Card className={cn(mode.radius)}>
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <p className={cn('text-muted-foreground text-sm', mode.font)}>
              {searchQuery || actionFilter !== 'all'
                ? '[NO LOGS FOUND]: Try adjusting filters'
                : '[NO AUDIT LOGS]: User actions will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {filteredLogs.map((log, index) => (
              <LogEntryItem
                key={log.id}
                log={log}
                isLast={index === filteredLogs.length - 1}
                onShowDetails={setSelectedLog}
              />
            ))}
          </div>
        )}
      </Card>

      <LogDetailsSheet log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
