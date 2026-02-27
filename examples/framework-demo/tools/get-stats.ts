import { defineTool, textResult } from '@fabrk/framework'

export default defineTool({
  name: 'get-stats',
  description: 'Get code quality statistics for a repository',
  schema: {
    type: 'object',
    properties: {
      repo: { type: 'string', description: 'Repository name' },
    },
    required: ['repo'],
  },
  handler: async ({ repo }) => {
    const stats = {
      repo,
      files: 1572,
      coverage: 87.3,
      issues: 23,
      lastScan: new Date().toISOString(),
    }
    return textResult(JSON.stringify(stats, null, 2))
  },
})
