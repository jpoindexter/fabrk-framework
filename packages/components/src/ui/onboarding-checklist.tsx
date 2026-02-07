'use client'

import { useState, useMemo } from 'react'
import { cn } from '../lib/utils'
import { mode } from '@fabrk/design-system'

export interface OnboardingTask {
  id: string
  title: string
  description?: string
  completed: boolean
  link?: {
    text: string
    href: string
  }
}

export interface OnboardingChecklistProps {
  tasks: OnboardingTask[]
  onTaskToggle?: (taskId: string, completed: boolean) => void | Promise<void>
  onDismiss?: () => void
  className?: string
}

export function OnboardingChecklist({
  tasks,
  onTaskToggle,
  onDismiss,
  className,
}: OnboardingChecklistProps) {
  const [minimized, setMinimized] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  )
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  if (minimized) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-[var(--grid-4)] border border-border p-[var(--grid-4)]',
          mode.radius,
          mode.font,
          className
        )}
      >
        <div className="flex items-center gap-[var(--grid-4)]">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Expand checklist"
          >
            [+]
          </button>
          <div>
            <p className="text-xs font-medium">[ ONBOARDING PROGRESS ]</p>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{tasks.length} tasks completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[var(--grid-2)]">
          <div className="relative h-[var(--grid-2)] w-[6ch] bg-muted">
            <div
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              x
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border border-border',
        mode.radius,
        mode.font,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-[var(--grid-4)]">
        <div>
          <p className="text-xs font-medium">[ GETTING STARTED ]</p>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{tasks.length} completed
          </p>
        </div>
        <div className="flex items-center gap-[var(--grid-2)]">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            [-]
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[var(--grid-1)] w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tasks */}
      <div className="divide-y divide-border">
        {tasks.map((task, index) => {
          const isExpanded = expandedTask === task.id

          return (
            <div key={task.id} className="p-[var(--grid-4)]">
              <div className="flex items-start gap-[var(--grid-4)]">
                <input
                  type="checkbox"
                  id={`task-${task.id}`}
                  checked={task.completed}
                  onChange={(e) => onTaskToggle?.(task.id, e.target.checked)}
                  className="mt-0.5 h-3 w-3"
                />
                <div className="flex-1 space-y-[var(--grid-1)]">
                  <label
                    htmlFor={`task-${task.id}`}
                    className={cn(
                      'cursor-pointer text-xs',
                      task.completed && 'text-muted-foreground line-through opacity-60'
                    )}
                  >
                    [{String(index + 1).padStart(2, '0')}]: {task.title}
                  </label>

                  {task.description && (
                    <div className="space-y-[var(--grid-2)]">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTask(isExpanded ? null : task.id)
                        }
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? '[HIDE DETAILS]' : '[SHOW DETAILS]'}
                      </button>

                      {isExpanded && (
                        <div
                          className={cn(
                            'border border-border bg-muted p-[var(--grid-4)]',
                            mode.radius
                          )}
                        >
                          <p className="text-xs text-muted-foreground">
                            {task.description}
                          </p>
                          {task.link && (
                            <a
                              href={task.link.href}
                              className="mt-[var(--grid-2)] inline-block text-xs text-primary hover:underline"
                            >
                              {task.link.text}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Completion message */}
      {completedCount === tasks.length && tasks.length > 0 && (
        <div className="border-t border-border p-[var(--grid-4)] text-center text-xs text-success">
          ALL TASKS COMPLETE
        </div>
      )}
    </div>
  )
}
