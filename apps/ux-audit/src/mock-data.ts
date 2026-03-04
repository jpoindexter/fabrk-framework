import type { ProductEvaluation, GapAnalysis, RoadmapItem } from './heuristics.js';

const EVALUATIONS: Array<Omit<ProductEvaluation, 'url' | 'screenshot'>> = [
  {
    scores: [
      { id: 'visibility', score: 4.0, severity: 'pass', finding: 'Loading states and progress indicators are well-implemented throughout the onboarding flow. Skeleton screens replace spinners in most views.', recommendation: '' },
      { id: 'match', score: 3.5, severity: 'P2', finding: 'Most UI language is familiar but technical jargon ("webhook payload", "idempotency key") appears without explanation during onboarding.', recommendation: 'Add tooltips or inline explanations on first encounter of technical terms.' },
      { id: 'control', score: 2.5, severity: 'P1', finding: 'No undo for bulk operations. Deleting a workspace is irreversible with only a single confirmation dialog and no recovery window.', recommendation: 'Add soft-delete with 30-day recovery. Show undo toast after destructive actions.' },
      { id: 'consistency', score: 4.0, severity: 'pass', finding: 'Button hierarchy, icon usage, and modal patterns are consistent across the product. Minor inconsistency in form field error styles between settings and onboarding flows.', recommendation: '' },
      { id: 'error_prevention', score: 3.0, severity: 'P2', finding: 'Forms allow submission with conflicting values (e.g., start date after end date). Validation only triggers on submit, not in real time.', recommendation: 'Add real-time cross-field validation. Disable submit until the form resolves all conflicts.' },
      { id: 'recognition', score: 4.5, severity: 'pass', finding: 'Navigation is persistent and feature discovery is strong. Recently used items surface in the sidebar. Contextual menus match user expectations.', recommendation: '' },
      { id: 'flexibility', score: 2.0, severity: 'P1', finding: 'No keyboard shortcuts or command palette. Bulk operations require mouse-only interaction. Power users report 3× longer task times vs. competitors.', recommendation: 'Implement Cmd+K command palette with the 15 most common actions. Document and expose keyboard shortcuts.' },
      { id: 'aesthetic', score: 3.5, severity: 'P2', finding: 'Dashboard overview is dense with low-priority information. Notification badge count is visible at all times, creating anxiety without urgency distinction.', recommendation: 'Collapse low-priority stats by default. Only badge actionable notifications, not informational ones.' },
      { id: 'error_recovery', score: 2.5, severity: 'P1', finding: 'Error messages show raw API response text ("422 Unprocessable Entity"). Users are unable to self-diagnose or recover from common issues without contacting support.', recommendation: 'Map all API errors to plain-language messages with specific recovery steps and relevant help links.' },
      { id: 'help', score: 3.0, severity: 'P2', finding: 'Help documentation is thorough but hard to reach from within the product. No contextual help panels. Documentation search is keyword-only with no semantic matching.', recommendation: 'Add in-product contextual help panels. Link from error states to relevant docs.' },
    ],
    overall: 3.2,
    summary: 'Solid foundation with strong consistency and recognition patterns. The critical gap is power-user efficiency — missing keyboard shortcuts and limited undo coverage create friction for daily users. Error handling requires immediate attention: raw API error messages in user-facing UI undermine trust and increase support volume.',
  },
  {
    scores: [
      { id: 'visibility', score: 3.0, severity: 'P2', finding: 'Background sync operations give no visual feedback. Users are unsure if changes saved. Auto-save indicator is only visible on hover.', recommendation: 'Show persistent auto-save indicator in the nav bar. Add toast on sync completion for first-time users.' },
      { id: 'match', score: 4.5, severity: 'pass', finding: 'Product language closely mirrors user mental models. "Projects", "Tasks", and "Due dates" map naturally to how users think about their work.', recommendation: '' },
      { id: 'control', score: 3.5, severity: 'P2', finding: 'Undo works for text edits but not for structural changes such as moving items between projects or archiving. Multi-step operations are not reversible.', recommendation: 'Extend undo stack to cover structural operations. Show affected items in the undo toast.' },
      { id: 'consistency', score: 3.0, severity: 'P2', finding: 'Primary action placement varies across views: sometimes top-right, sometimes bottom. Inline editing triggers differ per component type with no discernible rule.', recommendation: 'Audit primary action placement across all views. Standardize to a single consistent position.' },
      { id: 'error_prevention', score: 4.0, severity: 'pass', finding: 'Form validation is real-time and specific. Destructive actions require explicit confirmation. Duplicate detection prevents the most common data entry mistakes.', recommendation: '' },
      { id: 'recognition', score: 3.5, severity: 'P2', finding: 'Feature discoverability is moderate. High-value features like bulk edit and custom fields require prior knowledge of their existence to find.', recommendation: 'Add empty state prompts for advanced features. Surface shortcuts contextually on first use.' },
      { id: 'flexibility', score: 4.0, severity: 'pass', finding: 'Good keyboard shortcut coverage for core workflows. Command palette is available. Custom view filters allow power user customization.', recommendation: '' },
      { id: 'aesthetic', score: 3.5, severity: 'P2', finding: 'Landing view is clean. Detail views become cluttered with metadata as items grow. Mobile views truncate critical information without a clear disclosure pattern.', recommendation: 'Progressive disclosure for item metadata. Separate edit and read views on mobile.' },
      { id: 'error_recovery', score: 3.5, severity: 'P2', finding: 'Most errors have clear messages. Integration connection failures show a generic "Something went wrong" without diagnosis or recovery guidance.', recommendation: 'Add connection diagnostics panel. Show last-sync timestamp and the specific failure reason.' },
      { id: 'help', score: 2.5, severity: 'P1', finding: 'No in-product help beyond onboarding, which is skippable. Documentation site lacks search. New users have no fallback when they hit unfamiliar territory.', recommendation: 'Add progressive onboarding checklist. Implement documentation search with semantic matching.' },
    ],
    overall: 3.5,
    summary: 'Strong fundamentals around error prevention and keyboard flexibility. The visibility gap undermines user trust — users cannot confirm whether their work is saved. Help and documentation represent the biggest opportunity: new users have no safety net when the onboarding flow ends.',
  },
];

