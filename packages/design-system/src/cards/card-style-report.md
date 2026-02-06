# Card Style Analysis Report

Generated: 2025-12-06

## Executive Summary

The codebase contains **50+ card-like UI patterns** across components and inline JSX. Analysis reveals:

- **65% use terminal header pattern** (Style B: `[ [0xXX] TITLE ]` with `border-b`)
- **35% missing terminal header** - inconsistent with design system
- **Two header styles exist**: Style A (inline with dashes) and Style B (border-b separator)
- **Style B is the canonical standard** for grid cards

---

## Card Roles & Groups

### 1. Base/Container Cards

| Card             | Terminal Header | Status         |
| ---------------- | --------------- | -------------- |
| Card             | No              | Base component |
| StyledCard       | Yes (Style B)   | Canonical      |
| StyledCardHeader | Yes (Style B)   | Canonical      |

### 2. Grid Cards (Landing/Features/About)

| Card                 | Terminal Header | Status    |
| -------------------- | --------------- | --------- |
| Enterprise Features  | Yes (Style B)   | Compliant |
| Quality Section      | Yes (Style B)   | Compliant |
| Developer Experience | Yes (Style B)   | Compliant |
| Tech Stack           | Yes (Style B)   | Compliant |
| Stats Section        | Yes (Style B)   | Compliant |
| Values Section       | Yes (Style B)   | Compliant |
| Why Choose Section   | Yes (Style B)   | Compliant |
| Testimonials         | Yes (Style B)   | Compliant |

### 3. Hero/Status Cards

| Card                 | Terminal Header | Status                       |
| -------------------- | --------------- | ---------------------------- |
| Landing Hero Status  | Yes (Style A)   | Special case - inline dashes |
| Features Hero Status | Yes (Style A)   | Special case - inline dashes |
| About Hero Mission   | Yes (Style A)   | Special case - inline dashes |

### 4. Metric/KPI Cards

| Card                    | Terminal Header | Status            |
| ----------------------- | --------------- | ----------------- |
| KpiCard                 | No              | **NEEDS FIX**     |
| StatCard                | No              | Alias for KpiCard |
| AdminMetricsCard        | No              | **NEEDS FIX**     |
| MetricCards (Analytics) | No              | **NEEDS FIX**     |
| StatsCards (Team)       | No              | **NEEDS FIX**     |
| StatsCards (Users)      | No              | **NEEDS FIX**     |
| StatsCards (Dashboard)  | Yes             | Compliant         |

### 5. Documentation Cards

| Card         | Terminal Header | Status    |
| ------------ | --------------- | --------- |
| DocsCard     | Yes (Style B)   | Compliant |
| DocsLinkCard | Yes (Style B)   | Compliant |
| FeaturesCard | Yes (Style B)   | Compliant |

### 6. Security Cards

| Card                        | Terminal Header | Status    |
| --------------------------- | --------------- | --------- |
| SecurityPasswordCard        | Yes (Style B)   | Compliant |
| Security2FACard             | Yes (Style B)   | Compliant |
| SecurityAccountsCard        | Yes (Style B)   | Compliant |
| SecuritySessionsCard        | Yes (Style B)   | Compliant |
| SecurityRecommendationsCard | Yes (Style B)   | Compliant |

### 7. Billing/Subscription Cards

| Card                       | Terminal Header | Status        |
| -------------------------- | --------------- | ------------- |
| PaymentMethodsCard         | Yes (Style B)   | Compliant     |
| RecentInvoicesCard         | Yes (Style B)   | Compliant     |
| UsageMetricsCard           | Yes (Style B)   | Compliant     |
| CurrentPlanCard (Template) | Yes (Style B)   | Compliant     |
| PlanCards                  | Yes (Style B)   | Compliant     |
| CurrentPlanCard (Org)      | No              | **NEEDS FIX** |
| BillingHistoryCard         | No              | **NEEDS FIX** |
| UsageStatsCard             | No              | **NEEDS FIX** |

### 8. Profile/Organization Cards

| Card                | Terminal Header | Status        |
| ------------------- | --------------- | ------------- |
| MemberCard          | No              | **NEEDS FIX** |
| OrgCard             | No              | **NEEDS FIX** |
| RolePermissionsCard | No              | **NEEDS FIX** |

### 9. Purchase Status Cards

