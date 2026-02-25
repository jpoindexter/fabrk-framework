'use client'

import { useState } from 'react'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export interface JsonViewerProps {
  data: unknown
  defaultExpandDepth?: number
  className?: string
}

interface JsonNodeProps {
  data: unknown
  name?: string
  depth: number
  defaultExpandDepth: number
}

function JsonNode({ data, name, depth, defaultExpandDepth }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < defaultExpandDepth)

  if (data === null) {
    return (
      <div className="flex items-center gap-[0.5ch]" style={{ paddingLeft: `${depth * 2}ch` }}>
        {name && <span className="text-primary font-semibold">{name}:</span>}
        <span className="text-muted-foreground italic">null</span>
      </div>
    )
  }

  if (typeof data === 'boolean') {
    return (
      <div className="flex items-center gap-[0.5ch]" style={{ paddingLeft: `${depth * 2}ch` }}>
        {name && <span className="text-primary font-semibold">{name}:</span>}
        <span className="text-warning">{String(data)}</span>
      </div>
    )
  }

  if (typeof data === 'number') {
    return (
      <div className="flex items-center gap-[0.5ch]" style={{ paddingLeft: `${depth * 2}ch` }}>
        {name && <span className="text-primary font-semibold">{name}:</span>}
        <span className="text-info">{data}</span>
      </div>
    )
  }

  if (typeof data === 'string') {
    return (
      <div className="flex items-center gap-[0.5ch]" style={{ paddingLeft: `${depth * 2}ch` }}>
        {name && <span className="text-primary font-semibold">{name}:</span>}
        <span className="text-success">&quot;{data}&quot;</span>
      </div>
    )
  }

  if (Array.isArray(data)) {
    return (
      <div>
        <div
          className="flex cursor-pointer items-center gap-[0.5ch]"
          style={{ paddingLeft: `${depth * 2}ch` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-muted-foreground">{expanded ? '\u25BC' : '\u25B6'}</span>
          {name && <span className="text-primary font-semibold">{name}:</span>}
          <span className="text-muted-foreground">[{data.length}]</span>
        </div>
        {expanded &&
          data.map((item, i) => (
            <JsonNode
              key={i}
              data={item}
              name={String(i)}
              depth={depth + 1}
              defaultExpandDepth={defaultExpandDepth}
            />
          ))}
      </div>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    return (
      <div>
        <div
          className="flex cursor-pointer items-center gap-[0.5ch]"
          style={{ paddingLeft: `${depth * 2}ch` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-muted-foreground">{expanded ? '\u25BC' : '\u25B6'}</span>
          {name && <span className="text-primary font-semibold">{name}:</span>}
          <span className="text-muted-foreground">{`{${entries.length}}`}</span>
        </div>
        {expanded &&
          entries.map(([key, val]) => (
            <JsonNode
              key={key}
              data={val}
              name={key}
              depth={depth + 1}
              defaultExpandDepth={defaultExpandDepth}
            />
          ))}
      </div>
    )
  }

  return (
    <div style={{ paddingLeft: `${depth * 2}ch` }}>
      {name && <span className="text-primary font-semibold">{name}:</span>}
      <span className="text-muted-foreground">{String(data)}</span>
    </div>
  )
}

export function JsonViewer({
  data,
  defaultExpandDepth = 1,
  className,
}: JsonViewerProps) {
  return (
    <div
      className={cn(
        'overflow-auto border border-border bg-background p-[var(--grid-4)] font-mono text-xs',
        mode.radius,
        className
      )}
    >
      <JsonNode data={data} depth={0} defaultExpandDepth={defaultExpandDepth} />
    </div>
  )
}
