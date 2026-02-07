'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

export interface SystemHealthMetric {
  label: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend?: 'up' | 'down';
  trendValue?: number;
}

export interface SystemHealthWidgetProps {
  code?: string;
  uptime?: number;
  avgResponseTime?: number;
  errorRate?: number;
  requestsPerMinute?: number;
  lastUpdated?: Date;
  className?: string;
}

export function SystemHealthWidget({
  code = '0x00',
  uptime = 99.9,
  avgResponseTime = 145,
  errorRate = 0.2,
  requestsPerMinute = 1250,
  lastUpdated = new Date(),
  className,
}: SystemHealthWidgetProps) {
  const getUptimeStatus = (val: number): 'healthy' | 'warning' | 'critical' => {
    if (val >= 99.5) return 'healthy';
    if (val >= 99.0) return 'warning';
    return 'critical';
  };

  const getResponseTimeStatus = (time: number): 'healthy' | 'warning' | 'critical' => {
    if (time <= 200) return 'healthy';
    if (time <= 500) return 'warning';
    return 'critical';
  };

  const getErrorRateStatus = (rate: number): 'healthy' | 'warning' | 'critical' => {
    if (rate <= 0.5) return 'healthy';
    if (rate <= 2.0) return 'warning';
    return 'critical';
  };

  const uptimeStatus = getUptimeStatus(uptime);
  const responseTimeStatus = getResponseTimeStatus(avgResponseTime);
  const errorRateStatus = getErrorRateStatus(errorRate);

  const overallStatus = [uptimeStatus, responseTimeStatus, errorRateStatus].includes('critical')
    ? 'critical'
    : [uptimeStatus, responseTimeStatus, errorRateStatus].includes('warning')
      ? 'warning'
      : 'healthy';

  const StatusIcon = overallStatus === 'healthy' ? CheckCircle2 : AlertTriangle;

  const tone =
    overallStatus === 'healthy' ? 'success' : overallStatus === 'warning' ? 'warning' : 'danger';

  return (
    <Card tone={tone} className={className}>
      <div className="border-border flex items-center justify-between border-b px-4 py-2">
        <CardHeader
          code={code}
          title="SYSTEM HEALTH"
          meta={`Updated: ${lastUpdated.toLocaleTimeString()}`}
          icon={<Activity className="h-4 w-4" />}
          className="border-0 p-0"
        />
        <Badge variant={overallStatus === 'healthy' ? 'default' : 'accent'} className="font-medium">
          <StatusIcon className="mr-1 h-3 w-3" />
          {overallStatus.toUpperCase()}
        </Badge>
      </div>

      <CardContent className="space-y-4">
        {/* Uptime */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-muted-foreground h-4 w-4" />
              <span className="text-foreground text-sm font-medium">Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground text-2xl font-bold">{uptime}%</span>
              {uptime >= 99.9 && <TrendingUp className="text-primary h-4 w-4" />}
            </div>
          </div>
          <Progress
            value={uptime}
            className={cn(
              'h-2',
              uptimeStatus === 'healthy' && 'bg-primary/20',
              uptimeStatus === 'warning' && 'bg-warning/20',
              uptimeStatus === 'critical' && 'bg-destructive/20'
            )}
          />
        </div>

        {/* Response Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              <span className="text-foreground text-sm font-medium">Avg Response Time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground text-2xl font-bold">{avgResponseTime}ms</span>
              <TrendingDown className="text-primary h-4 w-4" />
            </div>
          </div>
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 flex-1',
                  mode.radius,
                  i < Math.floor((avgResponseTime / 1000) * 10)
                    ? responseTimeStatus === 'healthy'
                      ? 'bg-primary'
                      : responseTimeStatus === 'warning'
                        ? 'bg-warning'
                        : 'bg-destructive'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>

        {/* Error Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-muted-foreground h-4 w-4" />
              <span className="text-foreground text-sm font-medium">Error Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground text-2xl font-bold">{errorRate}%</span>
              {errorRate <= 0.5 && <TrendingDown className="text-primary h-4 w-4" />}
            </div>
          </div>
          <Progress
            value={errorRate * 20}
            className={cn(
              'h-2',
              errorRateStatus === 'healthy' && 'bg-primary/20',
              errorRateStatus === 'warning' && 'bg-warning/20',
              errorRateStatus === 'critical' && 'bg-destructive/20'
            )}
          />
        </div>

        {/* Requests Per Minute */}
        <div className={cn('border-border bg-accent/50 border p-4', mode.radius)}>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">Requests/min</span>
            <span className="text-foreground text-xl font-bold">
              {requestsPerMinute.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
