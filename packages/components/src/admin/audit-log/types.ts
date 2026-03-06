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
  initialLogs?: AuditLogEntry[];
}
