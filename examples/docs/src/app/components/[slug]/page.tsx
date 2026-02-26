import ComponentPageClient from './component-page-client'

const SLUGS = [
  'button', 'input', 'select', 'dialog', 'tabs', 'accordion', 'switch',
  'checkbox', 'badge', 'card', 'data-table', 'progress', 'star-rating',
  'empty-state', 'bar-chart', 'line-chart', 'donut-chart', 'gauge',
  'sparkline', 'segmented-control', 'nps-survey', 'feedback-widget',
  'cookie-consent', 'dashboard-shell', 'kpi-card', 'stats-grid',
  'ai-chat-input', 'audit-log', 'mfa-card', 'org-switcher',
]

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }))
}

export default function ComponentPage() {
  return <ComponentPageClient />
}
