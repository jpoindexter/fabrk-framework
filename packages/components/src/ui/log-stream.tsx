'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '../lib/utils'
import { mode } from '@fabrk/design-system'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success'

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  timestamp: Date
  source?: string
}

export interface LogStreamProps {
  entries: LogEntry[]
  maxHeight?: string
  showTimestamps?: boolean
  className?: string
}

const levelPrefixes: Record<LogLevel, string> = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  debug: '[DEBUG]',
  success: '[OK]',
}

const levelColors: Record<LogLevel, string> = {
  info: 'text-foreground',
  warn: 'text-warning',
  error: 'text-destructive',
  debug: 'text-muted-foreground',
  success: 'text-success',
}

export function createLogEntry(
  level: LogLevel,
  message: string,
  source?: string
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    timestamp: new Date(),
    source,
  }
}

export function LogStream({
  entries,
  maxHeight = '24rem',
  showTimestamps = true,
  className,
}: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20
    setAutoScroll(isAtBottom)
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'overflow-auto border border-border bg-background p-[var(--grid-4)] font-mono text-xs',
        mode.radius,
        className
      )}
      style={{ maxHeight }}
      role="log"
      aria-live="polite"
    >
      {entries.map((entry) => (
        <div key={entry.id} className="leading-relaxed">
          {showTimestamps && (
            <span className="text-muted-foreground">
              {entry.timestamp.toLocaleTimeString()}{' '}
            </span>
          )}
          <span className={cn('font-bold', levelColors[entry.level])}>
            {levelPrefixes[entry.level]}
          </span>
          {entry.source && (
            <span className="text-primary"> [{entry.source}]</span>
          )}
          <span className="text-foreground"> {entry.message}</span>
        </div>
      ))}
    </div>
  )
}
