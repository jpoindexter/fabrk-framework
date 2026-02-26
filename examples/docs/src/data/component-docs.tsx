'use client'

import React, { useState } from 'react'
import type { PropDef } from '@/components/doc-layout'

// ─── Types ──────────────────────────────────────────────────────────────
export interface ComponentExample {
  title: string
  element: React.ReactNode
  source: string
}

export interface A11yInfo {
  keyboard?: { key: string; action: string }[]
  aria?: string[]
}

export interface ComponentDoc {
  slug: string
  name: string
  description: string
  category: string
  examples: ComponentExample[]
  props: PropDef[]
  a11y: A11yInfo
}

// ─── Wrapper Components (for stateful examples) ─────────────────────────

function StarRatingDemo() {
  const [value, setValue] = useState(3)
  return React.createElement('div', null,
    React.createElement('span', { className: 'text-xs text-muted-foreground block mb-2' }, `Rating: ${value}/5`),
    React.createElement(require('@fabrk/components').StarRating, { value, onChange: setValue, max: 5 })
  )
}

function SwitchDemo() {
  const [checked, setChecked] = useState(false)
  return React.createElement('div', { className: 'flex items-center gap-3' },
    React.createElement(require('@fabrk/components').Switch, { checked, onCheckedChange: setChecked }),
    React.createElement('span', { className: 'text-xs text-muted-foreground' }, checked ? '[ENABLED]' : '[DISABLED]')
  )
}

function SegmentedControlDemo() {
  const [value, setValue] = useState('day')
  return React.createElement(require('@fabrk/components').SegmentedControl, {
    options: [
      { value: 'day', label: 'DAY' },
      { value: 'week', label: 'WEEK' },
      { value: 'month', label: 'MONTH' },
    ],
    value,
    onChange: setValue,
  })
}

// ─── Lazy Component Access ──────────────────────────────────────────────
// We use require() to avoid circular deps and keep this registry declarative.
// Returns a no-op during SSR prerender to prevent chart/browser crashes.
function C(name: string) {
  if (typeof window === 'undefined') return () => null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@fabrk/components')
  return mod[name]
}

// ─── Registry ───────────────────────────────────────────────────────────

