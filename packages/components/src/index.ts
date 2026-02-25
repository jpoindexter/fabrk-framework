/**
 * @fabrk/components
 *
 * 105+ production-ready UI components and charts
 */

// UI Components
export * from './ui/accordion'
export * from './ui/alert'
export * from './ui/alert-dialog'
export * from './ui/avatar'
export * from './ui/badge'
export * from './ui/breadcrumb'
export * from './ui/button'
export * from './ui/calendar'
export * from './ui/card'
export * from './ui/checkbox'
export * from './ui/code-block'
export * from './ui/command'
export * from './ui/container'
export * from './ui/data-table'
export * from './ui/date-picker'
export * from './ui/dialog'
export * from './ui/dropdown-menu'
export * from './ui/empty-state'
export * from './ui/form'
export * from './ui/form-error'
export * from './ui/heatmap'
export * from './ui/input'
export * from './ui/input-group'
export * from './ui/input-number'
export * from './ui/input-otp'
export * from './ui/input-password'
export * from './ui/input-search'
export * from './ui/kpi-card'
export * from './ui/label'
export * from './ui/loading'
export * from './ui/notification-badge'
export * from './ui/notification-list'
export * from './ui/pagination'
export * from './ui/popover'
export * from './ui/pricing-card'
export * from './ui/progress'
export * from './ui/radio-group'
export * from './ui/scroll-area'
export * from './ui/select'
export * from './ui/separator'
export * from './ui/sheet'
export * from './ui/sidebar'
export * from './ui/simple-icon'
export * from './ui/slider'
export * from './ui/stat-card'
export * from './ui/styled-tabs'
export * from './ui/switch'
export * from './ui/table'
export * from './ui/tabs'
// Note: terminal-card exports are not included to avoid Badge naming conflict
// Import directly from '@fabrk/components/ui/terminal-card' if needed
export * from './ui/terminal-spinner'
export * from './ui/textarea'
export * from './ui/toaster'
export * from './ui/tooltip'
export * from './ui/typewriter'

// New UI Components (extracted from index)
export * from './ui/tag'
export * from './ui/segmented-control'
export * from './ui/status-pulse'
export * from './ui/ascii-progress-bar'
export * from './ui/log-stream'
export * from './ui/token-counter'
export * from './ui/usage-bar'
export * from './ui/json-viewer'
export * from './ui/star-rating'
export * from './ui/nps-survey'
export * from './ui/feedback-widget'
export * from './ui/upgrade-cta'
export * from './ui/cookie-consent'
export * from './ui/onboarding-checklist'
export * from './ui/tier-badge'
export * from './ui/stats-grid'
export * from './ui/dashboard-header'
export * from './ui/page-header'
export * from './ui/dashboard-shell'

// Charts
export * from './charts/area-chart'
export * from './charts/bar-chart'
export * from './charts/donut-chart'
export * from './charts/funnel-chart'
export * from './charts/gauge'
export * from './charts/line-chart'
export * from './charts/pie-chart'
export * from './charts/sparkline'

// Error Boundary
export * from './ui/error-boundary'

// AI Chat Components
export * from './ai'

// Notification Center
export { NotificationCenter } from './notifications/notification-center'
export type { NotificationCenterItem, NotificationCenterProps } from './notifications/notification-center'

// Admin Components
export { AuditLog } from './admin/audit-log'
export type { AuditLogProps, AuditLogEntry, AuditAction } from './admin/audit-log'
export { AdminMetricsCard } from './admin/metrics-card'
export type { AdminMetricsCardProps } from './admin/metrics-card'
export { SystemHealthWidget } from './admin/system-health'
export type { SystemHealthWidgetProps, SystemHealthMetric } from './admin/system-health'

// Security Components
export { MfaCard } from './security/mfa-card'
export type { MfaCardProps } from './security/mfa-card'
export { MfaSetupDialog } from './security/mfa-setup-dialog'
export type { MfaSetupDialogProps } from './security/mfa-setup-dialog'
export { BackupCodesModal } from './security/backup-codes-modal'
export type { BackupCodesModalProps } from './security/backup-codes-modal'

// Organization Components
export { OrgSwitcher } from './organization/org-switcher'
export type { OrgSwitcherProps, OrgSwitcherOrganization } from './organization/org-switcher'
export { MemberCard } from './organization/member-card'
export type { MemberCardProps, Member } from './organization/member-card'
export { TeamActivityFeed } from './organization/team-activity-feed'
export type { TeamActivityFeedProps, TeamActivity, ActivityType } from './organization/team-activity-feed'

// SEO Components
export { SchemaScript } from './seo/schema-script'
export type { SchemaScriptProps } from './seo/schema-script'
export { Breadcrumbs } from './seo/breadcrumbs'
export type { BreadcrumbsProps, BreadcrumbItem as SeoBreadcrumbItem } from './seo/breadcrumbs'

// Hooks
export * from './hooks'

// Utilities
export { cn } from '@fabrk/core'
export { sanitizeHref } from './utils'

// Component Registry
export * from './registry'
