'use client'

import { useThemeContext } from '@fabrk/design-system'
import type { ColorThemeName } from '@fabrk/design-system'
import { Button } from '@fabrk/components'

const THEMES: { label: string; value: ColorThemeName }[] = [
  { label: 'GREEN', value: 'green' },
  { label: 'AMBER', value: 'amber' },
  { label: 'BLUE', value: 'blue' },
  { label: 'RED', value: 'red' },
  { label: 'CYBERPUNK', value: 'cyberpunk' },
  { label: 'PHOSPHOR', value: 'phosphor' },
]

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useThemeContext()

  return (
    <div className="flex flex-wrap gap-1">
      {THEMES.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={colorTheme === t.value ? 'default' : 'ghost'}
          onClick={() => setColorTheme(t.value)}
          className="text-xs px-2 h-7"
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
