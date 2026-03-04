export const HEURISTICS = [
  {
    id: 'visibility',
    name: 'Visibility of System Status',
    description: 'Does the system keep users informed about what is going on?',
  },
  {
    id: 'match',
    name: 'Match with Real World',
    description: 'Does the system use language and concepts familiar to the user?',
  },
  {
    id: 'control',
    name: 'User Control & Freedom',
    description: 'Can users easily undo and redo actions?',
  },
  {
    id: 'consistency',
    name: 'Consistency & Standards',
    description: 'Do UI conventions follow platform and industry norms?',
  },
  {
    id: 'error_prevention',
    name: 'Error Prevention',
    description: 'Does the design prevent problems from occurring?',
  },
  {
    id: 'recognition',
    name: 'Recognition over Recall',
    description: 'Are objects, actions, and options visible without relying on memory?',
  },
  {
    id: 'flexibility',
    name: 'Flexibility & Efficiency',
    description: 'Are there shortcuts and accelerators for expert users?',
  },
  {
    id: 'aesthetic',
    name: 'Aesthetic & Minimalist Design',
    description: 'Does the interface avoid irrelevant or rarely-needed information?',
  },
  {
    id: 'error_recovery',
    name: 'Error Recognition & Recovery',
    description: 'Are error messages plain-language and constructive?',
  },
  {
    id: 'help',
    name: 'Help & Documentation',
    description: 'Is help easy to find and focused on the user\'s task?',
  },
] as const;

export type HeuristicId = typeof HEURISTICS[number]['id'];

export interface HeuristicScore {
  id: HeuristicId;
  score: number; // 1–5
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'pass';
  finding: string;
  recommendation: string;
}

export interface ProductEvaluation {
  url: string;
  screenshot: string; // base64 PNG
  scores: HeuristicScore[];
  overall: number;
  summary: string;
}

export interface AuditResult {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  yourProduct: ProductEvaluation | null;
  competitors: ProductEvaluation[];
  gapAnalysis: GapAnalysis | null;
  roadmap: RoadmapItem[] | null;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface GapAnalysis {
  youWin: Array<{ heuristic: string; detail: string }>;
  theyWin: Array<{ heuristic: string; competitor: string; detail: string }>;
  comparable: Array<{ heuristic: string }>;
}

export interface RoadmapItem {
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  heuristic: string;
  finding: string;
  action: string;
  effort: 'low' | 'medium' | 'high';
}
