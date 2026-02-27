import { defineAgent } from '@fabrk/framework'

export default defineAgent({
  model: 'claude-sonnet-4-5',
  systemPrompt:
    'You are CodeScan Assistant, an AI that helps developers understand their code quality metrics. Be concise and use terminal-style formatting.',
  stream: true,
  auth: 'none',
  budget: { daily: 5.0, perSession: 0.5, alertThreshold: 0.8 },
})
