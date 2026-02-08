/**
 * E2E Smoke Test for create-fabrk-app CLI
 *
 * Verifies that `fabrk create` scaffolds a working project structure
 * from each template without errors.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CLI_DIST = path.resolve(__dirname, '../dist/fabrk.js')
const TEMPLATES = ['basic', 'ai-saas', 'dashboard'] as const

let tmpDir: string

beforeAll(() => {
  // Ensure CLI is built
  if (!fs.existsSync(CLI_DIST)) {
    throw new Error(
      'CLI not built. Run `pnpm build` in packages/cli first.\n' +
      `Expected: ${CLI_DIST}`
    )
  }

  // Create temp directory for test projects
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fabrk-e2e-'))
})

afterAll(() => {
  // Clean up temp directory
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

        // Run the CLI
        execSync(
          `node ${CLI_DIST} create ${projectName} --template ${template} --no-install --no-git`,
          {
            cwd: tmpDir,
            timeout: 30_000,
            env: { ...process.env, NO_COLOR: '1' },
          }
        )
      })

      it('creates the project directory', () => {
        expect(fs.existsSync(projectDir)).toBe(true)
      })

      it('creates package.json with correct name', () => {
        const pkgPath = path.join(projectDir, 'package.json')
        expect(fs.existsSync(pkgPath)).toBe(true)

        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        expect(pkg.name).toBe(projectName)
      })

      it('has @fabrk/core as a dependency', () => {
        const pkgPath = path.join(projectDir, 'package.json')
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

        expect(pkg.dependencies).toBeDefined()
        expect(pkg.dependencies['@fabrk/core']).toBeDefined()
      })

      it('has @fabrk/components as a dependency', () => {
        const pkgPath = path.join(projectDir, 'package.json')
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

        expect(pkg.dependencies['@fabrk/components']).toBeDefined()
      })

      it('has @fabrk/design-system as a dependency', () => {
        const pkgPath = path.join(projectDir, 'package.json')
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

        expect(pkg.dependencies['@fabrk/design-system']).toBeDefined()
      })

      it('includes Next.js as a dependency', () => {
        const pkgPath = path.join(projectDir, 'package.json')
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

        expect(pkg.dependencies['next']).toBeDefined()
      })

      it('includes React 19 as a dependency', () => {
        const pkgPath = path.join(projectDir, 'package.json')
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

        expect(pkg.dependencies['react']).toMatch(/19/)
      })

      it('creates tsconfig.json', () => {
        expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true)
      })

      it('creates next.config.js', () => {
        expect(fs.existsSync(path.join(projectDir, 'next.config.js'))).toBe(true)
      })

      it('creates app/page.tsx', () => {
        expect(fs.existsSync(path.join(projectDir, 'app', 'page.tsx'))).toBe(true)
      })

      it('creates app/layout.tsx', () => {
        expect(fs.existsSync(path.join(projectDir, 'app', 'layout.tsx'))).toBe(true)
      })

      it('creates tailwind.config.ts', () => {
        expect(fs.existsSync(path.join(projectDir, 'tailwind.config.ts'))).toBe(true)
      })

      it('creates postcss.config.js', () => {
        expect(fs.existsSync(path.join(projectDir, 'postcss.config.js'))).toBe(true)
      })

      it('creates app/globals.css', () => {
        expect(fs.existsSync(path.join(projectDir, 'app', 'globals.css'))).toBe(true)
      })

      it('creates .fabrk/ generated directory', () => {
        expect(fs.existsSync(path.join(projectDir, '.fabrk'))).toBe(true)
        expect(fs.existsSync(path.join(projectDir, '.fabrk', 'manifest.json'))).toBe(true)
      })

      it('generates manifest.json with correct framework field', () => {
        const manifestPath = path.join(projectDir, '.fabrk', 'manifest.json')
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

        expect(manifest.framework).toBe('fabrk')
        expect(manifest.runtime).toBe('nextjs')
        expect(manifest.name).toBe(projectName)
      })

      it('has dev, build, and start scripts', () => {
        const pkgPath = path.join(projectDir, 'package.json')
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

        expect(pkg.scripts?.dev).toBeDefined()
        expect(pkg.scripts?.build).toBeDefined()
        expect(pkg.scripts?.start).toBeDefined()
      })
    })
  }
})

describe('fabrk create — error cases', () => {
  it('fails on invalid template name', () => {
    expect(() => {
      execSync(
        `node ${CLI_DIST} create bad-template-test --template nonexistent --no-install --no-git`,
        {
          cwd: tmpDir,
          timeout: 10_000,
          stdio: 'pipe',
          env: { ...process.env, NO_COLOR: '1' },
        }
      )
    }).toThrow()
  })

  it('fails when directory already exists', () => {
    // Create a directory first
    const dir = path.join(tmpDir, 'already-exists')
    fs.mkdirSync(dir, { recursive: true })

    expect(() => {
      execSync(
        `node ${CLI_DIST} create already-exists --template basic --no-install --no-git`,
        {
          cwd: tmpDir,
          timeout: 10_000,
          stdio: 'pipe',
          env: { ...process.env, NO_COLOR: '1' },
        }
      )
    }).toThrow()
  })
})