const COMPETITOR_EVALS: Array<Omit<ProductEvaluation, 'url' | 'screenshot'>> = [
  {
    scores: [
      { id: 'visibility', score: 4.5, severity: 'pass', finding: 'Excellent loading state coverage. SSE-driven live updates eliminate perceived latency throughout the product.', recommendation: '' },
      { id: 'match', score: 4.5, severity: 'pass', finding: 'Natural language throughout. No technical jargon exposed to end users in any flow.', recommendation: '' },
      { id: 'control', score: 4.0, severity: 'pass', finding: 'Global undo covers all action types including structural changes. Recycle bin with 90-day retention.', recommendation: '' },
      { id: 'consistency', score: 4.5, severity: 'pass', finding: 'Tight, mature design system. Visual language is consistent across all features and edge cases.', recommendation: '' },
      { id: 'error_prevention', score: 4.0, severity: 'pass', finding: 'Smart defaults, real-time cross-field validation, and duplicate detection across the entire product.', recommendation: '' },
      { id: 'recognition', score: 4.5, severity: 'pass', finding: 'Navigation is intuitive from day one. Recently visited items are prominently surfaced in the sidebar.', recommendation: '' },
      { id: 'flexibility', score: 4.5, severity: 'pass', finding: 'Comprehensive keyboard shortcuts, command palette, and public API for workflow automation.', recommendation: '' },
      { id: 'aesthetic', score: 4.5, severity: 'pass', finding: 'Clean, information-dense views that do not feel cluttered. Generous use of whitespace alongside high data density.', recommendation: '' },
      { id: 'error_recovery', score: 4.0, severity: 'pass', finding: 'Plain-language errors with actionable suggestions and links to relevant documentation.', recommendation: '' },
      { id: 'help', score: 4.0, severity: 'pass', finding: 'Contextual help tooltips on first use, searchable documentation, and live chat support built into the product.', recommendation: '' },
    ],
    overall: 4.3,
    summary: 'Best-in-class execution across all 10 categories. Sets the benchmark for this product category. Keyboard coverage and undo depth are particularly notable differentiators.',
  },
  {
    scores: [
      { id: 'visibility', score: 3.5, severity: 'P2', finding: 'Real-time sync is reliable but there is no visual indicator of sync status in the interface.', recommendation: 'Add sync status indicator to the persistent nav bar.' },
      { id: 'match', score: 4.0, severity: 'pass', finding: 'Approachable language throughout. Some power-user terminology leaks through in advanced settings.', recommendation: '' },
      { id: 'control', score: 3.5, severity: 'P2', finding: 'Text undo works well. Structural undo is not available for move or archive operations.', recommendation: 'Extend undo stack to structural operations.' },
      { id: 'consistency', score: 3.5, severity: 'P2', finding: 'Slight inconsistencies in modal and bottom sheet patterns across different areas of the product.', recommendation: '' },
      { id: 'error_prevention', score: 4.5, severity: 'pass', finding: 'Excellent real-time validation. Conflict resolution is handled gracefully throughout.', recommendation: '' },
      { id: 'recognition', score: 4.0, severity: 'pass', finding: 'Feature discovery is handled well through progressive reveal and empty state prompts.', recommendation: '' },
      { id: 'flexibility', score: 3.5, severity: 'P2', finding: 'Limited keyboard shortcut coverage. No command palette available.', recommendation: 'Add keyboard shortcut system and command palette as a priority.' },
      { id: 'aesthetic', score: 4.5, severity: 'pass', finding: 'Exceptional visual design. One of the cleanest, most refined UIs in the category.', recommendation: '' },
      { id: 'error_recovery', score: 4.0, severity: 'pass', finding: 'Good plain-language error messages with inline guidance for resolution.', recommendation: '' },
      { id: 'help', score: 3.5, severity: 'P2', finding: 'Documentation is strong but not surfaced contextually within the product. In-product help is minimal.', recommendation: '' },
    ],
    overall: 3.9,
    summary: 'Strong visual design and error prevention. Keyboard shortcut gaps and lack of in-product help are notable for a product used daily by professionals.',
  },
];

