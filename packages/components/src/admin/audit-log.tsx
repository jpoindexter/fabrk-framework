/**
 * AuditLog - Filterable, searchable audit log timeline for tracking user actions.
 * Displays entries with avatars, action badges, timestamps, and IP addresses.
 * Includes a detail sheet panel and CSV export support.
 *
 * @example
 * ```tsx
 * <AuditLog
 *   initialLogs={[
 *     { id: '1', userId: 'u1', userName: 'Jason', userEmail: 'jason@example.com', action: 'user.login', resource: '/dashboard', ipAddress: '192.168.1.1', userAgent: 'Chrome', metadata: {}, timestamp: new Date() },
 *   ]}
 *   onExport={async () => downloadCSV()}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import {
  Search,
  Download,
  ChevronDown,
  User,
  Settings,
  Key,
  Shield,
  Database,
  Clock,
} from 'lucide-react';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'settings.updated'
  | 'api key.created'
  | 'api key.revoked'
  | 'data.exported'
  | 'data.deleted'
  | 'role.changed'
  | 'security.breach';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  action: AuditAction;
  resource: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface AuditLogProps {
  className?: string;
  onExport?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  initialLogs?: AuditLogEntry[];
}

/* ----- Helper Functions ----- */

const getActionIcon = (action: AuditAction) => {
  if (action.startsWith('user.')) return <User className="h-3 w-3" />;
  if (action.startsWith('settings.')) return <Settings className="h-3 w-3" />;
  if (action.startsWith('api')) return <Key className="h-3 w-3" />;
  if (action.startsWith('security.')) return <Shield className="h-3 w-3" />;
  if (action.startsWith('data.')) return <Database className="h-3 w-3" />;
  return <Settings className="h-3 w-3" />;
};

const getActionBadgeVariant = (action: AuditAction) => {
  if (action.includes('deleted') || action.includes('revoked') || action.includes('breach')) {
    return 'destructive' as const;
  }
  if (action.includes('created') || action.includes('login')) {
    return 'default' as const;
  }
  return 'secondary' as const;
};

const getActionLabel = (action: AuditAction) => {
  return action.toUpperCase().replace(/\./g, '_');
};

const getUserInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/* ----- Sub-Components ----- */

function LogFilters({
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
          <SelectTrigger className={cn('w-full sm:w-52', mode.radius, mode.font)}>
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

function LogEntryItem({ log, isLast, onShowDetails }: { log: AuditLogEntry; isLast: boolean; onShowDetails: (log: AuditLogEntry) => void }) {
  return (
    <div className="relative p-4">
      {!isLast && <div className={cn(mode.color.border.default, 'absolute top-13 left-13 h-full w-px border-l')} />}

      <div className="flex items-start gap-4">
        <Avatar className="border-border h-10 w-10 border-2">
          <AvatarImage src={log.userAvatar} alt={log.userName} />
          <AvatarFallback className={cn('text-xs', mode.font)}>
            {getUserInitials(log.userName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={cn('text-sm font-medium', mode.font)}>{log.userName}</p>
                <Badge
                  variant={getActionBadgeVariant(log.action)}
                  className={cn('gap-1 px-2 py-0.5 text-xs', mode.font)}
                >
                  {getActionIcon(log.action)}
                  {getActionLabel(log.action)}
                </Badge>
              </div>

              <p className={cn('text-muted-foreground mt-1 text-xs', mode.font)}>{log.resource}</p>

              <div className={cn('text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs', mode.font)}>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span>• {log.ipAddress}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onShowDetails(log)}
              className={cn('text-xs', mode.radius, mode.font)}
            >
              DETAILS
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogDetailsSheet({ log, onClose }: { log: AuditLogEntry | null; onClose: () => void }) {
  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className={cn('w-full overflow-y-auto sm:max-w-2xl', mode.radius)}>
        {log && (
          <>
            <SheetHeader>
              <SheetTitle className={cn(mode.font)}>[ AUDIT LOG DETAILS ]</SheetTitle>
              <SheetDescription>Complete information about this action</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <p className={cn('text-xs font-semibold', mode.font)}>[USER]:</p>
                <div className="flex items-center gap-4">
                  <Avatar className="border-border h-12 w-12 border-2">
                    <AvatarImage src={log.userAvatar} alt={log.userName} />
                    <AvatarFallback className={cn('text-sm', mode.font)}>
                      {getUserInitials(log.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className={cn('text-sm font-medium', mode.font)}>{log.userName}</p>
                    <p className={cn('text-muted-foreground text-xs', mode.font)}>{log.userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className={cn('text-xs font-semibold', mode.font)}>[ACTION]:</p>
                <div className={cn(mode.color.bg.muted, mode.color.border.default, 'space-y-1 border px-4 py-2', mode.radius)}>
                  <div className="flex justify-between text-xs">
                    <span className={cn('text-muted-foreground', mode.font)}>[TYPE]:</span>
                    <Badge variant={getActionBadgeVariant(log.action)} className={cn(mode.font)}>
                      {getActionLabel(log.action)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={cn('text-muted-foreground', mode.font)}>[RESOURCE]:</span>
                    <span className={cn(mode.font)}>{log.resource}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={cn('text-muted-foreground', mode.font)}>[TIMESTAMP]:</span>
                    <span className={cn(mode.font)}>{new Date(log.timestamp).toISOString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className={cn('text-xs font-semibold', mode.font)}>[SECURITY]:</p>
                <div className={cn(mode.color.bg.muted, mode.color.border.default, 'space-y-1 border px-4 py-2', mode.radius)}>
                  <div className="flex justify-between text-xs">
                    <span className={cn('text-muted-foreground', mode.font)}>[IP ADDRESS]:</span>
                    <span className={cn(mode.font)}>{log.ipAddress}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className={cn('text-muted-foreground', mode.font)}>[USER AGENT]:</span>
                    <span className={cn('text-muted-foreground break-all', mode.font)}>{log.userAgent}</span>
                  </div>
                </div>
              </div>

              {Object.keys(log.metadata).length > 0 && (
                <div className="space-y-2">
                  <p className={cn('text-xs font-semibold', mode.font)}>[METADATA]:</p>
                  <div className={cn(mode.color.bg.muted, mode.color.border.default, 'space-y-1 border px-4 py-2', mode.radius)}>
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className={cn('text-muted-foreground', mode.font)}>
                          [{key.toUpperCase()}]:
                        </span>
                        <span className={cn(mode.font)}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function AuditLog({
  className,
  onExport,
  initialLogs = [],
}: AuditLogProps) {
  const [logs] = React.useState<AuditLogEntry[]>(initialLogs);
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
