'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { useThemeContext } from '@fabrk/themes'
import type { ColorThemeName } from '@fabrk/themes'
import { useState } from 'react'

const THEME_GROUPS = [
  {
    label: 'CRT',
    themes: [
      { label: 'GREEN', value: 'green' as ColorThemeName },
      { label: 'AMBER', value: 'amber' as ColorThemeName },
      { label: 'BLUE', value: 'blue' as ColorThemeName },
      { label: 'RED', value: 'red' as ColorThemeName },
      { label: 'PURPLE', value: 'purple' as ColorThemeName },
    ],
  },
  {
    label: 'RETRO',
    themes: [
      { label: 'GAMEBOY', value: 'gameboy' as ColorThemeName },
      { label: 'C64', value: 'c64' as ColorThemeName },
      { label: 'GB POCKET', value: 'gbpocket' as ColorThemeName },
      { label: 'VIC-20', value: 'vic20' as ColorThemeName },
      { label: 'ATARI', value: 'atari' as ColorThemeName },
      { label: 'SPECTRUM', value: 'spectrum' as ColorThemeName },
    ],
  },
  {
    label: 'FUTURE',
    themes: [
      { label: 'CYBERPUNK', value: 'cyberpunk' as ColorThemeName },
      { label: 'PHOSPHOR', value: 'phosphor' as ColorThemeName },
      { label: 'HOLO', value: 'holographic' as ColorThemeName },
      { label: 'NAVIGATOR', value: 'navigator' as ColorThemeName },
      { label: 'BLUEPRINT', value: 'blueprint' as ColorThemeName },
      { label: 'INFRARED', value: 'infrared' as ColorThemeName },
    ],
  },
  {
    label: 'LIGHT',
    themes: [
      { label: 'B&W', value: 'bw' as ColorThemeName },
    ],
  },
]

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useThemeContext()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
          mode.font,
          'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label="Toggle theme selector"
      >
        <span className="flex-1 text-left">[THEME: {colorTheme.toUpperCase()}]</span>
        <svg
          className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 px-2">
          {THEME_GROUPS.map((group) => (
            <div key={group.label}>
              <div className={cn('text-xs text-muted-foreground px-1 mb-1', mode.font)}>
                [{group.label}]
              </div>
              <div className="flex flex-wrap gap-1">
                {group.themes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setColorTheme(t.value)}
                    className={cn(
                      'px-2 py-1 text-xs border transition-colors',
                      mode.font,
                      mode.radius,
                      colorTheme === t.value
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
