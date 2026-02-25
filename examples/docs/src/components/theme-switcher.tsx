'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { useThemeContext } from '@fabrk/design-system'
import type { ColorThemeName } from '@fabrk/design-system'
import { useState } from 'react'

const THEMES: { label: string; value: ColorThemeName }[] = [
  { label: 'GREEN', value: 'green' },
  { label: 'AMBER', value: 'amber' },
  { label: 'BLUE', value: 'blue' },
  { label: 'RED', value: 'red' },
  { label: 'PURPLE', value: 'purple' },
  { label: 'CYBERPUNK', value: 'cyberpunk' },
  { label: 'PHOSPHOR', value: 'phosphor' },
  { label: 'HOLO', value: 'holographic' },
  { label: 'NAVIGATOR', value: 'navigator' },
  { label: 'BLUEPRINT', value: 'blueprint' },
  { label: 'INFRARED', value: 'infrared' },
  { label: 'GAMEBOY', value: 'gameboy' },
  { label: 'C64', value: 'c64' },
  { label: 'GB POCKET', value: 'gbpocket' },
  { label: 'VIC-20', value: 'vic20' },
  { label: 'ATARI', value: 'atari' },
  { label: 'SPECTRUM', value: 'spectrum' },
  { label: 'B&W', value: 'bw' },
]

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useThemeContext()
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
          mode.font,
          open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Toggle theme selector"
      >
        <span className="flex-1 text-left">[THEME: {colorTheme.toUpperCase()}]</span>
        <svg
          className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-1 max-h-48 overflow-y-auto border border-border bg-card">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setColorTheme(t.value)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs transition-colors border-b border-border last:border-b-0',
                mode.font,
                colorTheme === t.value
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              {colorTheme === t.value ? '> ' : '  '}{t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
