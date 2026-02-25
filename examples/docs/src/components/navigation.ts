export interface NavItem {
  label: string
  href: string
  children?: NavItem[]
}

export const navigation: NavItem[] = [
  { label: 'HOME', href: '/' },
  { label: 'GETTING STARTED', href: '/getting-started' },
  { label: 'CONFIGURATION', href: '/configuration' },
  {
    label: 'PACKAGES',
    href: '/packages',
    children: [
      { label: 'fabrk', href: '/packages#fabrk' },
      { label: '@fabrk/config', href: '/packages#config' },
      { label: '@fabrk/design-system', href: '/packages#design-system' },
      { label: '@fabrk/core', href: '/packages#core' },
      { label: '@fabrk/components', href: '/packages#components' },
      { label: '@fabrk/ai', href: '/packages#ai' },
      { label: '@fabrk/themes', href: '/packages#themes' },
      { label: '@fabrk/payments', href: '/packages#payments' },
      { label: '@fabrk/auth', href: '/packages#auth' },
      { label: '@fabrk/email', href: '/packages#email' },
      { label: '@fabrk/storage', href: '/packages#storage' },
      { label: '@fabrk/security', href: '/packages#security' },
      { label: '@fabrk/mcp', href: '/packages#mcp' },
      { label: '@fabrk/store-prisma', href: '/packages#store-prisma' },
      { label: '@fabrk/ui', href: '/packages#ui' },
      { label: '@fabrk/referrals', href: '/packages#referrals' },
    ],
  },
  {
    label: 'COMPONENTS',
    href: '/components',
    children: [
      { label: 'Button', href: '/components/button' },
      { label: 'Card', href: '/components/card' },
      { label: 'Input', href: '/components/input' },
      { label: 'Dialog', href: '/components/dialog' },
      { label: 'Tabs', href: '/components/tabs' },
      { label: 'Badge', href: '/components/badge' },
      { label: 'BarChart', href: '/components/bar-chart' },
      { label: 'KPICard', href: '/components/kpi-card' },
      { label: 'DataTable', href: '/components/data-table' },
      { label: 'StarRating', href: '/components/star-rating' },
    ],
  },
  {
    label: 'TUTORIALS',
    href: '/tutorials/dashboard',
    children: [
      { label: 'Build a Dashboard', href: '/tutorials/dashboard' },
      { label: 'Authentication & MFA', href: '/tutorials/auth' },
      { label: 'Stripe Payments', href: '/tutorials/payments' },
    ],
  },
  {
    label: 'GUIDES',
    href: '/guides',
    children: [
      { label: 'Build a Dashboard', href: '/guides#dashboard' },
      { label: 'Authentication', href: '/guides#auth' },
      { label: 'Payments', href: '/guides#payments' },
      { label: 'AI Integration', href: '/guides#ai' },
      { label: 'Deployment', href: '/guides#deployment' },
    ],
  },
  {
    label: 'PHILOSOPHY',
    href: '/philosophy',
    children: [
      { label: 'Internationalization', href: '/philosophy#i18n' },
      { label: 'Data Fetching', href: '/philosophy#data-fetching' },
      { label: 'No CSS-in-JS', href: '/philosophy#no-css-in-js' },
      { label: 'Adapter Pattern', href: '/philosophy#adapter-pattern' },
      { label: 'Store Pattern', href: '/philosophy#store-pattern' },
    ],
  },
  { label: 'MIGRATION', href: '/migration' },
  { label: 'CLI REFERENCE', href: '/cli' },
  { label: 'API REFERENCE', href: '/api' },
  { label: 'STORYBOOK', href: '/storybook' },
]