| Card          | Terminal Header | Status        |
| ------------- | --------------- | ------------- |
| LicenseCard   | No              | **NEEDS FIX** |
| AccessCard    | No              | **NEEDS FIX** |
| ResourcesCard | No              | **NEEDS FIX** |

---

## Style Inconsistencies

### Header Pattern Inconsistencies

**Style A (Hero Cards):**

```
[ [0x01] STATUS ]────────────────────────
```

- Inline text with decorative dashes
- Used in hero sections for narrative cards
- No border-b separator

**Style B (Grid Cards) - CANONICAL:**

```
┌─────────────────────────────────────────────┐
│ [ [0x00] TITLE ]                       icon │ ← border-b separator
├─────────────────────────────────────────────┤
│ Content area                                │
└─────────────────────────────────────────────┘
```

- Header with border-b separator
- Icon on right side
- px-4 py-2 padding
- Used for all grid cards

### Padding Inconsistencies

| Pattern      | Files Using     | Standard           |
| ------------ | --------------- | ------------------ |
| `p-4`        | Template cards  | Compliant          |
| `p-6`        | Dashboard cards | Compliant          |
| `px-4 py-2`  | Headers only    | Compliant          |
| `p-4 lg:p-6` | Feature cards   | Responsive variant |

### Radius Inconsistencies

| Pattern         | Files Using       | Standard                |
| --------------- | ----------------- | ----------------------- |
| `mode.radius`   | Most components   | Compliant               |
| `rounded-none`  | Some inline cards | Explicit terminal style |
| No radius class | Some components   | **NEEDS FIX**           |

### Border Inconsistencies

| Pattern                | Files Using       | Standard               |
| ---------------------- | ----------------- | ---------------------- |
| `border border-border` | Most cards        | Compliant              |
| `border` only          | Some cards        | Implicit border-border |
| `border-primary`       | Highlighted cards | Accent variant         |
| `border-destructive`   | Error states      | Danger variant         |

---

## Cards Needing Migration

### Priority 1: Missing Terminal Headers (Dashboard/Org)

1. `CurrentPlanCard (Org)` - src/app/(dashboard)/organizations/[slug]/billing/
2. `BillingHistoryCard` - src/app/(dashboard)/organizations/[slug]/billing/
3. `UsageStatsCard` - src/app/(dashboard)/organizations/[slug]/billing/
4. `RolePermissionsCard` - src/app/(dashboard)/organizations/[slug]/members/

### Priority 2: Missing Terminal Headers (UI Components)

1. `KpiCard` - src/components/ui/kpi-card.tsx
2. `MemberCard` - src/components/ui/member-card.tsx
3. `OrgCard` - src/components/organization/org-card.tsx
4. `AdminMetricsCard` - src/components/admin/admin-metrics-card.tsx

### Priority 3: Missing Terminal Headers (Purchase Status)

1. `LicenseCard` - src/components/dashboard/purchase-status/
2. `AccessCard` - src/components/dashboard/purchase-status/
3. `ResourcesCard` - src/components/dashboard/purchase-status/

### Priority 4: Missing Terminal Headers (Templates)

1. `MetricCards` - src/app/templates/analytics-dashboard/
2. `StatsCards (Team)` - src/app/templates/team-dashboard/
3. `StatsCards (Users)` - src/app/templates/user-management/

---

## Canonical Style Specification

### Terminal Card (Style B) - Grid Cards

```tsx
// Container
className =
  'group border-border bg-card hover:border-primary/50 flex h-full flex-col border transition-colors';

// Header
className = 'border-border flex items-center justify-between border-b px-4 py-2';
// Header text: [ [0xXX] TITLE ]
// Header icon: size-4, group-hover:text-primary

// Content
className = 'flex-1 p-4';
// DESC: prefix for descriptions
```

### Hero Card (Style A) - Narrative Cards

```tsx
// Container
className = 'border-border bg-card mx-auto max-w-2xl border p-4 text-left';

// Header (inline)
className = 'text-muted-foreground mb-4 text-xs';
// Pattern: [ [0x01] STATUS ]────────────────────────

// Content - no DESC: prefix
// Status badges at bottom
```

---

## Recommendations

1. **Add `variant` prop to Card component** for terminal/default styles
2. **Create TerminalCard wrapper** that enforces Style B pattern
3. **Migrate all grid cards** to use StyledCard + StyledCardHeader
4. **Keep hero cards** using Style A as intentional exception
5. **Standardize padding** to p-4 for cards, px-4 py-2 for headers
6. **Add icon support** to all terminal headers