export const COMPONENT_DOCS: Record<string, ComponentDoc> = {
  // ── UI ────────────────────────────────────────────────────────────────
  button: {
    slug: 'button',
    name: 'Button',
    description: 'Primary action button with terminal styling, variants, and loading states.',
    category: 'UI',
    examples: [
      {
        title: 'Variants',
        get element() {
          const Button = C('Button')
          return React.createElement('div', { className: 'flex flex-wrap gap-2' },
            React.createElement(Button, { variant: 'default' }, '> SUBMIT'),
            React.createElement(Button, { variant: 'destructive' }, '> DELETE'),
            React.createElement(Button, { variant: 'outline' }, '> OUTLINE'),
            React.createElement(Button, { variant: 'secondary' }, '> SECONDARY'),
            React.createElement(Button, { variant: 'ghost' }, '> GHOST'),
          )
        },
        source: `<Button variant="default">> SUBMIT</Button>
<Button variant="destructive">> DELETE</Button>
<Button variant="outline">> OUTLINE</Button>
<Button variant="secondary">> SECONDARY</Button>
<Button variant="ghost">> GHOST</Button>`,
      },
      {
        title: 'Loading State',
        get element() {
          const Button = C('Button')
          return React.createElement(Button, { loading: true, loadingText: '> SAVING...' }, '> SAVE')
        },
        source: `<Button loading loadingText="> SAVING..."> SAVE</Button>`,
      },
    ],
    props: [
      { name: 'variant', type: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"', default: '"default"', description: 'Visual style variant' },
      { name: 'size', type: '"default" | "sm" | "lg" | "icon"', default: '"default"', description: 'Button size' },
      { name: 'loading', type: 'boolean', default: 'false', description: 'Show loading spinner and disable' },
      { name: 'loadingText', type: 'string', description: 'Accessible label during loading' },
      { name: 'asChild', type: 'boolean', default: 'false', description: 'Render as child element (Slot)' },
    ],
    a11y: {
      keyboard: [
        { key: 'Enter / Space', action: 'Activate the button' },
        { key: 'Tab', action: 'Move focus to the button' },
      ],
      aria: ['Uses native <button> element', 'aria-busy="true" when loading', 'aria-label set to loadingText when loading'],
    },
  },

  input: {
    slug: 'input',
    name: 'Input',
    description: 'Text input with validation states, loading indicator, and design token styling.',
    category: 'UI',
    examples: [
      {
        title: 'States',
        get element() {
          const Input = C('Input')
          return React.createElement('div', { className: 'space-y-3' },
            React.createElement(Input, { placeholder: 'Default input' }),
            React.createElement(Input, { placeholder: 'Error state', error: true }),
            React.createElement(Input, { placeholder: 'Loading...', loading: true }),
            React.createElement(Input, { placeholder: 'Disabled', disabled: true }),
          )
        },
        source: `<Input placeholder="Default input" />
<Input placeholder="Error state" error />
<Input placeholder="Loading..." loading />
<Input placeholder="Disabled" disabled />`,
      },
    ],
    props: [
      { name: 'error', type: 'boolean', default: 'false', description: 'Show error border styling' },
      { name: 'success', type: 'boolean', default: 'false', description: 'Show success border styling' },
      { name: 'loading', type: 'boolean', default: 'false', description: 'Show loading spinner and disable' },
      { name: 'loadingText', type: 'string', description: 'Accessible loading label' },
    ],
    a11y: {
      keyboard: [{ key: 'Tab', action: 'Focus the input' }],
      aria: ['Uses native <input> element', 'aria-invalid="true" when error prop is set'],
    },
  },

  select: {
    slug: 'select',
    name: 'Select',
    description: 'Dropdown select built on Radix UI with keyboard navigation and design tokens.',
    category: 'UI',
    examples: [
      {
        title: 'Basic Usage',
        get element() {
          const { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } = require('@fabrk/components')
          return React.createElement(Select, null,
            React.createElement(SelectTrigger, { className: 'w-[200px]' },
              React.createElement(SelectValue, { placeholder: 'Select option' })
            ),
            React.createElement(SelectContent, null,
              React.createElement(SelectItem, { value: 'react' }, 'React'),
              React.createElement(SelectItem, { value: 'vue' }, 'Vue'),
              React.createElement(SelectItem, { value: 'svelte' }, 'Svelte'),
            )
          )
        },
        source: `<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="react">React</SelectItem>
    <SelectItem value="vue">Vue</SelectItem>
    <SelectItem value="svelte">Svelte</SelectItem>
  </SelectContent>
</Select>`,
      },
    ],
    props: [
      { name: 'value', type: 'string', description: 'Controlled selected value' },
      { name: 'onValueChange', type: '(value: string) => void', description: 'Callback when selection changes' },
      { name: 'placeholder', type: 'string', description: 'Placeholder text' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the select' },
    ],
    a11y: {
      keyboard: [
        { key: 'Enter / Space', action: 'Open/close dropdown' },
        { key: 'Arrow Down/Up', action: 'Navigate options' },
        { key: 'Escape', action: 'Close dropdown' },
      ],
      aria: ['role="combobox" on trigger', 'role="listbox" on content', 'aria-expanded on trigger'],
    },
  },

  dialog: {
    slug: 'dialog',
    name: 'Dialog',
    description: 'Modal dialog built on Radix UI for confirmations, forms, and focused interactions.',
    category: 'UI',
    examples: [
      {
        title: 'Basic Dialog',
        get element() {
          const { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } = require('@fabrk/components')
          const Button = C('Button')
          return React.createElement(Dialog, null,
            React.createElement(DialogTrigger, { asChild: true },
              React.createElement(Button, { variant: 'outline' }, '> OPEN DIALOG')
            ),
            React.createElement(DialogContent, null,
              React.createElement(DialogHeader, null,
                React.createElement(DialogTitle, null, 'CONFIRM ACTION'),
                React.createElement(DialogDescription, null, 'Are you sure you want to proceed?'),
              ),
            )
          )
        },
        source: `<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">> OPEN DIALOG</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>CONFIRM ACTION</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>`,
      },
    ],
    props: [
      { name: 'open', type: 'boolean', description: 'Controlled open state' },
      { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Open state change callback' },
    ],
    a11y: {
      keyboard: [
        { key: 'Escape', action: 'Close the dialog' },
        { key: 'Tab', action: 'Cycle focus within dialog' },
      ],
      aria: ['role="dialog"', 'aria-modal="true"', 'aria-labelledby pointing to DialogTitle', 'Focus trapped inside dialog'],
    },
  },

  tabs: {
    slug: 'tabs',
    name: 'Tabs',
    description: 'Tab navigation built on Radix UI with underline-style tab bar and keyboard navigation.',
    category: 'UI',
    examples: [
      {
        title: 'Basic Tabs',
        get element() {
          const { Tabs, TabsList, TabsTrigger, TabsContent } = require('@fabrk/components')
          return React.createElement(Tabs, { defaultValue: 'overview' },
            React.createElement(TabsList, null,
              React.createElement(TabsTrigger, { value: 'overview' }, 'OVERVIEW'),
              React.createElement(TabsTrigger, { value: 'settings' }, 'SETTINGS'),
            ),
            React.createElement(TabsContent, { value: 'overview' },
              React.createElement('p', { className: 'text-sm text-muted-foreground p-4' }, 'Overview content')
            ),
            React.createElement(TabsContent, { value: 'settings' },
              React.createElement('p', { className: 'text-sm text-muted-foreground p-4' }, 'Settings content')
            ),
          )
        },
        source: `<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">OVERVIEW</TabsTrigger>
    <TabsTrigger value="settings">SETTINGS</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Overview content</TabsContent>
  <TabsContent value="settings">Settings content</TabsContent>
</Tabs>`,
      },
    ],
    props: [
      { name: 'defaultValue', type: 'string', description: 'Initial active tab value' },
      { name: 'value', type: 'string', description: 'Controlled active tab' },
      { name: 'onValueChange', type: '(value: string) => void', description: 'Tab change callback' },
    ],
    a11y: {
      keyboard: [
        { key: 'Arrow Left/Right', action: 'Switch between tabs' },
        { key: 'Home / End', action: 'First/last tab' },
      ],
      aria: ['role="tablist" on TabsList', 'role="tab" on each trigger', 'role="tabpanel" on content', 'aria-selected on active tab'],
    },
  },

  accordion: {
    slug: 'accordion',
    name: 'Accordion',
    description: 'Collapsible content sections built on Radix UI with animated expand/collapse.',
    category: 'UI',
    examples: [
      {
        title: 'Single Collapsible',
        get element() {
          const { Accordion, AccordionItem, AccordionTrigger, AccordionContent } = require('@fabrk/components')
          return React.createElement(Accordion, { type: 'single', collapsible: true, className: 'w-full' },
            React.createElement(AccordionItem, { value: 'q1' },
              React.createElement(AccordionTrigger, null, 'WHAT IS FABRK?'),
              React.createElement(AccordionContent, null, 'A UI framework designed for AI coding agents.'),
            ),
            React.createElement(AccordionItem, { value: 'q2' },
              React.createElement(AccordionTrigger, null, 'HOW DO I INSTALL?'),
              React.createElement(AccordionContent, null, 'Run: pnpm add @fabrk/components'),
            ),
          )
        },
        source: `<Accordion type="single" collapsible>
  <AccordionItem value="q1">
    <AccordionTrigger>WHAT IS FABRK?</AccordionTrigger>
    <AccordionContent>A UI framework for AI coding agents.</AccordionContent>
  </AccordionItem>
  <AccordionItem value="q2">
    <AccordionTrigger>HOW DO I INSTALL?</AccordionTrigger>
    <AccordionContent>Run: pnpm add @fabrk/components</AccordionContent>
  </AccordionItem>
</Accordion>`,
      },
    ],
    props: [
      { name: 'type', type: '"single" | "multiple"', description: 'Allow one or multiple open sections' },
      { name: 'collapsible', type: 'boolean', default: 'false', description: 'Allow closing all sections (single mode)' },
      { name: 'defaultValue', type: 'string | string[]', description: 'Initially open sections' },
    ],
    a11y: {
      keyboard: [
        { key: 'Enter / Space', action: 'Toggle section' },
        { key: 'Arrow Down/Up', action: 'Navigate triggers' },
      ],
      aria: ['aria-expanded on triggers', 'aria-controls linking trigger to content'],
    },
  },

  switch: {
    slug: 'switch',
    name: 'Switch',
    description: 'Toggle switch for binary on/off settings. Always pill-shaped regardless of theme radius.',
    category: 'UI',
    examples: [
      {
        title: 'Interactive',
        element: React.createElement(SwitchDemo),
        source: `const [checked, setChecked] = useState(false)

<Switch checked={checked} onCheckedChange={setChecked} />`,
      },
    ],
    props: [
      { name: 'checked', type: 'boolean', description: 'Controlled checked state' },
      { name: 'onCheckedChange', type: '(checked: boolean) => void', description: 'Toggle callback' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the switch' },
    ],
    a11y: {
      keyboard: [{ key: 'Space', action: 'Toggle the switch' }],
      aria: ['role="switch"', 'aria-checked reflects state'],
    },
  },

  checkbox: {
    slug: 'checkbox',
    name: 'Checkbox',
    description: 'Checkbox input built on Radix UI with theme-aware accent color when checked.',
    category: 'UI',
    examples: [
      {
        title: 'Basic',
        get element() {
          const Checkbox = C('Checkbox')
          return React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement(Checkbox, { id: 'terms' }),
            React.createElement('label', { htmlFor: 'terms', className: 'text-sm text-foreground' }, 'Accept terms and conditions'),
          )
        },
        source: `<Checkbox id="terms" />
<label htmlFor="terms">Accept terms and conditions</label>`,
      },
    ],
    props: [
      { name: 'checked', type: 'boolean | "indeterminate"', description: 'Controlled checked state' },
      { name: 'onCheckedChange', type: '(checked: boolean) => void', description: 'Check change callback' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the checkbox' },
    ],
    a11y: {
      keyboard: [{ key: 'Space', action: 'Toggle the checkbox' }],
      aria: ['role="checkbox"', 'aria-checked reflects state'],
    },
  },

  badge: {
    slug: 'badge',
    name: 'Badge',
    description: 'Status badge with variants for labeling, categorization, and status indicators.',
    category: 'UI',
    examples: [
      {
        title: 'Variants',
        get element() {
          const Badge = C('Badge')
          return React.createElement('div', { className: 'flex flex-wrap gap-2' },
            React.createElement(Badge, { variant: 'default' }, '[ACTIVE]'),
            React.createElement(Badge, { variant: 'secondary' }, '[PENDING]'),
            React.createElement(Badge, { variant: 'destructive' }, '[ERROR]'),
            React.createElement(Badge, { variant: 'outline' }, '[DRAFT]'),
          )
        },
        source: `<Badge variant="default">[ACTIVE]</Badge>
<Badge variant="secondary">[PENDING]</Badge>
<Badge variant="destructive">[ERROR]</Badge>
<Badge variant="outline">[DRAFT]</Badge>`,
      },
    ],
    props: [
      { name: 'variant', type: '"default" | "secondary" | "destructive" | "outline"', default: '"default"', description: 'Visual style' },
      { name: 'size', type: '"sm" | "md"', default: '"sm"', description: 'Badge size' },
    ],
    a11y: {
      aria: ['Rendered as <span> — purely presentational', 'Use aria-label for screen reader context if needed'],
    },
  },

  card: {
    slug: 'card',
    name: 'Card',
    description: 'Content container with border, tone variants, and compositional sub-components.',
    category: 'UI',
    examples: [
      {
        title: 'Tones',
        get element() {
          const { Card, CardHeader, CardContent } = require('@fabrk/components')
          return React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
            React.createElement(Card, { tone: 'neutral' },
              React.createElement(CardHeader, { title: 'NEUTRAL' }),
              React.createElement(CardContent, null, 'Default card')
            ),
            React.createElement(Card, { tone: 'primary' },
              React.createElement(CardHeader, { title: 'PRIMARY' }),
              React.createElement(CardContent, null, 'Highlighted card')
            ),
          )
        },
        source: `<Card tone="neutral">
  <CardHeader title="NEUTRAL" />
  <CardContent>Default card</CardContent>
</Card>
<Card tone="primary">
  <CardHeader title="PRIMARY" />
  <CardContent>Highlighted card</CardContent>
</Card>`,
      },
    ],
    props: [
      { name: 'tone', type: '"neutral" | "primary" | "success" | "warning" | "danger"', default: '"neutral"', description: 'Border color tone' },
      { name: 'size', type: '"auto" | "full"', default: '"full"', description: '"auto" = natural height, "full" = h-full for grids' },
      { name: 'interactive', type: 'boolean', default: 'false', description: 'Enable hover/focus states' },
    ],
    a11y: {
      aria: ['Uses <div> by default, can use as="article" or as="section"'],
    },
  },

  // ── Data Display ──────────────────────────────────────────────────────
  'data-table': {
    slug: 'data-table',
    name: 'DataTable',
    description: 'Sortable, filterable data table with pagination. Accepts column definitions and row data.',
    category: 'Data Display',
    examples: [
      {
        title: 'Basic Table',
        get element() {
          return React.createElement('div', {
            className: 'text-xs text-muted-foreground p-4 border border-border text-center'
          }, 'DataTable requires TanStack Table column definitions. See code example.')
        },
        source: `import { DataTable } from '@fabrk/components'

const columns = [
  { key: 'name', label: 'NAME', sortable: true },
  { key: 'email', label: 'EMAIL' },
  { key: 'role', label: 'ROLE' },
]

<DataTable
  columns={columns}
  data={users}
  onRowClick={(row) => navigate(\`/users/\${row.id}\`)}
/>`,
      },
    ],
    props: [
      { name: 'columns', type: 'ColumnDef[]', description: 'TanStack Table column definitions' },
      { name: 'data', type: 'T[]', description: 'Row data array' },
      { name: 'searchKey', type: 'string', description: 'Column key for search filtering' },
      { name: 'onRowClick', type: '(row: T) => void', description: 'Row click callback' },
      { name: 'pageSize', type: 'number', default: '10', description: 'Rows per page' },
    ],
    a11y: {
      keyboard: [
        { key: 'Tab', action: 'Navigate between interactive cells' },
        { key: 'Enter', action: 'Activate row click' },
      ],
      aria: ['Uses semantic <table>, <thead>, <tbody> elements', 'aria-sort on sortable column headers'],
    },
  },

  progress: {
    slug: 'progress',
    name: 'Progress',
    description: 'Terminal-style ASCII progress bar with 6 visual variants.',
    category: 'Data Display',
    examples: [
      {
        title: 'Variants',
        get element() {
          const Progress = C('Progress')
          return React.createElement('div', { className: 'space-y-3' },
            React.createElement(Progress, { value: 66, variant: 'block', showPercentage: true }),
            React.createElement(Progress, { value: 45, variant: 'hash', showPercentage: true }),
            React.createElement(Progress, { value: 80, variant: 'arrow', label: 'Downloading...' }),
          )
        },
        source: `<Progress value={66} variant="block" showPercentage />
<Progress value={45} variant="hash" showPercentage />
<Progress value={80} variant="arrow" label="Downloading..." />`,
      },
    ],
    props: [
      { name: 'value', type: 'number', default: '0', description: 'Progress value (0-100)' },
      { name: 'variant', type: '"block" | "hash" | "pipe" | "dots" | "arrow" | "braille"', default: '"block"', description: 'ASCII character style' },
      { name: 'showPercentage', type: 'boolean', default: 'false', description: 'Show percentage after bar' },
      { name: 'label', type: 'string', description: 'Custom label text' },
      { name: 'barWidth', type: 'number', default: '20', description: 'Bar width in characters' },
    ],
    a11y: {
      aria: ['role="progressbar"', 'aria-valuenow, aria-valuemin, aria-valuemax set'],
    },
  },

  'star-rating': {
    slug: 'star-rating',
    name: 'StarRating',
    description: 'Interactive or read-only star rating with hover preview and keyboard navigation.',
    category: 'Data Display',
    examples: [
      {
        title: 'Interactive',
        element: React.createElement(StarRatingDemo),
        source: `const [value, setValue] = useState(3)

<StarRating value={value} onChange={setValue} max={5} />`,
      },
      {
        title: 'Read-only',
        get element() {
          const StarRating = C('StarRating')
          return React.createElement(StarRating, { value: 4, readonly: true, size: 'lg' })
        },
        source: `<StarRating value={4} readonly size="lg" />`,
      },
    ],
    props: [
      { name: 'value', type: 'number', description: 'Current rating value' },
      { name: 'max', type: 'number', default: '5', description: 'Maximum stars' },
      { name: 'onChange', type: '(value: number) => void', description: 'Rating change callback' },
      { name: 'readonly', type: 'boolean', default: 'false', description: 'Display-only mode' },
      { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Star size' },
    ],
    a11y: {
      keyboard: [
        { key: 'Arrow Left/Right', action: 'Adjust rating' },
        { key: 'Home / End', action: 'Min/max rating' },
      ],
      aria: ['role="radiogroup"', 'Each star has role="radio" with aria-checked'],
    },
  },

  'empty-state': {
    slug: 'empty-state',
    name: 'EmptyState',
    description: 'Placeholder for empty views with optional icon, description, and CTA button.',
    category: 'Data Display',
    examples: [
      {
        title: 'Basic',
        get element() {
          const EmptyState = C('EmptyState')
          return React.createElement(EmptyState, {
            title: 'NO PROJECTS YET',
            description: 'Create your first project to get started.',
            action: { label: 'Create Project', onClick: () => {} },
          })
        },
        source: `<EmptyState
  title="NO PROJECTS YET"
  description="Create your first project to get started."
  action={{ label: "Create Project", onClick: () => openModal() }}
/>`,
      },
    ],
    props: [
      { name: 'icon', type: 'LucideIcon', description: 'Optional icon component' },
      { name: 'title', type: 'string', description: 'Heading text (renders UPPERCASE)' },
      { name: 'description', type: 'string', description: 'Description text' },
      { name: 'action', type: '{ label: string; onClick: () => void }', description: 'CTA button' },
    ],
    a11y: {
      aria: ['Semantic heading for title', 'Button for CTA action'],
    },
  },

  // ── Charts ────────────────────────────────────────────────────────────
  'bar-chart': {
    slug: 'bar-chart',
    name: 'BarChart',
    description: 'Vertical bar chart powered by Recharts with theme-aware colors.',
    category: 'Charts',
    examples: [
      {
        title: 'Basic',
        get element() {
          const BarChart = C('BarChart')
          return React.createElement(BarChart, {
            data: [
              { label: 'Jan', value: 4200 },
              { label: 'Feb', value: 5100 },
              { label: 'Mar', value: 4800 },
              { label: 'Apr', value: 6300 },
            ],
          })
        },
        source: `<BarChart
  data={[
    { label: 'Jan', value: 4200 },
    { label: 'Feb', value: 5100 },
    { label: 'Mar', value: 4800 },
    { label: 'Apr', value: 6300 },
  ]}
/>`,
      },
    ],
    props: [
      { name: 'data', type: '{ label: string; value: number }[]', description: 'Chart data points' },
      { name: 'height', type: 'number', default: '300', description: 'Chart height in pixels' },
      { name: 'horizontal', type: 'boolean', default: 'false', description: 'Horizontal bars' },
      { name: 'colorByIndex', type: 'boolean', default: 'false', description: 'Different color per bar' },
    ],
    a11y: {
      aria: ['SVG chart with aria-label', 'Data also available in alt text'],
    },
  },

  'line-chart': {
    slug: 'line-chart',
    name: 'LineChart',
    description: 'Line chart with smooth curves, powered by Recharts.',
    category: 'Charts',
    examples: [
      {
        title: 'Basic',
        get element() {
          const LineChart = C('LineChart')
          return React.createElement(LineChart, {
            data: [
              { label: 'Mon', value: 120 },
              { label: 'Tue', value: 180 },
              { label: 'Wed', value: 150 },
              { label: 'Thu', value: 210 },
              { label: 'Fri', value: 190 },
            ],
          })
        },
        source: `<LineChart
  data={[
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 180 },
    { label: 'Wed', value: 150 },
  ]}
/>`,
      },
    ],
    props: [
      { name: 'data', type: '{ label: string; value: number }[]', description: 'Chart data points' },
      { name: 'height', type: 'number', default: '300', description: 'Chart height' },
    ],
    a11y: { aria: ['SVG chart with aria-label'] },
  },

  'donut-chart': {
    slug: 'donut-chart',
    name: 'DonutChart',
    description: 'Donut chart with optional center label for summary stats.',
    category: 'Charts',
    examples: [
      {
        title: 'Basic',
        get element() {
          const DonutChart = C('DonutChart')
          return React.createElement(DonutChart, {
            data: [
              { label: 'Desktop', value: 62 },
              { label: 'Mobile', value: 28 },
              { label: 'Tablet', value: 10 },
            ],
            centerLabel: 'TRAFFIC',
          })
        },
        source: `<DonutChart
  data={[
    { label: 'Desktop', value: 62 },
    { label: 'Mobile', value: 28 },
    { label: 'Tablet', value: 10 },
  ]}
  centerLabel="TRAFFIC"
/>`,
      },
    ],
    props: [
      { name: 'data', type: '{ label: string; value: number }[]', description: 'Chart segments' },
      { name: 'centerLabel', type: 'string', description: 'Label in the center' },
      { name: 'height', type: 'number', default: '300', description: 'Chart height' },
    ],
    a11y: { aria: ['SVG chart with aria-label'] },
  },

  gauge: {
    slug: 'gauge',
    name: 'Gauge',
    description: 'Circular gauge meter for displaying single values against a maximum.',
    category: 'Charts',
    examples: [
      {
        title: 'Basic',
        get element() {
          const Gauge = C('Gauge')
          return React.createElement(Gauge, { value: 73, max: 100, label: 'CPU USAGE' })
        },
        source: `<Gauge value={73} max={100} label="CPU USAGE" />`,
      },
    ],
    props: [
      { name: 'value', type: 'number', description: 'Current value' },
      { name: 'max', type: 'number', default: '100', description: 'Maximum value' },
      { name: 'label', type: 'string', description: 'Label below the gauge' },
      { name: 'segments', type: '{ color: string; end: number }[]', description: 'Color segments for the arc' },
    ],
    a11y: { aria: ['role="meter"', 'aria-valuenow, aria-valuemin, aria-valuemax'] },
  },

  sparkline: {
    slug: 'sparkline',
    name: 'Sparkline',
    description: 'Inline mini chart for embedding in text or table cells.',
    category: 'Charts',
    examples: [
      {
        title: 'Basic',
        get element() {
          const Sparkline = C('Sparkline')
          return React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('span', { className: 'text-sm text-foreground' }, 'Revenue:'),
            React.createElement(Sparkline, { data: [10, 20, 15, 25, 18, 30, 22] }),
          )
        },
        source: `<Sparkline data={[10, 20, 15, 25, 18, 30, 22]} />`,
      },
    ],
    props: [
      { name: 'data', type: 'number[]', description: 'Data points' },
      { name: 'width', type: 'number', default: '100', description: 'Chart width' },
      { name: 'height', type: 'number', default: '30', description: 'Chart height' },
    ],
    a11y: { aria: ['SVG with aria-hidden (decorative)'] },
  },

  // ── Interactive ───────────────────────────────────────────────────────
  'segmented-control': {
    slug: 'segmented-control',
    name: 'SegmentedControl',
    description: 'Inline radio group rendered as toggle buttons. Supports generic types for type-safe selection.',
    category: 'Interactive',
    examples: [
      {
        title: 'Interactive',
        element: React.createElement(SegmentedControlDemo),
        source: `const [period, setPeriod] = useState('day')

<SegmentedControl
  options={[
    { value: 'day', label: 'DAY' },
    { value: 'week', label: 'WEEK' },
    { value: 'month', label: 'MONTH' },
  ]}
  value={period}
  onChange={setPeriod}
/>`,
      },
    ],
    props: [
      { name: 'options', type: '{ value: T; label: string; disabled?: boolean }[]', description: 'Segment options' },
      { name: 'value', type: 'T', description: 'Selected value' },
      { name: 'onChange', type: '(value: T) => void', description: 'Selection callback' },
      { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Control size' },
    ],
    a11y: {
      keyboard: [{ key: 'Arrow Left/Right', action: 'Switch segment' }],
      aria: ['role="radiogroup"', 'Each segment has role="radio"'],
    },
  },

  'nps-survey': {
    slug: 'nps-survey',
    name: 'NPSSurvey',
    description: 'Net Promoter Score survey widget with 0-10 scale and optional feedback text.',
    category: 'Interactive',
    examples: [
      {
        title: 'Basic',
        get element() {
          const NPSSurvey = C('NPSSurvey')
          return React.createElement(NPSSurvey, {
            onSubmit: () => {},
            onDismiss: () => {},
          })
        },
        source: `<NPSSurvey
  onSubmit={(score, feedback) => saveNPS(score, feedback)}
  onDismiss={() => hideWidget()}
/>`,
      },
    ],
    props: [
      { name: 'onSubmit', type: '(score: number, feedback?: string) => void', description: 'Submit callback with score 0-10' },
      { name: 'onDismiss', type: '() => void', description: 'Dismiss callback' },
      { name: 'title', type: 'string', description: 'Survey question text' },
    ],
    a11y: {
      keyboard: [{ key: 'Tab + Enter', action: 'Select score and submit' }],
      aria: ['Score buttons are labeled 0-10', 'Form semantics for submission'],
    },
  },

  'feedback-widget': {
    slug: 'feedback-widget',
    name: 'FeedbackWidget',
    description: 'Inline feedback collector with emoji reactions and optional text input.',
    category: 'Interactive',
    examples: [
      {
        title: 'Basic',
        get element() {
          const FeedbackWidget = C('FeedbackWidget')
          return React.createElement(FeedbackWidget, {
            onSubmit: () => {},
          })
        },
        source: `<FeedbackWidget onSubmit={(reaction, message) => saveFeedback(reaction, message)} />`,
      },
    ],
    props: [
      { name: 'onSubmit', type: '(reaction: string, message?: string) => void', description: 'Submit callback' },
      { name: 'title', type: 'string', description: 'Widget title' },
    ],
    a11y: {
      keyboard: [{ key: 'Tab + Enter', action: 'Select reaction and submit' }],
      aria: ['Buttons labeled with reaction meaning'],
    },
  },

  'cookie-consent': {
    slug: 'cookie-consent',
    name: 'CookieConsent',
    description: 'Cookie consent banner with granular category preferences.',
    category: 'Interactive',
    examples: [
      {
        title: 'Basic',
        get element() {
          const CookieConsent = C('CookieConsent')
          return React.createElement(CookieConsent, {
            onAcceptAll: () => {},
            onAcceptSelected: () => {},
            onRejectAll: () => {},
          })
        },
        source: `<CookieConsent
  onAcceptAll={(prefs) => saveCookiePrefs(prefs)}
  onAcceptSelected={(prefs) => saveCookiePrefs(prefs)}
  onRejectAll={(prefs) => saveCookiePrefs(prefs)}
/>`,
      },
    ],
    props: [
      { name: 'onAcceptAll', type: '(prefs: CookiePreferences) => void', description: 'Accept all callback' },
      { name: 'onAcceptSelected', type: '(prefs: CookiePreferences) => void', description: 'Accept selected callback' },
      { name: 'onRejectAll', type: '(prefs: CookiePreferences) => void', description: 'Reject all callback' },
      { name: 'cookieKey', type: 'string', default: '"cookie-consent"', description: 'localStorage key' },
    ],
    a11y: {
      keyboard: [{ key: 'Tab + Enter', action: 'Navigate and activate buttons' }],
      aria: ['Banner with role="dialog"', 'Toggle switches for each category'],
    },
  },

  // ── Dashboard ─────────────────────────────────────────────────────────
  'dashboard-shell': {
    slug: 'dashboard-shell',
    name: 'DashboardShell',
    description: 'Full dashboard layout with collapsible sidebar, user info, and responsive design.',
    category: 'Dashboard',
    examples: [
      {
        title: 'Usage',
        get element() {
          return React.createElement('div', {
            className: 'text-xs text-muted-foreground p-4 border border-border text-center'
          }, 'DashboardShell is a full-page layout. See code example for usage.')
        },
        source: `<DashboardShell
  sidebarItems={[
    { id: 'overview', label: 'Overview', href: '/dashboard' },
    { id: 'repos', label: 'Repos', href: '/dashboard/repos' },
  ]}
  user={{ name: 'Jason', tier: 'pro' }}
  onSignOut={() => signOut()}
>
  <DashboardHeader title="OVERVIEW" />
  {children}
</DashboardShell>`,
      },
    ],
    props: [
      { name: 'sidebarItems', type: '{ id: string; label: string; href: string; icon?: ReactNode }[]', description: 'Sidebar navigation items' },
      { name: 'user', type: '{ name: string; tier?: string }', description: 'User info for sidebar footer' },
      { name: 'onSignOut', type: '() => void', description: 'Sign out callback' },
      { name: 'logo', type: 'ReactNode', description: 'Logo element in sidebar header' },
    ],
    a11y: {
      keyboard: [{ key: 'Tab', action: 'Navigate sidebar items' }],
      aria: ['nav element for sidebar', 'Semantic landmarks for layout regions'],
    },
  },

  'kpi-card': {
    slug: 'kpi-card',
    name: 'KPICard',
    description: 'Key performance indicator card with value, label, and trend arrow.',
    category: 'Dashboard',
    examples: [
      {
        title: 'With Trend',
        get element() {
          const KpiCard = C('KpiCard')
          return React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
            React.createElement(KpiCard, { title: 'REVENUE', value: '$12,340', change: 12.5, trend: 'up' }),
            React.createElement(KpiCard, { title: 'ERRORS', value: '3', change: -50.0, trend: 'down' }),
          )
        },
        source: `<KpiCard title="REVENUE" value="$12,340" change={12.5} trend="up" />
<KpiCard title="ERRORS" value="3" change={-50.0} trend="down" />`,
      },
    ],
    props: [
      { name: 'title', type: 'string', description: 'KPI label (renders UPPERCASE)' },
      { name: 'value', type: 'string | number', description: 'Display value' },
      { name: 'change', type: 'number', description: 'Percentage change number' },
      { name: 'trend', type: '"up" | "down" | "neutral"', description: 'Trend direction arrow' },
      { name: 'icon', type: 'ReactNode', description: 'Optional icon' },
    ],
    a11y: { aria: ['Semantic card structure', 'Trend communicated via text and icon'] },
  },

  'stats-grid': {
    slug: 'stats-grid',
    name: 'StatsGrid',
    description: 'Responsive grid of stat items with optional change indicators.',
    category: 'Dashboard',
    examples: [
      {
        title: 'Basic',
        get element() {
          const StatsGrid = C('StatsGrid')
          return React.createElement(StatsGrid, {
            items: [
              { label: 'Files', value: 1572 },
              { label: 'Components', value: 279, change: '+12%' },
              { label: 'Routes', value: 46 },
              { label: 'Grade', value: 'B+' },
            ],
          })
        },
        source: `<StatsGrid
  items={[
    { label: 'Files', value: 1572 },
    { label: 'Components', value: 279, change: '+12%' },
    { label: 'Routes', value: 46 },
    { label: 'Grade', value: 'B+' },
  ]}
/>`,
      },
    ],
    props: [
      { name: 'items', type: '{ label: string; value: string | number; change?: string; icon?: ReactNode }[]', description: 'Grid items' },
      { name: 'columns', type: '2 | 3 | 4', default: '4', description: 'Number of columns' },
    ],
    a11y: { aria: ['Each stat item uses semantic structure'] },
  },

  // ── AI ────────────────────────────────────────────────────────────────
  'ai-chat-input': {
    slug: 'ai-chat-input',
    name: 'AiChatInput',
    description: 'Chat input with attachment support, model selector, and streaming stop button.',
    category: 'AI',
    examples: [
      {
        title: 'Basic',
        get element() {
          const AiChatInput = C('AiChatInput')
          return React.createElement(AiChatInput, {
            onSend: () => {},
            placeholder: 'Ask anything...',
          })
        },
        source: `<AiChatInput
  onSend={(message, attachments) => sendMessage(message, attachments)}
  placeholder="Ask anything..."
  models={[{ id: 'gpt-4', name: 'GPT-4' }]}
/>`,
      },
    ],
    props: [
      { name: 'onSend', type: '(message: string, attachments?: File[]) => void', description: 'Send callback' },
      { name: 'onStop', type: '() => void', description: 'Stop streaming callback' },
      { name: 'isLoading', type: 'boolean', default: 'false', description: 'Show stop button' },
      { name: 'models', type: '{ id: string; name: string }[]', description: 'Available AI models' },
      { name: 'selectedModelId', type: 'string', description: 'Current model ID' },
      { name: 'onModelChange', type: '(modelId: string) => void', description: 'Model change callback' },
    ],
    a11y: {
      keyboard: [
        { key: 'Enter', action: 'Send message' },
        { key: 'Shift+Enter', action: 'New line' },
      ],
      aria: ['Textarea with aria-label', 'Send button with aria-label'],
    },
  },

  // ── Admin/Security ────────────────────────────────────────────────────
  'audit-log': {
    slug: 'audit-log',
    name: 'AuditLog',
    description: 'Audit log table viewer with action types, timestamps, and export.',
    category: 'Admin',
    examples: [
      {
        title: 'Basic',
        get element() {
          return React.createElement('div', {
            className: 'text-xs text-muted-foreground p-4 border border-border text-center'
          }, 'AuditLog renders a filterable table. See code example.')
        },
        source: `<AuditLog
  entries={[
    { id: '1', action: 'user.login', actor: 'jason@example.com', timestamp: new Date(), metadata: {} },
    { id: '2', action: 'api.key.created', actor: 'system', timestamp: new Date(), metadata: {} },
  ]}
  onExport={() => downloadCSV()}
/>`,
      },
    ],
    props: [
      { name: 'entries', type: 'AuditLogEntry[]', description: 'Log entries to display' },
      { name: 'onExport', type: '() => void', description: 'Export callback' },
    ],
    a11y: {
      aria: ['Semantic table structure', 'Filter controls are labeled'],
    },
  },

  'mfa-card': {
    slug: 'mfa-card',
    name: 'MfaCard',
    description: 'MFA status card showing enabled/disabled state with setup and disable actions.',
    category: 'Security',
    examples: [
      {
        title: 'Enabled State',
        get element() {
          const MfaCard = C('MfaCard')
          return React.createElement(MfaCard, {
            twoFactorEnabled: true,
            onEnable2FA: () => {},
            onDisable2FA: () => {},
            onViewBackupCodes: () => {},
          })
        },
        source: `<MfaCard
  twoFactorEnabled={user.mfaEnabled}
  onEnable2FA={() => setShowSetup(true)}
  onDisable2FA={() => disableMfa()}
  onViewBackupCodes={() => showBackupCodes()}
/>`,
      },
    ],
    props: [
      { name: 'twoFactorEnabled', type: 'boolean', description: 'Current 2FA status' },
      { name: 'onEnable2FA', type: '() => void', description: 'Enable callback' },
      { name: 'onDisable2FA', type: '() => void', description: 'Disable callback' },
      { name: 'onViewBackupCodes', type: '() => void', description: 'View backup codes callback' },
    ],
    a11y: { aria: ['Status communicated via text', 'Action buttons are labeled'] },
  },

  'org-switcher': {
    slug: 'org-switcher',
    name: 'OrgSwitcher',
    description: 'Organization selector for multi-tenant applications.',
    category: 'Organization',
    examples: [
      {
        title: 'Basic',
        get element() {
          const OrgSwitcher = C('OrgSwitcher')
          return React.createElement(OrgSwitcher, {
            organizations: [
              { id: '1', name: 'Acme Corp', role: 'owner' },
              { id: '2', name: 'Startup Inc', role: 'member' },
            ],
            currentOrgId: '1',
            onSwitch: () => {},
            onCreateNew: () => {},
          })
        },
        source: `<OrgSwitcher
  organizations={orgs}
  currentOrgId={currentOrg.id}
  onSwitch={(orgId) => switchOrg(orgId)}
  onCreateNew={() => openCreateOrgDialog()}
/>`,
      },
    ],
    props: [
      { name: 'organizations', type: '{ id: string; name: string; role: string }[]', description: 'Available organizations' },
      { name: 'currentOrgId', type: 'string', description: 'Current org ID' },
      { name: 'onSwitch', type: '(orgId: string) => void', description: 'Switch callback' },
      { name: 'onCreateNew', type: '() => void', description: 'Create new org callback' },
    ],
    a11y: {
      keyboard: [{ key: 'Enter', action: 'Select organization' }],
      aria: ['role="listbox" for org list'],
    },
  },
}

// ─── Helpers ────────────────────────────────────────────────────────────

export const COMPONENT_SLUGS = Object.keys(COMPONENT_DOCS)

export function getComponentDoc(slug: string): ComponentDoc | undefined {
  return COMPONENT_DOCS[slug]
}

export function getComponentsByCategory(): Record<string, ComponentDoc[]> {
  const grouped: Record<string, ComponentDoc[]> = {}
  for (const doc of Object.values(COMPONENT_DOCS)) {
    if (!grouped[doc.category]) grouped[doc.category] = []
    grouped[doc.category].push(doc)
  }
  return grouped
}
