/**
 * FABRK COMPONENT
 * TierBadge - Subscription tier indicator with icon
 *
 * @example
 * ```tsx
 * <TierBadge tier="free" />
 * <TierBadge tier="pro" showIcon size="lg" />
 * <TierBadge tier="team" />
 * ```
 */

'use client';

import * as React from 'react';
import { Crown, Sparkles, Star, Zap } from 'lucide-react';
import { Badge } from './badge';

export type TierName = 'free' | 'trial' | 'pro' | 'team' | 'enterprise';

export interface TierBadgeProps {
  tier: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierConfig: Record<TierName, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: React.ElementType }> = {
  free: { label: 'FREE', variant: 'secondary', icon: Zap },
  trial: { label: 'TRIAL', variant: 'secondary', icon: Zap },
  pro: { label: 'PRO', variant: 'default', icon: Star },
  team: { label: 'TEAM', variant: 'default', icon: Crown },
  enterprise: { label: 'ENTERPRISE', variant: 'default', icon: Sparkles },
};

export function TierBadge({ tier, showIcon = true, size = 'md', className }: TierBadgeProps) {
  const tierName = (tier?.toLowerCase() || 'free') as TierName;
  const config = tierConfig[tierName] || tierConfig.free;
  const Icon = config.icon;

  const iconSize = size === 'sm' ? 'size-3' : size === 'lg' ? 'size-4' : 'size-3.5';

  return (
    <Badge variant={config.variant} className={className}>
      <span className="flex items-center gap-1 font-medium">
        {showIcon && <Icon className={iconSize} />}
        {config.label}
      </span>
    </Badge>
  );
}
