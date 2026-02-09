'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { useEffect, useRef, useState } from 'react'

interface TocHeading {
  id: string
  text: string
  level: number
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<TocHeading[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Scan headings on mount and when route changes
  useEffect(() => {
    function scanHeadings() {
      const main = document.querySelector('main')
      if (!main) return

      const elements = main.querySelectorAll('h2, h3')
      const found: TocHeading[] = []

      elements.forEach((el) => {
        // Use existing id or generate one from text content
        let id = el.id
        if (!id) {
          id = (el.textContent || '')
            .toLowerCase()
            .replace(/[\[\]]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
          el.id = id
        }

        found.push({
          id,
          text: (el.textContent || '').replace(/[\[\]]/g, '').trim(),
          level: el.tagName === 'H2' ? 2 : 3,
        })
      })

      setHeadings(found)
    }

    // Small delay to let page render
    const timer = setTimeout(scanHeadings, 100)

    // Also re-scan on navigation (URL change detection)
    const observer = new MutationObserver(() => {
      setTimeout(scanHeadings, 100)
    })
    const main = document.querySelector('main')
    if (main) {
      observer.observe(main, { childList: true, subtree: true })
    }

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  // IntersectionObserver for active section highlighting
  useEffect(() => {
    if (headings.length === 0) return

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const visibleSections = new Map<string, boolean>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibleSections.set(entry.target.id, entry.isIntersecting)
        })

        // Find the first visible heading
        for (const heading of headings) {
          if (visibleSections.get(heading.id)) {
            setActiveId(heading.id)
            return
          }
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    )

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id)
      if (el) {
        observerRef.current!.observe(el)
      }
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [headings])

  if (headings.length === 0) return null

  return (
    <aside className="hidden xl:block w-56 shrink-0 sticky top-0 max-h-screen overflow-y-auto py-12 pr-4">
      <div className={cn('text-xs font-bold text-muted-foreground uppercase mb-3', mode.font)}>
        [ON THIS PAGE]
      </div>
      <nav className="space-y-0.5">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            onClick={(e) => {
              e.preventDefault()
              const el = document.getElementById(heading.id)
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setActiveId(heading.id)
              }
            }}
            className={cn(
              'block py-1 text-xs transition-colors leading-snug',
              heading.level === 3 ? 'pl-4' : 'pl-0',
              activeId === heading.id
                ? 'text-primary border-l-2 border-primary pl-2'
                : 'text-muted-foreground hover:text-foreground',
              activeId === heading.id && heading.level === 3 && 'pl-6'
            )}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </aside>
  )
}
