import { describe, it, expect } from 'vitest'
import * as AllExports from '../index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert an export is defined and is a valid React component.
 * Components can be plain functions (function components) OR objects
 * (React.forwardRef returns an object with a $$typeof symbol).
 */
function expectComponent(name: string, value: unknown) {
  it(`exports ${name} as a valid component`, () => {
    expect(value).toBeDefined()
    const t = typeof value
    expect(
      t === 'function' || t === 'object'
    ).toBe(true)
  })
}

/**
 * Assert an export is defined and is strictly a function (hooks, utilities,
 * variant helpers like buttonVariants/badgeVariants, createLogEntry, etc.).
 */
function expectFunction(name: string, value: unknown) {
  it(`exports ${name} as a function`, () => {
    expect(value).toBeDefined()
    expect(typeof value).toBe('function')
  })
}

/**
 * Assert an export is defined and is a plain object (e.g. commonErrors).
 */
function expectObject(name: string, value: unknown) {
  it(`exports ${name} as an object`, () => {
    expect(value).toBeDefined()
    expect(typeof value).toBe('object')
  })
}

// ============================================================================
// Tests
// ============================================================================
describe('@fabrk/components', () => {
  it('exports a non-empty module', () => {
    const keys = Object.keys(AllExports)
    expect(keys.length).toBeGreaterThan(0)
  })

  // ==========================================================================
  // UI Components — Core Primitives
  // ==========================================================================
  describe('UI Components — Accordion', () => {
    expectComponent('Accordion', AllExports.Accordion)
    expectComponent('AccordionItem', AllExports.AccordionItem)
    expectComponent('AccordionTrigger', AllExports.AccordionTrigger)
    expectComponent('AccordionContent', AllExports.AccordionContent)
  })

  describe('UI Components — Alert', () => {
    expectComponent('Alert', AllExports.Alert)
    expectComponent('AlertTitle', AllExports.AlertTitle)
    expectComponent('AlertDescription', AllExports.AlertDescription)
  })

  describe('UI Components — AlertDialog', () => {
    expectComponent('AlertDialog', AllExports.AlertDialog)
    expectComponent('AlertDialogPortal', AllExports.AlertDialogPortal)
    expectComponent('AlertDialogOverlay', AllExports.AlertDialogOverlay)
    expectComponent('AlertDialogTrigger', AllExports.AlertDialogTrigger)
    expectComponent('AlertDialogContent', AllExports.AlertDialogContent)
    expectComponent('AlertDialogHeader', AllExports.AlertDialogHeader)
    expectComponent('AlertDialogFooter', AllExports.AlertDialogFooter)
    expectComponent('AlertDialogTitle', AllExports.AlertDialogTitle)
    expectComponent('AlertDialogDescription', AllExports.AlertDialogDescription)
    expectComponent('AlertDialogAction', AllExports.AlertDialogAction)
    expectComponent('AlertDialogCancel', AllExports.AlertDialogCancel)
  })

  describe('UI Components — Avatar', () => {
    expectComponent('Avatar', AllExports.Avatar)
    expectComponent('AvatarImage', AllExports.AvatarImage)
    expectComponent('AvatarFallback', AllExports.AvatarFallback)
  })

  describe('UI Components — Badge', () => {
    expectComponent('Badge', AllExports.Badge)
    expectFunction('badgeVariants', AllExports.badgeVariants)
  })

  describe('UI Components — Breadcrumb', () => {
    expectComponent('Breadcrumb', AllExports.Breadcrumb)
    expectComponent('BreadcrumbList', AllExports.BreadcrumbList)
    expectComponent('BreadcrumbItem', AllExports.BreadcrumbItem)
    expectComponent('BreadcrumbLink', AllExports.BreadcrumbLink)
    expectComponent('BreadcrumbPage', AllExports.BreadcrumbPage)
    expectComponent('BreadcrumbSeparator', AllExports.BreadcrumbSeparator)
    expectComponent('BreadcrumbEllipsis', AllExports.BreadcrumbEllipsis)
  })

  describe('UI Components — Button', () => {
    expectComponent('Button', AllExports.Button)
    expectFunction('buttonVariants', AllExports.buttonVariants)
  })

  describe('UI Components — Calendar', () => {
    expectComponent('Calendar', AllExports.Calendar)
  })

  describe('UI Components — Card', () => {
    expectComponent('Card', AllExports.Card)
    expectComponent('CardHeader', AllExports.CardHeader)
    expectComponent('CardContent', AllExports.CardContent)
    expectComponent('CardFooter', AllExports.CardFooter)
    // Re-exported terminal-card components via card.tsx
    expectComponent('Stat', AllExports.Stat)
    expectComponent('StatGroup', AllExports.StatGroup)
    expectComponent('StyledLabel', AllExports.StyledLabel)
    expectComponent('FeatureItem', AllExports.FeatureItem)
    expectComponent('FeatureList', AllExports.FeatureList)
    expectComponent('InfoNote', AllExports.InfoNote)
    expectComponent('PageBadge', AllExports.PageBadge)
    expectComponent('TemplatePageHeader', AllExports.TemplatePageHeader)
    expectComponent('FeaturesCard', AllExports.FeaturesCard)
    expectComponent('MetricCard', AllExports.MetricCard)
    expectComponent('FeatureCard', AllExports.FeatureCard)
  })

  describe('UI Components — Checkbox', () => {
    expectComponent('Checkbox', AllExports.Checkbox)
  })

  describe('UI Components — CodeBlock', () => {
    expectComponent('CodeBlock', AllExports.CodeBlock)
  })

  describe('UI Components — Command', () => {
    expectComponent('Command', AllExports.Command)
    expectComponent('CommandDialog', AllExports.CommandDialog)
    expectComponent('CommandInput', AllExports.CommandInput)
    expectComponent('CommandList', AllExports.CommandList)
    expectComponent('CommandEmpty', AllExports.CommandEmpty)
    expectComponent('CommandGroup', AllExports.CommandGroup)
    expectComponent('CommandItem', AllExports.CommandItem)
    expectComponent('CommandShortcut', AllExports.CommandShortcut)
    expectComponent('CommandSeparator', AllExports.CommandSeparator)
  })

  describe('UI Components — Container', () => {
    expectComponent('Container', AllExports.Container)
    expectFunction('containerVariants', AllExports.containerVariants)
  })

  describe('UI Components — DataTable', () => {
    expectComponent('DataTable', AllExports.DataTable)
    expectComponent('DataTableColumnHeader', AllExports.DataTableColumnHeader)
    expectComponent('DataTablePagination', AllExports.DataTablePagination)
    expectComponent('DataTableToolbar', AllExports.DataTableToolbar)
  })

  describe('UI Components — DatePicker', () => {
    expectComponent('DatePicker', AllExports.DatePicker)
  })

  describe('UI Components — Dialog', () => {
    expectComponent('Dialog', AllExports.Dialog)
    expectComponent('DialogClose', AllExports.DialogClose)
    expectComponent('DialogContent', AllExports.DialogContent)
    expectComponent('DialogDescription', AllExports.DialogDescription)
    expectComponent('DialogFooter', AllExports.DialogFooter)
    expectComponent('DialogHeader', AllExports.DialogHeader)
    expectComponent('DialogOverlay', AllExports.DialogOverlay)
    expectComponent('DialogPortal', AllExports.DialogPortal)
    expectComponent('DialogTitle', AllExports.DialogTitle)
    expectComponent('DialogTrigger', AllExports.DialogTrigger)
  })

  describe('UI Components — DropdownMenu', () => {
    expectComponent('DropdownMenu', AllExports.DropdownMenu)
    expectComponent('DropdownMenuTrigger', AllExports.DropdownMenuTrigger)
    expectComponent('DropdownMenuContent', AllExports.DropdownMenuContent)
    expectComponent('DropdownMenuItem', AllExports.DropdownMenuItem)
    expectComponent('DropdownMenuCheckboxItem', AllExports.DropdownMenuCheckboxItem)
    expectComponent('DropdownMenuRadioItem', AllExports.DropdownMenuRadioItem)
    expectComponent('DropdownMenuLabel', AllExports.DropdownMenuLabel)
    expectComponent('DropdownMenuSeparator', AllExports.DropdownMenuSeparator)
    expectComponent('DropdownMenuShortcut', AllExports.DropdownMenuShortcut)
    expectComponent('DropdownMenuGroup', AllExports.DropdownMenuGroup)
    expectComponent('DropdownMenuPortal', AllExports.DropdownMenuPortal)
    expectComponent('DropdownMenuSub', AllExports.DropdownMenuSub)
    expectComponent('DropdownMenuSubContent', AllExports.DropdownMenuSubContent)
    expectComponent('DropdownMenuSubTrigger', AllExports.DropdownMenuSubTrigger)
    expectComponent('DropdownMenuRadioGroup', AllExports.DropdownMenuRadioGroup)
  })

  describe('UI Components — EmptyState', () => {
    expectComponent('EmptyState', AllExports.EmptyState)
  })

  describe('UI Components — Form', () => {
    expectFunction('useFormField', AllExports.useFormField)
    expectComponent('Form', AllExports.Form)
    expectComponent('FormItem', AllExports.FormItem)
    expectComponent('FormLabel', AllExports.FormLabel)
    expectComponent('FormControl', AllExports.FormControl)
    expectComponent('FormDescription', AllExports.FormDescription)
    expectComponent('FormMessage', AllExports.FormMessage)
    expectComponent('FormField', AllExports.FormField)
  })

  describe('UI Components — FormError', () => {
    expectComponent('FormError', AllExports.FormError)
    expectObject('commonErrors', AllExports.commonErrors)
  })

  describe('UI Components — Heatmap', () => {
    expectComponent('Heatmap', AllExports.Heatmap)
  })

  describe('UI Components — Input', () => {
    expectComponent('Input', AllExports.Input)
  })

  describe('UI Components — InputGroup', () => {
    expectComponent('InputGroup', AllExports.InputGroup)
    expectComponent('InputGroupAddon', AllExports.InputGroupAddon)
    expectComponent('InputGroupButton', AllExports.InputGroupButton)
    expectComponent('InputGroupInput', AllExports.InputGroupInput)
    expectComponent('InputGroupSeparator', AllExports.InputGroupSeparator)
    expectComponent('InputGroupText', AllExports.InputGroupText)
    expectComponent('InputGroupTextarea', AllExports.InputGroupTextarea)
  })

  describe('UI Components — InputNumber', () => {
    expectComponent('InputNumber', AllExports.InputNumber)
  })

  describe('UI Components — InputOTP', () => {
    expectComponent('InputOTP', AllExports.InputOTP)
    expectComponent('InputOTPGroup', AllExports.InputOTPGroup)
    expectComponent('InputOTPSlot', AllExports.InputOTPSlot)
    expectComponent('InputOTPSeparator', AllExports.InputOTPSeparator)
  })

  describe('UI Components — InputPassword', () => {
    expectComponent('InputPassword', AllExports.InputPassword)
  })

  describe('UI Components — InputSearch', () => {
    expectComponent('InputSearch', AllExports.InputSearch)
  })

  describe('UI Components — KpiCard', () => {
    expectComponent('KpiCard', AllExports.KpiCard)
  })

  describe('UI Components — Label', () => {
    expectComponent('Label', AllExports.Label)
  })

  describe('UI Components — Loading', () => {
    expectComponent('Spinner', AllExports.Spinner)
    expectComponent('Skeleton', AllExports.Skeleton)
    expectComponent('LoadingContainer', AllExports.LoadingContainer)
    expectComponent('LoadingButton', AllExports.LoadingButton)
    expectComponent('LoadingSpinner', AllExports.LoadingSpinner)
  })

  describe('UI Components — NotificationBadge', () => {
    expectComponent('NotificationBadge', AllExports.NotificationBadge)
  })

  describe('UI Components — NotificationList', () => {
    expectComponent('NotificationList', AllExports.NotificationList)
  })

  describe('UI Components — Pagination', () => {
    expectComponent('Pagination', AllExports.Pagination)
    expectComponent('PaginationContent', AllExports.PaginationContent)
    expectComponent('PaginationEllipsis', AllExports.PaginationEllipsis)
    expectComponent('PaginationItem', AllExports.PaginationItem)
    expectComponent('PaginationLink', AllExports.PaginationLink)
    expectComponent('PaginationNext', AllExports.PaginationNext)
    expectComponent('PaginationPrevious', AllExports.PaginationPrevious)
    expectComponent('PaginationFirst', AllExports.PaginationFirst)
    expectComponent('PaginationLast', AllExports.PaginationLast)
  })

  describe('UI Components — Popover', () => {
    expectComponent('Popover', AllExports.Popover)
    expectComponent('PopoverTrigger', AllExports.PopoverTrigger)
    expectComponent('PopoverContent', AllExports.PopoverContent)
  })

  describe('UI Components — PricingCard', () => {
    expectComponent('PricingCard', AllExports.PricingCard)
  })

  describe('UI Components — Progress', () => {
    expectComponent('Progress', AllExports.Progress)
    expectComponent('AnimatedProgress', AllExports.AnimatedProgress)
    expectComponent('ProgressWithInfo', AllExports.ProgressWithInfo)
    expectComponent('SolidProgress', AllExports.SolidProgress)
    expectComponent('AnimatedSolidProgress', AllExports.AnimatedSolidProgress)
  })

  describe('UI Components — RadioGroup', () => {
    expectComponent('RadioGroup', AllExports.RadioGroup)
    expectComponent('RadioGroupItem', AllExports.RadioGroupItem)
  })

  describe('UI Components — ScrollArea', () => {
    expectComponent('ScrollArea', AllExports.ScrollArea)
    expectComponent('ScrollBar', AllExports.ScrollBar)
  })

  describe('UI Components — Select', () => {
    expectComponent('Select', AllExports.Select)
    expectComponent('SelectContent', AllExports.SelectContent)
    expectComponent('SelectGroup', AllExports.SelectGroup)
    expectComponent('SelectItem', AllExports.SelectItem)
    expectComponent('SelectLabel', AllExports.SelectLabel)
    expectComponent('SelectScrollDownButton', AllExports.SelectScrollDownButton)
    expectComponent('SelectScrollUpButton', AllExports.SelectScrollUpButton)
    expectComponent('SelectSeparator', AllExports.SelectSeparator)
    expectComponent('SelectTrigger', AllExports.SelectTrigger)
    expectComponent('SelectValue', AllExports.SelectValue)
  })

  describe('UI Components — Separator', () => {
    expectComponent('Separator', AllExports.Separator)
  })

  describe('UI Components — Sheet', () => {
    expectComponent('Sheet', AllExports.Sheet)
    expectComponent('SheetPortal', AllExports.SheetPortal)
    expectComponent('SheetOverlay', AllExports.SheetOverlay)
    expectComponent('SheetTrigger', AllExports.SheetTrigger)
    expectComponent('SheetClose', AllExports.SheetClose)
    expectComponent('SheetContent', AllExports.SheetContent)
    expectComponent('SheetHeader', AllExports.SheetHeader)
    expectComponent('SheetFooter', AllExports.SheetFooter)
    expectComponent('SheetTitle', AllExports.SheetTitle)
    expectComponent('SheetDescription', AllExports.SheetDescription)
  })

  describe('UI Components — Sidebar', () => {
    expectComponent('Sidebar', AllExports.Sidebar)
  })

  describe('UI Components — SimpleIcon', () => {
    expectComponent('SimpleIcon', AllExports.SimpleIcon)
  })

  describe('UI Components — Slider', () => {
    expectComponent('Slider', AllExports.Slider)
  })

  describe('UI Components — StatCard', () => {
    expectComponent('StatCard', AllExports.StatCard)
  })

  describe('UI Components — StyledTabs', () => {
    expectComponent('StyledTabs', AllExports.StyledTabs)
    expectComponent('StyledTabsContent', AllExports.StyledTabsContent)
  })

  describe('UI Components — Switch', () => {
    expectComponent('Switch', AllExports.Switch)
  })

  describe('UI Components — Table', () => {
    expectComponent('Table', AllExports.Table)
    expectComponent('TableHeader', AllExports.TableHeader)
    expectComponent('TableBody', AllExports.TableBody)
    expectComponent('TableFooter', AllExports.TableFooter)
    expectComponent('TableHead', AllExports.TableHead)
    expectComponent('TableRow', AllExports.TableRow)
    expectComponent('TableCell', AllExports.TableCell)
    expectComponent('TableCaption', AllExports.TableCaption)
  })

  describe('UI Components — Tabs', () => {
    expectComponent('Tabs', AllExports.Tabs)
    expectComponent('TabsList', AllExports.TabsList)
    expectComponent('TabsTrigger', AllExports.TabsTrigger)
    expectComponent('TabsContent', AllExports.TabsContent)
  })

  describe('UI Components — TerminalSpinner', () => {
    expectComponent('TerminalSpinner', AllExports.TerminalSpinner)
  })

  describe('UI Components — Textarea', () => {
    expectComponent('Textarea', AllExports.Textarea)
  })

  describe('UI Components — Toaster', () => {
    expectComponent('Toaster', AllExports.Toaster)
    expectComponent('ToastAction', AllExports.ToastAction)
    expectComponent('ToastTitle', AllExports.ToastTitle)
    expectComponent('ToastDescription', AllExports.ToastDescription)
    expectComponent('ToastClose', AllExports.ToastClose)
    expectComponent('ToastViewport', AllExports.ToastViewport)
  })

  describe('UI Components — Tooltip', () => {
    expectComponent('Tooltip', AllExports.Tooltip)
    expectComponent('TooltipTrigger', AllExports.TooltipTrigger)
    expectComponent('TooltipContent', AllExports.TooltipContent)
    expectComponent('TooltipProvider', AllExports.TooltipProvider)
  })

  describe('UI Components — TypeWriter', () => {
    expectComponent('TypeWriter', AllExports.TypeWriter)
  })

  // ==========================================================================
  // New UI Components (extracted from indx)
  // ==========================================================================
  describe('UI Components — Tag', () => {
    expectComponent('Tag', AllExports.Tag)
    expectComponent('TagGroup', AllExports.TagGroup)
  })

  describe('UI Components — SegmentedControl', () => {
    expectComponent('SegmentedControl', AllExports.SegmentedControl)
  })

  describe('UI Components — StatusPulse', () => {
    expectComponent('StatusPulse', AllExports.StatusPulse)
  })

  describe('UI Components — ASCIIProgressBar', () => {
    expectComponent('ASCIIProgressBar', AllExports.ASCIIProgressBar)
  })

  describe('UI Components — LogStream', () => {
    expectComponent('LogStream', AllExports.LogStream)
    expectFunction('createLogEntry', AllExports.createLogEntry)
  })

  describe('UI Components — TokenCounter', () => {
    expectComponent('TokenCounter', AllExports.TokenCounter)
    expectComponent('TokenCounterGroup', AllExports.TokenCounterGroup)
  })

  describe('UI Components — UsageBar', () => {
    expectComponent('UsageBar', AllExports.UsageBar)
    expectComponent('UsageStatsGrid', AllExports.UsageStatsGrid)
  })

  describe('UI Components — JsonViewer', () => {
    expectComponent('JsonViewer', AllExports.JsonViewer)
  })

  describe('UI Components — StarRating', () => {
    expectComponent('StarRating', AllExports.StarRating)
  })

  describe('UI Components — NPSSurvey', () => {
    expectComponent('NPSSurvey', AllExports.NPSSurvey)
  })

  describe('UI Components — FeedbackWidget', () => {
    expectComponent('FeedbackWidget', AllExports.FeedbackWidget)
  })

  describe('UI Components — UpgradeCTA', () => {
    expectComponent('UpgradeCTA', AllExports.UpgradeCTA)
    expectComponent('ContentLimitBadge', AllExports.ContentLimitBadge)
  })

  describe('UI Components — CookieConsent', () => {
    expectComponent('CookieConsent', AllExports.CookieConsent)
    expectFunction('useCookieConsent', AllExports.useCookieConsent)
  })

  describe('UI Components — OnboardingChecklist', () => {
    expectComponent('OnboardingChecklist', AllExports.OnboardingChecklist)
  })

  describe('UI Components — TierBadge', () => {
    expectComponent('TierBadge', AllExports.TierBadge)
  })

  describe('UI Components — StatsGrid', () => {
    expectComponent('StatsGrid', AllExports.StatsGrid)
  })

  describe('UI Components — DashboardHeader', () => {
    expectComponent('DashboardHeader', AllExports.DashboardHeader)
  })

  describe('UI Components — PageHeader', () => {
    expectComponent('PageHeader', AllExports.PageHeader)
  })

  describe('UI Components — DashboardShell', () => {
    expectComponent('DashboardShell', AllExports.DashboardShell)
  })

  // ==========================================================================
  // Charts
  // ==========================================================================
  describe('Charts — AreaChart', () => {
    expectComponent('AreaChart', AllExports.AreaChart)
    expectComponent('AreaChartCard', AllExports.AreaChartCard)
    expectComponent('StackedAreaChart', AllExports.StackedAreaChart)
  })

  describe('Charts — BarChart', () => {
    expectComponent('BarChart', AllExports.BarChart)
    expectComponent('BarChartCard', AllExports.BarChartCard)
    expectComponent('StackedBarChart', AllExports.StackedBarChart)
  })

  describe('Charts — DonutChart', () => {
    expectComponent('DonutChart', AllExports.DonutChart)
    expectComponent('MetricDonutChart', AllExports.MetricDonutChart)
    expectComponent('ProgressDonutChart', AllExports.ProgressDonutChart)
  })

  describe('Charts — FunnelChart', () => {
    expectComponent('FunnelChart', AllExports.FunnelChart)
  })

  describe('Charts — Gauge', () => {
    expectComponent('Gauge', AllExports.Gauge)
    expectComponent('ScoreGauge', AllExports.ScoreGauge)
  })

  describe('Charts — LineChart', () => {
    expectComponent('LineChart', AllExports.LineChart)
    expectComponent('LineChartCard', AllExports.LineChartCard)
  })

  describe('Charts — PieChart', () => {
    expectComponent('PieChart', AllExports.PieChart)
  })

  describe('Charts — Sparkline', () => {
    expectComponent('Sparkline', AllExports.Sparkline)
    expectComponent('SparklineCard', AllExports.SparklineCard)
    expectComponent('SparklineGroup', AllExports.SparklineGroup)
  })

  // ==========================================================================
  // Error Boundary
  // ==========================================================================
  describe('Error Boundary', () => {
    expectComponent('ErrorBoundary', AllExports.ErrorBoundary)
    expectFunction('useErrorHandler', AllExports.useErrorHandler)
  })

  // ==========================================================================
  // AI Chat Components
  // ==========================================================================
  describe('AI Chat Components', () => {
    expectComponent('AiChat', AllExports.AiChat)
    expectComponent('AiChatInput', AllExports.AiChatInput)
    expectComponent('AiChatMessageList', AllExports.AiChatMessageList)
    expectComponent('AiChatSidebar', AllExports.AiChatSidebar)
    expectComponent('AiChatAttachmentPreview', AllExports.AiChatAttachmentPreview)
  })

  // ==========================================================================
  // Notification Center
  // ==========================================================================
  describe('Notification Center', () => {
    expectComponent('NotificationCenter', AllExports.NotificationCenter)
  })

  // ==========================================================================
  // Admin Components
  // ==========================================================================
  describe('Admin — AuditLog', () => {
    expectComponent('AuditLog', AllExports.AuditLog)
  })

  describe('Admin — AdminMetricsCard', () => {
    expectComponent('AdminMetricsCard', AllExports.AdminMetricsCard)
  })

  describe('Admin — SystemHealthWidget', () => {
    expectComponent('SystemHealthWidget', AllExports.SystemHealthWidget)
  })

  // ==========================================================================
  // Security Components
  // ==========================================================================
  describe('Security — MfaCard', () => {
    expectComponent('MfaCard', AllExports.MfaCard)
  })

  describe('Security — MfaSetupDialog', () => {
    expectComponent('MfaSetupDialog', AllExports.MfaSetupDialog)
  })

  describe('Security — BackupCodesModal', () => {
    expectComponent('BackupCodesModal', AllExports.BackupCodesModal)
  })

  // ==========================================================================
  // Organization Components
  // ==========================================================================
  describe('Organization — OrgSwitcher', () => {
    expectComponent('OrgSwitcher', AllExports.OrgSwitcher)
  })

  describe('Organization — MemberCard', () => {
    expectComponent('MemberCard', AllExports.MemberCard)
  })

  describe('Organization — TeamActivityFeed', () => {
    expectComponent('TeamActivityFeed', AllExports.TeamActivityFeed)
  })

  // ==========================================================================
  // SEO Components
  // ==========================================================================
  describe('SEO — SchemaScript', () => {
    expectComponent('SchemaScript', AllExports.SchemaScript)
  })

  describe('SEO — Breadcrumbs', () => {
    expectComponent('Breadcrumbs', AllExports.Breadcrumbs)
  })

  // ==========================================================================
  // Utilities
  // ==========================================================================
  describe('Utilities', () => {
    expectFunction('cn', AllExports.cn)

    it('cn merges class names correctly', () => {
      const result = AllExports.cn('foo', 'bar')
      expect(typeof result).toBe('string')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })

    it('cn handles conditional classes', () => {
      const result = AllExports.cn('base', undefined, 'visible')
      expect(result).toContain('base')
      expect(result).toContain('visible')
      expect(result).not.toContain('hidden')
    })
  })
})
