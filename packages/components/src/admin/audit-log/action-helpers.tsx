import * as React from 'react';
import { User, Settings, Key, Shield, Database } from 'lucide-react';
import type { AuditAction } from './types';

export const getActionIcon = (action: AuditAction) => {
  if (action.startsWith('user.')) return <User className="h-3 w-3" />;
  if (action.startsWith('settings.')) return <Settings className="h-3 w-3" />;
  if (action.startsWith('api')) return <Key className="h-3 w-3" />;
  if (action.startsWith('security.')) return <Shield className="h-3 w-3" />;
  if (action.startsWith('data.')) return <Database className="h-3 w-3" />;
  return <Settings className="h-3 w-3" />;
};

export const getActionBadgeVariant = (action: AuditAction) => {
  if (action.includes('deleted') || action.includes('revoked') || action.includes('breach')) {
    return 'destructive' as const;
  }
  if (action.includes('created') || action.includes('login')) {
    return 'default' as const;
  }
  return 'secondary' as const;
};

export const getActionLabel = (action: AuditAction) => {
  return action.toUpperCase().replace(/\./g, '_');
};
