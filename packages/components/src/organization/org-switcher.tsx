/**
 * OrgSwitcher - Dropdown for switching between organizations with role display and create option.
 * Handles loading and empty states automatically.
 *
 * @example
 * ```tsx
 * <OrgSwitcher
 *   organizations={[
 *     { id: 'org-1', name: 'Acme Corp', slug: 'acme', role: 'owner' },
 *     { id: 'org-2', name: 'Startup Inc', slug: 'startup', role: 'member' },
 *   ]}
 *   currentOrgId="org-1"
 *   onSwitchOrg={(orgId) => switchOrg(orgId)}
 *   onCreateOrg={() => openCreateOrgModal()}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { mode } from '@fabrk/design-system';

export interface OrgSwitcherOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role: string;
}

export interface OrgSwitcherProps {
  organizations: OrgSwitcherOrganization[];
  currentOrgId?: string;
  loading?: boolean;
  onSwitchOrg: (orgId: string) => void;
  onCreateOrg?: () => void;
  className?: string;
}

export function OrgSwitcher({
  organizations,
  currentOrgId,
  loading = false,
  onSwitchOrg,
  onCreateOrg,
  className,
}: OrgSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const currentOrg = organizations.find((org) => org.id === currentOrgId) ?? organizations[0] ?? null;

  if (loading) {
    return (
      <div
        className={cn(
          'border-border bg-card flex items-center gap-2 border px-4 py-2',
          mode.radius
        )}
      >
        <Building2 className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <Button variant="outline" onClick={onCreateOrg} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Organization
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select organization"
          className={cn(
            'border-border w-52 justify-between gap-2 border transition-all',
            mode.radius,
            className
          )}
        >
          {currentOrg?.logo ? (
            <img src={currentOrg.logo} alt={currentOrg.name} className={cn('h-5 w-5', mode.radius)} />
          ) : (
            <Building2 className="text-muted-foreground h-4 w-4" />
          )}
          <span className="flex-1 truncate text-left text-sm font-medium">
            {currentOrg?.name || 'Select organization'}
          </span>
          <ChevronsUpDown className={cn('h-4 w-4 shrink-0', mode.state.muted.opacity)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn('border-border w-52 border', mode.radius)}
      >
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Your Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => {
              onSwitchOrg(org.id);
              setOpen(false);
            }}
            className="cursor-pointer font-semibold"
          >
            <div className="flex w-full items-center gap-2">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className={cn('h-5 w-5', mode.radius)} />
              ) : (
                <Building2 className="text-muted-foreground h-4 w-4" />
              )}
              <span className="flex-1 truncate text-sm">{org.name}</span>
              {currentOrg?.id === org.id && <Check className="text-primary h-4 w-4" />}
            </div>
            {org.role && <span className="text-muted-foreground ml-auto text-xs">{org.role}</span>}
          </DropdownMenuItem>
        ))}
        {onCreateOrg && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onCreateOrg();
                setOpen(false);
              }}
              className="text-primary cursor-pointer font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="text-sm">Create Organization</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