const GAP_ANALYSIS: { gapAnalysis: GapAnalysis; roadmap: RoadmapItem[] } = {
  gapAnalysis: {
    youWin: [
      { heuristic: 'Error Prevention', detail: 'Your real-time cross-field validation is more thorough than either competitor. Duplicate detection catches issues earlier in the workflow, reducing user errors.' },
      { heuristic: 'Match with Real World', detail: 'Your domain language is clearer and less technical than Competitor B, reducing cognitive load for new users in the first week.' },
    ],
    theyWin: [
      { heuristic: 'Flexibility & Efficiency', competitor: 'Competitor A', detail: 'Full keyboard shortcut coverage and command palette. Your users are spending measurably more time on repeat workflows without equivalent accelerators.' },
      { heuristic: 'User Control & Freedom', competitor: 'Competitor A', detail: 'Competitor A offers structural undo across all operations with a 90-day recycle bin. Your users cannot recover from bulk moves or archive operations.' },
      { heuristic: 'Help & Documentation', competitor: 'Competitor A', detail: 'Contextual in-product help vs. your documentation-only approach means users hit walls with no immediate fallback.' },
      { heuristic: 'Error Recognition & Recovery', competitor: 'Competitor A', detail: 'Plain-language error messages with specific recovery steps vs. your raw API error passthrough to users.' },
    ],
    comparable: [
      { heuristic: 'Visibility of System Status' },
      { heuristic: 'Consistency & Standards' },
      { heuristic: 'Aesthetic & Minimalist Design' },
      { heuristic: 'Recognition over Recall' },
    ],
  },
  roadmap: [
    { priority: 'P0', heuristic: 'Error Recognition & Recovery', finding: 'Raw API error messages ("422 Unprocessable Entity") shown directly to users in production', action: 'Map all API error codes to plain-language messages with specific recovery instructions and support links', effort: 'medium' },
    { priority: 'P1', heuristic: 'Flexibility & Efficiency', finding: 'No keyboard shortcuts or command palette — measurable time-on-task disadvantage vs. competitors', action: 'Implement Cmd+K command palette with the 15 most-used actions. Ship keyboard shortcut overlay.', effort: 'high' },
    { priority: 'P1', heuristic: 'User Control & Freedom', finding: 'Bulk operations and structural changes (archive, move, delete) are irreversible', action: 'Add soft-delete with 30-day recovery window. Show undo toast for all destructive actions.', effort: 'medium' },
    { priority: 'P1', heuristic: 'Visibility of System Status', finding: 'Auto-save indicator hidden on hover only; users are unsure if their work is being persisted', action: 'Persist auto-save status in the nav bar at all times. Add explicit save toast for the first save per session.', effort: 'low' },
    { priority: 'P2', heuristic: 'Help & Documentation', finding: 'No in-product help; new users have no fallback after skipping the onboarding flow', action: 'Add contextual help sidepanels to the 5 most complex views. Link from error states to relevant docs.', effort: 'medium' },
    { priority: 'P2', heuristic: 'Error Prevention', finding: 'Cross-field validation fires only on form submit, not in real time', action: 'Add real-time cross-field validation for date ranges, quantity limits, and field dependencies throughout', effort: 'low' },
    { priority: 'P2', heuristic: 'Aesthetic & Minimalist Design', finding: 'Notification badge reflects all updates including low-priority informational ones, creating cognitive noise', action: 'Separate actionable from informational notifications. Only badge count for actionable items.', effort: 'low' },
    { priority: 'P3', heuristic: 'Consistency & Standards', finding: 'Minor inconsistency in form field error state styles between settings and onboarding sections', action: 'Standardize error state design tokens in the design system. Audit all form instances.', effort: 'low' },
  ],
};

