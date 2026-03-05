import { Button, Card } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to FABRK
          </h1>
          <p className="text-muted-foreground text-lg">
            Start building your application with 105+ components
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Components</h3>
            <p className="text-sm text-muted-foreground mb-4">
              105+ production-ready UI components with terminal aesthetic
            </p>
            <Button className="w-full">
              Explore Components
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-2">Design System</h3>
            <p className="text-sm text-muted-foreground mb-4">
              18 terminal themes with design tokens and utilities
            </p>
            <Button variant="outline" className="w-full">
              View Themes
            </Button>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Edit{' '}
            <code className={cn('bg-muted px-2 py-1 text-xs', mode.radius, mode.font)}>
              app/page.tsx
            </code>{' '}
            to get started
          </p>
        </div>
      </div>
    </main>
  )
}
