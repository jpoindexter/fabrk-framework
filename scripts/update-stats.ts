#!/usr/bin/env tsx
/**
 * update-stats.ts
 *
 * Runs the test suite, counts packages, then rewrites every documentation file
 * that embeds those numbers. Run with:
 *
 *   pnpm update-stats
 *
 * Flags:
 *   --no-run   Skip running tests; use the last cached result in .vitest-stats.json
 *   --dry-run  Print changes without writing files
 */

import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const STATS_CACHE = join(ROOT, '.vitest-stats.json')

const args = process.argv.slice(2)
const skipRun = args.includes('--no-run')
const dryRun = args.includes('--dry-run')
const checkOnly = args.includes('--check')

// ---------------------------------------------------------------------------
// 1. Collect stats
// ---------------------------------------------------------------------------

function runTests(): number {
  console.log('Running test suite (this takes a moment)...')

  // Root suite
  const root = spawnSync('pnpm', ['vitest', 'run', '--reporter=json', `--outputFile=${STATS_CACHE}`], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let rootCount = 0
  if (existsSync(STATS_CACHE)) {
    try {
      const data = JSON.parse(readFileSync(STATS_CACHE, 'utf8'))
      rootCount = data.numTotalTests ?? 0
    } catch { /* ignore */ }
  } else {
    // Fallback: parse from stdout/stderr summary line
    const out = root.stdout + root.stderr
    const m = out.match(/Tests\s+(\d+)\s+passed/)
    if (m) rootCount = parseInt(m[1])
  }

  // Components suite (separate vitest config)
  const compDir = join(ROOT, 'packages', 'components')
  const compStatsFile = join(compDir, '.vitest-stats.json')
  spawnSync('pnpm', ['vitest', 'run', '--reporter=json', `--outputFile=${compStatsFile}`], {
    cwd: compDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let compCount = 0
  if (existsSync(compStatsFile)) {
    try {
      const data = JSON.parse(readFileSync(compStatsFile, 'utf8'))
      compCount = data.numTotalTests ?? 0
    } catch { /* ignore */ }
  }

  const total = rootCount + compCount
  writeFileSync(STATS_CACHE, JSON.stringify({ numTotalTests: total, updatedAt: new Date().toISOString() }))
  return total
}

function readCachedCount(): number {
  if (!existsSync(STATS_CACHE)) {
    console.error('No cached stats found. Run without --no-run first.')
    process.exit(1)
  }
  const data = JSON.parse(readFileSync(STATS_CACHE, 'utf8'))
  console.log(`Using cached count from ${data.updatedAt}`)
  return data.numTotalTests
}

function countPackages(): number {
  const pkgDir = join(ROOT, 'packages')
  return readdirSync(pkgDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(pkgDir, d.name, 'package.json')))
    .length
}

const FILES = [
  'README.md',
  'CLAUDE.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'DESIGN_SYSTEM_RULES.md',
  'CHANGELOG.md',
  'docs/reddit-sideproject.md',
  'packages/framework/AGENTS.md',
  'examples/docs/src/data/stats.ts',
]

// ---------------------------------------------------------------------------
// --check mode: verify all docs have consistent test counts (no tests needed)
// ---------------------------------------------------------------------------

if (checkOnly) {
  const SKIP_CHECK = new Set(['CHANGELOG.md'])
  const allCounts = new Set<string>()
  for (const rel of FILES) {
    if (SKIP_CHECK.has(rel)) continue
    const fullPath = join(ROOT, rel)
    if (!existsSync(fullPath)) continue
    const content = readFileSync(fullPath, 'utf8')

    // Prose: "2,677 tests"
    for (const m of content.matchAll(/\b(\d[\d,]*) tests\b/g)) {
      allCounts.add(m[1].replace(/,/g, ''))
    }
    // Badge: tests-NNNN-green
    for (const m of content.matchAll(/tests-(\d+)-green/g)) {
      allCounts.add(m[1])
    }
    // stats.ts: tests: NNNN
    for (const m of content.matchAll(/tests:\s*(\d+)/g)) {
      allCounts.add(m[1])
    }
  }

  if (allCounts.size <= 1) {
    console.log(`Stats are consistent across all docs (${[...allCounts][0] ?? 'no counts found'}).`)
    process.exit(0)
  } else {
    console.error(`Stats are inconsistent! Found different test counts: ${[...allCounts].join(', ')}`)
    console.error('Run "pnpm update-stats" to fix.')
    process.exit(1)
  }
}

const testCount = skipRun ? readCachedCount() : runTests()
const pkgCount = countPackages()

console.log(`\nStats:`)
console.log(`  tests:    ${testCount.toLocaleString('en-US')}`)
console.log(`  packages: ${pkgCount}`)

// ---------------------------------------------------------------------------
// 2. Update docs
// ---------------------------------------------------------------------------

const formattedTests = testCount.toLocaleString('en-US')

const replacements: Array<[RegExp, (m: string) => string]> = [
  // "2,677 tests" or "858 tests" (any count followed by " tests")
  [/\b\d[\d,]* tests\b/g, () => `${formattedTests} tests`],
  // stats.ts numeric field: tests: 2677
  [/(?<=tests:\s*)\d+(?=,)/g, () => String(testCount)],
  // shields.io badge: tests-NNNN-green
  [/(?<=tests-)\d+(?=-green)/g, () => String(testCount)],
]

let totalChanges = 0

for (const rel of FILES) {
  const fullPath = join(ROOT, rel)
  if (!existsSync(fullPath)) continue

  let content = readFileSync(fullPath, 'utf8')
  const original = content

  for (const [pattern, replacer] of replacements) {
    content = content.replace(pattern, replacer)
  }

  if (content !== original) {
    if (!dryRun) {
      writeFileSync(fullPath, content)
    }
    const count = (original.match(/\b\d[\d,]* tests\b/g) ?? []).length
    console.log(`  ${dryRun ? '[dry] ' : ''}updated ${rel} (${count} occurrence${count !== 1 ? 's' : ''})`)
    totalChanges++
  }
}

if (totalChanges === 0) {
  console.log('\nAll docs already up to date.')
} else {
  console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${totalChanges} file${totalChanges !== 1 ? 's' : ''}.`)
}
