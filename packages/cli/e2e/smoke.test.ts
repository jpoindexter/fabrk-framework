import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CLI_DIST = path.resolve(__dirname, '../dist/fabrk.js')
const TEMPLATES = ['basic', 'ai-saas', 'dashboard'] as const

let tmpDir: string

beforeAll(() => {
  if (!fs.existsSync(CLI_DIST)) {
    throw new Error(
      'CLI not built. Run `pnpm build` in packages/cli first.\n' +
      `Expected: ${CLI_DIST}`
    )
  }
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fabrk-e2e-'))
})

afterAll(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('fabrk create', () => {
  for (const template of TEMPLATES) {
    describe(`--template ${template}`, () => {
      const projectName = `test-${template}`
      let projectDir: string

      beforeAll(() => {
        projectDir = path.join(tmpDir, projectName)
        execFileSync(
          process.execPath,
          [CLI_DIST, 'create', projectName, '--template', template, '--no-install', '--no-git'],
          {
            cwd: tmpDir,
            timeout: 30_000,
            env: { ...process.env, NO_COLOR: '1' },
          }
        )
      })

      it('creates project with correct structure', () => {
        expect(fs.existsSync(projectDir)).toBe(true)

        const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'))
        expect(pkg.name).toBe(projectName)
        expect(pkg.dependencies['@fabrk/core']).toBeDefined()
        expect(pkg.dependencies['@fabrk/components']).toBeDefined()
        expect(pkg.dependencies['next']).toBeDefined()
        expect(pkg.dependencies['react']).toMatch(/19/)
        expect(pkg.scripts?.dev).toBeDefined()
        expect(pkg.scripts?.build).toBeDefined()
      })

      it('creates all required files', () => {
        const requiredFiles = [
          'tsconfig.json',
          'next.config.js',
          'fabrk.config.ts',
          'app/page.tsx',
          'app/layout.tsx',
          'app/globals.css',
          '.fabrk/manifest.json',
        ]
        for (const file of requiredFiles) {
          expect(fs.existsSync(path.join(projectDir, file)), `Missing: ${file}`).toBe(true)
        }
      })

      it('generates valid manifest', () => {
        const manifest = JSON.parse(
          fs.readFileSync(path.join(projectDir, '.fabrk', 'manifest.json'), 'utf-8')
        )
        expect(manifest.framework).toBe('fabrk')
        expect(manifest.runtime).toBe('nextjs')
        expect(manifest.name).toBe(projectName)
      })
    })
  }
})

describe('fabrk create — error cases', () => {
  it('fails on invalid template name', () => {
    expect(() => {
      execFileSync(
        process.execPath,
        [CLI_DIST, 'create', 'bad-template-test', '--template', 'nonexistent', '--no-install', '--no-git'],
        { cwd: tmpDir, timeout: 10_000, stdio: 'pipe', env: { ...process.env, NO_COLOR: '1' } }
      )
    }).toThrow()
  })

  it('fails when directory already exists', () => {
    const dir = path.join(tmpDir, 'already-exists')
    fs.mkdirSync(dir, { recursive: true })

    expect(() => {
      execFileSync(
        process.execPath,
        [CLI_DIST, 'create', 'already-exists', '--template', 'basic', '--no-install', '--no-git'],
        { cwd: tmpDir, timeout: 10_000, stdio: 'pipe', env: { ...process.env, NO_COLOR: '1' } }
      )
    }).toThrow()
  })
})