export function getMockEvaluation(seed = 0): Omit<ProductEvaluation, 'url' | 'screenshot'> {
  return EVALUATIONS[seed % EVALUATIONS.length];
}

export function getMockCompetitorEvaluation(seed = 0): Omit<ProductEvaluation, 'url' | 'screenshot'> {
  return COMPETITOR_EVALS[seed % COMPETITOR_EVALS.length];
}

export function getMockGapAnalysis(
  _yourProduct: ProductEvaluation,
  competitors: ProductEvaluation[],
): { gapAnalysis: GapAnalysis; roadmap: RoadmapItem[] } {
  if (competitors.length === 0) {
    return { gapAnalysis: { youWin: [], theyWin: [], comparable: [] }, roadmap: GAP_ANALYSIS.roadmap };
  }
  return GAP_ANALYSIS;
}

export function getSampleAuditResult() {
  const yourProduct = {
    url: 'your-saas.co',
    screenshot: '',
    ...getMockEvaluation(0),
  };
  const competitors = [
    { url: 'competitor-a.co', screenshot: '', ...getMockCompetitorEvaluation(0) },
    { url: 'competitor-b.co', screenshot: '', ...getMockCompetitorEvaluation(1) },
  ];
  return {
    id: 'sample',
    status: 'complete' as const,
    yourProduct,
    competitors,
    gapAnalysis: GAP_ANALYSIS.gapAnalysis,
    roadmap: GAP_ANALYSIS.roadmap,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}
